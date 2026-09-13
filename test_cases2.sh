echo "TEST 4: explique-moi ce verset (1 seul)"
curl -s -N -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Que dit le Coran sur le repentir dans la sourate Al-Baqarah ?"}],"conversationId":"test-conv-verse1","anonymousId":"test-anon-2"}'
echo -e "\n\n"
sleep 1
curl -s -N -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Que dit le Coran sur le repentir dans la sourate Al-Baqarah ?"},{"role":"assistant","content":"Le Coran aborde le repentir à de multiples endroits. Dans Al-Baqarah 2:37, il est dit qu Allah a pardonné à Adam après sa faute."},{"role":"user","content":"explique-moi ce verset"}],"conversationId":"test-conv-verse1","anonymousId":"test-anon-2"}'

