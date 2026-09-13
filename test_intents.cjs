async function testQuery(query, id) {
  const t0 = Date.now();
  console.log("\\n--- TEST: " + query + " ---");
  const res = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{role:'user', content: query}], anonymousId: id })
  });
  
  const reader = res.body.getReader();
  while(true) {
    const {done, value} = await reader.read();
    if (done) break;
    process.stdout.write(new TextDecoder().decode(value));
  }
  console.log("\\nTime: " + (Date.now() - t0) + "ms");
}

(async () => {
  await testQuery("salam", "test-1");
  await testQuery("Salam, comment vas-tu ?", "test-2");
  await testQuery("Quelles sont les conditions de validité de la prière ?", "test-3");
  await testQuery("Puis-je raccourcir ma prière ?", "test-4");
  await testQuery("Merci beaucoup", "test-7");
  await testQuery("Comment fonctionne un moteur à réaction ?", "test-9");
  await testQuery("Salam, j'ai une question : est-ce que le jeûne est annulé si je vomis ?", "test-12");
})();
