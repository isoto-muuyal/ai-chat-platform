import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Language = 'en' | 'es';
type Theme = 'light' | 'dark';

type Settings = {
  fullName: string;
  email: string;
  company: string;
  language: Language;
  theme: Theme;
};

type SettingsContextValue = {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  t: (key: keyof typeof translations) => string;
};

const defaultSettings: Settings = {
  fullName: '',
  email: '',
  company: '',
  language: 'en',
  theme: 'light',
};

const translations = {
  appTitle: { en: 'Reporting Dashboard', es: 'Panel de Reportes' },
  dashboard: { en: 'Dashboard', es: 'Tablero' },
  topics: { en: 'Topics', es: 'Temas' },
  troll: { en: 'Troll', es: 'Troll' },
  users: { en: 'Users', es: 'Usuarios' },
  conversations: { en: 'Conversations', es: 'Conversaciones' },
  recommendations: { en: 'Recommendations', es: 'Recomendaciones' },
  settings: { en: 'Settings', es: 'Ajustes' },
  welcome: { en: 'Welcome', es: 'Bienvenido' },
  logout: { en: 'Logout', es: 'Salir' },
  lightMode: { en: 'Light mode', es: 'Modo claro' },
  darkMode: { en: 'Dark mode', es: 'Modo oscuro' },
  loadingUsers: { en: 'Loading users...', es: 'Cargando usuarios...' },
  noUsers: { en: 'No users found', es: 'No se encontraron usuarios' },
  last7: { en: 'Last 7 days', es: 'Últimos 7 días' },
  last30: { en: 'Last 30 days', es: 'Últimos 30 días' },
  last90: { en: 'Last 90 days', es: 'Últimos 90 días' },
  robloxUserId: { en: 'Roblox User ID', es: 'ID de Roblox' },
  username: { en: 'Username', es: 'Usuario' },
  messages: { en: 'Messages', es: 'Mensajes' },
  conversationsCount: { en: 'Conversations', es: 'Conversaciones' },
  lastSeen: { en: 'Last Seen', es: 'Última vez' },
  country: { en: 'Country', es: 'País' },
  ageRange: { en: 'Age Range', es: 'Rango de edad' },
  fullName: { en: 'Full name', es: 'Nombre completo' },
  email: { en: 'Email', es: 'Correo' },
  company: { en: 'Company', es: 'Empresa' },
  prompt: { en: 'Prompt', es: 'Prompt' },
  sources: { en: 'Sources', es: 'Fuentes' },
  sourcesHelp: { en: 'Comma-separated list (e.g. web, roblox, discord)', es: 'Lista separada por comas (ej. web, roblox, discord)' },
  apiAccess: { en: 'API Access', es: 'Acceso API' },
  apiUrl: { en: 'API URL', es: 'URL API' },
  apiKey: { en: 'API Key', es: 'Clave API' },
  apiHeader: { en: 'Auth Header', es: 'Header de autenticación' },
  language: { en: 'Language', es: 'Idioma' },
  theme: { en: 'Theme', es: 'Tema' },
  save: { en: 'Save', es: 'Guardar' },
  currentPassword: { en: 'Current password', es: 'Contraseña actual' },
  newPassword: { en: 'New password', es: 'Nueva contraseña' },
  saved: { en: 'Saved', es: 'Guardado' },
  english: { en: 'English', es: 'Inglés' },
  spanish: { en: 'Spanish', es: 'Español' },
  light: { en: 'Light', es: 'Claro' },
  dark: { en: 'Dark', es: 'Oscuro' },
  topicsAnalysis: { en: 'Topics Analysis', es: 'Análisis de temas' },
  days: { en: 'Days', es: 'Días' },
  topN: { en: 'Top N', es: 'Top N' },
  exportXlsx: { en: 'Export XLSX', es: 'Exportar XLSX' },
  topicCountsShare: { en: 'Topic Counts and Share', es: 'Conteos y porcentaje por tema' },
  topic: { en: 'Topic', es: 'Tema' },
  count: { en: 'Count', es: 'Conteo' },
  share: { en: 'Share (%)', es: 'Porcentaje (%)' },
  topTopicsTimeseries: { en: 'Top Topics Timeseries', es: 'Serie temporal de temas principales' },
  loadingTopics: { en: 'Loading topics...', es: 'Cargando temas...' },
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === 'undefined') return defaultSettings;
    const raw = localStorage.getItem('reportingSettings');
    if (!raw) return defaultSettings;
    try {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      return { ...defaultSettings, ...parsed };
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem('reportingSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...updates }));
  };

  const t = useMemo(
    () => (key: keyof typeof translations) => translations[key][settings.language],
    [settings.language]
  );

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
