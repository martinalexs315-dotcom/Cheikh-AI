import React, { useState, useEffect, useRef } from 'react';
import { Menu, Plus, MessageSquare, Settings, User, Send, StopCircle, PanelLeftClose, PanelLeftOpen, Copy, X, MoreHorizontal, Sun, Moon, Monitor, Info, LogOut, Trash2, CheckSquare, Square, ChevronDown, Edit2, HelpCircle, ArrowRight, CornerDownLeft, ArrowDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, ChatResponse, Conversation } from '../shared/types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToConversations, subscribeToMessages, createConversationInFirestore, saveMessageToFirestore, renameConversationInFirestore, deleteConversationInFirestore, deleteConversationsInFirestore } from '../lib/chatStore';
import { UserSettings, loadUserSettings, saveUserSettings } from '../lib/settingsStore';
import SettingsModal from './SettingsModal';
import OnboardingModal from './OnboardingModal';
import ThinkingIndicator from './ThinkingIndicator';
import VoiceRecorder from './VoiceRecorder';
import { StarterQuestion, getRandomStarterQuestions } from '../data/starterQuestions';

const formatMessageTime = (createdAt?: any): string => {
  if (!createdAt) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  try {
    let date: Date;
    if (typeof createdAt?.toMillis === 'function') {
      date = new Date(createdAt.toMillis());
    } else if (typeof createdAt?.toDate === 'function') {
      date = createdAt.toDate();
    } else if (typeof createdAt === 'object' && typeof createdAt.seconds === 'number') {
      date = new Date(createdAt.seconds * 1000);
    } else if (typeof createdAt === 'number') {
      date = new Date(createdAt);
    } else if (typeof createdAt === 'string') {
      const parsed = Date.parse(createdAt);
      date = isNaN(parsed) ? new Date() : new Date(parsed);
    } else {
      date = new Date(createdAt);
    }
    if (isNaN(date.getTime())) {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};

export function Logo({ className, animated = false, noBackground = false }: { className?: string, animated?: boolean, noBackground?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} ${animated ? 'animate-pulse' : ''}`}>
      <rect width="40" height="40" rx="12" className={`transition-all duration-300 fill-zinc-900 dark:fill-zinc-100 ${noBackground ? 'opacity-0 scale-75 origin-center' : 'opacity-100 scale-100'}`} />
      <path d="M26.5 14.5C25.5 13.5 24 12.5 22 12.5C18 12.5 14.5 15.5 14.5 20C14.5 24.5 18 27.5 22 27.5C24 27.5 25.5 26.5 26.5 25.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={`transition-colors duration-300 ${noBackground ? 'stroke-zinc-900 dark:stroke-zinc-100' : 'stroke-white dark:stroke-zinc-900'}`} />
      <circle cx="25" cy="20" r="2.5" className={`transition-colors duration-300 ${noBackground ? 'fill-zinc-900 dark:fill-zinc-100' : 'fill-white dark:fill-zinc-900'}`} />
    </svg>
  );
}

function TypewriterMarkdown({ content, isReceiving }: { content: string, isReceiving: boolean }) {
  const [hasStartedReceiving] = useState(isReceiving);
  const isNew = hasStartedReceiving;

  const [displayedContent, setDisplayedContent] = useState(isNew ? '' : content);
  
  const contentRef = useRef(content);
  contentRef.current = content;

  useEffect(() => {
    if (!isNew) {
      setDisplayedContent(content);
      return;
    }
    
    const interval = setInterval(() => {
      setDisplayedContent(curr => {
        const target = contentRef.current;
        if (curr.length >= target.length) {
          return curr;
        }
        const diff = target.length - curr.length;
        const step = Math.max(1, Math.floor(diff / 4)); 
        return target.slice(0, curr.length + step);
      });
    }, 25);
    
    return () => clearInterval(interval);
  }, [isNew]);

  const isTyping = isNew && (displayedContent.length < content.length || isReceiving);

  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({node, children, ...props}) => {
          const isLastElement = isTyping && node?.position?.end.offset === displayedContent.length;
          return (
            <p className="mb-4 last:mb-0" {...props}>
              {children}
              {isLastElement && <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-zinc-900 dark:bg-zinc-100 animate-pulse rounded-[1px]" />}
            </p>
          );
        },
        h1: ({node, ...props}) => <h1 className="text-xl font-semibold mb-4 mt-6 tracking-tight text-zinc-900 dark:text-zinc-100" {...props} />,
        h2: ({node, ...props}) => <h2 className="text-lg font-semibold mb-3 mt-5 tracking-tight text-zinc-900 dark:text-zinc-100" {...props} />,
        h3: ({node, ...props}) => <h3 className="text-base font-semibold mb-2 mt-4 tracking-tight text-zinc-900 dark:text-zinc-100" {...props} />,
        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1.5" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1.5" {...props} />,
        li: ({node, ...props}) => <li className="pl-1" {...props} />,
        blockquote: ({node, ...props}) => (
          <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-700 pl-4 py-2 my-5 text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 rounded-r-lg italic" {...props} />
        ),
        strong: ({node, ...props}) => <strong className="font-semibold text-zinc-900 dark:text-zinc-100" {...props} />,
      }}
    >
      {displayedContent}
    </ReactMarkdown>
  );
}

export default function ChatInterface() {
  const { user, loading, hasCompletedOnboarding, markOnboardingCompleted, signInWithGoogle, signOut } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [anonymousId] = useState(() => {
    let id: string | null = null;
    try {
      id = localStorage.getItem('anonymousId');
    } catch (e) {}
    if (!id) {
      id = uuidv4();
      try {
        localStorage.setItem('anonymousId', id);
      } catch (e) {}
    }
    return id;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('Réflexion...');
  const [mobileActionMsgIdx, setMobileActionMsgIdx] = useState<number | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [isTitleDropdownOpen, setIsTitleDropdownOpen] = useState(false);
  const [customInputOpenIdx, setCustomInputOpenIdx] = useState<number | null>(null);
  const [customText, setCustomText] = useState('');
  const [starterQuestions, setStarterQuestions] = useState<StarterQuestion[]>(() => getRandomStarterQuestions(3));
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  
  // Migration logic
  useEffect(() => {
    const migrateLocalToFirestore = async () => {
      if (user) {
        const localStr = localStorage.getItem('local_conversations');
        if (localStr) {
          const localConvs = JSON.parse(localStr) as Conversation[];
          if (localConvs.length > 0) {
            for (const conv of localConvs) {
              if (conv.messages.length > 0) {
                const newId = await createConversationInFirestore(user.uid, conv.messages[0].content);
                for (const msg of conv.messages) {
                  await saveMessageToFirestore(newId, user.uid, msg);
                }
                // Set active to the newly migrated conversation if it was active
                if (conv.id === activeConversationId) {
                  setActiveConversationId(newId);
                }
              }
            }
            localStorage.removeItem('local_conversations');
          }
        }
      }
    };
    migrateLocalToFirestore();
  }, [user]);

  // User Settings state
  const [settings, setSettings] = useState<UserSettings>(loadUserSettings);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return settings.theme || (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
  });

  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveUserSettings(updated);
      if (newSettings.theme) {
        setTheme(newSettings.theme);
      }
      return updated;
    });
  };

  // Safe Dialog States (eliminates blocked window.confirm / alert / prompt in iframes)
  const [convToDelete, setConvToDelete] = useState<{ id: string; title: string } | null>(null);
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [convToRename, setConvToRename] = useState<{ id: string; title: string } | null>(null);
  const [renameInputVal, setRenameInputVal] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isDisclaimerModalOpen, setIsDisclaimerModalOpen] = useState(false);

  // Onboarding States
  // The initial questions are presented ONLY when the user connects for the very first time with their account.
  // When they disconnect and reconnect another day (or on another device), hasCompletedOnboarding is saved
  // in their Firestore account profile and locally, preventing any repeat.
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      const localDone = localStorage.getItem(`onboarding_${user.uid}`) === 'true';
      if (!hasCompletedOnboarding && !localDone) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
    } else {
      setShowOnboarding(false);
    }
  }, [user, loading, hasCompletedOnboarding]);

  const handleCompleteOnboarding = async () => {
    setShowOnboarding(false);
    await markOnboardingCompleted();
  };

  // Apply theme
  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      
      const listener = (e: MediaQueryListEvent) => {
        if (theme === 'system') {
          root.classList.remove('light', 'dark');
          root.classList.add(e.matches ? 'dark' : 'light');
        }
      };
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Persisted desktop sidebar state
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isCollapsed = isDesktopSidebarCollapsed && !isMobile;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldAutoScrollToBottomRef = useRef<boolean>(true);

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsThinking(false);
  };
  
  // Load conversations
  useEffect(() => {
    let isMounted = true;
    if (loading) return; // Wait until Firebase Auth is fully initialized
    if (user) {
      console.log("[Firestore DEBUG] operation: onSnapshot, collection: conversations, auth state: authenticated, uid:", user.uid);
      const unsubscribe = subscribeToConversations(user.uid, (convs) => {
        if (isMounted) setConversations(convs);
      });
      return () => {
        isMounted = false;
        unsubscribe();
      };
    } else {
      console.log("[Firestore DEBUG] auth state: anonymous/null. No firestore listeners started.");
      const local = localStorage.getItem('local_conversations');
      if (local && isMounted) setConversations(JSON.parse(local));
      return () => { isMounted = false; };
    }
  }, [user, loading]);

  // Load messages
  useEffect(() => {
    let isMounted = true;
    if (user && activeConversationId) {
      console.log("[Firestore DEBUG] operation: onSnapshot, collection: messages, auth state: authenticated, uid:", user.uid);
      const unsubscribe = subscribeToMessages(user.uid, activeConversationId, (msgs) => {
        if (isMounted) setActiveMessages(msgs);
      });
      return () => {
        isMounted = false;
        unsubscribe();
      };
    } else if (!user && activeConversationId) {
      const conv = conversations.find(c => c.id === activeConversationId);
      if (conv && conv.messages) {
        if (isMounted) setActiveMessages(conv.messages);
      }
      return () => { isMounted = false; };
    } else if (!activeConversationId) {
      if (isMounted) setActiveMessages([]);
      return () => { isMounted = false; };
    }
  }, [user, activeConversationId]);

  const [showScrollButton, setShowScrollButton] = useState(false);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isDesktopSidebarCollapsed));
  }, [isDesktopSidebarCollapsed]);

  // Gestion intelligente du défilement
  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    // Si l'utilisateur a remonté la discussion de plus de 30px pendant la réponse, on ne force pas le défilement
    shouldAutoScrollToBottomRef.current = distanceFromBottom < 30;
    setShowScrollButton(distanceFromBottom > 30);
  };

  // Dérouler le message de manière fluide au fur et à mesure de la génération de l'IA
  useEffect(() => {
    if (settings.autoScroll && isLoading && shouldAutoScrollToBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [activeMessages, isLoading, isThinking, settings.autoScroll]);

  // Lors d'un changement de discussion, positionner à la fin
  const lastScrolledConvIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeConversationId) {
      // Seulement si on n'a pas encore scrollé pour CETTE conversation ET que les messages sont là
      if (activeConversationId !== lastScrolledConvIdRef.current && activeMessages.length > 0) {
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            shouldAutoScrollToBottomRef.current = true;
          }
        }, 50);
        lastScrolledConvIdRef.current = activeConversationId;
      }
    } else {
      // Nouvelle discussion : on réinitialise
      lastScrolledConvIdRef.current = null;
    }
  }, [activeConversationId, activeMessages]);
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const messages = activeMessages.length > 0 ? activeMessages : (activeConversation?.messages || []);

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setActiveMessages([]); // Réinitialisation stricte de l'historique
    setStarterQuestions(getRandomStarterQuestions(3));
    setIsVoiceRecording(false);
    if (window.innerWidth < 768) setIsMobileSidebarOpen(false);
  };

  const updateConversation = (id: string, newMessages: ChatMessage[]) => {
    if (id === activeConversationId || !activeConversationId) {
      setActiveMessages(newMessages);
    }
    setConversations(prev => {
      const newConvs = prev.map(conv => {
        if (conv.id === id) {
          const title = (conv.title === 'Nouvelle discussion' && newMessages.length > 0)
            ? newMessages[0].content.slice(0, 30) + (newMessages[0].content.length > 30 ? '...' : '')
            : conv.title;
          
          return { ...conv, title, messages: newMessages, updatedAt: new Date().toISOString() };
        }
        return conv;
      });
      if (!user) {
        localStorage.setItem('local_conversations', JSON.stringify(newConvs));
      }
      return newConvs;
    });
  };


  const handleRename = async (convId: string, newTitle: string) => {
    if (!newTitle.trim()) { setEditingConvId(null); return; }
    // Optimistic local state update immediately
    const updatedConvs = conversations.map(c => c.id === convId ? { ...c, title: newTitle } : c);
    setConversations(updatedConvs);
    localStorage.setItem('local_conversations', JSON.stringify(updatedConvs));

    if (user) {
      await renameConversationInFirestore(convId, newTitle).catch(console.error);
    }
    setEditingConvId(null);
  };

  const openRenameModal = (convId: string, currentTitle: string) => {
    setConvToRename({ id: convId, title: currentTitle });
    setRenameInputVal(currentTitle);
  };

  const confirmRenameModal = async () => {
    if (!convToRename) return;
    const newTitle = renameInputVal.trim();
    if (newTitle && newTitle !== convToRename.title) {
      await handleRename(convToRename.id, newTitle);
    }
    setConvToRename(null);
  };

  const handleDelete = (convId: string) => {
    const conv = conversations.find(c => c.id === convId);
    setConvToDelete({ id: convId, title: conv?.title || 'cette discussion' });
  };

  const executeDeleteConversation = async (convId: string) => {
    // 1. Optimistic removal from UI immediately
    setConversations(prev => prev.filter(c => c.id !== convId));

    // 2. Remove from localStorage
    const local = localStorage.getItem('local_conversations');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        const filtered = parsed.filter((c: any) => c.id !== convId);
        localStorage.setItem('local_conversations', JSON.stringify(filtered));
      } catch (e) {
        console.error("Local storage sync error:", e);
      }
    }

    // 3. Clear active chat if this conversation was active
    if (activeConversationId === convId) {
      setActiveConversationId(null);
      setActiveMessages([]);
    }

    setConvToDelete(null);

    // 4. Delete in Firestore if logged in
    if (user) {
      try {
        await deleteConversationInFirestore(user.uid, convId);
      } catch (e) {
        console.error("Erreur suppression Firestore:", e);
      }
    }
  };

  const handleDeleteSelected = () => {
    if (selectedConversations.size === 0) return;
    setShowDeleteSelectedModal(true);
  };

  const executeDeleteSelected = async () => {
    const idsToDelete = Array.from(selectedConversations);
    if (idsToDelete.length === 0) return;

    // 1. Optimistic removal from UI immediately
    setConversations(prev => prev.filter(c => !selectedConversations.has(c.id)));

    // 2. Remove from localStorage
    const local = localStorage.getItem('local_conversations');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        const filtered = parsed.filter((c: any) => !selectedConversations.has(c.id));
        localStorage.setItem('local_conversations', JSON.stringify(filtered));
      } catch (e) {
        console.error("Local storage bulk delete error:", e);
      }
    }

    // 3. Clear active chat if deleted
    if (activeConversationId && selectedConversations.has(activeConversationId)) {
      setActiveConversationId(null);
      setActiveMessages([]);
    }

    setSelectedConversations(new Set());
    setIsSelectionMode(false);
    setShowDeleteSelectedModal(false);

    // 4. Delete in Firestore if logged in
    if (user) {
      try {
        await deleteConversationsInFirestore(user.uid, idsToDelete);
      } catch (e) {
        console.error("Erreur suppression multiple Firestore:", e);
      }
    }
  };

  const handleCopy = (text: string, idx?: number) => {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof idx === 'number') {
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
      }
    }).catch(err => console.error('Failed to copy', err));
  };

  const handleSendMessage = async (customInput?: string) => {
    const textToSend = typeof customInput === 'string' ? customInput.trim() : input.trim();
    if (!textToSend || isLoading) return;

    let targetConvId = activeConversationId;
    let targetConv = activeConversation;
    // Préserver impérativement l'historique complet des messages actifs (mémoire conversationnelle)
    const currentHistory: ChatMessage[] = activeMessages.length > 0
      ? [...activeMessages]
      : (targetConv && targetConv.messages && targetConv.messages.length > 0 ? [...targetConv.messages] : []);

    const userMessage: ChatMessage = { 
      role: 'user', 
      content: textToSend,
      createdAt: Date.now()
    };
    const newHistory = [...currentHistory, userMessage];
    
    if (typeof customInput !== 'string') {
      setInput('');
      setTimeout(() => textareaRef.current?.focus(), 10);
    }
    setIsLoading(true);
    setIsThinking(true);
    setThinkingMessage('Réflexion...');
    
    // UI Local State update immediat
    setActiveMessages(newHistory);

    // Recentrage visuel immédiat tout en bas
    shouldAutoScrollToBottomRef.current = true;
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 40);

    const isNewConv = !targetConvId;
    let convCreationPromise = Promise.resolve();
    if (!targetConvId) {
      const newConvId = uuidv4();
      targetConvId = newConvId;
      setActiveConversationId(newConvId);
      
      const newConv: Conversation = {
        id: newConvId,
        title: userMessage.content.slice(0, 30) + (userMessage.content.length > 30 ? '...' : ''),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      };
      
      setConversations(prev => {
        const newConvs = [newConv, ...prev].slice(0, 15);
        if (!user) localStorage.setItem('local_conversations', JSON.stringify(newConvs));
        return newConvs;
      });
      
      if (user) {
        // Create conversation and return promise
        convCreationPromise = createConversationInFirestore(user.uid, userMessage.content, newConvId) as any;
      }
    }

    // Génération automatique d'un titre court et concis par l'IA si nouvelle discussion
    if (isNewConv || targetConv?.title === 'Nouvelle discussion' || (targetConv && targetConv.title.endsWith('...'))) {
      const convIdForTitle = targetConvId;
      fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: textToSend })
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.title && data.title.trim()) {
            const aiTitle = data.title.trim();
            setConversations(prev => {
              const updated = prev.map(c => c.id === convIdForTitle ? { ...c, title: aiTitle } : c);
              if (!user) localStorage.setItem('local_conversations', JSON.stringify(updated));
              return updated;
            });
            if (user) {
              renameConversationInFirestore(convIdForTitle, aiTitle).catch(console.error);
            }
          }
        })
        .catch(err => console.error("Erreur génération titre:", err));
    }
    
    updateConversation(targetConvId, newHistory);
    
    if (user) {
      const convIdToSave = targetConvId;
      // Wait for conversation to be created if it's new, then save message
      convCreationPromise.then(() => {
        saveMessageToFirestore(convIdToSave, user.uid, userMessage).catch(console.error);
      }).catch(console.error);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      let token = '';
      if (user) {
        token = await user.getIdToken();
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          messages: newHistory,
          conversationId: targetConvId,
          anonymousId: anonymousId || 'guest',
          userOptions: {
            responseStyle: settings.responseStyle,
            schoolPreference: settings.schoolPreference
          }
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMsg = 'Erreur serveur. Veuillez réessayer plus tard.';
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          errorMsg = data.error || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let modelMessageContent = "";
      let buffer = "";

      if (!reader) {
        throw new Error("Impossible de lire la réponse du serveur.");
      }

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6);
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              
              if (data.type === 'status') {
                 if (data.stage === 'COMPLETED') {
                    setIsThinking(false);
                 } else {
                    setThinkingMessage(data.message || 'Réflexion...');
                 }
              }

              if (data.type === 'clarification') {
                 setIsThinking(false);
                 if (data.clarification) {
                   const finalMsg: ChatMessage = {
                     role: 'model',
                     content: data.clarification.question,
                     createdAt: Date.now(),
                     isClarification: true,
                     clarificationOptions: data.clarification.options || [],
                     currentStep: data.clarification.currentStep,
                     totalSteps: data.clarification.totalSteps
                   };
                   const updated = [...newHistory, finalMsg];
                   setActiveMessages(updated);
                   updateConversation(targetConvId!, updated);
                   if (user) {
                     saveMessageToFirestore(targetConvId!, user.uid, finalMsg).catch(console.error);
                   }
                   continue; // Go to next line
                 }
              }
                 
              if (data.error || data.text) {
                 setIsThinking(false);
              }
                 
              if (data.error) modelMessageContent += data.error;
              else if (data.text) modelMessageContent += data.text;
              
              if (modelMessageContent) {
                const updated: ChatMessage[] = [
                  ...newHistory, 
                  { role: 'model' as const, content: modelMessageContent, createdAt: Date.now() }
                ];
                setActiveMessages(updated);
                updateConversation(targetConvId!, updated);
              }
            } catch (e) {
              console.error("Erreur de parsing SSE:", e, dataStr);
            }
          }
        }
      }
      
      // Save assistant message to Firestore if connected
      if (user && modelMessageContent) {
         const finalMsg: ChatMessage = { role: 'model', content: modelMessageContent, createdAt: Date.now() };
         saveMessageToFirestore(targetConvId!, user.uid, finalMsg).catch(console.error);
      }
      
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return;
      }
      setIsThinking(false);
      console.error(err);
      const errorMessage: ChatMessage = { 
        role: 'system', 
        content: err.message || "Le service est temporairement indisponible. Veuillez patienter quelques instants puis réessayer.",
        createdAt: Date.now()
      };
      const updated = [...newHistory, errorMessage];
      setActiveMessages(updated);
      updateConversation(targetConvId!, updated);
      
      if (user) {
         saveMessageToFirestore(targetConvId!, user.uid, errorMessage).catch(console.error);
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (settings.enterToSend) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    } else {
      // If enterToSend is false, Ctrl+Enter or Cmd+Enter sends, standard Enter creates a newline
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSendMessage();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
        <Logo className="w-12 h-12" animated />
      </div>
    );
  }

  // User limit is handled server-side mostly, but UI can hint too.
  const userMessageCount = user ? 0 : conversations.flatMap(c => c.messages).filter(m => m.role === 'user').length;
  const isMessageLimitReached = !user && userMessageCount >= 100;

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors duration-300">
      
      {/* Account Modal */}
      {isAccountOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 dark:bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsAccountOpen(false)}>
          <div className="bg-zinc-50 dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800/50">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Compte</h3>
              <button onClick={() => setIsAccountOpen(false)} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center text-center">
              {user ? (
                <>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-20 h-20 rounded-full mb-4 object-cover shadow-sm ring-4 ring-zinc-50 dark:ring-zinc-800" />
                  ) : (
                    <div className="w-20 h-20 rounded-full mb-4 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <User className="w-10 h-10" />
                    </div>
                  )}
                  <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{user.displayName || 'Utilisateur'}</h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">{user.email}</p>
                  
                  <div className="w-full space-y-2">
                    <button 
                      onClick={() => {
                        signOut();
                        setIsAccountOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 p-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 rounded-xl transition-colors font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      Se déconnecter
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full mb-4 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shadow-sm ring-4 ring-zinc-50 dark:ring-zinc-800">
                    <User className="w-10 h-10" />
                  </div>
                  <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Non connecté</h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">Connectez-vous pour conserver votre historique.</p>
                  <button 
                    onClick={() => {
                      signInWithGoogle();
                      setIsAccountOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl transition-colors font-medium active:scale-95"
                  >
                    <User className="w-4 h-4" />
                    Se connecter
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          settings={settings} 
          updateSettings={handleUpdateSettings} 
          isMobile={isMobile}
          conversations={conversations}
          setConversations={setConversations}
          onClearActiveChat={() => {
            setActiveConversationId(null);
            setActiveMessages([]);
          }}
        />
      )}

      {/* Disclaimer Modal */}
      {isDisclaimerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/20 dark:bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsDisclaimerModalOpen(false)}>
          <div className="bg-zinc-50 dark:bg-zinc-900 w-full max-w-sm rounded-3xl sm:rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-2 sm:mb-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800/50">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Info className="w-5 h-5 text-zinc-500" />
                Informations importantes
              </h3>
              <button onClick={() => setIsDisclaimerModalOpen(false)} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5 leading-relaxed">
                Cheikh IA est un outil d'accompagnement et d'apprentissage virtuel. L'intelligence artificielle ne remplace en aucun cas l'avis, la consultation et la sagesse d'un véritable savant ou d'un imam qualifié.
              </p>
              <button 
                onClick={() => setIsDisclaimerModalOpen(false)}
                className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-medium transition-transform active:scale-95"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-50 flex flex-col
        bg-[#F4F4F5] dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800/50
        transform transition-all duration-300 ease-in-out backdrop-blur-md
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-[72px]' : 'w-[260px]'}
      `}>
        
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4">
          <div className="flex items-center overflow-hidden">
            <div className={`shrink-0 flex items-center transition-all duration-300`}>
               <Logo className="w-8 h-8" animated={isLoading} noBackground={isCollapsed} />
            </div>
            <span className={`font-medium tracking-wide whitespace-nowrap transition-all duration-300 overflow-hidden inline-block ${isCollapsed ? 'opacity-0 max-w-0 ml-0' : 'opacity-100 max-w-[200px] ml-3'}`}>Cheikh IA</span>
          </div>
          
          <button 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            <Plus className="w-5 h-5 rotate-45" />
          </button>

          <button
            onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
            className={`hidden md:flex p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-all ${isDesktopSidebarCollapsed ? 'ml-0.5' : ''}`}
            title={isDesktopSidebarCollapsed ? "Développer le menu" : "Réduire le menu"}
          >
            {isDesktopSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 py-3">
          <button 
            onClick={handleNewConversation}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-3 w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm group overflow-hidden`}
            title={isCollapsed ? "Nouvelle discussion" : undefined}
          >
            <Plus className="w-4 h-4 shrink-0 text-zinc-600 dark:text-zinc-300" />
            <span className={`text-sm font-medium text-zinc-700 dark:text-zinc-200 whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Nouvelle discussion</span>
          </button>
        </div>

        {/* Search Bar */}
        {!isCollapsed && (
          <div className="px-3 pb-3">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm px-3 py-2 rounded-lg border-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-600 outline-none transition-colors"
            />
          </div>
        )}

        {/* History */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 scrollbar-thin">
          {!isCollapsed && (
            <>
              {!isCollapsed && (
                <div className="flex items-center justify-between mb-3 px-2 transition-opacity duration-300">
                  <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    Discussions
                  </div>
                  {conversations.length > 0 && (
                    <button 
                      onClick={() => {
                        setIsSelectionMode(!isSelectionMode);
                        if (isSelectionMode) setSelectedConversations(new Set());
                      }}
                      className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
                    >
                      {isSelectionMode ? 'Annuler' : 'Sélectionner'}
                    </button>
                  )}
                </div>
              )}
              {isSelectionMode && !isCollapsed && (
                <div className="flex items-center justify-between mb-3 px-3 py-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg">
                  <span className="text-xs font-medium">{selectedConversations.size} sélectionnée(s)</span>
                  <button 
                    onClick={handleDeleteSelected}
                    disabled={selectedConversations.size === 0}
                    className="text-xs font-medium disabled:opacity-50 hover:underline"
                  >
                    Supprimer
                  </button>
                </div>
              )}
              <div className="space-y-1">
                {conversations
                  .filter(conv => conv.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(conv => {
                  const isSelected = selectedConversations.has(conv.id);
                  return (
                    <div key={conv.id} className="relative group w-full flex items-center">
                      <button
                        onClick={(e) => {
                          if (isSelectionMode) {
                            e.preventDefault();
                            const newSet = new Set(selectedConversations);
                            if (isSelected) newSet.delete(conv.id);
                            else newSet.add(conv.id);
                            setSelectedConversations(newSet);
                          } else {
                            setActiveConversationId(conv.id);
                            if (window.innerWidth < 768) setIsMobileSidebarOpen(false);
                          }
                        }}
                        title={conv.title}
                        className={`w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left overflow-hidden ${
                          activeConversationId === conv.id && !isSelectionMode
                            ? 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium' 
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'
                        }`}
                      >
                        {isSelectionMode ? (
                          isSelected ? <CheckSquare className="w-4 h-4 shrink-0 text-red-500" /> : <Square className="w-4 h-4 shrink-0 opacity-40" />
                        ) : (
                          isCollapsed && <MessageSquare className={`w-4 h-4 shrink-0 ${activeConversationId === conv.id ? 'opacity-100' : 'opacity-60'}`} />
                        )}
                        <span className={`truncate transition-opacity duration-300 pr-6 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                          {conv.title}
                        </span>
                      </button>
                      
                      {/* Individual delete - hidden in selection mode */}
                      {!isSelectionMode && !isCollapsed && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(conv.id);
                          }}
                          className="absolute right-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md z-10"
                          title="Supprimer la discussion"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 space-y-1 relative">
          <button 
            onClick={() => { 
              setIsSettingsOpen(true); 
              if (window.innerWidth < 768) setIsMobileSidebarOpen(false); 
            }}
            title={isCollapsed ? "Paramètres" : undefined} 
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-lg transition-colors overflow-hidden cursor-pointer`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Paramètres</span>
          </button>

          <button 
            onClick={() => { setIsAccountOpen(true); if (window.innerWidth < 768) setIsMobileSidebarOpen(false); }}
            title={isCollapsed ? "Compte" : undefined} 
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-lg transition-colors overflow-hidden`}
          >
            {user && user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-4 h-4 rounded-full shrink-0 object-cover" />
            ) : (
              <User className="w-4 h-4 shrink-0" />
            )}
            <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Compte</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 relative transition-all duration-300 bg-[#FCFCFC] dark:bg-zinc-950">
        
        {/* Topbar Unified */}
        <div className="flex items-center justify-between p-3 border-b border-zinc-100 dark:border-zinc-900 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3 w-full">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Conversation Title Dropdown */}
            {activeConversationId && activeConversation ? (
              <div className="relative">
                <button
                  onClick={() => setIsTitleDropdownOpen(!isTitleDropdownOpen)}
                  className="flex items-center gap-2 font-medium text-sm text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <span className="max-w-[200px] sm:max-w-[300px] truncate">{activeConversation.title}</span>
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                </button>
                {isTitleDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsTitleDropdownOpen(false)}></div>
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg py-1 z-50">
                      <button
                        onClick={() => {
                          setIsTitleDropdownOpen(false);
                          openRenameModal(activeConversationId, activeConversation.title);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Renommer
                      </button>
                      <button
                        onClick={() => {
                          setIsTitleDropdownOpen(false);
                          handleDelete(activeConversationId);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <span className="font-medium text-sm flex items-center gap-2 text-zinc-800 dark:text-zinc-200 md:pl-2">
                <Logo className="w-5 h-5" animated={isLoading} />
                Nouvelle discussion
              </span>
            )}
          </div>
          
          <button onClick={handleNewConversation} className="p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg md:hidden">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Chat Area */}
        <div 
          ref={chatContainerRef}
          onScroll={handleChatScroll}
          className="flex-1 overflow-y-auto scrollbar-thin"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto animate-in fade-in duration-700">
              <div className="mb-6">
                <Logo className="w-16 h-16 shadow-sm rounded-xl" />
              </div>
              <h2 className="text-2xl md:text-3xl font-medium mb-3 tracking-tight">Que souhaitez-vous savoir ?</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mb-10 text-sm md:text-base">
                Posez votre question sur le Coran, la Sunnah ou la pratique de l'islam.
              </p>
              
              <div className="grid sm:grid-cols-3 gap-3.5 sm:gap-4 w-full">
                {starterQuestions.map((card) => (
                  <button 
                    key={card.id}
                    onClick={() => {
                      setInput(card.query);
                      textareaRef.current?.focus();
                    }}
                    className="flex flex-col text-left p-4 sm:p-4.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/60 transition-all cursor-pointer group shadow-xs hover:shadow-sm"
                  >
                    <span className="text-[11px] font-medium tracking-wider uppercase text-zinc-400 dark:text-zinc-500 mb-2">
                      {card.category}
                    </span>
                    <span className="font-semibold text-sm mb-1.5 text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                      {card.title}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {card.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="pb-36 pt-8">
              {(() => {
                const lastUserIdx = messages.map(m => m.role).lastIndexOf('user');
                const messageSpacingClass = settings.messageSpacing === 'compact' ? 'py-2.5 sm:py-3' : 'py-5';
                const fontSizeClass = settings.fontSize === 'small' ? 'text-[13.5px]' : settings.fontSize === 'large' ? 'text-[17px]' : 'text-[15px]';

                return messages.map((msg, idx) => {
                  const isLast = idx === messages.length - 1;
                  const isGenerating = isLoading && isLast && msg.role === 'model';
                  const isLatestUser = msg.role === 'user' && idx === lastUserIdx;
                  
                  return (
                    <div 
                      key={idx} 
                      ref={isLatestUser ? lastUserMessageRef : undefined}
                      className={`w-full group ${isLatestUser ? 'scroll-mt-4 sm:scroll-mt-6' : ''}`}
                  >
                    <div className={`max-w-[780px] mx-auto px-4 sm:px-6 ${messageSpacingClass} flex gap-4 md:gap-6`}>
                      <div className="flex-1 min-w-0">
                        {msg.role === 'user' ? (
                           <div className="flex flex-col items-end">
                             <div className="flex items-center gap-2 max-w-[85%]">
                               <div className={`bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 px-5 py-3.5 rounded-3xl rounded-tr-sm ${fontSizeClass} leading-relaxed whitespace-pre-wrap`}>
                                 {msg.content}
                               </div>
                             </div>
                             <div className="flex items-center gap-2 mt-1 mr-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                               <button
                                 onClick={() => handleCopy(msg.content, idx)}
                                 title="Copier le message"
                                 className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                               >
                                 <Copy className="w-3.5 h-3.5" />
                               </button>
                               {copiedIdx === idx && (
                                 <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Copié !</span>
                               )}
                               {settings.showTimestamps && (
                                 <span className="text-[10px] text-zinc-400 dark:text-zinc-500 select-none">
                                   {formatMessageTime(msg.createdAt)}
                                 </span>
                               )}
                             </div>
                           </div>
                        ) : msg.role === 'system' ? (
                           <div className="text-red-500 text-sm p-4 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900/50">
                             {msg.content}
                           </div>
                        ) : (
                           <div className="flex gap-4 md:gap-5">
                             <div className={`flex-1 min-w-0 prose prose-zinc dark:prose-invert max-w-none ${fontSizeClass} leading-relaxed relative`}>
                               {msg.isClarification && msg.clarificationOptions && msg.clarificationOptions.length > 0 ? (
                                 <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden flex flex-col not-prose mb-2">
                                   <div className="px-5 pt-5 pb-4 flex items-start justify-between relative">
                                     <div className="text-[15px] text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed max-w-none pr-8">
                                       <TypewriterMarkdown content={msg.content} isReceiving={isGenerating && isLast} />
                                       {isGenerating && (!msg.content || msg.content.endsWith('\n')) && (
                                         <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-zinc-900 dark:bg-zinc-100 animate-pulse rounded-[1px]" />
                                       )}
                                     </div>
                                     <button 
                                       onClick={() => { if(!isLoading && isLast) handleSendMessage("Je passe"); }}
                                       disabled={isLoading || !isLast}
                                       className="absolute top-5 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors disabled:opacity-50"
                                       title="Fermer"
                                     >
                                       <X className="w-4 h-4" />
                                     </button>
                                   </div>

                                   <div className="flex flex-col px-3 pb-2">
                                     {msg.clarificationOptions.map((opt, i) => {
                                       const optLabel = typeof opt === 'string' ? opt : opt.label;
                                       const optValue = typeof opt === 'string' ? opt : opt.value;
                                       const isOther = optLabel.toLowerCase().includes('autre') || (typeof opt !== 'string' && opt.isCustom);
                                       if (isOther) return null;

                                       const canClick = !isLoading && isLast;

                                       return (
                                         <div key={i} className={`relative ${i !== msg.clarificationOptions.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800/80' : ''}`}>
                                           <button
                                             type="button"
                                             onClick={() => {
                                               if (canClick) {
                                                 handleSendMessage(optValue);
                                               }
                                             }}
                                             disabled={!canClick}
                                             className={`group w-full flex items-center px-3 py-3 text-left transition-all duration-150 rounded-xl my-1 ${
                                               canClick 
                                                 ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer' 
                                                 : 'opacity-60 cursor-not-allowed'
                                             }`}
                                           >
                                             {/* Badge Numéro (remplace A, B, C...) */}
                                             <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium text-sm flex items-center justify-center shrink-0 transition-colors group-hover:bg-white dark:group-hover:bg-zinc-700">
                                               {i + 1}
                                             </div>
                                             
                                             {/* Texte de l'option */}
                                             <span className="text-[14.5px] font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 flex-1 pl-4 pr-2 leading-snug">
                                               {optLabel}
                                             </span>

                                             {/* Indicateur de clic direct (CornerDownLeft) */}
                                             {canClick && (
                                               <span className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <CornerDownLeft className="w-4 h-4" />
                                               </span>
                                             )}
                                           </button>
                                         </div>
                                       );
                                     })}
                                   </div>

                                   {/* Champ de réponse personnalisée style "Autre chose" + Bouton Passer */}
                                   <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 px-4 sm:px-5 pb-4 sm:pb-5 pt-2">
                                     <form 
                                       onSubmit={(e) => {
                                         e.preventDefault();
                                         const val = customText.trim();
                                         if (val && !isLoading && isLast) {
                                           setCustomText('');
                                           handleSendMessage(val);
                                         }
                                       }}
                                       className="flex-1 flex items-center gap-2.5 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 focus-within:bg-zinc-100 dark:focus-within:bg-zinc-800/60 rounded-xl px-3.5 py-2.5 transition-colors border border-transparent focus-within:border-zinc-200 dark:focus-within:border-zinc-700"
                                     >
                                       <Edit2 className="w-4 h-4 text-zinc-400 shrink-0" />
                                       <input 
                                         type="text"
                                         value={customText}
                                         onChange={(e) => setCustomText(e.target.value)}
                                         placeholder="Autre chose..."
                                         disabled={isLoading || !isLast}
                                         className="flex-1 min-w-0 text-[14.5px] bg-transparent border-none focus:outline-none text-zinc-800 dark:text-zinc-200 placeholder-zinc-500 disabled:opacity-50"
                                       />
                                       {customText.trim() && (
                                         <button 
                                           type="submit" 
                                           disabled={isLoading || !isLast} 
                                           className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-50 shrink-0"
                                         >
                                           <CornerDownLeft className="w-4 h-4" />
                                         </button>
                                       )}
                                     </form>

                                     <button
                                       onClick={() => { if(!isLoading && isLast) handleSendMessage("Je passe"); }}
                                       disabled={isLoading || !isLast}
                                       className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-[14.5px] font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors shrink-0 disabled:opacity-50 text-center"
                                     >
                                       Passer
                                     </button>
                                   </div>
                                 </div>
                               ) : (
                                 <>
                                   {msg.isClarification && msg.totalSteps && (
                                     <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center">
                                       <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                         Étape {msg.currentStep || 1} sur {msg.totalSteps}
                                       </span>
                                     </div>
                                   )}
                                   <TypewriterMarkdown content={msg.content} isReceiving={isGenerating && isLast} />
                                   
                                   {isGenerating && (!msg.content || msg.content.endsWith('\n')) && (
                                     <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-zinc-900 dark:bg-zinc-100 animate-pulse rounded-[1px]" />
                                   )}
                                 </>
                               )}
                               
                               {!isLoading && (
                                 <div className="flex items-center gap-2 mt-3 text-zinc-400 dark:text-zinc-500">
                                   {settings.showTimestamps && (
                                     <span className="text-[10px] select-none">
                                       {formatMessageTime(msg.createdAt)}
                                     </span>
                                   )}
                                   <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center">
                                     <button 
                                       onClick={() => handleCopy(msg.content, idx)} 
                                       title="Copier la réponse" 
                                       className="flex items-center gap-1.5 px-2 py-1 text-xs hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                                     >
                                       <Copy className="w-3.5 h-3.5" />
                                       {copiedIdx === idx ? <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Copié !</span> : null}
                                     </button>
                                   </div>
                                 </div>
                               )}
                             </div>
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })})()}
              
              {isThinking && (
                 <div className="w-full mt-4 mb-2">
                   <div className="max-w-[780px] mx-auto px-4 sm:px-6">
                      <ThinkingIndicator message={thinkingMessage} />
                   </div>
                 </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-zinc-950 dark:via-zinc-950/80 pt-10 pb-4 md:pb-6 px-4">
          <div className="max-w-[760px] mx-auto relative">
            {/* Flèche vers le bas pour aller au dernier message */}
            {showScrollButton && messages.length > 0 && (
              <div className="flex justify-center mb-2">
                <button
                  type="button"
                  onClick={() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  title="Aller tout en bas de la discussion"
                  aria-label="Aller tout en bas"
                  className="p-1.5 sm:p-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            )}
            {isMessageLimitReached ? (
              <div className="relative flex flex-col items-center justify-center p-6 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                  Limite de messages atteinte en mode invité.
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                  Connectez-vous avec Google pour continuer à discuter avec Cheikh IA et conserver vos conversations.
                </p>
                <button
                  onClick={signInWithGoogle}
                  className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors active:scale-95"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continuer avec Google
                </button>
              </div>
            ) : isVoiceRecording ? (
              <div className="relative flex items-center bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm focus-within:ring-2 focus-within:ring-zinc-900/10 dark:focus-within:ring-zinc-100/10 focus-within:border-zinc-300 dark:focus-within:border-zinc-700 transition-all overflow-hidden min-h-[52px]">
                <VoiceRecorder
                  isRecording={true}
                  onStart={() => setIsVoiceRecording(true)}
                  onCancel={() => setIsVoiceRecording(false)}
                  onConfirm={(transcribedText) => {
                    setIsVoiceRecording(false);
                    if (transcribedText.trim()) {
                      setInput(prev => (prev.trim() ? prev.trim() + ' ' + transcribedText.trim() : transcribedText.trim()));
                      setTimeout(() => textareaRef.current?.focus(), 50);
                    }
                  }}
                  disabled={isLoading}
                />
              </div>
            ) : (
              <div className="relative flex items-end bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm focus-within:ring-2 focus-within:ring-zinc-900/10 dark:focus-within:ring-zinc-100/10 focus-within:border-zinc-300 dark:focus-within:border-zinc-700 transition-all overflow-hidden">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez votre question à Cheikh IA..."
                  className="w-full max-h-52 py-3.5 pl-5 pr-20 sm:pr-24 bg-transparent border-0 focus:ring-0 resize-none text-[15px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 outline-none scrollbar-thin disabled:opacity-50"
                  style={{ minHeight: '52px' }}
                  rows={1}
                />
                <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1">
                  {!isLoading && (
                    <VoiceRecorder
                      isRecording={false}
                      onStart={() => {
                        if (!isLoading) {
                          setIsVoiceRecording(true);
                        }
                      }}
                      onCancel={() => setIsVoiceRecording(false)}
                      onConfirm={() => {}}
                      disabled={isLoading}
                    />
                  )}
                  {isLoading ? (
                    <button 
                      onClick={handleCancelRequest}
                      title="Annuler"
                      className="p-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:scale-105 active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleSendMessage()}
                      disabled={!input.trim()}
                      className={`p-1.5 rounded-full transition-all cursor-pointer ${
                        input.trim()
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:scale-105 shadow-sm' 
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600'
                      }`}
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="text-center mt-3">
              {isMobile ? (
                <button 
                  onClick={() => setIsDisclaimerModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-full text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                  Informations importantes
                </button>
              ) : (
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  Cheikh IA peut faire des erreurs. Pour les questions importantes, vérifiez auprès d'un savant qualifié.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Single Conversation Modal */}
      {convToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Supprimer la discussion ?
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement « <span className="font-medium text-zinc-900 dark:text-zinc-200">{convToDelete.title}</span> » ? Cette action est irréversible et supprimera tout son historique.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConvToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => executeDeleteConversation(convToDelete.id)}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-colors"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Multiple Selected Conversations Modal */}
      {showDeleteSelectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Supprimer la sélection ?
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement {selectedConversations.size} discussion{selectedConversations.size > 1 ? 's' : ''} ? Cette action est irréversible.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteSelectedModal(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executeDeleteSelected}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-colors"
              >
                Supprimer {selectedConversations.size} discussion{selectedConversations.size > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Conversation Modal */}
      {convToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Renommer la discussion
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); confirmRenameModal(); }}>
              <input
                type="text"
                value={renameInputVal}
                onChange={(e) => setRenameInputVal(e.target.value)}
                placeholder="Titre de la discussion"
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-sm mb-5"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConvToRename(null)}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!renameInputVal.trim()}
                  className="px-4 py-2 text-sm font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          settings={settings}
          updateSettings={handleUpdateSettings}
          onComplete={handleCompleteOnboarding}
        />
      )}
    </div>
  );
}
