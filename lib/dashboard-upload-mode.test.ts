import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getUploadMode } from "../components/dashboard/dashboard-utils";

describe("dashboard telemetry upload mode", () => {
  it("recognizes manual button uploads regardless of case or surrounding whitespace", () => {
    assert.equal(getUploadMode(" Manual button upload "), "manual");
  });

  it("recognizes scheduled automatic uploads", () => {
    assert.equal(
      getUploadMode("Automatic scheduled upload every 5 minute(s)"),
      "automatic",
    );
  });

  it("keeps unrecognized messages distinct from known upload modes", () => {
    assert.equal(getUploadMode("Sensor restarted"), "other");
  });
});
