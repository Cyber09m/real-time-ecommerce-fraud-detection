const { spawn } = require("child_process");
const path = require("path");

function bad(message) {
  const e = new Error(message);
  e.statusCode = 400;
  return e;
}

function validateEvent(e) {
  if (!e || typeof e !== "object") throw bad("JSON object required");
  for (const key of ["event_type", "user_id", "timestamp", "source", "event_id"]) {
    if (e[key] === undefined || e[key] === null || e[key] === "") {
      throw bad(`Missing required field: ${key}`);
    }
  }
  if (!["transaction", "job_posting", "user_behavior"].includes(e.event_type)) {
    throw bad("Invalid event_type");
  }
  if (Number.isNaN(Date.parse(e.timestamp))) throw bad("Invalid timestamp");
  if (e.event_type === "transaction" &&
      (typeof e.amount !== "number" || !Number.isFinite(e.amount))) {
    throw bad("Transaction amount must be a number");
  }
  return {
    event_type: String(e.event_type),
    user_id: String(e.user_id),
    timestamp: new Date(e.timestamp).toISOString(),
    amount: Number(e.amount || 0),
    category: String(e.category || ""),
    text_content: String(e.text_content || ""),
    source: String(e.source),
    event_id: String(e.event_id)
  };
}

function runPython(events) {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, "..", "..", "python", "fraud_engine.py");
    const proc = spawn(process.env.PYTHON_BIN || "python3", [script]);
    let out = "", err = "";
    proc.stdout.on("data", d => out += d);
    proc.stderr.on("data", d => err += d);
    proc.on("error", reject);
    proc.on("close", code => {
      if (code !== 0) return reject(new Error(err || "Python engine failed"));
      try { resolve(JSON.parse(out)); }
      catch { reject(new Error("Python engine returned invalid JSON")); }
    });
    proc.stdin.end(JSON.stringify({ events }));
  });
}

async function processEvent(db, event) {
  const existing = await db.collection("events").findOne({ event_id: event.event_id });
  if (existing) return { duplicate: true, event_id: event.event_id, message: "Event already processed" };

  await db.collection("events").insertOne({ ...event, received_at: new Date() });

  const history = await db.collection("events")
    .find({ user_id: event.user_id })
    .toArray();

  const result = await runPython(history.map(e => ({
    event_type:e.event_type, user_id:e.user_id, timestamp:e.timestamp,
    amount:e.amount, category:e.category, text_content:e.text_content,
    source:e.source, event_id:e.event_id
  })));

  const latest = await db.collection("user_states").find({ user_id:event.user_id })
    .sort({ version:-1 }).limit(1).next();
  const version = (latest?.version || 0) + 1;

  await db.collection("user_states").insertOne({
    ...result.state, user_id:event.user_id, version, updated_at:new Date()
  });

  await db.collection("audit_records").insertOne({
    user_id:event.user_id, ...result.audit, state_version:version
  });

  return {
    duplicate:false,
    decision:result.audit.decision,
    reason:result.audit.decision_reason,
    state:result.state,
    audit:result.audit
  };
}

async function replayUser(db, userId) {
  const events = await db.collection("events").find({ user_id:userId }).toArray();
  if (!events.length) {
    const e = new Error("No events found for user");
    e.statusCode = 404;
    throw e;
  }
  const result = await runPython(events);
  return { user_id:userId, replayed_events:events.length, state:result.state, audit:result.audit };
}

module.exports = { validateEvent, processEvent, replayUser, runPython };
