import json
import sys
from datetime import datetime, timedelta, timezone

def ts(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)

def evaluate(events):
    events = sorted(events, key=lambda e: (ts(e["timestamp"]), e["event_id"]))
    transactions = [e for e in events if e["event_type"] == "transaction"]
    reasons = []

    if any(e.get("amount", 0) > 1000 for e in transactions):
        reasons.append("transaction amount > 1000")

    for current in transactions:
        end = ts(current["timestamp"])
        start = end - timedelta(hours=1)
        count = sum(start <= ts(e["timestamp"]) <= end for e in transactions)
        if count >= 3:
            reasons.append("3 or more transactions within 1 hour")
            break

    for e in events:
        if e["event_type"] != "job_posting":
            continue
        text = e.get("text_content", "").lower()
        if len(text) > 200 and ("urgent hiring" in text or "work from home" in text):
            reasons.append("suspicious job posting text")
            break

    admin = [e for e in events if e.get("source") == "admin"]
    latest_admin = admin[-1] if admin else None

    if latest_admin and latest_admin.get("category", "").lower() in {"clear", "approve", "low_risk"}:
        decision = "LOW_RISK"
        reason = "admin override"
    elif reasons:
        decision = "FRAUD"
        reason = reasons[0]
    else:
        decision = "LOW_RISK"
        reason = "no fraud rule triggered"

    state = {
        "transaction_count": len(transactions),
        "transactions": [
            {"event_id":e["event_id"], "timestamp":e["timestamp"], "amount":e.get("amount",0)}
            for e in transactions
        ],
        "fraud_risk_score": min(100, len(reasons) * 40),
        "risk_level": decision
    }

    audit = {
        "decision": decision,
        "decision_reason": reason,
        "input_event_ids": [e["event_id"] for e in events],
        "state_at_decision": state,
        "decision_timestamp": events[-1]["timestamp"]
    }
    return {"state":state, "audit":audit}

def main():
    payload = json.load(sys.stdin)
    # support two input shapes: a list of events, or an object with an "events" key
    if isinstance(payload, list):
        events = payload
    else:
        events = payload.get("events", [])
    print(json.dumps(evaluate(events), separators=(",", ":")))

if __name__ == "__main__":
    main()
