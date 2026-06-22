import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AdminPayPal.css';

type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  price_usd: string;
  active: boolean;
  sort_order: number;
};

type PaypalSettings = {
  environment: 'sandbox' | 'live';
  clientId: string;
  webhookId: string;
  hasSecret: boolean;
};

const emptyPackageForm = { name: '', credits: '', priceUsd: '', active: true, sortOrder: '0' };

export default function AdminPayPal() {
  const { user, csrfToken } = useAuth();
  const [settings, setSettings] = useState<PaypalSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    environment: 'sandbox',
    clientId: '',
    clientSecret: '',
    webhookId: '',
  });
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [packageForm, setPackageForm] = useState(emptyPackageForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.role === 'sysadmin') {
      loadAll();
    }
  }, [user]);

  async function loadAll() {
    setLoading(true);
    try {
      const [settingsRes, packagesRes] = await Promise.all([
        fetch('/api/admin/paypal-settings', { credentials: 'include' }),
        fetch('/api/admin/credit-packages', { credentials: 'include' }),
      ]);
      if (!settingsRes.ok || !packagesRes.ok) throw new Error('Failed to fetch PayPal data');
      const settingsData: PaypalSettings = await settingsRes.json();
      const packagesData = await packagesRes.json();
      setSettings(settingsData);
      setSettingsForm({
        environment: settingsData.environment,
        clientId: settingsData.clientId,
        clientSecret: '',
        webhookId: settingsData.webhookId,
      });
      setPackages(packagesData.packages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch PayPal data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/admin/paypal-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          environment: settingsForm.environment,
          clientId: settingsForm.clientId,
          clientSecret: settingsForm.clientSecret || undefined,
          webhookId: settingsForm.webhookId || undefined,
        }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Failed to save PayPal settings');
      }
      setSuccess('PayPal settings saved.');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save PayPal settings');
    }
  }

  function startCreatePackage() {
    setEditingId(null);
    setPackageForm(emptyPackageForm);
  }

  function startEditPackage(pkg: CreditPackage) {
    setEditingId(pkg.id);
    setPackageForm({
      name: pkg.name,
      credits: String(pkg.credits),
      priceUsd: pkg.price_usd,
      active: pkg.active,
      sortOrder: String(pkg.sort_order),
    });
  }

  async function handleSavePackage(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const body = JSON.stringify({
        name: packageForm.name,
        credits: Number(packageForm.credits),
        priceUsd: Number(packageForm.priceUsd),
        active: packageForm.active,
        sortOrder: Number(packageForm.sortOrder) || 0,
      });
      const response = await fetch(
        editingId ? `/api/admin/credit-packages/${editingId}` : '/api/admin/credit-packages',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
          },
          credentials: 'include',
          body,
        }
      );
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Failed to save credit package');
      }
      setSuccess(editingId ? 'Package updated.' : 'Package created.');
      startCreatePackage();
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credit package');
    }
  }

  async function handleDeletePackage(id: string) {
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/admin/credit-packages/${id}`, {
        method: 'DELETE',
        headers: { ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete credit package');
      if (editingId === id) startCreatePackage();
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete credit package');
    }
  }

  if (user?.role !== 'sysadmin') {
    return <div className="admin-paypal">Not authorized.</div>;
  }

  return (
    <div className="admin-paypal">
      <h2>PayPal Setup &amp; Pricing</h2>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <form className="admin-form" onSubmit={handleSaveSettings}>
            <h3>PayPal credentials</h3>
            <div className="form-row">
              <label>
                Environment
                <select
                  value={settingsForm.environment}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, environment: event.target.value })
                  }
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="live">Live</option>
                </select>
              </label>
              <label>
                Client ID
                <input
                  value={settingsForm.clientId}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, clientId: event.target.value })
                  }
                  required
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Client secret {settings?.hasSecret && <span className="hint">(secret is set, leave blank to keep)</span>}
                <input
                  type="password"
                  value={settingsForm.clientSecret}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, clientSecret: event.target.value })
                  }
                />
              </label>
              <label>
                Webhook ID
                <input
                  value={settingsForm.webhookId}
                  onChange={(event) =>
                    setSettingsForm({ ...settingsForm, webhookId: event.target.value })
                  }
                />
              </label>
            </div>
            <button type="submit">Save PayPal settings</button>
          </form>

          <div className="admin-table">
            <h3>Credit packages</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Credits</th>
                  <th>Price (USD)</th>
                  <th>Active</th>
                  <th>Sort</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td>{pkg.name}</td>
                    <td>{pkg.credits}</td>
                    <td>{pkg.price_usd}</td>
                    <td>{pkg.active ? 'Yes' : 'No'}</td>
                    <td>{pkg.sort_order}</td>
                    <td className="row-actions">
                      <button type="button" onClick={() => startEditPackage(pkg)}>
                        Edit
                      </button>
                      <button type="button" className="danger" onClick={() => handleDeletePackage(pkg.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form className="admin-form" onSubmit={handleSavePackage}>
            <h3>{editingId ? 'Edit credit package' : 'New credit package'}</h3>
            <div className="form-row">
              <label>
                Name
                <input
                  value={packageForm.name}
                  onChange={(event) => setPackageForm({ ...packageForm, name: event.target.value })}
                  required
                />
              </label>
              <label>
                Credits
                <input
                  type="number"
                  min="1"
                  value={packageForm.credits}
                  onChange={(event) => setPackageForm({ ...packageForm, credits: event.target.value })}
                  required
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Price (USD)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={packageForm.priceUsd}
                  onChange={(event) => setPackageForm({ ...packageForm, priceUsd: event.target.value })}
                  required
                />
              </label>
              <label>
                Sort order
                <input
                  type="number"
                  value={packageForm.sortOrder}
                  onChange={(event) => setPackageForm({ ...packageForm, sortOrder: event.target.value })}
                />
              </label>
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={packageForm.active}
                onChange={(event) => setPackageForm({ ...packageForm, active: event.target.checked })}
              />
              Active
            </label>
            <div className="form-actions">
              <button type="submit">{editingId ? 'Save changes' : 'Create package'}</button>
              {editingId && (
                <button type="button" className="secondary" onClick={startCreatePackage}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}
