import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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

