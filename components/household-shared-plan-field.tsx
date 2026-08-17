import { Pressable, StyleSheet, Text, View } from "react-native";

import type { HouseholdMember } from "@/lib/subscription-types";

const type = { regular: "Poppins-Regular", semi: "Poppins-SemiBold", bold: "Poppins-Bold" };

export function SharedPlanField({
  members,
  selectedMemberIds,
  onChange,
  onManageHousehold,
}: {
  members: HouseholdMember[];
  selectedMemberIds: string[];
  onChange: (memberIds: string[]) => void;
  onManageHousehold: () => void;
}) {
  const toggleMember = (member: HouseholdMember) => {
    if (member.isOwner) {
      onChange(Array.from(new Set(["owner", ...selectedMemberIds])));
      return;
    }
    onChange(selectedMemberIds.includes(member.id) ? selectedMemberIds.filter((id) => id !== member.id) : [...selectedMemberIds, member.id]);
  };

  return (
    <View>
      <Text style={styles.section}>Shared plan</Text>
      <Text style={styles.helper}>Select people who share this subscription. SubTrack divides the saved monthly estimate equally in the local Household view.</Text>
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
  avatarText: { color: "#FFFFFF", fontFamily: type.bold, fontSize: 10 },
  memberName: { color: "#3C4043", flex: 1, fontFamily: type.semi, fontSize: 11 },
  memberNameSelected: { color: "#1967D2" },
  check: { borderColor: "#9AA0A6", borderRadius: 9, borderWidth: 1.5, height: 18, width: 18, alignItems: "center", justifyContent: "center" },
  checkSelected: { backgroundColor: "#1A73E8", borderColor: "#1A73E8" },
  checkText: { color: "#FFFFFF", fontFamily: type.bold, fontSize: 10 },
  link: { color: "#1A73E8", fontFamily: type.semi, fontSize: 11, marginTop: 9 },
  pressed: { opacity: 0.75 },
});
