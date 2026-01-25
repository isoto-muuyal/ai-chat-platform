import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Language = 'en' | 'es' | 'fr';
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
  appTitle: { en: 'Reporting Dashboard', es: 'Panel de Reportes', fr: 'Tableau de bord' },
  dashboard: { en: 'Dashboard', es: 'Tablero', fr: 'Tableau' },
  topics: { en: 'Topics', es: 'Temas', fr: 'Sujets' },
  troll: { en: 'Troll', es: 'Troll', fr: 'Troll' },
  users: { en: 'Users', es: 'Usuarios', fr: 'Utilisateurs' },
  conversations: { en: 'Conversations', es: 'Conversaciones', fr: 'Conversations' },
  recommendations: { en: 'Recommendations', es: 'Recomendaciones', fr: 'Recommandations' },
  settings: { en: 'Settings', es: 'Ajustes', fr: 'Paramètres' },
  welcome: { en: 'Welcome', es: 'Bienvenido', fr: 'Bienvenue' },
  logout: { en: 'Logout', es: 'Salir', fr: 'Déconnexion' },
  lightMode: { en: 'Light mode', es: 'Modo claro', fr: 'Mode clair' },
  darkMode: { en: 'Dark mode', es: 'Modo oscuro', fr: 'Mode sombre' },
  loadingUsers: { en: 'Loading users...', es: 'Cargando usuarios...', fr: 'Chargement des utilisateurs...' },
  noUsers: { en: 'No users found', es: 'No se encontraron usuarios', fr: 'Aucun utilisateur trouvé' },
  last7: { en: 'Last 7 days', es: 'Últimos 7 días', fr: '7 derniers jours' },
  last30: { en: 'Last 30 days', es: 'Últimos 30 días', fr: '30 derniers jours' },
  last90: { en: 'Last 90 days', es: 'Últimos 90 días', fr: '90 derniers jours' },
  robloxUserId: { en: 'Roblox User ID', es: 'ID de Roblox', fr: 'ID Roblox' },
  username: { en: 'Username', es: 'Usuario', fr: "Nom d'utilisateur" },
  messages: { en: 'Messages', es: 'Mensajes', fr: 'Messages' },
  conversationsCount: { en: 'Conversations', es: 'Conversaciones', fr: 'Conversations' },
  lastSeen: { en: 'Last Seen', es: 'Última vez', fr: 'Dernière activité' },
  country: { en: 'Country', es: 'País', fr: 'Pays' },
  ageRange: { en: 'Age Range', es: 'Rango de edad', fr: "Tranche d'âge" },
  fullName: { en: 'Full name', es: 'Nombre completo', fr: 'Nom complet' },
  email: { en: 'Email', es: 'Correo', fr: 'Email' },
  company: { en: 'Company', es: 'Empresa', fr: 'Société' },
  prompt: { en: 'Prompt', es: 'Prompt', fr: 'Prompt' },
  sources: { en: 'Sources', es: 'Fuentes', fr: 'Sources' },
  sourcesHelp: {
    en: 'Comma-separated list (e.g. web, roblox, discord)',
    es: 'Lista separada por comas (ej. web, roblox, discord)',
    fr: 'Liste séparée par des virgules (ex. web, roblox, discord)',
  },
  apiAccess: { en: 'API Access', es: 'Acceso API', fr: "Accès API" },
  apiUrl: { en: 'API URL', es: 'URL API', fr: "URL de l'API" },
  apiKey: { en: 'API Key', es: 'Clave API', fr: "Clé API" },
  apiHeader: { en: 'Auth Header', es: 'Header de autenticación', fr: "En-tête d'authentification" },
  language: { en: 'Language', es: 'Idioma', fr: 'Langue' },
  theme: { en: 'Theme', es: 'Tema', fr: 'Thème' },
  status: { en: 'Status', es: 'Estado', fr: 'Statut' },
  filterStatus: { en: 'Filter by status', es: 'Filtrar por estado', fr: 'Filtrer par statut' },
  allStatuses: { en: 'All statuses', es: 'Todos los estados', fr: 'Tous les statuts' },
  read: { en: 'Read', es: 'Leer', fr: 'Lire' },
  save: { en: 'Save', es: 'Guardar', fr: 'Enregistrer' },
  currentPassword: { en: 'Current password', es: 'Contraseña actual', fr: 'Mot de passe actuel' },
  newPassword: { en: 'New password', es: 'Nueva contraseña', fr: 'Nouveau mot de passe' },
  saved: { en: 'Saved', es: 'Guardado', fr: 'Enregistré' },
  close: { en: 'Close', es: 'Cerrar', fr: 'Fermer' },
  english: { en: 'English', es: 'Inglés', fr: 'Anglais' },
  spanish: { en: 'Spanish', es: 'Español', fr: 'Espagnol' },
  french: { en: 'French', es: 'Francés', fr: 'Français' },
  statusNew: { en: 'New', es: 'Nuevo', fr: 'Nouveau' },
  statusUnderRevision: { en: 'Under Revision', es: 'En revisión', fr: 'En révision' },
  statusInProgress: { en: 'In Progress', es: 'En progreso', fr: 'En cours' },
  statusDone: { en: 'Done', es: 'Hecho', fr: 'Terminé' },
  statusCancelled: { en: 'Cancelled', es: 'Cancelado', fr: 'Annulé' },
  statusIgnored: { en: 'Ignored', es: 'Ignorado', fr: 'Ignoré' },
  light: { en: 'Light', es: 'Claro', fr: 'Clair' },
  dark: { en: 'Dark', es: 'Oscuro', fr: 'Sombre' },
  topicsAnalysis: { en: 'Topics Analysis', es: 'Análisis de temas', fr: 'Analyse des sujets' },
  days: { en: 'Days', es: 'Días', fr: 'Jours' },
  topN: { en: 'Top N', es: 'Top N', fr: 'Top N' },
  exportXlsx: { en: 'Export XLSX', es: 'Exportar XLSX', fr: 'Exporter XLSX' },
  topicCountsShare: {
    en: 'Topic Counts and Share',
    es: 'Conteos y porcentaje por tema',
    fr: 'Comptes et part par sujet',
  },
  topic: { en: 'Topic', es: 'Tema', fr: 'Sujet' },
  count: { en: 'Count', es: 'Conteo', fr: 'Nombre' },
  share: { en: 'Share (%)', es: 'Porcentaje (%)', fr: 'Part (%)' },
  topTopicsTimeseries: {
    en: 'Top Topics Timeseries',
    es: 'Serie temporal de temas principales',
    fr: 'Série temporelle des sujets principaux',
  },
  loadingTopics: { en: 'Loading topics...', es: 'Cargando temas...', fr: 'Chargement des sujets...' },
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
