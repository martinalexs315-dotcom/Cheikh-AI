const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetStatus = "      res.write(`data: ${JSON.stringify({ type: 'status', status: 'intent', message: 'Analyse de la demande...' })}\\n\\n`);";
content = content.replace(targetStatus, "");

const oldLogic = `      if (intent.type === 'clarification') {
        // Increment usage for anonymous if they got a response
        if (!isConnected && anonymousId) {
          anonymousUsage.set(anonymousId, (anonymousUsage.get(anonymousId) || 0) + 1);
        }
        res.write(\`data: \${JSON.stringify({ type: 'clarification', clarification: intent })}\\n\\n\`);
        res.write('data: [DONE]\\n\\n');
        res.end();
        return;
      }

      // 5. Perform Search if needed
      let searchContext = "";
      let sourcesList: any[] = [];
      
      // If it's a religious query or needs search
      if (intent.type === 'search' || intent.isReligious) {
         res.write(\`data: \${JSON.stringify({ type: 'status', status: 'searching', message: 'Recherche des sources autorisées...' })}\\n\\n\`);
         const searchQuery = intent.searchQuery || validMessages[validMessages.length - 1].content;
         const t3 = Date.now();
         console.log(\`[PERF] T3 (Search started) = \${t3}\`);
         const sources = await performIslamicSearch(searchQuery);
         const t5 = Date.now();
         console.log(\`[PERF] T5 (Scraping done) = \${t5} (\${t5-t3}ms)\`);
         sourcesList = sources;
         
         if (sources.length > 0) {
           res.write(\`data: \${JSON.stringify({ type: 'status', status: 'analyzing', message: 'Analyse des sources...' })}\\n\\n\`);
           searchContext = "SOURCES AUTORISÉES TROUVÉES:\\n" + sources.map(s => \`[SOURCE_ID: \${s.id}]\\nDomaine: \${s.domain}\\nTitre: \${s.title}\\nContenu: \${s.content}\`).join("\\n\\n");
         } else {
           res.write(\`data: \${JSON.stringify({ type: 'status', status: 'analyzing', message: 'Aucune source trouvée...' })}\\n\\n\`);
           searchContext = "AUCUNE SOURCE AUTORISÉE N'A ÉTÉ TROUVÉE. Vous devez obligatoirement informer l'utilisateur qu'aucune source fiable n'est disponible et que vous ne pouvez pas répondre avec certitude.";
         }
      }`;

const newLogic = `      if (intent.type === 'CASUAL' || intent.type === 'NON_RELIGIOUS') {
        // Increment usage for anonymous if they got a response
        if (!isConnected && anonymousId) {
          anonymousUsage.set(anonymousId, (anonymousUsage.get(anonymousId) || 0) + 1);
        }
        res.write(\`data: \${JSON.stringify({ text: intent.directResponse || (intent.type === 'CASUAL' ? 'Bonjour !' : 'Je suis spécialisé en Islam.') })}\\n\\n\`);
        res.write('data: [DONE]\\n\\n');
        res.end();
        return;
      }

      if (intent.type === 'RELIGIOUS_CLARIFICATION') {
        // Increment usage for anonymous if they got a response
        if (!isConnected && anonymousId) {
          anonymousUsage.set(anonymousId, (anonymousUsage.get(anonymousId) || 0) + 1);
        }
        res.write(\`data: \${JSON.stringify({ type: 'clarification', clarification: intent })}\\n\\n\`);
        res.write('data: [DONE]\\n\\n');
        res.end();
        return;
      }

      // 5. Perform Search if needed
      let searchContext = "";
      let sourcesList: any[] = [];
      
      // If it's a religious query or needs search
      if (intent.type === 'RELIGIOUS_SEARCH') {
         res.write(\`data: \${JSON.stringify({ type: 'status', status: 'searching', message: 'Recherche des sources autorisées...' })}\\n\\n\`);
         const searchQuery = intent.searchQuery || validMessages[validMessages.length - 1].content;
         const t3 = Date.now();
         console.log(\`[PERF] T3 (Search started) = \${t3}\`);
         const sources = await performIslamicSearch(searchQuery);
         const t5 = Date.now();
         console.log(\`[PERF] T5 (Scraping done) = \${t5} (\${t5-t3}ms)\`);
         sourcesList = sources;
         
         if (sources.length > 0) {
           res.write(\`data: \${JSON.stringify({ type: 'status', status: 'analyzing', message: 'Analyse des sources...' })}\\n\\n\`);
           searchContext = "SOURCES AUTORISÉES TROUVÉES:\\n" + sources.map(s => \`[SOURCE_ID: \${s.id}]\\nDomaine: \${s.domain}\\nTitre: \${s.title}\\nContenu: \${s.content}\`).join("\\n\\n");
         } else {
           res.write(\`data: \${JSON.stringify({ type: 'status', status: 'analyzing', message: 'Aucune source trouvée...' })}\\n\\n\`);
           searchContext = "AUCUNE SOURCE AUTORISÉE N'A ÉTÉ TROUVÉE. Vous devez obligatoirement informer l'utilisateur qu'aucune source fiable n'est disponible et que vous ne pouvez pas répondre avec certitude.";
         }
      }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('server.ts', content);
