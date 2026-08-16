#!/bin/bash
set -e
API=${API_URL:-http://localhost:3000}
echo "1) Health"
curl -s "$API/health"; echo
echo "2) Send three transactions"
for id in demo-001 demo-002 demo-003; do
  python3 - "$id" <<'PY' | curl -s -X POST "$API/events" -H "Content-Type: application/json" -d @-
import json,sys
ids={"demo-001":("10:00:00",100),"demo-002":("10:30:00",200),"demo-003":("11:00:00",300)}
i=sys.argv[1]; t,a=ids[i]
print(json.dumps({"event_type":"transaction","user_id":"demo-user","timestamp":f"2026-08-16T{t}Z","amount":a,"category":"electronics","source":"merchant","event_id":i}))
PY
  echo
done
echo "3) State"
curl -s "$API/users/demo-user/state"; echo
echo "4) Replay"
curl -s -X POST "$API/replay" -H "Content-Type: application/json" -d '{"user_id":"demo-user"}'; echo
