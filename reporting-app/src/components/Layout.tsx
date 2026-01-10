import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

type Theme = 'light' | 'dark';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleToggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="layout">
      <header className="header">
        <h1>Reporting Dashboard</h1>
        <nav className="nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/topics">Topics</Link>
          <Link to="/troll">Troll</Link>
          <Link to="/users">Users</Link>
          <Link to="/conversations">Conversations</Link>
        </nav>
        <div className="user-info">
          <span>Welcome, {user?.username}</span>
          <button type="button" onClick={handleToggleTheme} className="theme-toggle">
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
