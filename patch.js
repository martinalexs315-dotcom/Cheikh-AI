const fs = require('fs');
let content = fs.readFileSync('src/components/ChatInterface.tsx', 'utf8');

const target = `              if (data.type === 'clarification' || data.type === 'sources') {
                 setIsThinking(false);
              }
              
              if (data.text || data.error) {
                 setIsThinking(false);
              }
              
              if (data.error) modelMessageContent += data.error;
              else if (data.text) modelMessageContent += data.text;`;

const replacement = `              if (data.type === 'status') {
                 setThinkingMessage(data.message || 'Réflexion...');
              }

              if (data.type === 'clarification') {
                 setIsThinking(false);
              }
                 
              if (data.error || (data.text && modelMessageContent.length + data.text.length > 0)) {
                 setIsThinking(false);
              }
                 
              if (data.error) modelMessageContent += data.error;
              else if (data.text) modelMessageContent += data.text;`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/ChatInterface.tsx', content);
