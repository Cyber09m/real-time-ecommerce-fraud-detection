# Note for Judges

## What did we build?

We built a real-time, stateful e-commerce fraud detection engine. It accepts normalized events through a Node.js API, stores events and versioned user state in MongoDB, evaluates deterministic fraud rules in Python, resolves admin/merchant conflicts, generates an audit record for every decision, and supports historical replay.

## How did we use AI tools?

AI assistance was used for implementation planning, scaffolding, documentation refinement, and brainstorming edge-case tests. The final fraud rules and system behavior are explicitly encoded in the repository, with no external ML model or fraud API used at runtime.

## What should judges test?

1. Send three transactions for one user within one hour.
2. Send a transaction above 1000.
3. Send a suspicious job posting over 200 characters.
4. Repeat an event with the same `event_id`.
5. Send events out of arrival order and call `/replay`.
6. Send a merchant risk event followed by an admin clear override.
7. Inspect `/users/:userId/audit` to see why each decision happened.
