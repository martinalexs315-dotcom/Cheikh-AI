const fs = require('fs');
let content = fs.readFileSync('src/server/services/ai.service.ts', 'utf8');

const targetPrompt = `  const prompt = \`Vous êtes un analyseur d'intention pour "Cheikh IA", un assistant spécialisé en Islam.
Analysez l'intention de la dernière requête de l'utilisateur en tenant compte de l'historique complet de la conversation.

RÈGLES IMPORTANTES:
1. Si la question est ambiguë et manque d'informations cruciales pour donner une réponse religieuse correcte (ex: "Puis-je raccourcir ma prière ?", "Je veux divorcer"), vous DEVEZ demander une clarification au lieu de chercher immédiatement. Posez une seule question précise à la fois.
2. Proposez toujours entre 2 et 5 options rapides pour faciliter la clarification, incluant toujours une option type "Autre" ou "Je ne sais pas".
3. Si la question est claire ou si l'utilisateur vient de répondre à une clarification (ex: "Je suis en voyage"), marquez-la comme "search" et générez une requête de recherche (\\\`searchQuery\\\`) enrichie avec le contexte de la conversation (ex: "Conditions pour raccourcir la prière en voyage").
4. Ne posez pas de questions en rafale. Une seule clarification à la fois.
5. Si la question n'est pas religieuse, type="answer".

HISTORIQUE DE CONVERSATION:
\${conversationHistory}

Dernier message utilisateur: "\${lastUserMessage}"

Répondez UNIQUEMENT en JSON valide suivant ce schéma:
{
  "type": "clarification" | "search" | "answer",
  "isReligious": boolean,
  "question": string (si type=clarification, la seule et unique question à poser),
  "options": string[] (si type=clarification, 2 à 5 options rapides max, ex: ["En voyage", "Résident", "Autre situation"]),
  "searchQuery": string (si type=search, la requête optimisée pour le moteur de recherche incluant le contexte)
}\`;`;

const newPrompt = `  const prompt = \`Vous êtes le routeur d'intention de "Cheikh IA", un assistant spécialisé en Islam.
Analysez l'intention de la dernière requête de l'utilisateur en tenant compte de l'historique complet de la conversation.

CATÉGORIES D'INTENTION :
1. "CASUAL" : Salutations pures (salam, bonjour), remerciements, accords (oui, non), discussions très basiques sans aucune notion religieuse ni demande de savoir.
   -> Fournissez une réponse naturelle et polie (ex: "Wa alaykoum assalam wa rahmatoullahi wa barakatouh ! Comment puis-je t'aider ?") dans le champ "directResponse".
2. "RELIGIOUS_SEARCH" : Question religieuse, juridique (fiqh), historique islamique, ou exégèse (tafsir), qui est suffisamment claire pour faire l'objet d'une recherche documentaire. (Même si la question commence par "Salam", si elle contient une question religieuse, c'est RELIGIOUS_SEARCH).
   -> Fournissez une requête de recherche optimisée dans "searchQuery", en incluant le contexte de la conversation (ex: si l'utilisateur dit "Et selon les malikites ?", la requête doit être "Conditions de la prière selon les malikites").
3. "RELIGIOUS_CLARIFICATION" : Question religieuse dont une information essentielle manque pour donner une réponse correcte (ex: "Puis-je raccourcir ma prière ?").
   -> Fournissez UNE SEULE "question" de clarification, et un tableau "options" de 2 à 5 choix. L'option "Autre" doit toujours être présente ou suggérée.
4. "NON_RELIGIOUS" : Question complexe ou demande de connaissances qui n'a ABSOLUMENT AUCUN rapport avec l'islam (ex: "Comment fonctionne un moteur ?", "Recette de crêpes").
   -> Fournissez une réponse polie dans "directResponse" indiquant que vous êtes "Cheikh IA", spécialisé en Islam, et que vous ne répondez pas à ces sujets.

HISTORIQUE DE CONVERSATION:
\${conversationHistory}

Dernier message utilisateur: "\${lastUserMessage}"

Répondez UNIQUEMENT en JSON valide suivant ce schéma strict:
{
  "type": "CASUAL" | "RELIGIOUS_SEARCH" | "RELIGIOUS_CLARIFICATION" | "NON_RELIGIOUS",
  "searchQuery": "Requête complète avec contexte pour le moteur de recherche (uniquement si type=RELIGIOUS_SEARCH)",
  "question": "Question de clarification (uniquement si type=RELIGIOUS_CLARIFICATION)",
  "options": ["Option 1", "Option 2"] (uniquement si type=RELIGIOUS_CLARIFICATION),
  "directResponse": "Texte de la réponse directe (uniquement si type=CASUAL ou NON_RELIGIOUS)"
}\`;`;

if (content.includes(targetPrompt)) {
    content = content.replace(targetPrompt, newPrompt);
} else {
    // try replacing with regex or indexOf
    const startIdx = content.indexOf('  const prompt = `Vous êtes un analyseur d\'intention');
    const endIdx = content.indexOf('}`;', startIdx) + 3;
    content = content.substring(0, startIdx) + newPrompt + content.substring(endIdx);
}

content = content.replace(`    return { type: 'search', isReligious: true, searchQuery: lastUserMessage };`, `    return { type: 'RELIGIOUS_SEARCH', searchQuery: lastUserMessage };`);

fs.writeFileSync('src/server/services/ai.service.ts', content);
