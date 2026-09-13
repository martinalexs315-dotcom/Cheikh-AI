import { getSimpleContext, updateSimpleContext } from './simpleContext';
import { resolveContext, extractActiveEntityFromUser } from './deterministicResolver';
import { GoogleGenAI } from "@google/genai";
import { systemPrompt } from "../instructions/systemPrompt";
import { ChatMessage } from "../../shared/types";
import { analyzeQueryRisk } from "./analyzer.service";
import { getModelCascadeForQuery, calculateEstimatedCost, updateBudget, markModelUnavailable } from "./router.service";
import { APP_CONFIG } from "../config/ai.config";
import { FEATURE_FLAGS } from "../config/features.config";
import {
  getOrCreateConversationContext,
  updateConversationContext,
  analyzeConversationMemory,
  syncConversationReferences,
  captureAndIndexReferences,
  logConversationContext,
  ConversationMode
} from "./conversationMemoryService";

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.CHEIKH_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("La clé API CHEIKH_API_KEY ou GEMINI_API_KEY n'est pas configurée côté serveur.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

function isRetryableError(error: any): boolean {
  const status = error?.status;
  const message = error?.message?.toLowerCase() || '';
  if (status === 429 || status === 503) return true;
  if (
    message.includes('quota') || 
    message.includes('rate limit') || 
    message.includes('exhausted') || 
    message.includes('overloaded') ||
    message.includes('unavailable')
  ) {
    return true;
  }
  return false;
}

export interface IntentEvaluationResult {
  mode: ConversationMode;
  mainTopic: string;
  subtopic: string;
  currentEntity: string;
  referenceResolution: string;
  resolvedContext: string;
  resolvedQuery: string;
  searchQuery?: string;
  type: string;
  question?: string;
  options?: string[];
  currentStep?: number;
  totalSteps?: number;
  directResponse?: string;
}

export async function evaluateQueryIntent(
  messages: ChatMessage[],
  convId: string = 'default',
  requestId: string = 'REQ'
): Promise<IntentEvaluationResult> {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || "";
  const lower = lastUserMessage.toLowerCase().trim();
  
  // 1. Détection ultra-rapide des salutations pures (réponse immédiate et chaleureuse sans appel LLM)
  const isPureGreetingOrIdentity = (
    /^(salam(\s*aleikoum|\s*alaykoum)?|salut|bonjour|bonsoir|coucou|hello|merci|jazakallahu?\s*khayr|barakallahu?\s*fik|chokran)[!.\s]*$/i.test(lower) ||
    /^(qui\s+es[- ]tu|tu\s+es\s+qui|comment\s+(vas?[- ]tu|tu\s+vas|va[- ]t[- ]il))[?!.\s]*$/i.test(lower)
  );

  if (isPureGreetingOrIdentity) {
    const isSalam = /salam/i.test(lower);
    return {
      mode: 'NEW_TOPIC',
      mainTopic: 'Salutation & Accueil',
      subtopic: 'Accueil',
      currentEntity: 'Utilisateur',
      referenceResolution: 'Échange de courtoisie direct',
      resolvedContext: 'Conversation',
      resolvedQuery: lastUserMessage,
      type: "CONVERSATIONAL",
      directResponse: isSalam
        ? "Wa alaykoum assalam wa rahmatullah. Comment puis-je vous aider aujourd'hui ?"
        : "Bonjour ! Comment puis-je vous aider aujourd'hui ?"
    };
  }

  // 2. Détection des sujets du quotidien / profanes (football, sport, tech, cinéma...)
  // Si la conversation en cours portait déjà sur l'Islam et que le message est une suite/précision, ne pas dévier en profane
  const previousMessagesHaveReligious = messages.length > 1 && messages.slice(0, -1).some(m =>
    /(islam|musulman|coran|sourate|verset|hadith|sunna|prophète|messager|allah|dieu|fiqh|fatwa|halal|haram|prière|salat|priere|ablution|wudu|ghusl|tayammum|ramadan|jeûne|jeune|zakat|hajj|omra|péché|tawbah|savant|tafsir|madhhab)/i.test(m.content)
  );

  const isEverydayProfane = !previousMessagesHaveReligious && (
    /(football|foot\b|match|ligue|champions|coupe|équipe|joueur|ballon|but|arbitre|can\b|sport|tennis|basket|course|musculation|fitness|cinéma|film|série|acteur|musique|jeux?\s*vidéo|gaming|console)/i.test(lower) &&
    !/(islam|musulman|halal|haram|prière|salat|priere|sourate|verset|hadith|ramadan|jeûne|jeune|zakat|allah|prophète|dieu|foi|péché|fatwa|fiqh)/i.test(lower)
  );

  if (isEverydayProfane) {
    return {
      mode: 'NEW_TOPIC',
      mainTopic: 'Échange non religieux',
      subtopic: 'Discussion',
      currentEntity: 'Utilisateur',
      referenceResolution: 'Direct',
      resolvedContext: 'Discussion générale',
      resolvedQuery: lastUserMessage,
      type: "NON_RELIGIOUS"
    };
  }

  // 3. Routage heuristique rapide si MULTI_STAGE_INTENT_LLM est désactivé (recommandé pour stabilité absolue)
  if (!FEATURE_FLAGS.MULTI_STAGE_INTENT_LLM) {
    const isSensitive = /(divorce|talaq|mariage|héritage|suicide|violence|meurtre|zina)/i.test(lower);
    const isFiqh = /(halal|haram|permis|interdit|obligatoire|valide|annule|règle|statut|fatwa|jugement|ablution|wudu|prière|salat|jeûne|ramadan|zakat|hajj)/i.test(lower);
    const isAdvice = /(conseil|motivation|organisation|habitude|étudier|apprendre|programme)/i.test(lower);
    const hasReligiousKeywords = /(islam|musulman|coran|qur'?an|sourate|verset|hadith|sunna|prophète|messager|allah|dieu|seigneur|foi|iman|ihsan|tawhid|chirk|fiqh|fatwa|halal|haram|makruh|mustahabb|mubah|valide|invalide|prière|salat|namaz|priere|ablution|wudu|ghusl|tayammum|adkar|dhikr|doua|invocation|mosquée|masjid|imam|cheikh|ramadan|jeûne|jeune|sawm|zakat|aumône|hajj|omra|pèlerinage|enfer|paradis|akhirah|tombe|ange|djin|jinn|satan|shaitan|iblis|péché|tawbah|repentir|savant|tafsir|madhhab|malikite|chaféite|hanafite|hanbalite|bukhari|muslim|tirmidhi|nawawi)/i.test(lower);

    // Update active entity from user message if explicit
    const newEntity = extractActiveEntityFromUser(lastUserMessage);
    if (newEntity) {
      updateSimpleContext(convId, { activeEntity: { type: 'PERSON', name: newEntity } });
    }

    const resolution = resolveContext(messages, convId);
    if (resolution.needsClarification) {
      return {
        mode: 'CLARIFICATION',
        mainTopic: 'Clarification requise',
        subtopic: 'Clarification',
        currentEntity: 'Aucune',
        referenceResolution: 'Aucune',
        resolvedContext: 'Attente de clarification',
        resolvedQuery: resolution.resolvedQuery,
        type: 'RELIGIOUS_CLARIFICATION',
        question: resolution.clarificationText
      };
    }

    // Si aucune intention religieuse ni mot-clé religieux n'est présent, qu'aucune entité religieuse n'est en cours, et que l'historique précédent n'était pas religieux
    if (!isSensitive && !isFiqh && !isAdvice && !hasReligiousKeywords && !resolution.activeEntity && !previousMessagesHaveReligious) {
      return {
        mode: 'NEW_TOPIC',
        mainTopic: 'Échange non religieux',
        subtopic: 'Discussion',
        currentEntity: 'Utilisateur',
        referenceResolution: 'Direct',
        resolvedContext: 'Discussion générale',
        resolvedQuery: lastUserMessage,
        type: "NON_RELIGIOUS"
      };
    }

    let type = 'RELIGIOUS_FACTUAL';
    if (isSensitive) type = 'SENSITIVE_FATWA';
    else if (isFiqh) type = 'FIQH_RULING';
    else if (isAdvice) type = 'GENERAL_ADVICE';

    return {
      mode: 'CONTINUATION',
      mainTopic: 'Question religieuse',
      subtopic: type,
      currentEntity: resolution.activeEntity || 'Sujet courant',
      referenceResolution: 'Résolution déterministe',
      resolvedContext: 'Historique récent',
      resolvedQuery: resolution.resolvedQuery,
      searchQuery: resolution.resolvedQuery,
      type: type
    };
  }

  // 4. Mode avancé multi-étapes si le feature flag est explicitement activé
  const client = getAIClient();
  syncConversationReferences(convId, messages);
  const currentContext = getOrCreateConversationContext(convId);
  const memoryAnalysis = analyzeConversationMemory(messages, currentContext);
  const formattedIndexedReferences = currentContext.referencedItems.length > 0
    ? currentContext.referencedItems.map(item => `- [${item.type}] ${item.name} (${item.sourceRole === 'user' ? 'Mentionné par l\'utilisateur' : 'Cité par l\'IA'})`).join('\n')
    : 'Aucune référence indexée pour le moment';

  const conversationHistory = messages.slice(-5).map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
  
  const prompt = `Vous êtes le routeur sémantique et d'intention de "Cheikh IA", un assistant spécialisé en Islam.
Analysez la requête utilisateur en garantissant une CONTINUITÉ CONVERSATIONNELLE PARFAITE.

RÈGLE CARDINALE : DÉTERMINATION DU FIL DE DISCUSSION ET RÉSOLUTION SÉMANTIQUE
Vous devez déterminer comment le dernier message se rattache aux 5 derniers échanges.
1. PRONOMS, ANAPHORES ET RÉFÉRENCES :
   - "ce verset", "cette sourate", "ce passage" -> Reliez directement au dernier verset / sourate indexé(e) cité(e) par l'IA.
   - "ce hadith", "cette parole", "cette tradition" -> Reliez directement au dernier hadith indexé cité par l'IA.
   - "ce savant", "cette personne", "lui", "elle" -> Reliez à la personnalité / savant indexé(e).
   - "cet événement", "cette bataille" -> Reliez à l'événement historique indexé.
   - "son péché" -> Déterminez de qui on parle (Ex: Si on parlait d'Adam juste avant, "son péché" = le péché d'Adam).
   - "pour mon frère", "c'est pas pour moi" -> Conservez la question précédente en modifiant uniquement la personne concernée.
   - "pourquoi ?", "comment ça ?", "et si c'est temporaire ?" -> Raccrochez à l'affirmation ou règle qui précède immédiatement.
2. CONTINUITÉ VS NOUVEAU SUJET :
   - Déterminez le mode parmi : "NEW_TOPIC", "CONTINUATION", "CLARIFICATION_ANSWER", "REFERENCE_TO_PREVIOUS_TOPIC", "RETURN_TO_OLDER_TOPIC".
   - Un message court ("pourquoi ?", "et lui ?", "et adam ?", "peux-tu m'expliquer ce verset ?") est PRESQUE TOUJOURS une CONTINUATION. Ne le traitez JAMAIS comme un sujet isolé.
3. RETOUR À UN SUJET ANCIEN ("RETURN_TO_OLDER_TOPIC") :
   - Si l'utilisateur dit "Et concernant ce que tu m'avais dit sur Adam ?" ou "concernant ma première question", inspectez l'historique et rattachez-y la resolvedQuery.
4. "resolvedQuery" :
   - Doit être une phrase complète, autonome, claire et explicite en français, sans pronom ambigu, intégrant les références exactes (ex: nom de la sourate, numéro de verset, recueil de hadith).

RÉFÉRENCES INDEXÉES DANS LA DISCUSSION (CORAN, HADITH, PERSONNALITÉS, ÉVÉNEMENTS) :
${formattedIndexedReferences}

ANALYSE INTERNE FOURNIE PAR LA MÉMOIRE :
- Mode probable : ${memoryAnalysis.probableMode}
- Entité candidate : ${memoryAnalysis.candidateEntity || 'Aucune'}
- Pronoms/indices repérés : ${memoryAnalysis.detectedPronouns.join(', ') || 'Aucun'}
${memoryAnalysis.referenceResolutionResult?.item ? `- Résolution automatique de référence : [${memoryAnalysis.referenceResolutionResult.item.type}] ${memoryAnalysis.referenceResolutionResult.item.name} (${memoryAnalysis.referenceResolutionResult.explanation})` : ''}
${memoryAnalysis.olderTopicMatch ? `- Sujet ancien correspondant : ${memoryAnalysis.olderTopicMatch.topic} (${memoryAnalysis.olderTopicMatch.summary})` : ''}

HISTORIQUE DES 5 DERNIERS MESSAGES :
${conversationHistory}

Dernier message utilisateur : "${lastUserMessage}"

CATÉGORIES D'INTENTION ("type") :
- "CONVERSATIONAL" : Salutations pures (salam, bonjour, merci), confidences sans question religieuse de fond.
- "GENERAL_ADVICE" : Conseils d'organisation spirituelle sans fatwa.
- "RELIGIOUS_FACTUAL" : Histoire des prophètes, concepts théologiques, foi, qadar, mérites.
- "FIQH_RULING" : Statut juridique (halal, haram, valide, obligatoire, prière, jeûne, zakat).
- "SENSITIVE_FATWA" : Litiges graves, divorce, takfir, violences (4:34).
- "RELIGIOUS_CLARIFICATION" : Situation floue où il manque un paramètre clé avant de statuer (fournir question et options).
- "NON_RELIGIOUS" : Hors-sujet islamique.

Répondez UNIQUEMENT en JSON valide suivant ce format strict :
{
  "mode": "NEW_TOPIC" | "CONTINUATION" | "CLARIFICATION_ANSWER" | "REFERENCE_TO_PREVIOUS_TOPIC" | "RETURN_TO_OLDER_TOPIC",
  "mainTopic": "Sujet principal (ex: Qadar / Destin, Salat, Zakat, etc.)",
  "subtopic": "Sous-sujet spécifique (ex: Adam et la transmission du péché, Prière couchée, etc.)",
  "currentEntity": "Personne ou entité concernée (ex: Adam, le frère, le voyageur, etc.)",
  "referenceResolution": "Explication de la résolution",
  "resolvedContext": "Résumé du contexte thématique actif",
  "resolvedQuery": "Question complète et explicite résolue en français",
  "searchQuery": "Mots-clés optimaux pour la recherche documentaire islamique (basés sur resolvedQuery)",
  "type": "CONVERSATIONAL" | "GENERAL_ADVICE" | "RELIGIOUS_FACTUAL" | "FIQH_RULING" | "SENSITIVE_FATWA" | "RELIGIOUS_CLARIFICATION" | "NON_RELIGIOUS",
  "question": "Question de clarification si type=RELIGIOUS_CLARIFICATION",
  "options": ["Option 1", "Option 2"],
  "currentStep": 1,
  "totalSteps": 2,
  "directResponse": "Texte si type=CONVERSATIONAL ou NON_RELIGIOUS"
}`;

  try {
    const aiCall = (async () => {
      const response = await client.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      });
      let resultText = response.text || "{}";
      resultText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const match = resultText.match(/\{[\s\S]*\}/);
      return JSON.parse(match ? match[0] : resultText) as IntentEvaluationResult;
    })();

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
    const parsed = await Promise.race([aiCall, timeoutPromise]);

    if (parsed && parsed.resolvedQuery) {
      updateConversationContext(convId, {
        mainTopic: parsed.mainTopic || currentContext.mainTopic,
        currentSubtopic: parsed.subtopic || currentContext.currentSubtopic,
        currentEntity: parsed.currentEntity || memoryAnalysis.candidateEntity || currentContext.currentEntity,
        currentQuestion: parsed.resolvedQuery || lastUserMessage
      });

      return parsed;
    }
  } catch (error: any) {
    console.warn(`[REQ ${requestId}] Intent model call failed:`, error.message);
  }

  // Fallback heuristique en cas de timeout ou d'erreur du modèle préliminaire
  return {
    mode: 'CONTINUATION',
    mainTopic: currentContext.mainTopic || 'Islam',
    subtopic: 'Échange',
    currentEntity: currentContext.currentEntity || 'Utilisateur',
    referenceResolution: 'Historique',
    resolvedContext: 'Discussion',
    resolvedQuery: lastUserMessage,
    searchQuery: lastUserMessage,
    type: "RELIGIOUS_FACTUAL"
  };
}


export async function generateChatResponseStream(
  messages: ChatMessage[],
  searchContext: string,
  onChunk: (text: string) => void,
  regeneratePreviousResponse?: string,
  resolvedContext?: string | {
    mainTopic?: string;
    subtopic?: string;
    currentEntity?: string;
    referenceResolution?: string;
    resolvedQuery?: string;
    mode?: string;
  },
  resolvedQuery?: string,
  requestId: string = 'REQ',
  userOptions?: {
    responseStyle?: string;
    schoolPreference?: string;
  }
): Promise<{ modelUsed: string; temperature: number }> {
  const client = getAIClient();
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || "";
  
  // Récupération de la mémoire de discussion : on passe à 20 messages pour une meilleure mémoire contextuelle
  const recentMessages = messages.slice(-20);

  // Construction des tokens conversationnels multi-tours pour l'API Gemini
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const msg of recentMessages) {
    const role = msg.role === 'user' ? 'user' : 'model';
    // Éviter les rôles consécutifs identiques pour l'API Gemini
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += "\n\n" + msg.content;
    } else {
      contents.push({
        role,
        parts: [{ text: msg.content }]
      });
    }
  }

  // Gemini exige impérativement que 'contents' commence par le rôle 'user'
  if (contents.length > 0 && contents[0].role === 'model') {
    const preUserMsg = messages.slice(0, -20).filter(m => m.role === 'user').pop();
    if (preUserMsg) {
      contents.unshift({
        role: 'user',
        parts: [{ text: preUserMsg.content }]
      });
    } else {
      contents.unshift({
        role: 'user',
        parts: [{ text: "Bonjour, poursuivons la discussion." }]
      });
    }
  }

  const riskLevel = await analyzeQueryRisk(lastUserMessage);
  const modelsToTry = getModelCascadeForQuery(riskLevel);

  let fullSystemInstruction = systemPrompt + "\n\n" + searchContext;

  // Injection explicite de la mémoire des 20 derniers messages dans le prompt système
  if (recentMessages.length > 1) {
    fullSystemInstruction += `\n\n=== MÉMOIRE CONVERSATIONNELLE DES ${recentMessages.length} DERNIERS MESSAGES ===
Voici le fil des derniers échanges dans cette même discussion :
${recentMessages.map((m, idx) => `${idx + 1}. [${m.role === 'user' ? 'Utilisateur' : 'Cheikh IA'}] : ${m.content}`).join('\n\n')}

DIRECTIVES DE MÉMOIRE ET CONTINUITÉ NATURELLE :
- Tu es dans un échange suivi avec cet utilisateur, comme un être humain doté de mémoire.
- Prends activement en compte tout ce qui a été dit dans ces derniers messages pour répondre avec pertinence et continuité.
- Ne fais AUCUNE réinitialisation : ne répète pas les salutations (« Salam », « Bonjour ») déjà échangées plus tôt.
- Réponds directement et sans détour en prolongeant la réflexion en cours.`;
  }
  
  if (resolvedContext || resolvedQuery) {
    if (typeof resolvedContext === 'object') {
      fullSystemInstruction += `\n\n=== CONTEXTE CONVERSATIONNEL ===
- Mode : ${resolvedContext.mode || 'CONTINUATION'}
- Sujet principal : ${resolvedContext.mainTopic || 'Islam'}
- Sous-sujet : ${resolvedContext.subtopic || 'Général'}
- Entité active : ${resolvedContext.currentEntity || 'Utilisateur'}
- Contexte résolu : ${resolvedContext.resolvedQuery || resolvedQuery || lastUserMessage}

CONSIGNE : Répondez naturellement à la question en tenant compte de l'ensemble des échanges récents ci-dessus.`;
    } else {
      fullSystemInstruction += `\n\n=== CONTEXTE DE LA QUESTION ===
- Sujet : ${resolvedContext || 'Islam'}
- Question : ${resolvedQuery || lastUserMessage}
Répondez directement en vous appuyant sur les échanges récents.`;
    }
  }
  if (regeneratePreviousResponse && regeneratePreviousResponse.trim().length > 0) {
    fullSystemInstruction += `\n\n=== DEMANDE DE RÉGÉNÉRATION AMÉLIORÉE ===
La réponse précédente générée pour l'utilisateur était :
"""
${regeneratePreviousResponse.trim()}
"""
Génère une nouvelle réponse plus satisfaisante pour l'utilisateur.
Améliore notamment :
- La clarté et la pertinence
- La précision doctrinale et la structure
- La prise en compte du contexte de la discussion
- Le respect scrupuleux des sources (ne jamais inventer de verset ou hadith)
- L'absence de répétition inutile ou de salutations mécaniques.
Ne change pas arbitrairement le contenu religieux uniquement pour être différent. Si la réponse précédente était correcte sur le fond, propose une reformulation enrichie, plus claire et mieux structurée. Conserve rigoureusement toutes les règles de sécurité religieuse.`;
  }
  if (userOptions) {
    if (userOptions.schoolPreference && userOptions.schoolPreference !== 'all') {
      const schoolNames: Record<string, string> = {
        maliki: "l'école Malikite (Imam Malik ibn Anas)",
        hanafi: "l'école Hanafite (Imam Abou Hanifah)",
        shafii: "l'école Chafiite (Imam Al-Chafi'i)",
        hanbali: "l'école Hanbalite (Imam Ahmad ibn Hanbal)"
      };
      const chosenSchool = schoolNames[userOptions.schoolPreference] || userOptions.schoolPreference;
      fullSystemInstruction += `\n\n=== PRÉFÉRENCE JURISPRUDENTIELLE DE L'UTILISATEUR ===
L'utilisateur souhaite que la priorité soit accordée à ${chosenSchool}.
CONSIGNE : Expose en premier lieu et de façon détaillée l'avis et l'argumentation de cette école, tout en rappelant avec respect et bienveillance les positions des autres écoles s'il y a divergence reconnue.
RAPPEL FONDAMENTAL : Ne réduis jamais la position stricte à cette seule école tardive si elle prend racine dans la compréhension des Compagnons (Fahm Aṣ-Ṣaḥābah). Mentionne toujours les preuves scripturaires authentiques et les Athars des Salaf avant les développements des juristes.`;
    }
  }

  const MODEL_TEMPERATURE = 0.1; // Strict low temperature as requested for deterministic testing

  const genStartTime = Date.now();
  let firstTokenLogged = false;
  let totalChars = 0;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[REQ ${requestId}] GEMINI_START (modèle: ${modelName.id})`);
      const responseStream = await client.models.generateContentStream({
        model: modelName.id,
        contents,
        config: {
          systemInstruction: fullSystemInstruction,
          temperature: MODEL_TEMPERATURE,
          topP: 0.95,
          topK: 40,
        }
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          if (!firstTokenLogged) {
            firstTokenLogged = true;
            console.log(`[REQ ${requestId}] FIRST_TOKEN (latence: ${Date.now() - genStartTime}ms)`);
          }
          totalChars += chunk.text.length;
          onChunk(chunk.text);
        }
      }
      console.log(`[REQ ${requestId}] STREAM_END (total caractères: ${totalChars})`);
      return { modelUsed: modelName.id, temperature: MODEL_TEMPERATURE }; 
    } catch (error: any) {
      console.warn(`[REQ ${requestId}] [Model Fallback] Échec avec ${modelName.id}:`, error.message);
      if (isRetryableError(error)) {
         markModelUnavailable(modelName.id);
         continue; 
      } else {
         throw error;
      }
    }
  }
  
  throw new Error("ALL_MODELS_EXHAUSTED");
}

export async function generateConversationTitle(question: string): Promise<string> {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  for (const model of models) {
    try {
      const client = getAIClient();
      const cleanQuestion = question.trim().slice(0, 300);
      const prompt = `Génère un titre très court, précis et concis (3 à 5 mots maximum) pour une discussion en français commençant par cette question :
"${cleanQuestion}"

RÈGLES STRICTES :
- 3 à 5 mots maximum.
- Pas de ponctuation finale (pas de point, pas de point d'interrogation).
- Pas de guillemets autour du titre.
- Pas de préfixes génériques comme "Question sur", "Discussion sur" ou "Demande de".
- Synthétise immédiatement le sujet (ex: "Validité du jeûne et saignement", "Prière de consultation Istikhara", "Zakat al-Fitr en argent").
- Uniquement le titre, rien d'autre.`;

      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.2,
        }
      });

      let title = response.text?.trim() || "";
      title = title.replace(/^["'«»]+|["'«»]+$/g, '').replace(/[.?!]+$/, '').trim();
      if (title && title.length >= 3 && title.length <= 60) {
        return title;
      }
    } catch (err: any) {
      console.warn(`[generateConversationTitle] Échec avec ${model}:`, err?.message);
    }
  }
  const fallback = question.trim().slice(0, 30);
  return fallback + (question.trim().length > 30 ? '...' : '');
}
