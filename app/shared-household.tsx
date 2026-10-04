import { useCallback, useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { Button, Card, Copy, Field, Page } from "@/components/app-ui";
import { useCloudSync } from "@/lib/cloud-sync";
import { useSubscriptions } from "@/lib/subscription-store";
import { useMoneyFormatter } from "@/lib/privacy";
import { supabase } from "@/lib/supabase";
import { acceptInvite, createHousehold, deleteHousehold, getHousehold, inviteMember, listHouseholds, removeMember, removeSharedPlan, saveSharedPlan, type SharedPlan } from "@/lib/household-cloud";

export default function SharedHouseholdScreen() {
  const cloud = useCloudSync(); const store = useSubscriptions(); const money = useMoneyFormatter();
  const [households, setHouseholds] = useState<Awaited<ReturnType<typeof listHouseholds>>>([]);
  const [selected, setSelected] = useState(""); const [household, setHousehold] = useState<Awaited<ReturnType<typeof getHousehold>>>();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [token, setToken] = useState("");
  const [generatedToken, setGeneratedToken] = useState(""); const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [shareId, setShareId] = useState(""); const [editing, setEditing] = useState<SharedPlan>();
  const [editAmount, setEditAmount] = useState(""); const [editDate, setEditDate] = useState("");
  const [confirmation, setConfirmation] = useState<{ label: string; perform: () => Promise<unknown> }>();
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  // Read the live selection so late responses and post-delete refreshes never apply to a different household.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const choose = (id: string) => { selectedRef.current = id; setSelected(id); };
  const refresh = useCallback(async () => {
    if (!cloud.userEmail) return;
    setHouseholds(await listHouseholds());
    const requested = selectedRef.current;
    if (!requested) return;
    try {
      const next = await getHousehold(requested);
      if (selectedRef.current === requested) setHousehold(next);
    } catch (error) {
      if (selectedRef.current !== requested) return;
      setHousehold(undefined); setEditing(undefined); throw error;
    }
  }, [cloud.userEmail]);
  const run = async (operation: () => Promise<unknown>) => {
    setBusy(true); setMessage("");
    try { await operation(); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Household operation failed."); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    void refresh().catch((error) => setMessage(error.message));
    if (!selected || !supabase || !cloud.userEmail) return;
    const channel = supabase.channel(`subtrack-household-${selected}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subtrack_shared_plans", filter: `household_id=eq.${selected}` }, () => void refresh().catch((error) => setMessage(error.message))).subscribe();
    const timer = setInterval(() => void refresh().catch((error) => setMessage(error.message)), 30_000);
    return () => { clearInterval(timer); void supabase?.removeChannel(channel); };
  }, [refresh, selected, cloud.userEmail]);
  if (!cloud.isConfigured || !cloud.userEmail) return <Page title="Household collaboration">
    <Card title="Optional cloud feature"><Copy>Sign in and deploy the reviewed Supabase migrations before sharing. Local household allocation remains available without an account.</Copy>
      <Button label="Cloud account" onPress={() => router.push("/cloud-sync")} /><Button label="Local household allocation" secondary onPress={() => router.push("/household")} />
    </Card>
  </Page>;
  const shareRecord = store.subscriptions.find((record) => record.id === shareId);
  const canEdit = household?.role === "owner" || household?.role === "editor";
  return <Page title="Household collaboration" subtitle="Only explicitly published plan fields are shared. Private notes, billing identities, reminders, and cancellation evidence are excluded. Requires approved Supabase deployment.">
    <Card title="Your households">
      <Button label="Refresh households" secondary disabled={busy} onPress={() => void run(refresh)} />
      {households.map((item) => <Button key={item.id} label={item.name} secondary={selected !== item.id} onPress={() => { choose(item.id); setHousehold(undefined); setShareId(""); setEditing(undefined); setGeneratedToken(""); setConfirmation(undefined); }} />)}
      <Field label="New household name" value={name} onChangeText={setName} maxLength={120} />
      <Button label="Create household" disabled={busy || !name.trim()} onPress={() => void run(async () => { choose(await createHousehold(name)); setName(""); })} />
    </Card>
    <Card title="Join by invitation">
      <Copy muted>Ask the owner to send a single-use code privately. It expires after seven days and works only for the verified email it was addressed to.</Copy>
      <Field label="Invitation code" value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} />
      <Button label="Accept invitation" disabled={busy || !token.trim()} onPress={() => void run(async () => { choose(await acceptInvite(token)); setToken(""); })} />
    </Card>
    {household ? <>
      <Card title={`Access: ${household.role}`}>
        {household.members.map((member, index) => <Card key={member.user_id}>
          <Copy>{member.user_id === household.userId ? "You" : `Member ${index + 1}`} · {member.role}</Copy>
          {member.role !== "owner" && (household.role === "owner" || member.user_id === household.userId) ? <Button label={member.user_id === household.userId ? "Leave household" : "Remove member"} secondary disabled={busy} onPress={() => setConfirmation({ label: "Remove household access? Local records will remain unchanged.", perform: () => removeMember(selected, member.user_id) })} /> : null}
        </Card>)}
        {household.role === "owner" ? <>
          <Field label="Invite verified email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Button label={`Invitation role: ${role} (tap to change)`} secondary onPress={() => setRole(role === "viewer" ? "editor" : "viewer")} />
          <Button label="Generate single-use invitation" disabled={busy || !email.trim()} onPress={() => void run(async () => setGeneratedToken(await inviteMember(selected, email, role)))} />
          {generatedToken ? <><Field label="Copy this invitation privately" value={generatedToken} editable={false} /><Copy muted>Do not publish invitation codes or paste them into assistant chats.</Copy></> : null}
          <Button label="Delete household and shared plans" secondary disabled={busy} onPress={() => setConfirmation({ label: "Delete this cloud household for all members? This does not delete anyone's private local subscriptions.", perform: async () => { await deleteHousehold(selected); choose(""); setHousehold(undefined); } })} />
        </> : null}
      </Card>
      {canEdit ? <Card title="Publish a selected local plan">
        <Copy muted>Publishing uploads name, amount, currency, cadence, renewal date, expected next charge, and status. Nothing is shared automatically.</Copy>
        {store.subscriptions.map((record) => <Button key={record.id} label={`${shareId === record.id ? "Selected: " : ""}${record.planName}`} secondary={shareId !== record.id} onPress={() => setShareId(record.id)} />)}
        {shareRecord ? <><Copy>{shareRecord.planName} · {money(shareRecord.amount, shareRecord.currency)} · {shareRecord.renewalDate}</Copy>
          <Button label="Publish this reviewed plan to household" disabled={busy} onPress={() => void run(async () => { await saveSharedPlan(selected, shareRecord, household.plans.find((plan) => plan.payload.id === shareRecord.id)); setShareId(""); })} />
        </> : null}
      </Card> : null}
      {household.plans.map((plan) => <Card key={plan.id} title={plan.payload.planName}>
        <Copy>{money(plan.payload.amount, plan.payload.currency)} {plan.payload.cadence} · {plan.payload.renewalDate} · revision {plan.revision}</Copy>
        {canEdit ? <Button label="Edit shared amount and renewal date" secondary disabled={busy} onPress={() => { setEditing(plan); setEditAmount(String(plan.payload.amount)); setEditDate(plan.payload.renewalDate); }} /> : null}
        <Button label="Copy to my private subscriptions" secondary disabled={busy} onPress={() => setConfirmation({ label: "Create a separate local copy? Future household changes will not silently overwrite your private copy.", perform: () => store.addSubscription({ ...plan.payload, billingSource: "unknown", reminderEnabled: false, sharedMemberIds: ["owner"], sharedMemberShares: undefined }) })} />
        {household.role === "owner" ? <Button label="Remove shared plan" secondary disabled={busy} onPress={() => setConfirmation({ label: "Remove this plan from the household? Provider billing will not change.", perform: () => removeSharedPlan(selected, plan.id) })} /> : null}
      </Card>)}
      {household.unreadablePlanIds.map((planId) => <Card key={planId} title="Unreadable shared plan">
        <Copy muted>This shared plan has data this version of SubTrack cannot read, so it is hidden.</Copy>
        {household.role === "owner" ? <Button label="Remove unreadable plan" secondary disabled={busy} onPress={() => setConfirmation({ label: "Remove this unreadable plan from the household? Provider billing will not change.", perform: () => removeSharedPlan(selected, planId) })} /> : null}
      </Card>)}
    </> : null}
    {editing ? <Card title="Review shared edit">
      <Field label="Amount" value={editAmount} onChangeText={setEditAmount} keyboardType="decimal-pad" />
      <Field label="Renewal date (YYYY-MM-DD)" value={editDate} onChangeText={setEditDate} />
      <Button label="Save with conflict protection" disabled={busy || !editAmount.trim()} onPress={() => void run(async () => {
        await saveSharedPlan(selected, { ...editing.payload, amount: Number(editAmount), renewalDate: editDate, updatedAt: new Date().toISOString() }, editing); setEditing(undefined);
      })} />
      <Button label="Cancel edit" secondary onPress={() => setEditing(undefined)} />
    </Card> : null}
    {confirmation ? <Card title="Confirm action"><Copy>{confirmation.label}</Copy>
      <Button label="Confirm reviewed action" disabled={busy} onPress={() => void run(async () => { await confirmation.perform(); setConfirmation(undefined); })} />
      <Button label="Cancel" secondary onPress={() => setConfirmation(undefined)} />
    </Card> : null}
    {message ? <Copy>{message}</Copy> : null}
  </Page>;
}
