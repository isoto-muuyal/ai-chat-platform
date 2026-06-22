import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './YourAccount.css';

type Transaction = {
  id: string;
  type: 'purchase' | 'usage' | 'adjustment';
  credits: number;
  balance_after: number;
  description: string | null;
  created_at: string;
};

type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  price_usd: string;
};

type Summary = {
  balance: number;
  lifetimeConversations: number;
  lifetimeMessages: number;
  transactions: Transaction[];
  packages: CreditPackage[];
};

export default function YourAccount() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  async function loadSummary() {
    setLoading(true);
    try {
      const response = await fetch('/api/account/summary', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load account summary');
      setSummary(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account summary');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const orderId = searchParams.get('token');
    if (orderId) {
      fetch(`/api/billing/credits/capture?orderId=${encodeURIComponent(orderId)}`, { credentials: 'include' })
        .finally(() => {
          searchParams.delete('token');
          searchParams.delete('PayerID');
          setSearchParams(searchParams, { replace: true });
          loadSummary();
        });
    } else {
      loadSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBuy(packageId: string) {
    setBuyingId(packageId);
    setError('');
    try {
      const response = await fetch('/api/billing/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ packageId }),
      });
      if (!response.ok) throw new Error('Failed to start checkout');
      const order = await response.json();
      if (order.approveUrl) {
        window.location.href = order.approveUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setBuyingId(null);
    }
  }

  if (loading) {
    return <div className="your-account">Loading...</div>;
  }

  return (
    <div className="your-account">
      <h2>Your Account</h2>
      {error && <div className="error">{error}</div>}

      {summary && (
        <>
          <div className="account-stats">
            <div className="stat-card">
              <span className="stat-label">Credits remaining</span>
              <span className="stat-value">{summary.balance}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Conversations</span>
              <span className="stat-value">{summary.lifetimeConversations}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Messages sent</span>
              <span className="stat-value">{summary.lifetimeMessages}</span>
            </div>
          </div>

          <h3>Buy more credits</h3>
          <div className="package-grid">
            {summary.packages.map((pkg) => (
              <div className="package-card" key={pkg.id}>
                <h4>{pkg.name}</h4>
                <p>{pkg.credits} credits</p>
                <p className="price">${Number(pkg.price_usd).toFixed(2)}</p>
                <button onClick={() => handleBuy(pkg.id)} disabled={buyingId === pkg.id}>
                  {buyingId === pkg.id ? 'Redirecting...' : 'Buy'}
                </button>
              </div>
            ))}
          </div>

          <h3>Recent activity</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Credits</th>
                <th>Balance after</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {summary.transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.created_at).toLocaleString()}</td>
                  <td>{tx.type}</td>
                  <td>{tx.credits > 0 ? `+${tx.credits}` : tx.credits}</td>
                  <td>{tx.balance_after}</td>
                  <td>{tx.description || '-'}</td>
                </tr>
              ))}
              {summary.transactions.length === 0 && (
                <tr>
                  <td colSpan={5}>No activity yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
