import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AdminStatistics.css';

type PerClientRow = {
  account_number: number;
  full_name: string;
  company: string | null;
  balance: number;
  credits_purchased: number;
};

type Statistics = {
  totalClients: number;
  activeClientsLast30Days: number;
  totalPurchases: number;
  totalCreditsSold: number;
  totalRevenueUsd: string;
  totalCreditsConsumed: number;
  perClient: PerClientRow[];
};

export default function AdminStatistics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'sysadmin') {
      loadStats();
    }
  }, [user]);

  async function loadStats() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/statistics', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch statistics');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  }

  if (user?.role !== 'sysadmin') {
    return <div className="admin-statistics">Not authorized.</div>;
  }

  return (
    <div className="admin-statistics">
      <h2>Client &amp; Sales Statistics</h2>
      {error && <div className="error">{error}</div>}

      {loading || !stats ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total clients</div>
              <div className="stat-value">{stats.totalClients}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active last 30 days</div>
              <div className="stat-value">{stats.activeClientsLast30Days}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total purchases</div>
              <div className="stat-value">{stats.totalPurchases}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Credits sold</div>
              <div className="stat-value">{stats.totalCreditsSold}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Revenue (USD)</div>
              <div className="stat-value">${Number(stats.totalRevenueUsd).toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Credits consumed</div>
              <div className="stat-value">{stats.totalCreditsConsumed}</div>
            </div>
          </div>

          <div className="admin-table">
            <h3>Per-client breakdown</h3>
            <table>
              <thead>
                <tr>
                  <th>Account #</th>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Balance</th>
                  <th>Credits purchased</th>
                </tr>
              </thead>
              <tbody>
                {stats.perClient.map((row) => (
                  <tr key={row.account_number}>
                    <td>{row.account_number}</td>
                    <td>{row.full_name || '-'}</td>
                    <td>{row.company || '-'}</td>
                    <td>{row.balance}</td>
                    <td>{row.credits_purchased}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
