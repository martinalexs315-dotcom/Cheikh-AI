export interface UserSettings {
  // Apparence
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'normal' | 'large';
  messageSpacing: 'compact' | 'comfortable';
  showTimestamps: boolean;

  // Chat & Navigation
  enterToSend: boolean;
  autoScroll: boolean;
  quickCopy: boolean;

  // Lecture & Sources
  showSourcesByDefault: boolean;
  responseStyle: 'balanced' | 'concise' | 'detailed' | 'pedagogical';
  schoolPreference: 'all' | 'maliki' | 'hanafi' | 'shafii' | 'hanbali';
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  fontSize: 'normal',
  messageSpacing: 'comfortable',
  showTimestamps: true,
  enterToSend: true,
  autoScroll: true,
  quickCopy: true,
  showSourcesByDefault: false,
  responseStyle: 'balanced',
  schoolPreference: 'all'
};

const SETTINGS_KEY = 'cheikh_ia_user_settings';

export const loadUserSettings = (): UserSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveUserSettings = (settings: UserSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings to localStorage:", e);
  }
};
