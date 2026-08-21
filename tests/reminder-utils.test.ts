import { describe, expect, it } from "vitest";

import { getReminderPermissionGuidance } from "../lib/reminder-utils";

describe("reminder permission guidance", () => {
  it("explains every device permission state without claiming delivery", () => {
    expect(getReminderPermissionGuidance("granted")).toContain("can schedule");
    expect(getReminderPermissionGuidance("undetermined")).toContain("Allow");
    expect(getReminderPermissionGuidance("denied")).toContain("device settings");
    expect(getReminderPermissionGuidance("unsupported")).toContain("web preview");
  });
});
