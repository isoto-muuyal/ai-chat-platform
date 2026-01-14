import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './AuthExtras.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError('Missing reset token');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Failed to reset password');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-extra">
      <div className="auth-card">
        <h1>Reset password</h1>
        {error && <div className="error">{error}</div>}
        {done ? (
          <div className="success">
            Password updated. <Link to="/login">Return to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              New password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
