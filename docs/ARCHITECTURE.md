# Architecture

## 1. Ingestion

Express receives JSON at `POST /events` and validates the event schema.

## 2. Persistence

MongoDB stores:
- `events`: immutable normalized input events
- `user_states`: versioned user state snapshots
- `audit_records`: decision explanations

A unique index on `event_id` supports idempotency.

## 3. Fraud engine

Node.js passes the user's event history to `python/fraud_engine.py`.

The Python engine:
- sorts events deterministically
- calculates transaction-window risk
- checks transaction amount
- checks job-posting text
- applies admin override priority
- returns state + audit information

## 4. Replay

Replay reads stored events, sorts them exactly as the engine does, and executes the same Python logic. No external model state is required.

## 5. UI

The React dashboard displays the latest risk level, score, transaction count, and audit trail.
