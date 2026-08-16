require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { validateEvent, processEvent, replayUser } = require("./services/fraudService");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const client = new MongoClient(process.env.MONGO_URI || "mongodb://127.0.0.1:27017");
let db;

app.get("/health", (_req, res) => res.json({ ok: true, service: "fraud-detection-api" }));

app.post("/events", async (req, res) => {
  try {
    const event = validateEvent(req.body);
    const result = await processEvent(db, event);
    res.status(result.duplicate ? 200 : 201).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.get("/users/:userId/state", async (req, res) => {
  const state = await db.collection("user_states")
    .find({ user_id: req.params.userId })
    .sort({ version: -1 })
    .limit(1)
    .next();
  if (!state) return res.status(404).json({ error: "User state not found" });
  res.json(state);
});

app.get("/users/:userId/audit", async (req, res) => {
  const rows = await db.collection("audit_records")
    .find({ user_id: req.params.userId })
    .sort({ decision_timestamp: 1 })
    .toArray();
  res.json(rows);
});

app.post("/replay", async (req, res) => {
  try {
    if (!req.body.user_id) return res.status(400).json({ error: "user_id is required" });
    res.json(await replayUser(db, req.body.user_id));
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

async function start() {
  await client.connect();
  db = client.db(process.env.DB_NAME || "fraud_detection");
  await db.collection("events").createIndex({ event_id: 1 }, { unique: true });
  await db.collection("user_states").createIndex({ user_id: 1, version: -1 });
  await db.collection("audit_records").createIndex({ user_id: 1, decision_timestamp: 1 });
  app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
}

if (require.main === module) start().catch(err => { console.error(err); process.exit(1); });

module.exports = { app };
