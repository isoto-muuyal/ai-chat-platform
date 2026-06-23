import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PublicNav from '../components/PublicNav';
import './PublicPages.css';

export default function Signup() {
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fullName, company, email, password, plan: 'free' }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      if (data.pendingConfirmation) {
        setError(data.message || 'Check your email to confirm your account.');
        return;
      }
      await refreshMe();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="public-page">
      <PublicNav />
      <section className="signup-shell">
        <div className="signup-copy">
          <h1>Start chatting in minutes.</h1>
          <p>
            Create your account free, then buy credits as you go — no subscription required. You can
            upgrade to a Pro plan any time from Your Account once you're ready.
          </p>
          <a className="oauth-button" href="/api/auth/google">Continue with Google</a>
        </div>
        <form className="signup-form" onSubmit={submit}>
          {error && <div className="error">{error}</div>}
          <label>
            Full name
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </label>
          <label>
            Company
            <input value={company} onChange={(event) => setCompany(event.target.value)} />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create free account'}
          </button>
        </form>
      </section>
    </main>
  );
}
