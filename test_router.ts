import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const client = new GoogleGenAI({ apiKey: process.env.CHEIKH_API_KEY });

const msgs = [
  {role: 'user', content: 'salam'},
  {role: 'model', content: 'Wa alaykoum assalam...'},
  {role: 'user', content: "j'ai un probleme avec mon frere"}
];

const conversationHistory = msgs.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
const lastUserMessage = "j'ai un probleme avec mon frere";

const prompt = `Vous êtes le routeur d'intention de "Cheikh IA", un assistant spécialisé en Islam.
Analysez l'intention de la dernière requête de l'utilisateur en tenant compte de l'historique complet de la conversation.

CATÉGORIES D'INTENTION :
1. "CONVERSATIONAL" : Salutations pures, remerciements, OUVERTURES DE DIALOGUE (ex: "J'ai un problème avec mon frère", "Je veux te parler", "Il m'est arrivé quelque chose"). L'utilisateur cherche de l'écoute, pose le contexte ou discute de manière informelle sans poser de question religieuse précise.
   -> Fournissez une réponse naturelle, empathique et polie (ex: "Wa alaykoum assalam ! Comment puis-je t'aider ?" ou "Bien sûr, raconte-moi ce qui se passe, je t'écoute.") dans le champ "directResponse".
2. "RELIGIOUS_SEARCH" : Question religieuse, juridique (fiqh), historique islamique...
3. "RELIGIOUS_CLARIFICATION" : Question religieuse dont une information essentielle manque...
4. "NON_RELIGIOUS" : Question complexe ou demande de connaissances qui n'a ABSOLUMENT AUCUN rapport avec l'islam...

HISTORIQUE DE CONVERSATION:
${conversationHistory}

Dernier message utilisateur: "${lastUserMessage}"

Répondez UNIQUEMENT en JSON valide suivant ce schéma strict:
{
  "type": "CONVERSATIONAL" | "RELIGIOUS_SEARCH" | "RELIGIOUS_CLARIFICATION" | "NON_RELIGIOUS",
  "searchQuery": "...",
  "question": "...",
  "options": [],
  "directResponse": "Texte de la réponse directe (uniquement si type=CONVERSATIONAL ou NON_RELIGIOUS)"
}`;

(async () => {
  const response = await client.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.1, responseMimeType: "application/json" }
  });
  console.log(response.text);
})();
