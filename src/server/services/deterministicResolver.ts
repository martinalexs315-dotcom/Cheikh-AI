import { ChatMessage } from '../../shared/types';
import { getSimpleContext } from './simpleContext';

export function resolveContext(
  messages: ChatMessage[],
  convId: string
): { resolvedQuery: string; needsClarification: boolean; clarificationText?: string; activeEntity?: string } {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || "";
  const lowerMsg = lastUserMessage.toLowerCase().trim();
  const ctx = getSimpleContext(convId);
  
  const isAskingAboutVerse = /(ce verset|cette sourate|ce hadith|cette citation|cette référence)/i.test(lowerMsg);
  
  if (isAskingAboutVerse) {
    const refs = ctx.lastAssistantReferences || [];
    if (refs.length === 1) {
      return { 
        resolvedQuery: `[Contexte : L'utilisateur parle de ${refs[0].label}] ${lastUserMessage}`,
        needsClarification: false
      };
    } else if (refs.length > 1) {
      return {
        resolvedQuery: lastUserMessage,
        needsClarification: true,
        clarificationText: `Tu parles de ${refs.map(r => r.label).join(' ou de ')} ?`
      };
    } else {
      return {
        resolvedQuery: lastUserMessage,
        needsClarification: true,
        clarificationText: `De quelle référence parles-tu exactement ?`
      };
    }
  }

  const hasPronoun = /\b(il|lui|elle|son|sa|ses|leur|leurs|cet homme|cette personne|ce prophète|eux|pourquoi|comment)\b/i.test(lowerMsg) || lowerMsg.startsWith('et ');
  
  if (hasPronoun && ctx.activeEntity) {
    let contextStr = `L'utilisateur fait référence à ${ctx.activeEntity.name}.`;
    if (lowerMsg.includes('épouse') || lowerMsg.includes('femme')) {
       if (ctx.activeEntity.name.toLowerCase() === 'adam') {
           contextStr = `L'utilisateur fait référence à l'épouse d'Adam (Hawwa / Ève).`;
       } else {
           contextStr = `L'utilisateur fait référence à l'épouse de ${ctx.activeEntity.name}.`;
       }
    } else if (lowerMsg.includes('descendant')) {
        contextStr = `L'utilisateur fait référence aux descendants de ${ctx.activeEntity.name}.`;
    }
    
    return {
      resolvedQuery: `Question utilisateur : "${lastUserMessage}"\nContexte résolu : ${contextStr}\nQuestion interprétée : La question porte sur ${ctx.activeEntity.name} (et/ou ses proches/descendants) dans la continuité du sujet précédent.`,
      needsClarification: false,
      activeEntity: ctx.activeEntity.name
    };
  }
  
  return {
    resolvedQuery: lastUserMessage,
    needsClarification: false,
    activeEntity: ctx.activeEntity?.name
  };
}

// Very basic extraction of entities from user message to update context
export function extractActiveEntityFromUser(message: string): string | null {
  const m = message.toLowerCase();
  if (m.includes('adam')) return 'Adam';
  if (m.includes('moussa') || m.includes('moïse')) return 'Moussa';
  if (m.includes('ibrahim') || m.includes('abraham')) return 'Ibrahim';
  if (m.includes('issa') || m.includes('jésus')) return 'Issa';
  if (m.includes('muhammad') || m.includes('mohammed') || m.includes('prophète')) return 'Muhammad ﷺ';
  if (m.includes('nuh') || m.includes('noé')) return 'Nuh';
  return null;
}

// Extract Quran references from assistant response
export function extractReferencesFromAssistant(response: string): Array<{type: string, label: string}> {
  const refs: Array<{type: string, label: string}> = [];
  // Match things like Al-Baqarah 2:37, Al-Baqarah, 2:37 or Sourate 2 verset 37
  const quranRegex = /([a-zA-Z\-]+)[,\s]+(\d+[:]\d+)/g;
  let match;
  while ((match = quranRegex.exec(response)) !== null) {
    refs.push({ type: 'QURAN', label: match[0] });
  }
  return refs;
}
