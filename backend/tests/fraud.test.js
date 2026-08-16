const { validateEvent, runPython } = require("../src/services/fraudService");

const base = (id, time, extra={}) => ({
  event_type:"transaction", user_id:"u", timestamp:time, amount:100,
  category:"electronics", text_content:"", source:"merchant", event_id:id, ...extra
});

describe("Fraud engine", () => {
  test("3 transactions in one hour -> FRAUD", async () => {
    const r = await runPython([
      base("a","2026-08-16T10:00:00Z"),
      base("b","2026-08-16T10:30:00Z"),
      base("c","2026-08-16T11:00:00Z")
    ]);
    expect(r.audit.decision).toBe("FRAUD");
  });

  test("amount > 1000 -> FRAUD", async () => {
    const r = await runPython([base("a","2026-08-16T10:00:00Z",{amount:1001})]);
    expect(r.audit.decision).toBe("FRAUD");
  });

  test("admin clear overrides merchant risk", async () => {
    const r = await runPython([
      base("m","2026-08-16T10:00:00Z",{amount:1500}),
      base("a","2026-08-16T10:01:00Z",{event_type:"user_behavior",amount:0,source:"admin",category:"clear"})
    ]);
    expect(r.audit.decision).toBe("LOW_RISK");
    expect(r.audit.decision_reason).toBe("admin override");
  });

  test("late arrival is replayed by timestamp", async () => {
    const r = await runPython([
      base("late","2026-08-16T10:30:00Z"),
      base("early","2026-08-16T10:00:00Z"),
      base("middle","2026-08-16T10:20:00Z")
    ]);
    expect(r.audit.input_event_ids).toEqual(["early","middle","late"]);
  });

  test("validation rejects missing fields", () => {
    expect(() => validateEvent({event_type:"transaction"})).toThrow();
  });

  test("suspicious job text -> FRAUD", async () => {
    const r = await runPython([{
      event_type:"job_posting", user_id:"u", timestamp:"2026-08-16T10:00:00Z",
      amount:0, category:"job", text_content:"urgent hiring " + "x".repeat(220),
      source:"third_party", event_id:"job1"
    }]);
    expect(r.audit.decision).toBe("FRAUD");
  });
});
