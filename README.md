# Real-Time E-Commerce Fraud Detection

A deterministic, stateful fraud detection engine for real-time e-commerce events.

## What this project solves

The system receives transaction, user-behavior, and simulated job-posting events; keeps versioned user state; detects fraud with local deterministic rules; resolves conflicting signals; records an audit trail; and replays historical events to reproduce decisions.

## Architecture

```text
Client / Demo
     |
     v
Node.js + Express API
     |
     +----> MongoDB
     |       - events
     |       - user_states
     |       - audit_records
     |
     v
Python Fraud Engine
     |
     +---- deterministic rules
     +---- state calculation
     +---- audit decision

React dashboard <---- REST API
```

## Required rules

- >= 3 transactions within 1 hour -> FRAUD
- transaction amount > 1000 -> FRAUD
- job text contains "urgent hiring" OR "work from home", and length > 200 -> FRAUD
- admin clear/low-risk override takes precedence over merchant risk
- duplicate `event_id` is idempotent
- events are replayed in timestamp + event_id order

## Repository structure

```text
RealTime-Fraud-Detection/
├── backend/
│   ├── python/fraud_engine.py
│   ├── src/server.js
│   ├── src/services/fraudService.js
│   ├── tests/fraud.test.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/main.jsx
│   ├── src/style.css
│   ├── index.html
│   └── package.json
├── fixtures/
│   ├── edge_cases.json
│   └── sample_events.json
├── scripts/
│   └── demo.sh
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── JUDGES_NOTE.md
├── pitch-deck.pptx
└── README.md
```

## Setup

### MongoDB

Start a local MongoDB server.

Default connection:
`mongodb://127.0.0.1:27017`

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm start
```

The API runs at `http://localhost:3000`.

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite will show the local dashboard URL.

### Tests

```bash
cd backend
npm test
```

The tests exercise the deterministic Python engine and the important edge cases.

## Demo

From the repository root:

```bash
chmod +x scripts/demo.sh
./scripts/demo.sh
```

Or manually:

```bash
curl http://localhost:3000/health

curl -X POST http://localhost:3000/events   -H "Content-Type: application/json"   -d @fixtures/sample_events.json
```

For the fixture file, send each JSON object separately if using curl. The included demo script does this automatically.

## API

- `GET /health`
- `POST /events`
- `GET /users/:userId/state`
- `GET /users/:userId/audit`
- `POST /replay`

See `docs/API.md`.

## Determinism and replay

The fraud engine is pure local Python logic. Events are sorted by:

1. ISO timestamp
2. `event_id` as deterministic tie-breaker

The same event set and rules therefore produce the same decision and audit trace.

## No external ML

No external ML model, fraud dataset, or external fraud API is required. All detection rules are local and deterministic, matching the challenge constraints.

## AI tools

AI assistance was used for implementation planning, code scaffolding, documentation refinement, and test-case brainstorming. The fraud rules, event model, replay behavior, and final project structure were implemented against the challenge requirements and can be inspected directly in this repository.
