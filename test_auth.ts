import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";

async function runTests() {
  console.log("=== TEST A: Utilisateur non connecté ===");
  const anonId = uuidv4();
  
  const res1 = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Bonjour" }]
    }) // Missing anonId
  });
  console.log("Test missing anonId:", res1.status, await res1.text());

  const res2 = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Bonjour" }],
      anonymousId: anonId
    })
  });
  console.log("Test with anonId:", res2.status, res2.status === 200 ? "OK" : await res2.text());

}
runTests();
