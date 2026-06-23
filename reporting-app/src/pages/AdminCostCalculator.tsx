import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AdminCostCalculator.css';

type AiProvider = {
  id: string;
  name: string;
  input_price_per_million: string;
  output_price_per_million: string;
};

type InfrastructureCost = {
  id: string;
  provider_name: string;
  server_type: string;
  monthly_cost_usd: string;
};

const emptyProviderForm = { name: '', inputPricePerMillion: '', outputPricePerMillion: '' };
const emptyInfraForm = { providerName: '', serverType: '', monthlyCostUsd: '' };

const VOLUME_TIERS = [
  { label: '10 users', users: 10 },
  { label: '100 users', users: 100 },
  { label: '1,000 users', users: 1000 },
  { label: '5,000 users', users: 5000 },
  { label: '>5,000 users (e.g. 10,000)', users: 10000 },
];

export default function AdminCostCalculator() {
  const { user, csrfToken } = useAuth();
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [infraItems, setInfraItems] = useState<InfrastructureCost[]>([]);
  const [providerForm, setProviderForm] = useState(emptyProviderForm);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [infraForm, setInfraForm] = useState(emptyInfraForm);
  const [editingInfraId, setEditingInfraId] = useState<string | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [avgInputTokens, setAvgInputTokens] = useState('300');
  const [avgOutputTokens, setAvgOutputTokens] = useState('150');
  const [conversationsPerUserPerMonth, setConversationsPerUserPerMonth] = useState('20');
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
      const [providersRes, infraRes] = await Promise.all([
        fetch('/api/admin/ai-providers', { credentials: 'include' }),
        fetch('/api/admin/infrastructure-costs', { credentials: 'include' }),
      ]);
      if (!providersRes.ok || !infraRes.ok) throw new Error('Failed to fetch cost data');
      const providersData = await providersRes.json();
      const infraData = await infraRes.json();
      setProviders(providersData.providers || []);
      setInfraItems(infraData.items || []);
      setSelectedProviderId((current) => current || providersData.providers?.[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cost data');
    } finally {
      setLoading(false);
    }
  }

  function startCreateProvider() {
    setEditingProviderId(null);
    setProviderForm(emptyProviderForm);
    setShowAddProvider(true);
  }

  function startEditProvider(provider: AiProvider) {
    setEditingProviderId(provider.id);
    setProviderForm({
      name: provider.name,
      inputPricePerMillion: provider.input_price_per_million,
      outputPricePerMillion: provider.output_price_per_million,
    });
    setShowAddProvider(true);
  }

  async function handleSaveProvider(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const body = JSON.stringify({
        name: providerForm.name,
        inputPricePerMillion: Number(providerForm.inputPricePerMillion),
        outputPricePerMillion: Number(providerForm.outputPricePerMillion),
      });
      const response = await fetch(
        editingProviderId ? `/api/admin/ai-providers/${editingProviderId}` : '/api/admin/ai-providers',
        {
          method: editingProviderId ? 'PUT' : 'POST',
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
        throw new Error(payload.error || 'Failed to save provider');
      }
      setSuccess(editingProviderId ? 'Provider updated.' : 'Provider added.');
      setShowAddProvider(false);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save provider');
    }
  }

  async function handleDeleteProvider(id: string) {
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/admin/ai-providers/${id}`, {
        method: 'DELETE',
        headers: { ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete provider');
      if (selectedProviderId === id) setSelectedProviderId('');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete provider');
    }
  }

  function startCreateInfra() {
    setEditingInfraId(null);
    setInfraForm(emptyInfraForm);
  }

  function startEditInfra(item: InfrastructureCost) {
    setEditingInfraId(item.id);
    setInfraForm({
      providerName: item.provider_name,
      serverType: item.server_type,
      monthlyCostUsd: item.monthly_cost_usd,
    });
  }

  async function handleSaveInfra(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const body = JSON.stringify({
        providerName: infraForm.providerName,
        serverType: infraForm.serverType,
        monthlyCostUsd: Number(infraForm.monthlyCostUsd),
      });
      const response = await fetch(
        editingInfraId ? `/api/admin/infrastructure-costs/${editingInfraId}` : '/api/admin/infrastructure-costs',
        {
          method: editingInfraId ? 'PUT' : 'POST',
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
        throw new Error(payload.error || 'Failed to save infrastructure cost');
      }
      setSuccess(editingInfraId ? 'Infrastructure cost updated.' : 'Infrastructure cost added.');
      startCreateInfra();
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save infrastructure cost');
    }
  }

  async function handleDeleteInfra(id: string) {
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/admin/infrastructure-costs/${id}`, {
        method: 'DELETE',
        headers: { ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete infrastructure cost');
      if (editingInfraId === id) startCreateInfra();
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete infrastructure cost');
    }
  }

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  const costPerConversation = useMemo(() => {
    if (!selectedProvider) return 0;
    const inputTokens = Number(avgInputTokens) || 0;
    const outputTokens = Number(avgOutputTokens) || 0;
    const inputPrice = Number(selectedProvider.input_price_per_million) || 0;
    const outputPrice = Number(selectedProvider.output_price_per_million) || 0;
    return (inputTokens * inputPrice + outputTokens * outputPrice) / 1_000_000;
  }, [selectedProvider, avgInputTokens, avgOutputTokens]);

  const totalInfraMonthlyCost = useMemo(
    () => infraItems.reduce((sum, item) => sum + (Number(item.monthly_cost_usd) || 0), 0),
    [infraItems]
  );

  const tierRows = useMemo(() => {
    const perUserConversations = Number(conversationsPerUserPerMonth) || 0;
    return VOLUME_TIERS.map((tier) => {
      const conversations = tier.users * perUserConversations;
      const aiCost = conversations * costPerConversation;
      const totalCost = aiCost + totalInfraMonthlyCost;
      return {
        ...tier,
        conversations,
        aiCost,
        totalCost,
        costPerUser: tier.users > 0 ? totalCost / tier.users : 0,
      };
    });
  }, [conversationsPerUserPerMonth, costPerConversation, totalInfraMonthlyCost]);

  if (user?.role !== 'sysadmin') {
    return <div className="admin-cost-calculator">Not authorized.</div>;
  }

  return (
    <div className="admin-cost-calculator">
      <h2>Cost Calculator</h2>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="admin-form">
            <h3>1. AI provider &amp; conversation assumptions</h3>
            <div className="form-row">
              <label>
                Provider
                <select
                  value={selectedProviderId}
                  onChange={(event) => setSelectedProviderId(event.target.value)}
                >
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="add-provider-label">
                &nbsp;
                <button type="button" className="secondary" onClick={startCreateProvider}>
                  + Add another provider
                </button>
              </label>
            </div>
            <div className="form-row">
              <label>
                Avg input tokens / message
                <input
                  type="number"
                  min="0"
                  value={avgInputTokens}
                  onChange={(event) => setAvgInputTokens(event.target.value)}
                />
              </label>
              <label>
                Avg output tokens / message
                <input
                  type="number"
                  min="0"
                  value={avgOutputTokens}
                  onChange={(event) => setAvgOutputTokens(event.target.value)}
                />
              </label>
              <label>
                Conversations / user / month
                <input
                  type="number"
                  min="0"
                  value={conversationsPerUserPerMonth}
                  onChange={(event) => setConversationsPerUserPerMonth(event.target.value)}
                />
              </label>
            </div>
            <p className="hint">
              Estimated AI cost per message: <strong>${costPerConversation.toFixed(6)}</strong>
            </p>
          </div>

          {showAddProvider && (
            <form className="admin-form" onSubmit={handleSaveProvider}>
              <h3>{editingProviderId ? 'Edit AI provider' : 'New AI provider'}</h3>
              <div className="form-row">
                <label>
                  Name
                  <input
                    value={providerForm.name}
                    onChange={(event) => setProviderForm({ ...providerForm, name: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Input price (USD / 1M tokens)
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={providerForm.inputPricePerMillion}
                    onChange={(event) =>
                      setProviderForm({ ...providerForm, inputPricePerMillion: event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Output price (USD / 1M tokens)
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={providerForm.outputPricePerMillion}
                    onChange={(event) =>
                      setProviderForm({ ...providerForm, outputPricePerMillion: event.target.value })
                    }
                    required
                  />
                </label>
              </div>
              <div className="form-actions">
                <button type="submit">{editingProviderId ? 'Save changes' : 'Add provider'}</button>
                <button type="button" className="secondary" onClick={() => setShowAddProvider(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="admin-table">
            <h3>Configured AI providers</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Input $/1M tokens</th>
                  <th>Output $/1M tokens</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider) => (
                  <tr key={provider.id}>
                    <td>{provider.name}</td>
                    <td>{provider.input_price_per_million}</td>
                    <td>{provider.output_price_per_million}</td>
                    <td className="row-actions">
                      <button type="button" onClick={() => startEditProvider(provider)}>
                        Edit
                      </button>
                      <button type="button" className="danger" onClick={() => handleDeleteProvider(provider.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-table">
            <h3>2. Infrastructure costs</h3>
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Server type</th>
                  <th>Monthly cost (USD)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {infraItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.provider_name}</td>
                    <td>{item.server_type}</td>
                    <td>${Number(item.monthly_cost_usd).toFixed(2)}</td>
                    <td className="row-actions">
                      <button type="button" onClick={() => startEditInfra(item)}>
                        Edit
                      </button>
                      <button type="button" className="danger" onClick={() => handleDeleteInfra(item.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hint">
              Total monthly infrastructure cost: <strong>${totalInfraMonthlyCost.toFixed(2)}</strong>
            </p>
          </div>

          <form className="admin-form" onSubmit={handleSaveInfra}>
            <h3>{editingInfraId ? 'Edit infrastructure cost' : 'New infrastructure cost'}</h3>
            <div className="form-row">
              <label>
                Provider name
                <input
                  placeholder="e.g. AWS, DigitalOcean, Supabase"
                  value={infraForm.providerName}
                  onChange={(event) => setInfraForm({ ...infraForm, providerName: event.target.value })}
                  required
                />
              </label>
              <label>
                Server type
                <input
                  placeholder="e.g. 2 vCPU / 4GB droplet"
                  value={infraForm.serverType}
                  onChange={(event) => setInfraForm({ ...infraForm, serverType: event.target.value })}
                  required
                />
              </label>
              <label>
                Monthly cost (USD)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={infraForm.monthlyCostUsd}
                  onChange={(event) => setInfraForm({ ...infraForm, monthlyCostUsd: event.target.value })}
                  required
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit">{editingInfraId ? 'Save changes' : 'Add infrastructure cost'}</button>
              {editingInfraId && (
                <button type="button" className="secondary" onClick={startCreateInfra}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="admin-table">
            <h3>3. Monthly expenses by user volume</h3>
            <table>
              <thead>
                <tr>
                  <th>Volume</th>
                  <th>Conversations/mo</th>
                  <th>AI cost</th>
                  <th>Infra cost</th>
                  <th>Total/mo</th>
                  <th>Cost/user</th>
                </tr>
              </thead>
              <tbody>
                {tierRows.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{row.conversations.toLocaleString()}</td>
                    <td>${row.aiCost.toFixed(2)}</td>
                    <td>${totalInfraMonthlyCost.toFixed(2)}</td>
                    <td>
                      <strong>${row.totalCost.toFixed(2)}</strong>
                    </td>
                    <td>${row.costPerUser.toFixed(4)}</td>
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
