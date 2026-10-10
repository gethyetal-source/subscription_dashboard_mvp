import { FINANCIAL_CLOUD_DISABLED } from "./account-utils";
import type { SubscriptionRecord } from "./subscription-types";

// Reject old/direct entry points before any network request or payload preparation.
export function householdError(_error: unknown) { return new Error(FINANCIAL_CLOUD_DISABLED); }
async function blocked(): Promise<never> { throw householdError(undefined); }
export interface SharedPlan { id: string; household_id: string; revision: number; updated_at: string; payload: SubscriptionRecord; }
export const listHouseholds = () => blocked();
export const getHousehold = (_id: string) => blocked();
export const createHousehold = (_name: string) => blocked();
export const inviteMember = (_household: string, _email: string, _role: "editor" | "viewer") => blocked();
export const acceptInvite = (_token: string) => blocked();
export const removeMember = (_household: string, _user: string) => blocked();
export const deleteHousehold = (_household: string) => blocked();
export const removeSharedPlan = (_household: string, _plan: string) => blocked();
export const saveSharedPlan = (_household: string, _record: SubscriptionRecord, _previous?: SharedPlan) => blocked();
