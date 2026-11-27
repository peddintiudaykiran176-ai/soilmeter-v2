import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fromLocalDateTime, toLocalDateTime } from "./dashboard-time";

describe("dashboard timezone conversion", () => {
  it("converts local times to UTC without changing the displayed wall time", () => {
    const utc = fromLocalDateTime("2026-11-27T12:30", "Asia/Kolkata");
    assert.equal(utc, "2026-11-27T07:00:00.000Z");
    assert.ok(utc);
    assert.equal(
      toLocalDateTime(new Date(utc), "Asia/Kolkata"),
      "2026-11-27T12:30",
    );
  });

  it("rejects nonexistent daylight-saving local times", () => {
    assert.equal(fromLocalDateTime("2026-03-29T01:30", "Europe/London"), null);
  });

  it("keeps UTC date-time values unchanged", () => {
    assert.equal(
      fromLocalDateTime("2026-01-02T03:04", "UTC"),
      "2026-01-02T03:04:00.000Z",
    );
  });
});
