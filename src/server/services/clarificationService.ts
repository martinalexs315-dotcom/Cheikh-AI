import { ChatMessage, ClarificationOption, ClarificationState } from '../../shared/types';
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.CHEIKH_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Clé API manquante");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export interface ClarificationAnalysisResult {
  needsClarification: boolean;
  question?: string;
  options?: ClarificationOption[];
  currentStep?: number;
  totalSteps?: number;
  originalQuestion?: string;
  clarificationSummary?: string;
  resolvedQuery?: string;
}

/**
 * Analyse l'historique de la conversation pour extraire les étapes de clarification passées
 */
export function extractClarificationState(messages: ChatMessage[]): {
  originalQuestion: string;
  collectedAnswers: { question: string; answer: string }[];
  clarificationCount: number;
} {
  const collectedAnswers: { question: string; answer: string }[] = [];
  let originalQuestion = "";
  let clarificationCount = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'user' && !originalQuestion) {
      originalQuestion = msg.content;
    }
    if (msg.role === 'model' && (msg.isClarification || (msg.clarificationOptions && msg.clarificationOptions.length > 0))) {
      clarificationCount++;
      const nextMsg = messages[i + 1];
      if (nextMsg && nextMsg.role === 'user') {
        collectedAnswers.push({
          question: msg.content,
          answer: nextMsg.content
        });
      }
    }
  }

  // Si aucune question originale trouvée, prendre le premier message utilisateur
  if (!originalQuestion) {
    const firstUser = messages.find(m => m.role === 'user');
    originalQuestion = firstUser?.content || "";
  }

  return { originalQuestion, collectedAnswers, clarificationCount };
}

/**
 * Vérifie si la question de l'utilisateur nécessite une clarification interactive
 * selon le principe jurisprudentiel :
 * "Est-ce qu'un juriste musulman peut donner une réponse sûre et applicable sans spéculer au hasard sur la situation réelle de la personne ?"
 */
export async function analyzeClarificationNeed(
  messages: ChatMessage[],
  convId: string
): Promise<ClarificationAnalysisResult> {
  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || "";
  const lower = lastUserMsg.toLowerCase().trim();
  const { originalQuestion, collectedAnswers, clarificationCount } = extractClarificationState(messages);

  // Si l'utilisateur clique sur "Passer" (X ou bouton Passer), on ignore la clarification et on force une réponse générale exhaustive.
  if (lower === "je passe") {
    const summary = collectedAnswers.map((a, idx) => `[Précision ${idx + 1}: ${a.question} -> ${a.answer}]`).join(' ; ');
    const context = summary ? `Précisions déjà données : ${summary}.` : "";
    return {
      needsClarification: false,
      originalQuestion,
      clarificationSummary: summary,
      resolvedQuery: `${originalQuestion}. ${context} L'utilisateur a passé la clarification. Fournir une réponse générale et exhaustive couvrant tous les cas de figure possibles selon la jurisprudence islamique (les différentes situations possibles).`
    };
  }

  // Seuil de sécurité : après 2 ou 3 étapes de clarification au maximum, arrêt et réponse complète définitive
  const MAX_CLARIFICATION_STEPS = 3;
  if (clarificationCount >= MAX_CLARIFICATION_STEPS) {
    const summary = collectedAnswers.map((a, idx) => `[Précision ${idx + 1}: ${a.question} -> ${a.answer}]`).join(' ; ');
    return {
      needsClarification: false,
      originalQuestion,
      clarificationSummary: summary,
      resolvedQuery: `${originalQuestion}. Synthèse des précisions : ${summary}. Répondre de manière exhaustive sur l'ensemble de ces points selon les 4 écoles.`
    };
  }

  // =========================================================================
  // ANALYSE DYNAMIQUE GÉNÉRALE (LLM AVEC LE RAISONNEMENT JURIDIQUE DU CHEIKH)
  // L'IA est désormais 100% autonome pour déterminer si elle doit poser une
  // question à choix multiples et générer les options adaptées.
  // =========================================================================
  
  // Si nous sommes déjà dans un processus de clarification en cours (l'utilisateur vient de répondre à une option),
  // nous devons vérifier si cette réponse suffit ou s'il faut creuser davantage.
  // S'il a répondu, on fournit le contexte accumulé au LLM.

  try {
    const client = getAIClient();
    const conversationSnippet = messages.slice(-20).map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
    const summaryOfPreviousAnswers = collectedAnswers.map(a => `Q: ${a.question} -> R: ${a.answer}`).join(' | ');

    const prompt = `Tu es le moteur de clarification jurisprudentielle (Usul al-Fiqh) de "Cheikh IA".
Ton rôle UNIQUE est de déterminer de façon 100% autonome si la situation de l'utilisateur est suffisamment claire pour qu'un juriste puisse émettre un avis (hukm) précis et sans supposition.

Historique récent :
${conversationSnippet}

Question initiale : "${originalQuestion || lastUserMsg}"
Précisions déjà apportées par l'utilisateur lors de cette session : ${summaryOfPreviousAnswers || "Aucune"}
Dernier message : "${lastUserMsg}"
Nombre de clarifications déjà posées : ${clarificationCount}

RÈGLES STRICTES DE JUGEMENT :
1. Si la situation est complète, OU s'il s'agit d'une question générale/théorique/historique (ex: "Quels sont les piliers de l'islam ?", "Histoire du prophète"), OU si les "Précisions déjà apportées" suffisent désormais pour donner une réponse exhaustive, retourne IMMÉDIATEMENT :
   { "needsClarification": false }

2. Si la question est incomplète ou ambiguë (ex: "Est-ce que ma prière est valide ?"), tu DOIS identifier CE QU'IL MANQUE (ex: Qu'a-t-il fait exactement pendant la prière ?).
Ne propose jamais une liste d'options génériques fixes (comme "voyage, maladie" si rien dans la question n'en parle). Tes options doivent être strictement CONTEXTUELLES à la question posée.
Génère UNE SEULE question de relance très pertinente, et 2 à 4 options contextuelles (A, B, C, D) de réponses probables couvrant les cas de figure jurisprudentiels liés à CE MANQUE précis.

Format JSON strict attendu :
{
  "needsClarification": boolean,
  "question": "Question courte ciblée sur l'élément manquant si needsClarification=true",
  "options": [
    { "letter": "A", "label": "Libellé court A", "value": "Explication complète A" },
    { "letter": "B", "label": "Libellé court B", "value": "Explication complète B" }
  ]
}`;

    const aiCall = (async () => {
      const resp = await client.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      });
      const txt = (resp.text || "{}").replace(/```json/gi, '').replace(/```/g, '').trim();
      const match = txt.match(/\{[\s\S]*\}/);
      return JSON.parse(match ? match[0] : txt);
    })();

    // Timeout de 5000ms pour garantir que l'IA a le temps de générer ses choix de façon autonome
    const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve(null), 5000));
    const result = await Promise.race([aiCall, timeoutPromise]);

    if (result && result.needsClarification && result.question && Array.isArray(result.options) && result.options.length > 0) {
      const letters = ['A', 'B', 'C', 'D'];
      const formattedOptions = result.options.slice(0, 4).map((opt: any, i: number) => {
        const letter = opt.letter || letters[i] || `${i + 1}`;
        const label = typeof opt === 'string' ? opt : (opt.label || opt.value || `Choix ${letter}`);
        const value = typeof opt === 'string' ? opt : (opt.value || opt.label || label);
        return {
          id: `opt-${clarificationCount + 1}-${letter}`,
          letter,
          label,
          value
        };
      });

      return {
        needsClarification: true,
        currentStep: clarificationCount + 1,
        totalSteps: Math.max(clarificationCount + 1, 2),
        originalQuestion: originalQuestion || lastUserMsg,
        question: result.question,
        options: formattedOptions
      };
    }
  } catch (e: any) {
    console.warn("[clarificationService] Analyse dynamique LLM ignorée / fallback:", e.message);
  }

  // Si on arrive ici (soit LLM a dit false, soit timeout, soit erreur) :
  // On vérifie s'il y a un contexte à compiler avant de sortir
  if (collectedAnswers.length >= 1) {
    const summary = `Question initiale : "${originalQuestion}". ` +
      collectedAnswers.map((a, i) => `Précision ${i + 1} (${a.question}) : "${a.answer}"`).join('. ') +
      `. Complément : "${lastUserMsg}".`;
    
    return {
      needsClarification: false,
      originalQuestion,
      clarificationSummary: summary,
      resolvedQuery: `${originalQuestion} [Contexte complet vérifié : ${summary}]. Fournir la réponse juridique exhaustive selon les 4 écoles (Hanafite, Malikite, Chaféite, Hanbalite) avec les dalils du Coran, de la Sunna et les avis pratiques.`
    };
  }

  // Par défaut, si contexte suffisant dès le début
  return {
    needsClarification: false,
    originalQuestion: originalQuestion || lastUserMsg,
    resolvedQuery: lastUserMsg
  };
}
