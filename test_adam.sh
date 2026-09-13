echo "TEST A1: Où Adam est-il mentionné pour la première fois ?"
curl -s -N -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Où Adam est-il mentionné pour la première fois ?"}],"conversationId":"test-adam-1","anonymousId":"test-anon-adam"}'
echo -e "\n\nTEST A2: Quel fruit Adam a-t-il mangé ?"
sleep 1
curl -s -N -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Quel fruit Adam a-t-il mangé ?"}],"conversationId":"test-adam-2","anonymousId":"test-anon-adam"}'
echo -e "\n\nTEST A3: Adam était-il le premier prophète ?"
sleep 1
curl -s -N -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Adam était-il le premier prophète ?"}],"conversationId":"test-adam-3","anonymousId":"test-anon-adam"}'
echo -e "\n\nTEST A4: Quels étaient les noms des enfants d'Adam ?"
sleep 1
curl -s -N -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Quels étaient les noms des enfants d Adam ?"}],"conversationId":"test-adam-4","anonymousId":"test-anon-adam"}'
