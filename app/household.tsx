import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { ServiceBadge } from "@/components/subscription-ui";
import { getService } from "@/lib/catalog";
import { useSubscriptions } from "@/lib/subscription-store";
import { formatCurrency, formatCurrencySpendGroups, getHouseholdContributions, monthlyAmount } from "@/lib/subscription-utils";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

export default function HouseholdScreen() {
  const { householdMembers, subscriptions, addHouseholdMember, removeHouseholdMember } = useSubscriptions();
  const [memberName, setMemberName] = useState("");
  const activeSubscriptions = useMemo(() => subscriptions.filter((item) => item.status !== "cancelled"), [subscriptions]);
  const contributions = useMemo(() => getHouseholdContributions(activeSubscriptions, householdMembers), [activeSubscriptions, householdMembers]);
  const sharedPlans = activeSubscriptions.filter((item) => (item.sharedMemberIds?.length ?? 1) > 1);

  const addMember = async () => {
    const added = await addHouseholdMember(memberName);
    if (!added) {
      Alert.alert("Name not added", "Enter a new household member name. Names need to be unique on this device.");
      return;
    }
    setMemberName("");
  };

  const confirmRemove = (id: string, name: string) => {
    Alert.alert("Remove household member?", `${name} will be removed from every shared plan on this device.`, [
      { text: "Keep", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void removeHouseholdMember(id) },
    ]);
  };

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background" edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.nav}>
          <Pressable accessibilityLabel="Go back" hitSlop={10} onPress={() => router.back()}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.navTitle}>Household</Text>
          <View style={styles.navSpacer} />
        </View>

        <Text style={styles.title}>Shared plans, made clear</Text>
        <Text style={styles.subtitle}>Add people on this device, then choose who shares each subscription. Nothing is sent to an account or cloud service.</Text>

        <View style={styles.privacyCard}>
          <View style={styles.privacyIcon}><Text style={styles.privacyIconText}>⌂</Text></View>
          <View style={styles.flex}><Text style={styles.privacyTitle}>Stored on this device</Text><Text style={styles.privacyBody}>This is a local planning tool. Household members cannot sign in or see data from another device.</Text></View>
        </View>

        <Text style={styles.section}>People</Text>
        <View style={styles.memberAdd}>
          <TextInput value={memberName} onChangeText={setMemberName} onSubmitEditing={() => void addMember()} placeholder="Add a person, for example Alex" placeholderTextColor="#80868B" returnKeyType="done" style={styles.memberInput} />
          <Pressable accessibilityRole="button" onPress={() => void addMember()} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}><Text style={styles.addButtonText}>Add</Text></Pressable>
        </View>
        <View style={styles.group}>
          {householdMembers.map((member, index) => (
            <View key={member.id}>
              {index ? <View style={styles.divider} /> : null}
              <View style={styles.memberRow}>
                <View style={[styles.avatar, { backgroundColor: member.color }]}><Text style={styles.avatarText}>{member.name.slice(0, 1).toUpperCase()}</Text></View>
                <View style={styles.flex}><Text style={styles.memberName}>{member.name}</Text><Text style={styles.memberMeta}>{member.isOwner ? "This device" : "Local household member"}</Text></View>
                {!member.isOwner ? <Pressable accessibilityLabel={`Remove ${member.name}`} onPress={() => confirmRemove(member.id, member.name)} style={({ pressed }) => [styles.remove, pressed && styles.pressed]}><Text style={styles.removeText}>Remove</Text></Pressable> : null}
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Monthly contribution</Text>
        <View style={styles.group}>
          {contributions.map((contribution, index) => (
            <View key={contribution.member.id}>
              {index ? <View style={styles.divider} /> : null}
              <View style={styles.contributionRow}>
                <View style={[styles.avatarSmall, { backgroundColor: contribution.member.color }]}><Text style={styles.avatarText}>{contribution.member.name.slice(0, 1).toUpperCase()}</Text></View>
                <View style={styles.flex}><Text style={styles.memberName}>{contribution.member.name}</Text><Text style={styles.memberMeta}>{contribution.sharedPlanCount} active plan{contribution.sharedPlanCount === 1 ? "" : "s"}</Text></View>
                <Text style={styles.contributionAmount}>{formatCurrencySpendGroups(contribution.monthlyByCurrency)}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Shared plans</Text>
        <Text style={styles.sectionHint}>Choose people for each plan from its full edit screen. Contributions are split equally across selected people.</Text>
        {!activeSubscriptions.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>No plans to share yet</Text><Text style={styles.emptyBody}>Add a subscription first, then assign household members while editing it.</Text><Pressable onPress={() => router.replace("/(tabs)/discover")}><Text style={styles.emptyLink}>Browse services</Text></Pressable></View> : activeSubscriptions.map((item) => {
          const participants = householdMembers.filter((member) => (item.sharedMemberIds ?? ["owner"]).includes(member.id));
          const isShared = participants.length > 1;
          const share = monthlyAmount(item.amount, item.cadence) / Math.max(participants.length, 1);
          const service = getService(item.serviceId);
          return <Pressable key={item.id} onPress={() => router.push(`/subscription/edit?subscriptionId=${item.id}&serviceId=${item.serviceId}` as never)} style={({ pressed }) => [styles.planCard, pressed && styles.pressed]}>
            <ServiceBadge serviceId={item.serviceId} size="small" />
            <View style={styles.flex}><Text style={styles.planName}>{service?.name ?? item.planName}</Text><Text style={styles.planMeta}>{isShared ? participants.map((member) => member.name).join(" • ") : "Just you"}</Text><Text style={styles.planShare}>{isShared ? `${formatCurrency(share, item.currency)} each / month` : "Tap to share this plan"}</Text></View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>;
        })}
        {sharedPlans.length ? <Text style={styles.footer}>You currently share {sharedPlans.length} plan{sharedPlans.length === 1 ? "" : "s"}. SubTrack divides each saved monthly estimate equally between selected local members.</Text> : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32, paddingTop: 8 }, nav: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, back: { color: "#3C4043", fontFamily: type.regular, fontSize: 34, lineHeight: 34 }, navTitle: { color: "#3C4043", fontFamily: type.semi, fontSize: 13 }, navSpacer: { width: 24 }, title: { color: "#202124", fontFamily: type.bold, fontSize: 26, letterSpacing: -0.8, marginTop: 18 }, subtitle: { color: "#5F6368", fontFamily: type.regular, fontSize: 12, lineHeight: 18, marginTop: 6 }, privacyCard: { alignItems: "flex-start", backgroundColor: "#E8F0FE", borderRadius: 16, flexDirection: "row", gap: 11, marginTop: 20, padding: 15 }, privacyIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, height: 26, justifyContent: "center", width: 26 }, privacyIconText: { color: "#1A73E8", fontFamily: type.bold, fontSize: 15 }, privacyTitle: { color: "#174EA6", fontFamily: type.semi, fontSize: 13 }, privacyBody: { color: "#3C4043", fontFamily: type.regular, fontSize: 11, lineHeight: 16, marginTop: 3 }, section: { color: "#202124", fontFamily: type.semi, fontSize: 16, marginBottom: 9, marginTop: 24 }, sectionHint: { color: "#5F6368", fontFamily: type.regular, fontSize: 11, lineHeight: 16, marginBottom: 10, marginTop: -4 }, memberAdd: { flexDirection: "row", gap: 8, marginBottom: 10 }, memberInput: { backgroundColor: "#FFFFFF", borderColor: "#DADCE0", borderRadius: 12, borderWidth: 1, color: "#202124", flex: 1, fontFamily: type.regular, fontSize: 12, height: 46, paddingHorizontal: 12 }, addButton: { alignItems: "center", backgroundColor: "#1A73E8", borderRadius: 12, justifyContent: "center", minWidth: 64, paddingHorizontal: 12 }, addButtonText: { color: "#FFFFFF", fontFamily: type.semi, fontSize: 12 }, group: { backgroundColor: "#FFFFFF", borderColor: "#DADCE0", borderRadius: 16, borderWidth: 1, overflow: "hidden" }, memberRow: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 70, padding: 14 }, contributionRow: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 65, padding: 14 }, avatar: { alignItems: "center", borderRadius: 16, height: 32, justifyContent: "center", width: 32 }, avatarSmall: { alignItems: "center", borderRadius: 13, height: 26, justifyContent: "center", width: 26 }, avatarText: { color: "#FFFFFF", fontFamily: type.bold, fontSize: 12 }, flex: { flex: 1 }, memberName: { color: "#202124", fontFamily: type.semi, fontSize: 13 }, memberMeta: { color: "#5F6368", fontFamily: type.regular, fontSize: 10, marginTop: 2 }, remove: { paddingHorizontal: 6, paddingVertical: 7 }, removeText: { color: "#C5221F", fontFamily: type.semi, fontSize: 11 }, contributionAmount: { color: "#202124", fontFamily: type.semi, fontSize: 13 }, divider: { backgroundColor: "#E8EAED", height: 1, marginLeft: 14 }, planCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DADCE0", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 11, marginBottom: 9, padding: 13 }, planName: { color: "#202124", fontFamily: type.semi, fontSize: 13 }, planMeta: { color: "#5F6368", fontFamily: type.regular, fontSize: 10, marginTop: 2 }, planShare: { color: "#1A73E8", fontFamily: type.semi, fontSize: 10, marginTop: 4 }, chevron: { color: "#9AA0A6", fontFamily: type.regular, fontSize: 24 }, empty: { backgroundColor: "#FFFFFF", borderColor: "#DADCE0", borderRadius: 16, borderWidth: 1, padding: 18 }, emptyTitle: { color: "#202124", fontFamily: type.semi, fontSize: 14 }, emptyBody: { color: "#5F6368", fontFamily: type.regular, fontSize: 11, lineHeight: 16, marginTop: 4 }, emptyLink: { color: "#1A73E8", fontFamily: type.semi, fontSize: 12, marginTop: 12 }, footer: { color: "#80868B", fontFamily: type.regular, fontSize: 10, lineHeight: 15, marginTop: 9, textAlign: "center" }, pressed: { opacity: 0.75 },
});
