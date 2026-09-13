import { ChatMessage, ReferencedItem, ReferenceCategory } from '../../shared/types';
import { extractReferencedItems } from './referenceExtractor';

export interface RecentSubject {
  topic: string;
  subtopic?: string;
  question: string;
  entity?: string;
  messageIndex: number;
}

export interface ActiveConversationContext {
  mainTopic: string | null;
  currentSubtopic: string | null;
  currentQuestion: string | null;
  currentEntity: string | null;
  previousQuestion: string | null;
  unresolvedReferences: string[];
  recentSubjects: RecentSubject[];
  referencedItems: ReferencedItem[];
  referencesByType: {
    Quran: ReferencedItem[];
    Hadith: ReferencedItem[];
    People: ReferencedItem[];
    Events: ReferencedItem[];
  };
  lastCapturedReference: ReferencedItem | null;
  clarificationState: {
    active: boolean;
    originalQuestion: string | null;
    goal: string | null;
    answers: string[];
  };
}

export type ConversationMode =
  | 'NEW_TOPIC'
  | 'CONTINUATION'
  | 'CLARIFICATION'
  | 'CLARIFICATION_ANSWER'
  | 'REFERENCE_TO_PREVIOUS_TOPIC'
  | 'RETURN_TO_OLDER_TOPIC';

// Mémoire locale active par ID de conversation (ou session)
const contextStore = new Map<string, ActiveConversationContext>();

export function getOrCreateConversationContext(convId: string): ActiveConversationContext {
  let ctx = contextStore.get(convId);
  if (!ctx) {
    ctx = {
      mainTopic: null,
      currentSubtopic: null,
      currentQuestion: null,
      currentEntity: null,
      previousQuestion: null,
      unresolvedReferences: [],
      recentSubjects: [],
      referencedItems: [],
      referencesByType: {
        Quran: [],
        Hadith: [],
        People: [],
        Events: []
      },
      lastCapturedReference: null,
      clarificationState: {
        active: false,
        originalQuestion: null,
        goal: null,
        answers: []
      }
    };
    contextStore.set(convId, ctx);
  }
  return ctx;
}

export function updateConversationContext(
  convId: string,
  updates: Partial<ActiveConversationContext>
): ActiveConversationContext {
  const ctx = getOrCreateConversationContext(convId);
  if (updates.mainTopic !== undefined) ctx.mainTopic = updates.mainTopic;
  if (updates.currentSubtopic !== undefined) ctx.currentSubtopic = updates.currentSubtopic;
  if (updates.currentQuestion !== undefined) {
    ctx.previousQuestion = ctx.currentQuestion;
    ctx.currentQuestion = updates.currentQuestion;
  }
  if (updates.currentEntity !== undefined) ctx.currentEntity = updates.currentEntity;
  if (updates.unresolvedReferences !== undefined) ctx.unresolvedReferences = updates.unresolvedReferences;
  if (updates.recentSubjects !== undefined) ctx.recentSubjects = updates.recentSubjects;
  if (updates.referencedItems !== undefined) ctx.referencedItems = updates.referencedItems;
  if (updates.referencesByType !== undefined) ctx.referencesByType = updates.referencesByType;
  if (updates.lastCapturedReference !== undefined) ctx.lastCapturedReference = updates.lastCapturedReference;
  if (updates.clarificationState !== undefined) {
    ctx.clarificationState = { ...ctx.clarificationState, ...updates.clarificationState };
  }
  return ctx;
}

/**
 * Capture et indexe automatiquement toutes les références présentes dans un texte
 * (Coran, Hadith, Personnalités, Événements) pour la session/conversation active.
 * Met à jour à la fois la liste chronologique et les index par catégorie.
 */
export function captureAndIndexReferences(
  convId: string,
  text: string,
  sourceRole: 'user' | 'assistant' | 'model',
  messageIndex?: number,
  externalSources?: any[]
): ReferencedItem[] {
  const ctx = getOrCreateConversationContext(convId);
  const items = extractReferencedItems(text, sourceRole, messageIndex, externalSources);
  if (items.length === 0) return [];

  for (const item of items) {
    // Vérifier si l'élément existe déjà pour mettre à jour ou ajouter
    const existingIndex = ctx.referencedItems.findIndex(
      r => r.normalizedKey === item.normalizedKey
    );

    if (existingIndex >= 0) {
      // Mettre à jour avec le contexte ou la source la plus récente
      ctx.referencedItems[existingIndex] = {
        ...ctx.referencedItems[existingIndex],
        ...item,
        sourceRole: item.sourceRole,
        messageIndex: item.messageIndex ?? ctx.referencedItems[existingIndex].messageIndex,
        timestamp: Date.now()
      };
    } else {
      ctx.referencedItems.push({
        ...item,
        timestamp: Date.now()
      });
    }

    // Indexation par catégorie
    const typeList = ctx.referencesByType[item.type];
    const catIndex = typeList.findIndex(r => r.normalizedKey === item.normalizedKey);
    if (catIndex >= 0) {
      typeList[catIndex] = { ...typeList[catIndex], ...item, timestamp: Date.now() };
    } else {
      typeList.push({ ...item, timestamp: Date.now() });
    }

    // Le dernier élément capturé est mis à jour
    ctx.lastCapturedReference = item;
  }

  return items;
}

/**
 * Parcourt tout l'historique de la conversation pour extraire et indexer les références
 * des messages de l'utilisateur et de l'assistant dans l'ordre chronologique.
 */
export function syncConversationReferences(
  convId: string,
  messages: ChatMessage[]
): ReferencedItem[] {
  const allIndexed: ReferencedItem[] = [];
  messages.forEach((msg, idx) => {
    const role: 'user' | 'assistant' | 'model' = msg.role === 'user' ? 'user' : 'assistant';
    const captured = captureAndIndexReferences(convId, msg.content, role, idx, msg.sources);
    allIndexed.push(...captured);
  });
  return allIndexed;
}

/**
 * Récupère la référence la plus récente (globale ou par catégorie spécifique).
 */
export function getMostRecentReference(
  context: ActiveConversationContext,
  category?: ReferenceCategory
): ReferencedItem | null {
  if (category) {
    const list = context.referencesByType[category];
    return list && list.length > 0 ? list[list.length - 1] : null;
  }
  return context.lastCapturedReference || (context.referencedItems.length > 0 ? context.referencedItems[context.referencedItems.length - 1] : null);
}

/**
 * Récupère toutes les références indexées pour une conversation donnée.
 */
export function getAllIndexedReferences(convId: string): ReferencedItem[] {
  const ctx = getOrCreateConversationContext(convId);
  return ctx.referencedItems;
}

/**
 * Résout automatiquement les références et anaphores du message utilisateur
 * à partir des éléments indexés (Coran, Hadith, Personnalités, Événements).
 */
export function resolveReferenceFromContext(
  lastUserMsg: string,
  context: ActiveConversationContext
): {
  item: ReferencedItem | null;
  category: ReferenceCategory | null;
  explanation: string | null;
  resolvedQuery: string | null;
} {
  const lower = lastUserMsg.toLowerCase().trim();

  // 1. Détection anaphorique vers le Coran ("ce verset", "cette sourate", "cette ayah", "ce passage")
  const quranPattern = /\b(ce\s+verset|cette\s+sourate|cette\s+ayah|ce\s+passage|dans\s+quelle\s+sourate|le\s+contexte\s+de\s+ce\s+verset|explique[- ]moi\s+ce\s+verset|d['\u2019]o[ùu]\s+vient\s+ce\s+verset|la\s+signification\s+de\s+ce\s+verset)\b/i;
  if (quranPattern.test(lower)) {
    const item = getMostRecentReference(context, 'Quran');
    if (item) {
      const explanation = `'ce verset' / 'cette sourate' fait référence à ${item.name} cité précédemment`;
      let resolvedQuery = lastUserMsg.replace(/ce verset|cette sourate|cette ayah|ce passage/gi, item.name);
      if (resolvedQuery === lastUserMsg || resolvedQuery.trim().length < 20) {
        resolvedQuery = `Explication, contexte de révélation et enseignements du passage coranique : ${item.name}`;
      }
      return { item, category: 'Quran', explanation, resolvedQuery };
    }
  }

  // 2. Détection anaphorique vers un Hadith ("ce hadith", "cette tradition", "est-il authentique", "est-il sahih")
  const hadithPattern = /\b(ce\s+hadith|cette\s+tradition|cette\s+parole|est[- ]il\s+authentique|est[- ]il\s+sahih|son\s+authenticit[ée]|qui\s+a\s+rapport[ée]\s+ce\s+hadith|d['\u2019]o[ùu]\s+vient\s+ce\s+hadith|dans\s+quel\s+recueil|l['\u2019]explication\s+de\s+ce\s+hadith)\b/i;
  if (hadithPattern.test(lower)) {
    const item = getMostRecentReference(context, 'Hadith');
    if (item) {
      const explanation = `'ce hadith' fait référence à ${item.name} cité précédemment`;
      let resolvedQuery = lastUserMsg.replace(/ce hadith|cette tradition|cette parole/gi, item.name);
      if (resolvedQuery === lastUserMsg || resolvedQuery.trim().length < 20) {
        resolvedQuery = `Authenticité, rapporteur et explication du ${item.name}`;
      }
      return { item, category: 'Hadith', explanation, resolvedQuery };
    }
  }

  // 3. Détection anaphorique vers une Personnalité ("ce savant", "cette personne", "ce prophète", "lui", "elle", "parle-moi de lui")
  const peoplePattern = /\b(ce\s+savant|cette\s+personne|ce\s+proph[èe]te|ce\s+compagnon|qui\s+est[- ]il|qui\s+est[- ]elle|parle[- ]moi\s+de\s+lui|parle[- ]moi\s+d['\u2019]elle|qu['\u2019]a[- ]t[- ]il\s+dit|qu['\u2019]a[- ]t[- ]elle\s+dit|sa\s+biographie|son\s+[ée]poque|son\s+[ée]cole)\b/i;
  if (peoplePattern.test(lower)) {
    const item = getMostRecentReference(context, 'People');
    if (item) {
      const explanation = `'ce savant/personne/lui' fait référence à ${item.name} mentionné précédemment`;
      let resolvedQuery = lastUserMsg.replace(/ce savant|cette personne|ce prophète|ce compagnon|de lui|d'elle/gi, item.name);
      if (resolvedQuery === lastUserMsg || resolvedQuery.trim().length < 20) {
        resolvedQuery = `Biographie, statut et enseignements de ${item.name} en Islam`;
      }
      return { item, category: 'People', explanation, resolvedQuery };
    }
  }

  // 4. Détection anaphorique vers un Événement ("cet événement", "cette bataille", "cette guerre", "ce traité", "ce voyage")
  const eventPattern = /\b(cet\s+[ée]v[ée]nement|cette\s+bataille|cette\s+guerre|ce\s+trait[ée]|ce\s+voyage|quand\s+[çc]a\s+s['\u2019]est\s+pass[ée]|raconte[- ]moi\s+cette\s+bataille|d[ée]tails\s+sur\s+cet\s+[ée]v[ée]nement)\b/i;
  if (eventPattern.test(lower)) {
    const item = getMostRecentReference(context, 'Events');
    if (item) {
      const explanation = `'cet événement' / 'cette bataille' fait référence à ${item.name} mentionné précédemment`;
      let resolvedQuery = lastUserMsg.replace(/cet événement|cette bataille|ce traité|ce voyage/gi, item.name);
      if (resolvedQuery === lastUserMsg || resolvedQuery.trim().length < 20) {
        resolvedQuery = `Détails historiques, date et récit de ${item.name}`;
      }
      return { item, category: 'Events', explanation, resolvedQuery };
    }
  }

  // 5. Détection de demande de source générale ("cette source", "cette référence", "d'où vient cette citation", "la référence de ce que tu dis")
  const genericSourcePattern = /\b(cette\s+source|cette\s+r[ée]f[ée]rence|ce\s+que\s+tu\s+as\s+cit[ée]|cette\s+citation|d['\u2019]o[ùu]\s+vient\s+cela|la\s+preuve\s+de\s+ce\s+que\s+tu\s+dis)\b/i;
  if (genericSourcePattern.test(lower)) {
    const item = context.lastCapturedReference || getMostRecentReference(context);
    if (item) {
      const explanation = `'cette source/référence' fait référence à ${item.name} (${item.type}) cité précédemment`;
      const resolvedQuery = `Origine, source exacte et degré d'authenticité de la référence suivante : ${item.name}`;
      return { item, category: item.type, explanation, resolvedQuery };
    }
  }

  // 6. Recherche d'une correspondance directe avec un élément déjà indexé
  for (const item of context.referencedItems) {
    const key = item.normalizedKey.split(':').pop() || '';
    if (key.length > 3 && lower.includes(key)) {
      return {
        item,
        category: item.type,
        explanation: `La question mentionne directement ${item.name} (${item.type}) déjà indexé dans la conversation`,
        resolvedQuery: `${lastUserMsg} (Précision sur la référence : ${item.name})`
      };
    }
  }

  return { item: null, category: null, explanation: null, resolvedQuery: null };
}

export function logConversationContext(context: {
  mainTopic?: string | null;
  subtopic?: string | null;
  entity?: string | null;
  currentQuestion?: string | null;
  resolvedQuery?: string | null;
  referenceResolution?: string | null;
  mode?: string | null;
}) {
  console.log(`[CONTEXT]
mainTopic: ${context.mainTopic || 'Non spécifié'}
subtopic: ${context.subtopic || 'Non spécifié'}
entity: ${context.entity || 'Non spécifié'}
currentQuestion: ${context.currentQuestion || 'Non spécifié'}
resolvedQuery: ${context.resolvedQuery || 'Non spécifié'}
referenceResolution: ${context.referenceResolution || 'Aucune'}
mode: ${context.mode || 'CONTINUATION'}`);
}

/**
 * Analyse sémantique heuristique locale de l'historique complet pour préparer
 * le routage et la mémoire conversationnelle sans appel d'API supplémentaire.
 */
export function analyzeConversationMemory(
  messages: ChatMessage[],
  currentContext: ActiveConversationContext
) {
  const userMessages = messages.filter(m => m.role === 'user');
  const lastUserMsg = userMessages[userMessages.length - 1]?.content || '';
  const prevUserMsg = userMessages[userMessages.length - 2]?.content || '';
  const lastAssistantMsg = messages.filter(m => m.role === 'model' || m.role === 'assistant').pop()?.content || '';

  const lower = lastUserMsg.toLowerCase().trim();

  // Résolution automatique des références indexées
  const referenceResolutionResult = resolveReferenceFromContext(lastUserMsg, currentContext);

  // 1. Détection de pronoms ou références anaphoriques
  const pronounPatterns = [
    { pattern: /\b(son|sa|ses)\s+(p[ée]ch[ée]|acte|faute|histoire|cas|r[èe]gle|prière|salat|zakat)/i, match: 'possessif' },
    { pattern: /\b(lui|elle|eux|ceci|cela|[çc]a|celui-ci|celle-ci)\b/i, match: 'pronom_demonstratif' },
    { pattern: /\b(cette|ce|cet|ces)\s+(personne|r[èe]gle|cas|situation|statut|obligation|verset|sourate|hadith|bataille)\b/i, match: 'demonstratif_nominal' },
    { pattern: /\b(pourquoi|comment|et lui|et elle|et adam|et [çc]a|donc oui|toujours|et si|et pour)\b/i, match: 'court_connecteur' },
    { pattern: /\b(mon|ma|mes)\s+(fr[èe]re|soeur|sœur|p[èe]re|m[èe]re|mari|femme|[ée]poux|[ée]pouse|ami|voisin)\b/i, match: 'entite_familiale' },
    { pattern: /\b(premi[èe]re\s+question|la\s+pr[ée]c[ée]dente|au\s+d[ée]but|ce\s+que\s+tu\s+(as|m'avais)\s+dit\s+sur)\b/i, match: 'retour_ancien' }
  ];

  const detectedPronouns = pronounPatterns
    .filter(p => p.pattern.test(lower))
    .map(p => p.match);

  const isShortMessage = lower.length < 50;

  // 2. Détection de changement de sujet explicite
  const isNewTopicExplicit = /^(au fait|sinon|autre question|rien [àa] voir|je change de sujet|parlons d'autre chose)\b/i.test(lower);

  // 3. Détection de retour à un sujet plus ancien
  let olderTopicMatch: { topic: string; summary: string; index: number } | null = null;
  const returnToOlderRegex = /(?:concernant ce que tu m'avais dit sur|par rapport [àa] ce que tu disais sur|tu m'avais dit sur|pour en revenir [àa]|reparlons de|ma premi[èe]re question|la premi[èe]re question)\s*([a-zA-ZÀ-ÿ\s]*)/i;
  const returnMatch = lower.match(returnToOlderRegex);

  if (returnMatch) {
    const targetWord = returnMatch[1]?.trim().toLowerCase();
    if (lower.includes('premiere question') || lower.includes('première question')) {
      const firstUser = userMessages[0];
      if (firstUser) {
        olderTopicMatch = {
          topic: 'Première question de la discussion',
          summary: firstUser.content,
          index: 0
        };
      }
    } else if (targetWord && targetWord.length > 2) {
      for (let i = 0; i < messages.length - 1; i++) {
        const msg = messages[i];
        if (msg.content.toLowerCase().includes(targetWord)) {
          olderTopicMatch = {
            topic: targetWord,
            summary: `Échange #${i + 1} (${msg.role}): "${msg.content.slice(0, 150)}..."`,
            index: i
          };
          break;
        }
      }
    }
  }

  // 4. Extraction d'entités saillantes dans l'historique récent
  const recognizedEntities = [
    { name: 'Adam', regex: /\badam\b/i },
    { name: 'Frère', regex: /\bfr[èe]re\b/i },
    { name: 'Épouse/Femme', regex: /\b([ée]pouse|femme)\b/i },
    { name: 'Époux/Mari', regex: /\b([ée]poux|mari)\b/i },
    { name: 'Parents', regex: /\b(parents|p[èe]re|m[èe]re)\b/i },
    { name: 'Voyageur', regex: /\b(voyage|voyageur|trajet|d[ée]placement)\b/i },
    { name: 'Malade', regex: /\b(malade|maladie|couch[ée]|assis|incapacit[ée])\b/i },
    { name: 'Zakat', regex: /\bzakat\b/i },
    { name: 'Prière (Salat)', regex: /\b(pri[èe]re|salat|rak'ah|salât)\b/i },
    { name: 'Jeûne (Sawm)', regex: /\b(je[ûu]ne|ramadan|sawm)\b/i },
    { name: 'Qadar (Destin)', regex: /\b(destin|qadar|libre arbitre|pr[ée]destination|science divine)\b/i }
  ];

  let candidateEntity: string | null = referenceResolutionResult.item
    ? referenceResolutionResult.item.name
    : currentContext.currentEntity;

  if (!candidateEntity) {
    for (const ent of recognizedEntities) {
      if (ent.regex.test(lastUserMsg)) {
        candidateEntity = ent.name;
        break;
      }
    }
  }

  if (!candidateEntity) {
    for (const ent of recognizedEntities) {
      if (ent.regex.test(prevUserMsg) || ent.regex.test(lastAssistantMsg)) {
        candidateEntity = ent.name;
        break;
      }
    }
  }

  // 5. Détermination du mode probable
  let probableMode: ConversationMode = 'CONTINUATION';
  if (isNewTopicExplicit) {
    probableMode = 'NEW_TOPIC';
  } else if (olderTopicMatch) {
    probableMode = 'RETURN_TO_OLDER_TOPIC';
  } else if (referenceResolutionResult.item) {
    probableMode = 'CONTINUATION';
  } else if (currentContext.clarificationState.active) {
    probableMode = 'CLARIFICATION_ANSWER';
  } else if (detectedPronouns.length > 0 || isShortMessage) {
    probableMode = 'CONTINUATION';
  } else if (messages.length <= 1) {
    probableMode = 'NEW_TOPIC';
  }

  // 6. Chronologie sémantique
  const semanticTimeline: string[] = [];
  let userTurnCount = 0;

  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i];
    if (msg.role === 'user') {
      userTurnCount++;
      const nextAssistant = messages[i + 1]?.role === 'model' || messages[i + 1]?.role === 'assistant' 
        ? messages[i + 1].content.slice(0, 100) + '...' 
        : '';
      semanticTimeline.push(
        `Tour ${userTurnCount} [User]: "${msg.content}" -> [Assistant summary]: "${nextAssistant.replace(/\n/g, ' ')}"`
      );
    }
  }

  return {
    lastUserMsg,
    prevUserMsg,
    lastAssistantMsg,
    detectedPronouns,
    isShortMessage,
    probableMode,
    candidateEntity,
    olderTopicMatch,
    referenceResolutionResult,
    semanticTimeline: semanticTimeline.slice(-8).join('\n')
  };
}
