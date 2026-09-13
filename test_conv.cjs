async function testQuery(query, id, history) {
  const t0 = Date.now();
  console.log("\\n--- TEST: " + query + " ---");
  const messages = history ? history.concat([{role:'user', content: query}]) : [{role:'user', content: query}];
  const res = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, anonymousId: id })
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
  const h1 = [
     {role:'user', content:"Quelles sont les conditions de validité de la prière ?"},
     {role:'model', content:"Les conditions sont X, Y, Z."}
  ];
  await testQuery("Et selon l'école malikite ?", "test-conv-1", h1);
})();
