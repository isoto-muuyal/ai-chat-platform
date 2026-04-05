import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './SourceManagement.css';

type DestinationProvider = 'gemini' | 'openai' | 'ollama' | 'huggingface';
type SourceType = 'roblox' | 'whatsapp' | 'web_app' | 'other';
type SourceProvider = 'api' | 'twilio_whatsapp';

type Destination = {
  name: string;
  provider: DestinationProvider;
  model: string;
  apiKey: string;
};

type Source = {
  name: string;
  sourceType: SourceType;
  provider: SourceProvider;
  destinationName: string;
  prompt: string;
  providerIdentifier: string;
  providerSecret: string;
};

const emptyDestination = (): Destination => ({
  name: '',
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  apiKey: '',
});

const emptySource = (): Source => ({
  name: '',
  sourceType: 'roblox',
  provider: 'api',
  destinationName: '',
  prompt: '',
  providerIdentifier: '',
  providerSecret: '',
});

export default function SourceManagement() {
  const { user, csrfToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiHeader, setApiHeader] = useState('x-api-key');
  const [apiKey, setApiKey] = useState('');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  async function load() {
    setLoading(true);
    setStatus('');
    try {
      const response = await fetch('/api/auth/source-management', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to load source management');
      }
      const data = await response.json();
      setApiUrl(data.apiUrl || '');
      setApiHeader(data.apiHeader || 'x-api-key');
      setApiKey(data.apiKey || '');
      setDestinations((data.destinations || []).length > 0 ? data.destinations : []);
      setSources((data.sources || []).length > 0 ? data.sources : []);
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : 'Failed to load source management');
    } finally {
      setLoading(false);
    }
  }

  function updateDestination(index: number, field: keyof Destination, value: string) {
    setDestinations((current) =>
      current.map((destination, currentIndex) =>
        currentIndex === index ? { ...destination, [field]: value } : destination
      )
    );
  }

  function updateSource(index: number, field: keyof Source, value: string) {
    setSources((current) =>
      current.map((source, currentIndex) => {
        if (currentIndex !== index) {
          return source;
        }

        if (field === 'sourceType') {
          const nextSourceType = value as SourceType;
          const provider = nextSourceType === 'whatsapp' ? 'twilio_whatsapp' : 'api';
          return { ...source, sourceType: nextSourceType, provider };
        }

        return { ...source, [field]: value };
      })
    );
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus('');

    try {
      const response = await fetch('/api/auth/source-management', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          destinations,
          sources,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save source management');
      }

      setApiUrl(data.apiUrl || '');
      setApiHeader(data.apiHeader || 'x-api-key');
      setApiKey(data.apiKey || '');
      setDestinations(data.destinations || []);
      setSources(data.sources || []);
      setStatus('Saved');
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : 'Failed to save source management');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="loading">Loading source management...</div>;
  }

  return (
    <div className="source-management">
      <div className="page-header">
        <div>
          <h2>Source Management</h2>
          <p>Configure channel sources, WhatsApp providers, and LLM destinations per account.</p>
        </div>
      </div>

      <form className="source-management-form" onSubmit={handleSave}>
        <section className="management-card">
          <div className="card-header">
            <div>
              <h3>Destinations</h3>
              <p>Each destination is an AI endpoint with its own model and API key.</p>
            </div>
            <button type="button" className="secondary-btn" onClick={() => setDestinations((current) => [...current, emptyDestination()])}>
              Add destination
            </button>
          </div>

          {destinations.length === 0 && <div className="empty-state">No destinations configured.</div>}

          <div className="stack">
            {destinations.map((destination, index) => (
              <div className="item-card" key={`destination-${index}`}>
                <div className="item-grid">
                  <label>
                    Name
                    <input
                      value={destination.name}
                      onChange={(event) => updateDestination(index, 'name', event.target.value)}
                      placeholder="default-gemini"
                    />
                  </label>
                  <label>
                    Provider
                    <select
                      value={destination.provider}
                      onChange={(event) => updateDestination(index, 'provider', event.target.value)}
                    >
                      <option value="gemini">Gemini</option>
                      <option value="openai">OpenAI</option>
                      <option value="ollama">Ollama</option>
                      <option value="huggingface">Hugging Face</option>
                    </select>
                  </label>
                  <label>
                    Model
                    <input
                      value={destination.model}
                      onChange={(event) => updateDestination(index, 'model', event.target.value)}
                      placeholder={
                        destination.provider === 'gemini'
                          ? 'gemini-2.5-flash'
                          : destination.provider === 'openai'
                            ? 'gpt-5-mini'
                            : destination.provider === 'ollama'
                              ? 'llama3.1'
                              : 'meta-llama/Llama-3.1-8B-Instruct'
                      }
                    />
                  </label>
                  <label className="span-2">
                    API key
                    <input
                      type="password"
                      value={destination.apiKey}
                      onChange={(event) => updateDestination(index, 'apiKey', event.target.value)}
                      placeholder="Provider API key"
                    />
                  </label>
                </div>
                <div className="item-actions">
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => setDestinations((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="management-card">
          <div className="card-header">
            <div>
              <h3>Sources</h3>
              <p>Each source keeps the external source type, provider, destination, and prompt.</p>
            </div>
            <button type="button" className="secondary-btn" onClick={() => setSources((current) => [...current, emptySource()])}>
              Add source
            </button>
          </div>

          {sources.length === 0 && <div className="empty-state">No sources configured.</div>}

          <div className="stack">
            {sources.map((source, index) => (
              <div className="item-card" key={`source-${index}`}>
                <div className="item-grid">
                  <label>
                    Source name
                    <input
                      value={source.name}
                      onChange={(event) => updateSource(index, 'name', event.target.value)}
                      placeholder="roblox-main"
                    />
                  </label>
                  <label>
                    Source type
                    <select
                      value={source.sourceType}
                      onChange={(event) => updateSource(index, 'sourceType', event.target.value)}
                    >
                      <option value="roblox">Roblox</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="web_app">Web app</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label>
                    Provider
                    <select
                      value={source.provider}
                      onChange={(event) => updateSource(index, 'provider', event.target.value)}
                      disabled={source.sourceType !== 'whatsapp'}
                    >
                      <option value={source.sourceType === 'whatsapp' ? 'twilio_whatsapp' : 'api'}>
                        {source.sourceType === 'whatsapp' ? 'Twilio WhatsApp' : 'Direct API'}
                      </option>
                    </select>
                  </label>
                  <label>
                    Destination
                    <select
                      value={source.destinationName}
                      onChange={(event) => updateSource(index, 'destinationName', event.target.value)}
                    >
                      <option value="">Select destination</option>
                      {destinations.map((destination) => (
                        <option key={destination.name} value={destination.name}>
                          {destination.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="span-2">
                    Prompt
                    <textarea
                      rows={4}
                      value={source.prompt}
                      onChange={(event) => updateSource(index, 'prompt', event.target.value)}
                      placeholder="Source-specific prompt"
                    />
                  </label>
                  {source.sourceType === 'whatsapp' && (
                    <>
                      <label>
                        Twilio identifier
                        <input
                          value={source.providerIdentifier}
                          onChange={(event) => updateSource(index, 'providerIdentifier', event.target.value)}
                          placeholder="whatsapp:+14155238886"
                        />
                      </label>
                      <label>
                        Twilio auth token
                        <input
                          type="password"
                          value={source.providerSecret}
                          onChange={(event) => updateSource(index, 'providerSecret', event.target.value)}
                          placeholder="Twilio auth token"
                        />
                      </label>
                    </>
                  )}
                </div>
                <div className="item-actions">
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => setSources((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="management-card">
          <div className="card-header">
            <div>
              <h3>Client API Access</h3>
              <p>External clients still call the chat API with the source name in `sourceClient`.</p>
            </div>
          </div>
          <div className="item-grid">
            <label>
              API URL
              <input readOnly value={apiUrl} />
            </label>
            <label>
              Auth header
              <input readOnly value={apiHeader} />
            </label>
            <label className="span-2">
              API key
              <input readOnly value={apiKey} />
            </label>
          </div>
        </section>

        <div className="form-footer">
          <button type="submit" className="save-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          {status && <div className="status">{status}</div>}
        </div>
      </form>
    </div>
  );
}
