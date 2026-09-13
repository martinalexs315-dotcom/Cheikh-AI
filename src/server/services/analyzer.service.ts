import { RiskLevel } from '../config/ai.config';

/**
 * Service d'analyse sémantique léger pour évaluer le niveau de risque et de complexité religieuse d'une requête.
 * Ce n'est pas infaillible, le but est d'être conservateur (par défaut HIGH).
 */
export function analyzeQueryRisk(query: string): RiskLevel {
  const lowerQuery = query.toLowerCase();

  // Mots-clés indiquant une situation critique (conséquences graves/juridiques)
  const criticalKeywords = [
    'divorce', 'talaq', 'mariage', 'nikah', 'héritage', 'mirath',
    'fatwa', 'finance', 'ribâ', 'riba', 'intérêt', 'banque',
    'violence', 'meurtre', 'accusation', 'zina', 'vol',
    'suicide', 'médical', 'avortement', 'opération'
  ];

  // Mots-clés indiquant un besoin de haute fiabilité doctrinale
  const highKeywords = [
    'fiqh', 'savant', 'hadith', 'preuve', 'dalil', 'aqida',
    'croyance', 'shirk', 'bidah', 'divergence', 'ikhtilaf',
    'haram', 'halal', 'obligatoire', 'fard'
  ];

  // Mots-clés pour des questions intermédiaires (pratique quotidienne)
  const mediumKeywords = [
    'ablution', 'wudu', 'prière', 'salat', 'jeûne', 'ramadan',
    'zakat', 'hajj', 'omra', 'sounnah', 'sunnah', 'doua',
    'invocation', 'verset', 'sourate', 'tafsir'
  ];

  if (criticalKeywords.some(kw => lowerQuery.includes(kw))) {
    return 'CRITICAL';
  }

  if (highKeywords.some(kw => lowerQuery.includes(kw))) {
    return 'HIGH';
  }

  if (mediumKeywords.some(kw => lowerQuery.includes(kw))) {
    return 'MEDIUM';
  }

  // Par prudence conservatrice, si on ne sait pas, on privilégie la haute fiabilité
  return 'HIGH';
}
