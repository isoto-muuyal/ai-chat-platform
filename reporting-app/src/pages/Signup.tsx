import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './PublicPages.css';

export default function Signup() {
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
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
        body: JSON.stringify({ fullName, company, email, password, plan }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      if (data.pendingConfirmation) {
        setError(data.message || 'Check your email to confirm your account.');
        return;
      }
      if (plan === 'pro') {
        const billingResponse = await fetch('/api/billing/paypal/subscriptions', {
          method: 'POST',
          headers: {
            ...(data.csrfToken ? { 'x-csrf-token': data.csrfToken } : {}),
          },
          credentials: 'include',
        });
        const billingData = await billingResponse.json();
        if (!billingResponse.ok) {
          throw new Error(billingData.error || 'PayPal subscription failed');
        }
        if (billingData.approveUrl) {
          window.location.href = billingData.approveUrl;
          return;
        }
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
      <nav className="public-nav">
        <Link to="/about">AI Chat Platform</Link>
        <div>
          <Link to="/login">Login</Link>
        </div>
      </nav>
      <section className="signup-shell">
        <div className="signup-copy">
          <h1>Start with a free chatbot account.</h1>
          <p>Free tier includes up to 50 monthly conversations, with conversations capped at 5 user messages.</p>
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
          <div className="plan-toggle">
            <button type="button" className={plan === 'free' ? 'active' : ''} onClick={() => setPlan('free')}>Free</button>
            <button type="button" className={plan === 'pro' ? 'active' : ''} onClick={() => setPlan('pro')}>Pro with PayPal</button>
          </div>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : plan === 'pro' ? 'Sign up and pay with PayPal' : 'Create free account'}
          </button>
        </form>
      </section>
    </main>
  );
}
