import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const { settings, updateSettings, t } = useSettings();
  const navigate = useNavigate();
  const displayName = user?.fullName || user?.email || 'User';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleToggleTheme = () => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <div className="layout">
      <nav className="public-links-bar">
        <Link to="/about">About Us</Link>
        <Link to="/how-it-works">How It Works</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/contact">Contact Us</Link>
      </nav>
      <header className="header">
        <h1>{t('appTitle')}</h1>
        <nav className="nav">
          <Link to="/dashboard">{t('dashboard')}</Link>
          <Link to="/topics">{t('topics')}</Link>
          <Link to="/troll">{t('troll')}</Link>
          <Link to="/users">{t('users')}</Link>
          <Link to="/conversations">{t('conversations')}</Link>
          <Link to="/recommendations">{t('recommendations')}</Link>
          <Link to="/message-boards">{t('messageBoards')}</Link>
          <Link to="/sources">{t('sourceManagement')}</Link>
          <Link to="/agent-context">Agent Context</Link>
          <Link to="/settings">{t('settings')}</Link>
          <Link to="/account">Your Account</Link>
          {user?.role === 'sysadmin' && (
            <>
              <Link to="/admin/clients">Clients</Link>
              <Link to="/admin/content">Content</Link>
              <Link to="/admin/paypal">PayPal</Link>
              <Link to="/admin/statistics">Statistics</Link>
            </>
          )}
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
