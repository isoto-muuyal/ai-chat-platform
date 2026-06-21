import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AgentContext.css';

type AgentContextItem = {
  id: string;
  sourceName: string | null;
  title: string;
  content: string;
  enabled: boolean;
};

const emptyDraft = {
  id: '',
  sourceName: '',
  title: '',
  content: '',
  enabled: true,
};

export default function AgentContext() {
  const { csrfToken } = useAuth();
  const [contexts, setContexts] = useState<AgentContextItem[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const response = await fetch('/api/agent-context', { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || 'Failed to load context');
      return;
    }
    setContexts(data.contexts || []);
  }

  async function handleFile(file: File) {
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      setStatus('Only .txt and .md files are supported');
      return;
    }
    const text = await file.text();
    setDraft((current) => ({
      ...current,
      title: current.title || file.name.replace(/\.(txt|md)$/i, ''),
      content: text.slice(0, 20000),
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    const isUpdate = Boolean(draft.id);
    try {
      const response = await fetch(`/api/agent-context${isUpdate ? `/${draft.id}` : ''}`, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          title: draft.title,
          content: draft.content,
          sourceName: draft.sourceName || null,
          enabled: draft.enabled,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save context');
      }
      setDraft(emptyDraft);
      await load();
      setStatus('Saved');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save context');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/agent-context/${id}`, {
      method: 'DELETE',
      headers: {
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
      credentials: 'include',
    });
    if (response.ok) {
      await load();
      setStatus('Deleted');
    }
  }

  return (
    <div className="agent-context-page">
      <div className="page-header">
        <h2>Agent Context</h2>
        <p>Upload and manage the knowledge the agent should use during client conversations.</p>
      </div>

      <form className="context-editor" onSubmit={save}>
        <div className="context-grid">
          <label>
            Title
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
          </label>
          <label>
            Source name
            <input
              value={draft.sourceName || ''}
              onChange={(event) => setDraft({ ...draft, sourceName: event.target.value })}
              placeholder="Optional, e.g. web-main"
            />
          </label>
          <label>
            Upload .txt or .md
            <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }} />
          </label>
          <label className="enabled-row">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
            />
            Enabled
          </label>
        </div>
        <label className="content-label">
          Context content
          <textarea
            rows={12}
            value={draft.content}
            onChange={(event) => setDraft({ ...draft, content: event.target.value.slice(0, 20000) })}
            required
          />
        </label>
        <div className="context-actions">
          <button type="submit" disabled={saving}>{saving ? 'Saving...' : draft.id ? 'Update context' : 'Add context'}</button>
          {draft.id && <button type="button" onClick={() => setDraft(emptyDraft)}>Cancel edit</button>}
          {status && <span>{status}</span>}
        </div>
      </form>

      <div className="context-list">
        {contexts.map((item) => (
          <article key={item.id} className="context-row">
            <div>
              <h3>{item.title}</h3>
              <p>{item.sourceName || 'All sources'} · {item.enabled ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div className="row-actions">
              <button type="button" onClick={() => setDraft({ ...item, sourceName: item.sourceName || '' })}>Edit</button>
              <button type="button" className="danger" onClick={() => void remove(item.id)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
