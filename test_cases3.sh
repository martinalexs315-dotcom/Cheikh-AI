echo "TEST 5: explique-moi ce verset (2 versets)"
curl -s -N -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Que dit le Coran sur le repentir dans la sourate Al-Baqarah ?"},{"role":"assistant","content":"Le Coran aborde le repentir à de multiples endroits. Dans Al-Baqarah 2:37, il est dit qu Allah a pardonné à Adam après sa faute. On trouve aussi Taha 20:121."},{"role":"user","content":"explique-moi ce verset"}],"conversationId":"test-conv-verse2","anonymousId":"test-anon-3"}'
echo -e "\n\n"
sleep 1
echo "TEST 7: changement explicite de sujet"
curl -s -N -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Adam a-t-il été pardonné ?"},{"role":"assistant","content":"Oui, Adam a été pardonné après avoir mangé de l arbre."},{"role":"user","content":"quelles sont les conditions de validité de la prière ?"}],"conversationId":"test-conv-change","anonymousId":"test-anon-3"}'

