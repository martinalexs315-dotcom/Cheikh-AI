export interface AuditLogEntry {
  requestId: string;
  timestamp: string;
  question: string;
  intent: string;
  searchRequired: boolean;
  searchExecuted: boolean;
  sourcesFound: number;
  sourcesUsed: number[];
  model: string;
  temperature: number;
  response: string;
  responseType: string;
  indicators: {
    hasQuranCitation: boolean;
    hasHadithCitation: boolean;
    hasScholarMention: boolean;
    hasMadhhabMention: boolean;
    hasConsensusClaim: boolean;
    hasRulingClaim: boolean;
    hasScholarConsultationRecommendation: boolean;
  };
}

const auditLogBuffer: AuditLogEntry[] = [];
const MAX_AUDIT_LOGS = 200;

export function analyzeResponseIndicators(responseText: string) {
  const text = responseText.toLowerCase();

  const hasQuranCitation = 
    /(sourate|verset|coran\s*\d+|qur['’]an|\b\d{1,3}\s*:\s*\d{1,3}\b)/i.test(text);

  const hasHadithCitation = 
    /(hadith|rapporté par|al-boukhari|bukhari|muslim|mouslim|tirmidhi|abu daoud|abou daoud|ibn majah|an-nawawi|sahih)/i.test(text);

  const hasScholarMention = 
    /(ibn taymiyya|ibn al-qayyim|al-ghazali|ibn ['’]ashir|ibn ['’]âshir|cheikh|im[aâ]m|savant|an-nawawi|ibn kathir|al-qurtubi)/i.test(text);

  const hasMadhhabMention = 
    /(malikite|mâlikite|hanafite|chafiite|châfi['’]ite|hanbalite|madhhab|école de jurisprudence|rite)/i.test(text);

  const hasConsensusClaim = 
    /(consensus|ijm[aâ]['’]|unanimité|tous les savants s['’]accordent|sans divergence)/i.test(text);

  const hasRulingClaim = 
    /(obligatoire|w[aâ]jib|fard|interdit|har[aâ]m|illicite|licite|hal[aâ]l|mubtil|invalide la pri[eè]re|p[eé]ch[eé])/i.test(text);

  const hasScholarConsultationRecommendation = 
    /(consulter un savant|savant qualifi[eé]|imam|mufti|autorit[eé] religieuse|r[eé]f[eé]rent religieux|juriste musulman)/i.test(text);

  return {
    hasQuranCitation,
    hasHadithCitation,
    hasScholarMention,
    hasMadhhabMention,
    hasConsensusClaim,
    hasRulingClaim,
    hasScholarConsultationRecommendation
  };
}

export function recordAuditLog(entry: Omit<AuditLogEntry, 'timestamp' | 'indicators'> & { indicators?: AuditLogEntry['indicators'] }): AuditLogEntry {
  const indicators = entry.indicators || analyzeResponseIndicators(entry.response);
  const fullEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    indicators
  };

  auditLogBuffer.push(fullEntry);
  if (auditLogBuffer.length > MAX_AUDIT_LOGS) {
    auditLogBuffer.shift();
  }

  console.log(`[AUDIT] [${fullEntry.requestId}] intent=${fullEntry.intent} type=${fullEntry.responseType} sources=${fullEntry.sourcesFound} quran=${indicators.hasQuranCitation} hadith=${indicators.hasHadithCitation} ruling=${indicators.hasRulingClaim} scholarReco=${indicators.hasScholarConsultationRecommendation}`);

  return fullEntry;
}

export function getAuditLogs(): AuditLogEntry[] {
  return [...auditLogBuffer];
}

export function getAuditLogByRequestId(requestId: string): AuditLogEntry | undefined {
  return auditLogBuffer.find(e => e.requestId === requestId);
}
