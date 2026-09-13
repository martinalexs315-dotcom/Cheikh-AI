import { AI_MODELS, BUDGET_CONFIG, ModelConfig, RiskLevel, APP_CONFIG } from '../config/ai.config';

// Stockage factice en mémoire pour la démonstration de la consommation de budget
let currentDailySpend = 0.0; 

// Mémoire des modèles temporairement indisponibles (id -> timestamp d'expiration)
const unavailableModels = new Map<string, number>();

export function markModelUnavailable(modelId: string, retryDelaySeconds: number = 30) {
  const expiry = Date.now() + retryDelaySeconds * 1000;
  unavailableModels.set(modelId, expiry);
  console.log(`[Router] Le modèle ${modelId} est marqué temporairement indisponible (Quota/Erreur) pour ${retryDelaySeconds}s.`);
}

function isModelTemporarilyUnavailable(modelId: string): boolean {
  const expiry = unavailableModels.get(modelId);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    unavailableModels.delete(modelId);
    return false;
  }
  return true;
}

export function getCurrentBudgetState() {
  return {
    spend: currentDailySpend,
    isWarning: currentDailySpend >= BUDGET_CONFIG.DAILY_BUDGET_USD * BUDGET_CONFIG.WARNING_THRESHOLD_PERCENT,
    isCritical: currentDailySpend >= BUDGET_CONFIG.DAILY_BUDGET_USD * BUDGET_CONFIG.CRITICAL_THRESHOLD_PERCENT,
    isExhausted: currentDailySpend >= BUDGET_CONFIG.DAILY_BUDGET_USD
  };
}

export function updateBudget(estimatedCost: number) {
  // En mode FREE, on ne compte pas le budget, ou du moins ce n'est qu'indicatif.
  currentDailySpend += estimatedCost;
  // console.log(`[Budget] Nouvelle dépense estimée : $${estimatedCost.toFixed(6)} | Total journalier : $${currentDailySpend.toFixed(6)}`);
}

/**
 * Routeur intelligent : sélectionne la liste des modèles applicables selon la fiabilité requise et le budget.
 */
export function getModelCascadeForQuery(riskLevel: RiskLevel): ModelConfig[] {
  const budget = getCurrentBudgetState();
  let availableModels = AI_MODELS.filter(m => m.enabled);
  
  if (APP_CONFIG.BILLING_MODE === 'FREE') {
    availableModels = availableModels.filter(m => m.billing === 'free');
  }

  if (availableModels.length === 0) {
    if (APP_CONFIG.BILLING_MODE === 'FREE') {
      throw new Error("FREE_QUOTA_EXHAUSTED");
    }
    throw new Error("Aucun modèle configuré.");
  }

  // Filtrer les modèles temporairement indisponibles (ex: 429 quota épuisé ou 503)
  availableModels = availableModels.filter(m => !isModelTemporarilyUnavailable(m.id));
  
  if (availableModels.length === 0) {
    if (APP_CONFIG.BILLING_MODE === 'FREE') {
      throw new Error("FREE_QUOTA_EXHAUSTED"); // Remplace "ALL_MODELS_TEMPORARILY_UNAVAILABLE"
    }
    throw new Error("ALL_MODELS_TEMPORARILY_UNAVAILABLE");
  }

  // 1. Définir la cascade idéale selon le niveau de risque
  let eligibleModels = [...availableModels];
  
  // Pour HIGH et CRITICAL, on garde TOUS les modèles dans la cascade (pour le fallback),
  // mais ils seront triés de toute façon par ordre de priorité.
  // Cependant, on veut s'assurer que si on n'a PAS de modèle de haute priorité dispo du tout, on prévient
  if ((riskLevel === 'CRITICAL' || riskLevel === 'HIGH')) {
    const hasHighPriority = eligibleModels.some(m => m.priority === 1);
    // Si aucun modèle de priorité 1 n'est dispo (ex: tous en timeout)
    if (!hasHighPriority) {
       console.warn(`[Router] AVERTISSEMENT : Aucun modèle de haute fiabilité n'est disponible pour une question de niveau ${riskLevel}. On tente les fallbacks.`);
    }
  } 

  // 2. Vérification du budget
  if (budget.isExhausted) {
    throw new Error("BUDGET_EXHAUSTED");
  }

  // Si on est en alerte budgétaire critique, on essaie d'éviter le modèle coûteux SAUF si c'est indispensable religieusement
  if (budget.isCritical && riskLevel !== 'CRITICAL' && riskLevel !== 'HIGH') {
    const cheaperModels = eligibleModels.filter(m => m.costTier !== 'HIGH');
    if (cheaperModels.length > 0) {
      eligibleModels = cheaperModels;
    }
  }

  // 3. Trier par ordre de préférence (la priorité la plus petite en premier)
  eligibleModels.sort((a, b) => a.priority - b.priority);

  return eligibleModels;
}

/**
 * Calcule grossièrement le coût estimé basé sur les tarifs actuels 
 * (à mettre à jour avec les vrais tarifs de l'API)
 */
export function calculateEstimatedCost(modelId: string, inputTokens: number, outputTokens: number): number | null {
  // Tarification estimative par million de tokens
  const pricingPerMillion: Record<string, { in: number, out: number }> = {
    "gemini-3.1-pro-preview": { in: 2.0, out: 12.0 },
    "gemini-3.8-flash": { in: 1.5, out: 9.0 },
    "gemini-3.1-flash-lite": { in: 0.3, out: 2.5 }
  };

  const rates = pricingPerMillion[modelId];
  if (!rates) return null; // Prix inconnu
  
  const cost = (inputTokens / 1_000_000) * rates.in + (outputTokens / 1_000_000) * rates.out;
  return cost;
}
