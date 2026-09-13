echo "Turn 1"
curl -s -N -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Cite-moi deux versets sur le repentir d Adam, juste la référence sans le texte."}],"conversationId":"test-conv-real2","anonymousId":"test-anon-4"}'
echo -e "\n\nTurn 2"
sleep 1
curl -s -N -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Cite-moi deux versets sur le repentir d Adam, juste la référence sans le texte."},{"role":"assistant","content":"Al-Baqarah 2:37 et Taha 20:121"},{"role":"user","content":"explique-moi ce verset"}],"conversationId":"test-conv-real2","anonymousId":"test-anon-4"}'
