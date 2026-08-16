# API Documentation

## GET /health

Returns service status.

## POST /events

Example:

```json
{
  "event_type": "transaction",
  "user_id": "u1",
  "timestamp": "2026-08-16T10:40:00Z",
  "amount": 500,
  "category": "electronics",
  "source": "merchant",
  "event_id": "evt-003"
}
```

Required:
- event_type
- user_id
- timestamp
- source
- event_id

Transaction events also require numeric `amount`.

## GET /users/:userId/state

Returns the latest persisted state.

## GET /users/:userId/audit

Returns audit decisions for the user.

## POST /replay

```json
{"user_id":"u1"}
```

Reprocesses the user's stored events in deterministic order and returns the reconstructed state and audit result.
