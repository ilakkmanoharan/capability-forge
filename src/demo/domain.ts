// Synthetic fixture logic, shared by the UI and tests. Automation must use the UI.
const members: Record<string, Record<string, string>> = {
  "10001": { Savings: "2450.75", Checking: "800.00" },
  "10002": { Savings: "730.20", Checking: "125.50" },
};
type Outcome = { status: "business_outcome"; code: string };
export function lookupMember(memberId: unknown): Outcome | { status: "found"; memberId: string } {
  if (typeof memberId !== "string" || !/^[0-9]{5}$/.test(memberId))
    return { status: "business_outcome", code: "invalid_member_id" };
  if (!Object.hasOwn(members, memberId))
    return { status: "business_outcome", code: "member_not_found" };
  return { status: "found", memberId };
}
export function readAccount(memberId: unknown, accountType: unknown): Outcome | {
  status: "success"; outputs: { memberId: string; accountType: string; balance: string; currency: string };
} {
  const member = lookupMember(memberId);
  if (member.status !== "found") return member;
  if (typeof accountType !== "string" || !Object.hasOwn(members[member.memberId], accountType))
    return { status: "business_outcome", code: "invalid_account_type" };
  return { status: "success", outputs: { memberId: member.memberId, accountType,
    balance: members[member.memberId][accountType], currency: "USD" } };
}
