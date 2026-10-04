import { supabase } from "./supabase";
import { subscriptionSchema } from "./data-safety";
import type { SubscriptionRecord } from "./subscription-types";

function client() {
  if (!supabase) throw new Error("Configure Supabase and deploy the reviewed household migration before using collaboration.");
  return supabase;
}
export function householdError(error: unknown) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "Household operation failed.";
  if (message.includes("SUBTRACK_SYNC_CONFLICT")) return new Error("This plan changed on another device. Refresh and review it before editing again.");
  if (message.includes("does not exist") || message.includes("schema cache")) return new Error("Household collaboration is not deployed. Approve and apply the migrations before using this feature.");
  return new Error(message);
}
async function rpc(name: string, parameters: Record<string, unknown>) {
  const { data, error } = await client().rpc(name, parameters);
  if (error) throw householdError(error);
  return data;
}
export interface SharedPlan { id: string; household_id: string; revision: number; updated_at: string; payload: SubscriptionRecord; }
export function shareablePlan(record: SubscriptionRecord): SubscriptionRecord {
  // Share only the plan fields chosen by this workflow, never private notes or billing clues.
  return subscriptionSchema.parse({
    id: record.id, serviceId: record.serviceId, planId: record.planId, planName: record.planName,
    amount: record.amount, currency: record.currency, cadence: record.cadence, renewalDate: record.renewalDate,
    expectedNextCharge: record.expectedNextCharge, status: record.status, billingSource: "unknown",
    reminderEnabled: false, createdAt: record.createdAt, updatedAt: record.updatedAt,
  });
}
export async function listHouseholds() {
  const { data, error } = await client().from("subtrack_households").select("id,name,owner_id").order("created_at");
  if (error) throw householdError(error);
  return data as { id: string; name: string; owner_id: string }[];
}
export async function getHousehold(householdId: string) {
  const [plans, members, user] = await Promise.all([
    client().from("subtrack_shared_plans").select("id,household_id,payload,revision,updated_at").eq("household_id", householdId),
    client().from("subtrack_household_members").select("user_id,role").eq("household_id", householdId),
    client().auth.getUser(),
  ]);
  if (plans.error || members.error || user.error) throw householdError(plans.error ?? members.error ?? user.error);
  const roster = members.data as { user_id: string; role: "owner" | "editor" | "viewer" }[];
  const role = roster.find((member) => member.user_id === user.data.user?.id)?.role;
  if (!role) throw new Error("You no longer have access to this household.");
  const readable: SharedPlan[] = []; const unreadablePlanIds: string[] = [];
  for (const row of plans.data) {
    const payload = subscriptionSchema.safeParse(row.payload);
    if (payload.success) readable.push({ ...row, revision: Number(row.revision), payload: payload.data });
    else unreadablePlanIds.push(row.id);
  }
  return { householdId, role, userId: user.data.user!.id, members: roster, plans: readable, unreadablePlanIds };
}
export const createHousehold = (name: string) => rpc("subtrack_create_household", { p_name: name.trim() }) as Promise<string>;
export const inviteMember = (householdId: string, email: string, role: "editor" | "viewer") => rpc("subtrack_invite_member", { p_household: householdId, p_email: email.trim().toLowerCase(), p_role: role }) as Promise<string>;
export const acceptInvite = (token: string) => rpc("subtrack_accept_invite", { p_token: token.trim() }) as Promise<string>;
export const removeMember = (householdId: string, userId: string) => rpc("subtrack_remove_member", { p_household: householdId, p_user: userId });
export const deleteHousehold = (householdId: string) => rpc("subtrack_delete_household", { p_household: householdId });
export const removeSharedPlan = (householdId: string, planId: string) => rpc("subtrack_remove_shared_plan", { p_household: householdId, p_plan_id: planId });
export const saveSharedPlan = (householdId: string, record: SubscriptionRecord, previous?: SharedPlan) => rpc("subtrack_save_shared_plan", {
  p_household: householdId, p_plan_id: previous?.id ?? null, p_payload: shareablePlan(record), p_expected_revision: previous?.revision ?? 0,
});
