export type ReferenceCategory = 'Quran' | 'Hadith' | 'People' | 'Events';

export interface ReferencedItem {
  id: string;
  type: ReferenceCategory;
  name: string;
  rawText: string;
  normalizedKey: string;
  sourceRole: 'user' | 'assistant' | 'model';
  messageIndex?: number;
  turnNumber?: number;
  timestamp?: number | string;
  metadata?: {
    surahName?: string;
    surahNumber?: number;
    ayahNumber?: number | string;
    verseText?: string;
    collection?: string;
    hadithNumber?: string | number;
    narrator?: string;
    personRole?: 'Prophet' | 'Sahaba' | 'Scholar' | 'Figure';
    eventPeriod?: string;
    description?: string;
    url?: string;
    [key: string]: any;
  };
}

export interface ClarificationOption {
  id: string;
  label: string;
  value: string;
  isCustom?: boolean;
  letter?: string;
}

export interface ClarificationState {
  active: boolean;
  originalQuestion: string;
  collectedAnswers: {
    question: string;
    answer: string;
  }[];
  currentQuestion?: string;
  options?: ClarificationOption[];
  currentStep?: number;
  totalSteps?: number;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system' | 'assistant';
  content: string;
  createdAt?: string | number;
  sources?: { title: string; url: string; domain: string }[];
  isClarification?: boolean;
  clarificationOptions?: (string | ClarificationOption)[];
  currentStep?: number;
  totalSteps?: number;
  referencedItems?: ReferencedItem[];
}

export interface ChatRequest {
  messages: ChatMessage[];
  anonymousId?: string;
  regeneratePreviousResponse?: string;
}

export interface ChatResponse {
  text?: string;
  error?: string;
  type?: 'clarification' | 'sources' | 'references';
  clarification?: any;
  sources?: any[];
  references?: ReferencedItem[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string | number;
  updatedAt: string | number;
  messages: ChatMessage[];
  userId?: string;
}
