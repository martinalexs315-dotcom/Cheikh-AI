export type SimpleContext = {
  activeEntity?: {
    type: "PERSON" | "QURAN" | "HADITH" | "CONCEPT" | "EVENT";
    name: string;
  };
  activeTopic?: string;
  lastAssistantReferences?: Array<{
    type: string;
    label: string;
    reference?: string;
  }>;
};

const store = new Map<string, SimpleContext>();

export function getSimpleContext(convId: string): SimpleContext {
  if (!store.has(convId)) {
    store.set(convId, {});
  }
  return store.get(convId)!;
}

export function updateSimpleContext(convId: string, updates: Partial<SimpleContext>) {
  const ctx = getSimpleContext(convId);
  if (updates.activeEntity !== undefined) ctx.activeEntity = updates.activeEntity;
  if (updates.activeTopic !== undefined) ctx.activeTopic = updates.activeTopic;
  if (updates.lastAssistantReferences !== undefined) ctx.lastAssistantReferences = updates.lastAssistantReferences;
}
