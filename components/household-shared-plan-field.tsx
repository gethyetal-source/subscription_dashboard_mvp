import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { HouseholdMember } from "@/lib/subscription-types";
import { getHouseholdAllocation } from "@/lib/subscription-utils";
import { useThemedStyles } from "@/lib/ui-theme";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };
const baseStyles = () => styles;

export function SharedPlanField({
  members,
  selectedMemberIds,
  sharedMemberShares,
  onChange,
  onSharesChange,
  onManageHousehold,
}: {
  members: HouseholdMember[];
  selectedMemberIds: string[];
  sharedMemberShares?: Record<string, number>;
  onChange: (memberIds: string[]) => void;
  onSharesChange: (shares: Record<string, number>) => void;
  onManageHousehold: () => void;
}) {
  const styles = useThemedStyles(baseStyles());
  const participantIds = Array.from(new Set(["owner", ...selectedMemberIds])).filter((id) => members.some((member) => member.id === id));
  const fallbackShares = getHouseholdAllocation(participantIds, sharedMemberShares);
  const shareFor = (memberId: string) => sharedMemberShares?.[memberId] ?? fallbackShares[memberId] ?? 0;
  const totalPercentage = Number(participantIds.reduce((sum, memberId) => sum + shareFor(memberId), 0).toFixed(2));
  const allocationIsValid = Math.abs(totalPercentage - 100) < 0.01;

  const toggleMember = (member: HouseholdMember) => {
    if (member.isOwner) {
      onChange(Array.from(new Set(["owner", ...selectedMemberIds])));
      return;
    }
    onChange(selectedMemberIds.includes(member.id) ? selectedMemberIds.filter((id) => id !== member.id) : [...selectedMemberIds, member.id]);
  };
  const updateShare = (memberId: string, value: string) => {
    const amount = Number.parseFloat(value.replace(",", "."));
    onSharesChange({ ...(sharedMemberShares ?? fallbackShares), [memberId]: Number.isFinite(amount) ? Math.max(0, amount) : 0 });
  };

  return (
    <View>
      <Text style={styles.section}>Shared plan</Text>
      <Text style={styles.helper}>Select people who share this subscription. Add a local percentage split when the cost is not shared equally.</Text>
      <View style={styles.card}>
        {members.map((member) => {
          const selected = selectedMemberIds.includes(member.id);
          return <Pressable key={member.id} onPress={() => toggleMember(member)} style={({ pressed }) => [styles.member, selected && styles.memberSelected, pressed && styles.pressed]}>
            <View style={[styles.avatar, { backgroundColor: member.color }]}><Text style={styles.avatarText}>{member.name.slice(0, 1).toUpperCase()}</Text></View>
            <Text style={[styles.memberName, selected && styles.memberNameSelected]}>{member.name}{member.isOwner ? " (you)" : ""}</Text>
            <View style={[styles.check, selected && styles.checkSelected]}>{selected ? <Text style={styles.checkText}>✓</Text> : null}</View>
          </Pressable>;
        })}
      </View>
      {participantIds.length > 1 ? <View style={styles.allocationCard}>
        <View style={styles.allocationTitleRow}><View style={styles.allocationIntro}><Text style={styles.allocationTitle}>Cost allocation</Text><Text style={styles.allocationHelper}>Set each participant’s share. Total must equal 100%.</Text></View><Pressable onPress={() => onSharesChange(getHouseholdAllocation(participantIds))} style={({ pressed }) => [styles.equalButton, pressed && styles.pressed]}><Text style={styles.equalButtonText}>Equal split</Text></Pressable></View>
        {participantIds.map((memberId) => { const member = members.find((item) => item.id === memberId); if (!member) return null; return <View key={member.id} style={styles.allocationRow}><Text style={styles.allocationName}>{member.name}{member.isOwner ? " (you)" : ""}</Text><View style={styles.percentInputWrap}><TextInput value={String(shareFor(member.id))} onChangeText={(value) => updateShare(member.id, value)} keyboardType="decimal-pad" maxLength={6} accessibilityLabel={`${member.name} percentage share`} style={styles.percentInput} /><Text style={styles.percentSign}>%</Text></View></View>; })}
        <Text style={[styles.totalText, !allocationIsValid && styles.totalTextError]}>Total: {totalPercentage.toFixed(2)}%{allocationIsValid ? " · ready" : " · adjust to 100%"}</Text>
      </View> : null}
      {members.length === 1 ? <Pressable onPress={onManageHousehold}><Text style={styles.link}>Add household members</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { color: "#202124", fontFamily: type.semi, fontSize: 15, marginTop: 10 },
  helper: { color: "#5F6368", fontFamily: type.regular, fontSize: 10, lineHeight: 15, marginTop: 4 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#DADCE0", borderRadius: 14, borderWidth: 1, gap: 6, marginTop: 9, padding: 8 },
  member: { alignItems: "center", borderRadius: 10, flexDirection: "row", gap: 9, minHeight: 42, paddingHorizontal: 8 },
  memberSelected: { backgroundColor: "#E8F0FE" },
  avatar: { alignItems: "center", borderRadius: 11, height: 22, justifyContent: "center", width: 22 },
  avatarText: { color: "white", fontFamily: type.bold, fontSize: 10 },
  memberName: { color: "#3C4043", flex: 1, fontFamily: type.semi, fontSize: 11 },
  memberNameSelected: { color: "#1967D2" },
  check: { alignItems: "center", borderColor: "#9AA0A6", borderRadius: 9, borderWidth: 1.5, height: 18, justifyContent: "center", width: 18 },
  checkSelected: { backgroundColor: "#1A73E8", borderColor: "#1A73E8" },
  checkText: { color: "#FFFFFF", fontFamily: type.bold, fontSize: 10 },
  allocationCard: { backgroundColor: "#F8FBFF", borderColor: "#D2E3FC", borderRadius: 14, borderWidth: 1, gap: 8, marginTop: 9, padding: 11 },
  allocationTitleRow: { alignItems: "flex-start", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  allocationIntro: { flex: 1 },
  allocationTitle: { color: "#174EA6", fontFamily: type.semi, fontSize: 12 },
  allocationHelper: { color: "#5F6368", fontFamily: type.regular, fontSize: 9, lineHeight: 13, marginTop: 2 },
  equalButton: { backgroundColor: "#FFFFFF", borderColor: "#AECBFA", borderRadius: 12, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 6 },
  equalButtonText: { color: "#1967D2", fontFamily: type.semi, fontSize: 9 },
  allocationRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  allocationName: { color: "#3C4043", flex: 1, fontFamily: type.semi, fontSize: 11 },
  percentInputWrap: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DADCE0", borderRadius: 10, borderWidth: 1, flexDirection: "row", height: 34, paddingHorizontal: 8, width: 82 },
  percentInput: { color: "#202124", flex: 1, fontFamily: type.semi, fontSize: 11, padding: 0, textAlign: "right" },
  percentSign: { color: "#5F6368", fontFamily: type.semi, fontSize: 11, marginLeft: 3 },
  totalText: { color: "#188038", fontFamily: type.semi, fontSize: 10, marginTop: 1 },
  totalTextError: { color: "#C5221F" },
  link: { color: "#1A73E8", fontFamily: type.semi, fontSize: 11, marginTop: 9 },
  pressed: { opacity: 0.75 },
});
