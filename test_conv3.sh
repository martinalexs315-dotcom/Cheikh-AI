#!/bin/bash
run_test() {
  local num=$1
  local question=$2
  echo "--- TEST $num ---"
  echo "Q: $question"
  curl -s -N -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"$question\"}],\"conversationId\":\"test-conv3-$num\",\"anonymousId\":\"test-anon-conv3-$num\"}"
  echo -e "\n\n"
  sleep 1
}

run_test "C1" "Tu as vu le match d'hier ?"
run_test "C4" "Je développe une application React."
run_test "C6" "J'ai raté mon examen."
