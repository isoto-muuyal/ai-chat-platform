import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const { settings, updateSettings, t } = useSettings();
  const navigate = useNavigate();
  const displayName = settings.fullName || user?.username;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleToggleTheme = () => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <div className="layout">
      <header className="header">
        <h1>{t('appTitle')}</h1>
        <nav className="nav">
          <Link to="/dashboard">{t('dashboard')}</Link>
          <Link to="/topics">{t('topics')}</Link>
          <Link to="/troll">{t('troll')}</Link>
          <Link to="/users">{t('users')}</Link>
          <Link to="/conversations">{t('conversations')}</Link>
          <Link to="/settings">{t('settings')}</Link>
        </nav>
        <div className="user-info">
          <span>
            {t('welcome')}, {displayName}
          </span>
          <button type="button" onClick={handleToggleTheme} className="theme-toggle">
            {settings.theme === 'dark' ? t('lightMode') : t('darkMode')}
          </button>
          <button onClick={handleLogout} className="logout-btn">
            {t('logout')}
          </button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
