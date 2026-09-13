/**
 * Feature Flags pour Cheikh IA
 * Permet d'activer / désactiver les couches architecturales
 * selon le principe : STABILITÉ AVANT COMPLEXITÉ
 */
export const FEATURE_FLAGS = {
  // Mémoire conversationnelle simple (derniers 20 messages) vs complexe (indexation sémantique multi-niveaux)
  COMPLEX_MEMORY: false,

  // Détection d'intention par appel LLM préliminaire vs routage heuristique immédiat
  MULTI_STAGE_INTENT_LLM: false,

  // Analyse des preuves documentaires par un appel LLM préliminaire vs transmission directe au prompt
  EVIDENCE_ANALYSIS_LLM: false,

  // Questionnaire de clarification automatique strict avec tableaux A/B/C/D
  QUESTIONNAIRE_CLARIFICATION: false,

  // Délai de timeout de sécurité maximal pour une requête (en ms)
  MAX_REQUEST_TIMEOUT_MS: 40000,
};
