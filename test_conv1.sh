#!/bin/bash
run_test() {
  local num=$1
  local question=$2
  echo "--- TEST $num ---"
  echo "Q: $question"
  curl -s -N -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"$question\"}],\"conversationId\":\"test-conv-$num\",\"anonymousId\":\"test-anon-conv-$num\"}"
  echo -e "\n\n"
  sleep 1
}

run_test "C1" "Tu as vu le match d'hier ?"
run_test "C2" "Je suis complètement accro au football."
run_test "C3" "Je regarde les matchs même quand c'est l'heure de la prière."
run_test "C4" "Je développe une application React."
run_test "C5" "Est-ce que développer une application est halal ?"
run_test "C6" "J'ai raté mon examen."
run_test "C7" "Pourquoi les avions ont-ils des winglets ?"
run_test "C8" "Est-ce que je peux prier dans un avion ?"
run_test "C9" "Mon ami m'a trahi."
