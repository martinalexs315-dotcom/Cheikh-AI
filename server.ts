import { extractReferencesFromAssistant } from './src/server/services/deterministicResolver';
import { updateSimpleContext } from './src/server/services/simpleContext';
import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import firebaseConfig from "./firebase-applet-config.json";

import { evaluateQueryIntent, generateChatResponseStream, generateConversationTitle } from "./src/server/services/ai.service";
import { analyzeClarificationNeed } from "./src/server/services/clarificationService";
import { performIslamicSearch } from "./src/server/services/search.service";
import { recordAuditLog, getAuditLogs } from "./src/server/services/audit.service";
import { captureAndIndexReferences, syncConversationReferences } from "./src/server/services/conversationMemoryService";
import { ChatMessage } from "./src/shared/types";
import { cleanInternalSourceIds } from "./src/shared/cleanSourceIds";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";

dotenv.config();

const anonymousUsage = new Map<string, number>();

export  
const app = express();
export async function startServer() {
  
  if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId
        });
        console.log("Firebase Admin initialized with service account key");
      } catch (e) {
        console.error("Firebase Admin initialization failed with service account:", e);
      }
    }

    if (getApps().length === 0) {
      try {
        initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId
        });
        console.log("Firebase Admin initialized with projectId:", firebaseConfig.projectId);
      } catch (e) {
        console.warn("Firebase Admin initializeApp with projectId failed:", e);
      }
    }
  }

   
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  app.get("/api/audit-logs", (req, res) => {
    res.json(getAuditLogs());
  });

  app.post("/api/chat", async (req, res) => {
    const reqId = "REQ-" + new Date().toISOString().replace(/[-:T.]/g, '').slice(0,14) + "-" + crypto.randomBytes(3).toString('hex').toUpperCase();
    console.log(`[REQ ${reqId}] START`);

    // We will ensure that every branch sends a response. 
    // To do that, we manage SSE connection state.
    let headersSent = false;
    const sendSSE = (data: any) => {
        if (!headersSent) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            headersSent = true;
        }
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const { messages, anonymousId, conversationId, regeneratePreviousResponse, userOptions } = req.body;
      const authHeader = req.headers.authorization;
      
      let isConnected = false;
      let decodedToken: DecodedIdToken | null = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const idToken = authHeader.split('Bearer ')[1];
        try {
          if (getApps().length > 0) {
            decodedToken = await getAuth().verifyIdToken(idToken);
            isConnected = true;
          } else {
            console.warn(`[${reqId}] Firebase App not initialized, cannot verify token`);
          }
        } catch (err: any) {
          console.warn(`[${reqId}] Invalid Firebase ID token: ${err?.message || err}`);
        }
      }

      let effectiveAnonId = anonymousId;
      if (!isConnected) {
        if (!effectiveAnonId) {
          // If the client did not supply anonymousId, derive a deterministic fallback from IP and User-Agent
          const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'localhost';
          const ua = req.headers['user-agent'] || 'client';
          effectiveAnonId = 'anon_' + crypto.createHash('md5').update(`${rawIp}_${ua}`).digest('hex').slice(0, 16);
          console.log(`[${reqId}] Using derived fallback anonymousId: ${effectiveAnonId}`);
        }
        const usage = anonymousUsage.get(effectiveAnonId) || 0;
        if (usage >= 100) {
          return res.status(403).json({ error: "LIMITE_ATTEINTE", message: "Vous avez utilisé vos messages gratuits. Connectez-vous pour continuer." });
        }
      }

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
         return res.status(400).json({ error: "Historique de conversation invalide ou vide." });
      }

      const recentMessages = messages.slice(-50);
      const validMessages: ChatMessage[] = [];
      for (const msg of recentMessages) {
        if (!msg.content || typeof msg.content !== 'string' || !['user', 'assistant', 'system', 'model'].includes(msg.role)) {
          return res.status(400).json({ error: "Format de message invalide détecté." });
        }
        if (msg.content.trim().length === 0) {
          return res.status(400).json({ error: "Un message ne peut pas être vide." });
        }
        if (msg.content.length > 8000) {
          return res.status(400).json({ error: "Un message dépasse la taille maximale autorisée (8000 caractères)." });
        }
        if (msg.role !== 'system') {
           validMessages.push(msg as ChatMessage);
        }
      }

      const lastUserMsg = validMessages.filter(m => m.role === 'user').pop()?.content || "";
      console.log(`[${reqId}] message reçu: "${lastUserMsg}"`);

      let isClientConnected = true;
      res.on('close', () => {
        if (!res.writableEnded) {
          console.log(`[${reqId}] Client disconnected before response ended`);
          isClientConnected = false;
        }
      });

      // 1. CLASSIFICATION STATE & CONVERSATIONAL MEMORY
      sendSSE({ type: 'status', stage: 'CLASSIFYING', message: 'Analyse du contexte et de la demande...' });
      
      const effectiveConvId = conversationId || (decodedToken ? decodedToken.uid : null) || effectiveAnonId || 'default';

      // Synchroniser et indexer les références des 6 derniers messages selon la directive de mémoire
      const recentContextMessages = validMessages.slice(-6);
      syncConversationReferences(effectiveConvId, recentContextMessages);

      let intent;
      try {
          intent = await evaluateQueryIntent(recentContextMessages, effectiveConvId, reqId);
          if (!isClientConnected) return;
          console.log(`[REQ ${reqId}] INTENT: ${intent.type} (mode: ${intent.mode || 'CONTINUATION'})`);
          if (intent.resolvedQuery) console.log(`[REQ ${reqId}] resolvedQuery: ${intent.resolvedQuery}`);
      } catch(e: any) {
          console.error(`[REQ ${reqId}] ERROR: Échec classification intent -`, e.message || e);
          if (isClientConnected) {
            sendSSE({ error: "Une erreur est survenue lors de l'analyse de votre demande." });
            res.write('data: [DONE]\n\n');
            res.end();
          }
          return;
      }

      // Vérification du besoin de clarification interactive pour les questions religieuses
      if (intent.type !== 'CONVERSATIONAL' && intent.type !== 'NON_RELIGIOUS') {
        try {
          const clarificationResult = await analyzeClarificationNeed(recentContextMessages, effectiveConvId);
          if (clarificationResult.needsClarification) {
            intent.type = 'RELIGIOUS_CLARIFICATION';
            intent.question = clarificationResult.question;
            intent.options = clarificationResult.options as any;
            intent.currentStep = clarificationResult.currentStep;
            intent.totalSteps = clarificationResult.totalSteps;
            console.log(`[REQ ${reqId}] CLARIFICATION DEMANDÉE : "${intent.question}" (Étape ${intent.currentStep}/${intent.totalSteps})`);
          } else if (clarificationResult.clarificationSummary) {
            intent.resolvedQuery = clarificationResult.resolvedQuery || intent.resolvedQuery;
            (intent as any).clarificationSummary = clarificationResult.clarificationSummary;
            console.log(`[REQ ${reqId}] CLARIFICATION INTÉGRÉE : ${clarificationResult.clarificationSummary}`);
          }
        } catch (err: any) {
          console.warn(`[REQ ${reqId}] Avertissement clarification:`, err.message);
        }
      }

      // 2. CONVERSATIONAL (Salutations immédiates)
      if (intent.type === 'CONVERSATIONAL') {
        sendSSE({ type: 'status', stage: 'GENERATING', message: 'Génération de la réponse...' });
        if (!isConnected && effectiveAnonId) {
          anonymousUsage.set(effectiveAnonId, (anonymousUsage.get(effectiveAnonId) || 0) + 1);
        }
        const responseText = cleanInternalSourceIds(intent.directResponse || 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?');
        sendSSE({ text: responseText });
        
        const capturedRefs = captureAndIndexReferences(effectiveConvId, responseText, 'assistant', validMessages.length);
        if (capturedRefs.length > 0) {
          sendSSE({ type: 'references', references: capturedRefs });
        }

        sendSSE({ type: 'status', stage: 'COMPLETED' });

        recordAuditLog({
          requestId: reqId,
          question: lastUserMsg,
          intent: intent.type,
          searchRequired: false,
          searchExecuted: false,
          sourcesFound: 0,
          sourcesUsed: [],
          model: 'gemini-3.8-flash',
          temperature: 0.1,
          response: responseText,
          responseType: intent.type
        });

        console.log(`[REQ ${reqId}] FIRESTORE_SAVED: ${responseText.length} caractères`);
        console.log(`[REQ ${reqId}] END`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      // 3. CLARIFICATION
      if (intent.type === 'RELIGIOUS_CLARIFICATION') {
        sendSSE({ type: 'status', stage: 'CLARIFYING', message: 'Demande de précision...' });
        if (!isConnected && effectiveAnonId) {
          anonymousUsage.set(effectiveAnonId, (anonymousUsage.get(effectiveAnonId) || 0) + 1);
        }
        
        sendSSE({ type: 'clarification', clarification: intent });
        if (intent.question) {
          const capturedRefs = captureAndIndexReferences(effectiveConvId, intent.question, 'assistant', validMessages.length);
          if (capturedRefs.length > 0) {
            sendSSE({ type: 'references', references: capturedRefs });
          }
        }
        sendSSE({ type: 'status', stage: 'COMPLETED' });

        recordAuditLog({
          requestId: reqId,
          question: lastUserMsg,
          intent: intent.type,
          searchRequired: false,
          searchExecuted: false,
          sourcesFound: 0,
          sourcesUsed: [],
          model: 'gemini-3.8-flash',
          temperature: 0.1,
          response: `Clarification demandée: ${intent.question || 'Précisez votre demande'}`,
          responseType: 'CLARIFICATION'
        });

        console.log(`[REQ ${reqId}] FIRESTORE_SAVED: Clarification demandée`);
        console.log(`[REQ ${reqId}] END`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      // 4. SEARCH & GENERATION
      let searchContext = "";
      let sourcesList: any[] = [];
      let evidenceList: any[] = [];
      
      const requiresSearch = ['GENERAL_ADVICE', 'RELIGIOUS_FACTUAL', 'FIQH_RULING', 'SENSITIVE_FATWA', 'RELIGIOUS_SEARCH'].includes(intent.type);
      const isSearchStrict = intent.type === 'FIQH_RULING' || intent.type === 'SENSITIVE_FATWA';

      if (intent.type === 'NON_RELIGIOUS') {
        searchContext = `CONSIGNE SPÉCIALE [RÉORIENTATION ISLAMIQUE NATURELLE D'UN SUJET DU QUOTIDIEN OU DU DIVERTISSEMENT] :
L'utilisateur aborde un sujet profane, sportif, de loisir ou du quotidien (ex : football, sport, jeux vidéo, séries, célébrités, etc.).
Cheikh IA ne doit PAS devenir une IA généraliste, un journaliste sportif ou un bavard profane :
- ❌ Ne réponds JAMAIS avec le score, une analyse tactique ou un compte-rendu journalistique profane.
- ❌ Ne dis JAMAIS « Je peux te donner les informations sur le match » ou « Je suis une IA spécialisée en islam, je ne peux pas parler de football ».
- ❌ N'invente JAMAIS d'expérience vécue (« J'ai regardé le match », « J'ai vu cette vidéo », « J'ai vécu cela »).
- ✅ Principe obligatoire : Comprendre le sujet de l'utilisateur → Identifier sa dimension islamique et éthique pertinente → Réorienter avec naturel, bienveillance et sagesse vers celle-ci.
- Exemples de contextualisation :
  * Si l'utilisateur demande « Tu as vu le match d'hier ? » : explique avec bienveillance que le sport et le football peuvent constituer une détente permise en soi, mais que l'attention du musulman se porte sur la manière dont ce loisir est pratiqué : qu'il ne devienne pas une cause de négligence de ses obligations (prières à l'heure), de perte excessive de temps ou de passions partisanes démesurées.
  * Si l'utilisateur évoque une pratique excessive comme « Je passe tous mes soirs à regarder le foot » : aborde avec sagesse la dimension du temps en Islam (rappel du hadith authentique sur les deux bienfaits : la santé et le temps libre - Sahih Al-Bukhari), la préservation des prières du soir et de l'aube, et la recherche de l'équilibre.
- Sois fraternel, pertinent, pédagogue et fondé sur les principes authentiques sans transformer artificiellement chaque phrase en sermon accusateur.`;
      } else if (requiresSearch) {
         sendSSE({ type: 'status', stage: 'SEARCHING', message: 'Recherche des sources autorisées...' });
         const searchQuery = intent.searchQuery || intent.resolvedQuery || lastUserMsg;
         console.log(`[REQ ${reqId}] SEARCH_START: "${searchQuery}" (type: ${intent.type})`);
         
         try {
           sourcesList = await performIslamicSearch(searchQuery);
           console.log(`[REQ ${reqId}] SEARCH_END: ${sourcesList.length} sources trouvées`);
           
           if (sourcesList.length > 0) {
             sendSSE({ type: 'sources', sources: sourcesList.map(s => ({ title: s.title, url: s.url, domain: s.domain })) });
             sendSSE({ type: 'status', stage: 'ANALYZING_SOURCES', message: 'Analyse des preuves...' });
             
             evidenceList = [];
             console.log(`[REQ ${reqId}] PREUVES: ${evidenceList.length} points validés`);
             
             const sourceDocsText = sourcesList.map(s => 
                `=== DOCUMENT [SOURCE_ID: ${s.id}] ===\nTitre: ${s.title}\nDomaine/Type: ${s.domain} (${s.sourceType})\nURL: ${s.url}\nExtrait textuel:\n${s.content}`
             ).join("\n\n");


             searchContext = `DOCUMENTS ET SOURCES FOURNIES POUR RÉPONDRE :\n${sourceDocsText}`;
           } else {
             console.log(`[REQ ${reqId}] SEARCH_END: 0 source - Adaptation du contexte (${intent.type})`);
             
             // NON-BLOCKING ADAPTED CONTEXT
             if (intent.type === 'GENERAL_ADVICE') {
               searchContext = `CONSIGNE SPÉCIALE [CONSEIL GÉNÉRAL & ORGANISATION] :
Aucune source documentaire externe spécifique n'a été extraite. La question porte sur un conseil pratique ou d'organisation spirituelle (ex: prise d'habitude, organisation de la lecture, régularité).
- Répondez avec sagesse, progressivité et bienveillance (ex: fixer des objectifs réalistes, la constance dans les petits actes, l'intention sincère).
- NE TRANSFORMEZ PAS ce conseil en fatwa ou en obligation religieuse.
- RÈGLE ABSOLUE : N'inventez aucun verset ni hadith précis.
- N'ajoutez pas systématiquement "Allahu a'lam" pour un simple conseil pratique d'organisation.`;
             } else if (intent.type === 'RELIGIOUS_FACTUAL') {
               searchContext = `CONSIGNE SPÉCIALE [QUESTION FACTUELLE / CULTURE ISLAMIQUE] :
Aucune source externe n'a été extraite en direct. Exposez les principes généraux et connus de l'Islam avec mesure et humilité.
- RÈGLE ABSOLUE : N'inventez aucun numéro de verset, aucune citation formelle de hadith ni aucune référence de livre non vérifiée.
- Si un point fait l'objet de discussions ou n'est pas vérifié, mentionnez-le avec réserve.
- Terminez par "Allahu a'lam".`;
             } else if (intent.type === 'FIQH_RULING') {
               searchContext = `CONSIGNE SPÉCIALE [FIQH & JUGEMENT JURIDIQUE SANS SOURCE VÉRIFIÉE] :
Aucune source juridique autorisée n'a pu être validée pour établir ce jugement avec certitude.
- RÈGLE STRICTE : Ne décrétez pas arbitrairement de statut (obligatoire, interdit, annulation, péché) sans preuve vérifiée.
- Reconnaissez avec humilité : "Je ne peux pas établir ce jugement avec suffisamment de certitude à partir des sources documentaires vérifiées disponibles."
- Recommandez avec respect de consulter un savant qualifié ou un imam pour ce point de fiqh.
- Terminez par "Allahu a'lam".`;
             } else if (intent.type === 'SENSITIVE_FATWA') {
               searchContext = `CONSIGNE SPÉCIALE [CAS SENSIBLE / FATWA INDIVIDUELLE] :
Cette question concerne une situation individuelle ou sensible (divorce, litige familial, mariage, apostasie).
- RÈGLE STRICTE : Ne délivrez aucune fatwa personnelle.
- Rappelez avec prudence les principes généraux sans vous prononcer sur le cas personnel.
- Recommandez impérativement à l'utilisateur de consulter directement un savant qualifié, une autorité religieuse reconnue ou un imam compétent pour son cas individuel.
- Terminez par "Allahu a'lam".`;
             } else {
               searchContext = `CONSIGNE SPÉCIALE :
Aucune source documentaire n'a été récupérée. Répondez avec prudence et humilité selon les principes généraux de l'Islam sans inventer de preuve textuelle (ni verset, ni hadith précis). Terminez par "Allahu a'lam".`;
             }
           }
         } catch (searchError: any) {
           console.error(`[REQ ${reqId}] ERROR: Recherche échouée -`, searchError.message || searchError);
           sendSSE({ error: "\n\n_La recherche des sources a échoué. Veuillez réessayer._" });
           res.write('data: [DONE]\n\n');
           res.end();
           return;
         }
      }

      if (!isConnected && effectiveAnonId) {
        anonymousUsage.set(effectiveAnonId, (anonymousUsage.get(effectiveAnonId) || 0) + 1);
      }

      // Intégrer les réponses de clarification dans le contexte de génération
      if ((intent as any).clarificationSummary) {
        searchContext += `\n\n=== CONTEXTE ET PRÉCISIONS DE CLARIFICATION DE L'UTILISATEUR ===\n${(intent as any).clarificationSummary}\nIMPORTANT : La réponse finale doit obligatoirement répondre en tenant compte à la fois de la question originale et de l'ensemble des précisions apportées par l'utilisateur. Ne pose plus de questions : donne une réponse finale concise, rigoureuse et utile.`;
      }

      // 5. GENERATING
      sendSSE({ type: 'status', stage: 'GENERATING', message: 'Préparation de la réponse finale...' });
      
      let chunkReceived = false;
      let firstTokenLogged = false;
      let fullResponseText = "";
      let generationMeta = { modelUsed: 'gemini-3.8-flash', temperature: 0.1 };
      
      try {
          let streamBuffer = "";
          const flushStreamBuffer = (forceAll = false) => {
            if (!streamBuffer) return;
            if (forceAll) {
              const cleaned = cleanInternalSourceIds(streamBuffer);
              if (cleaned) {
                sendSSE({ text: cleaned });
              }
              streamBuffer = "";
              return;
            }
            const openBracketIdx = streamBuffer.lastIndexOf('[');
            if (openBracketIdx !== -1) {
              const potentialMarker = streamBuffer.slice(openBracketIdx);
              if (potentialMarker.toUpperCase().includes('SOURCE') || !potentialMarker.includes(']')) {
                const safePart = streamBuffer.slice(0, openBracketIdx);
                if (safePart) {
                  const cleaned = cleanInternalSourceIds(safePart);
                  if (cleaned) sendSSE({ text: cleaned });
                }
                streamBuffer = potentialMarker;
                return;
              }
            }
            const cleaned = cleanInternalSourceIds(streamBuffer);
            if (cleaned) sendSSE({ text: cleaned });
            streamBuffer = "";
          };

          generationMeta = await generateChatResponseStream(
            validMessages.slice(-6), 
            searchContext, 
            (chunkText) => {
              if (!isClientConnected) return;
              if (!firstTokenLogged && chunkText) {
                console.log(`[REQ ${reqId}] FIRST_TOKEN`);
                firstTokenLogged = true;
              }
              chunkReceived = true;
              fullResponseText += chunkText;
              streamBuffer += chunkText;
              flushStreamBuffer(false);
            }, 
            regeneratePreviousResponse,
            intent,
            intent.resolvedQuery,
            reqId,
            userOptions
          );

          if (!isClientConnected) return;
          flushStreamBuffer(true);
          console.log(`[REQ ${reqId}] STREAM_END`);
          
          // Indexer immédiatement toutes les références issues de la réponse de l'IA et de ses sources
          const capturedRefs = captureAndIndexReferences(
            effectiveConvId,
            fullResponseText,
            'assistant',
            validMessages.length,
            sourcesList
          );
          if (capturedRefs.length > 0) {
            sendSSE({ type: 'references', references: capturedRefs });
          }
          
          const simpleRefs = extractReferencesFromAssistant(fullResponseText);
          updateSimpleContext(effectiveConvId, { lastAssistantReferences: simpleRefs });

          recordAuditLog({
            requestId: reqId,
            question: lastUserMsg,
            intent: intent.type,
            searchRequired: requiresSearch,
            searchExecuted: sourcesList.length > 0 || intent.searchQuery !== undefined,
            sourcesFound: sourcesList.length,
            sourcesUsed: evidenceList.map(e => e.sourceId),
            model: generationMeta.modelUsed,
            temperature: generationMeta.temperature,
            response: fullResponseText,
            responseType: intent.type
          });

          console.log(`[REQ ${reqId}] FIRESTORE_SAVED: ${fullResponseText.length} caractères`);
      } catch (genError: any) {
          console.error(`[REQ ${reqId}] ERROR: Génération échouée -`, genError.message || genError);
          if (!chunkReceived) {
              sendSSE({ error: "Une erreur est survenue lors de la génération de la réponse." });
          } else {
              sendSSE({ error: "\n\n_[Génération interrompue]_" });
          }
      }
      
      sendSSE({ type: 'status', stage: 'COMPLETED' });
      console.log(`[REQ ${reqId}] END`);
      res.write('data: [DONE]\n\n');
      res.end();

    } catch (error: any) {
      console.error(`[${reqId}] UNEXPECTED SERVER ERROR:`, error);
      if (res.headersSent) {
         res.write(`data: ${JSON.stringify({ error: "Le service est temporairement indisponible." })}\n\n`);
         res.write('data: [DONE]\n\n');
         res.end();
      } else {
         res.status(500).json({ error: "Le service est temporairement indisponible." });
      }
    }
  });

  app.post('/api/generate-title', async (req, res) => {
    try {
      const { question } = req.body;
      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return res.status(400).json({ error: "Question requise pour générer un titre." });
      }
      const title = await generateConversationTitle(question.trim());
      res.json({ title });
    } catch (err: any) {
      console.error("Erreur dans /api/generate-title:", err);
      res.status(500).json({ error: "Échec de génération du titre." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) { app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://0.0.0.0:${PORT}`)); }
}



if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  startServer();
}
