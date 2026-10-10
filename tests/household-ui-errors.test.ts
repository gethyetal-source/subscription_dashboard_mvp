import { describe, expect, it, vi } from "vitest";
import { FINANCIAL_CLOUD_DISABLED } from "../lib/account-utils";
import { acceptInvite, createHousehold, deleteHousehold, getHousehold, householdError, inviteMember, listHouseholds, removeMember, removeSharedPlan, saveSharedPlan } from "../lib/household-cloud";
import type { SubscriptionRecord } from "../lib/subscription-types";

const network = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("../lib/supabase", () => ({ supabase: network }));

describe("financial cloud transfers are disabled", () => {
  it("uses a clear local-only explanation instead of obsolete server errors", () => {
    expect(householdError({ message: "private backend information" }).message).toBe(FINANCIAL_CLOUD_DISABLED);
  });
  it("blocks every old household entry point before any network request", async () => {
    const operations = [
      () => listHouseholds(), () => getHousehold("test"), () => createHousehold("Test"),
      () => inviteMember("test", "test@example.test", "viewer"), () => acceptInvite("test"),
      () => removeMember("test", "test"), () => deleteHousehold("test"),
      () => removeSharedPlan("test", "test"), () => saveSharedPlan("test", {} as SubscriptionRecord),
    ];
    for (const operation of operations) await expect(operation()).rejects.toThrow(FINANCIAL_CLOUD_DISABLED);
    expect(network.rpc).not.toHaveBeenCalled();
    expect(network.from).not.toHaveBeenCalled();
  });
});
