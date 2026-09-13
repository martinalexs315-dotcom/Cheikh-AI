# TEST 1: Adam a-t-il été pardonné ? -> et ses descendants ?
echo "TEST 1.1: Adam a-t-il été pardonné ?"
curl -s -N -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Adam a-t-il été pardonné ?"}],"conversationId":"test-conv-adam","anonymousId":"test-anon"}'
echo -e "\n\nTEST 1.2: et ses descendants ?"
sleep 1
curl -s -N -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Adam a-t-il été pardonné ?"},{"role":"assistant","content":"Oui, Adam a été pardonné après avoir mangé de l arbre."},{"role":"user","content":"et ses descendants ?"}],"conversationId":"test-conv-adam","anonymousId":"test-anon"}'

