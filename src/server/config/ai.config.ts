export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ModelConfig {
  id: string;
  priority: number;
  capabilities: string[];
  costTier: 'LOW' | 'MEDIUM' | 'HIGH';
  latencyTier: 'LOW' | 'MEDIUM' | 'HIGH';
  enabled: boolean;
  billing: 'free' | 'paid';
}

export const APP_CONFIG = {
  BILLING_MODE: 'FREE' as 'FREE' | 'PAID'
};

export const AI_MODELS: ModelConfig[] = [
  {
    id: "gemini-3.1-flash-lite",
    priority: 1,
    capabilities: ["general", "fast_response", "reasoning"],
    costTier: "LOW",
    latencyTier: "LOW",
    enabled: true,
    billing: 'free'
  },
  {
    id: "gemini-3.8-flash",
    priority: 2,
    capabilities: ["advanced", "reasoning"],
    costTier: "MEDIUM",
    latencyTier: "LOW",
    enabled: true,
    billing: 'free'
  },
  {
    id: "gemini-flash-latest",
    priority: 3,
    capabilities: ["fallback", "general"],
    costTier: "MEDIUM",
    latencyTier: "LOW",
    enabled: true,
    billing: 'free'
  }
];

export const BUDGET_CONFIG = {
  DAILY_BUDGET_USD: 5.0, // Example limit
  MONTHLY_BUDGET_USD: 100.0,
  WARNING_THRESHOLD_PERCENT: 0.8, // 80%
  CRITICAL_THRESHOLD_PERCENT: 0.95, // 95%
};

