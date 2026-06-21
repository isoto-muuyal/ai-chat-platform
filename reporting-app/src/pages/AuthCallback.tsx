import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const [message, setMessage] = useState('Completing sign in...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = params.get('access_token');
    if (!accessToken) {
      setMessage('Missing Supabase access token.');
      return;
    }

    void (async () => {
      const response = await fetch('/api/auth/supabase-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accessToken }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setMessage(data.error || 'Could not complete sign in.');
        return;
      }
      await refreshMe();
      navigate('/dashboard');
    })();
  }, [navigate, refreshMe]);

  return <div className="loading">{message}</div>;
}
