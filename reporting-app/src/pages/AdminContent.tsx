import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AdminContent.css';

type CmsPageRow = {
  slug: string;
  title: string;
  content: string;
  updated_at: string;
};

export default function AdminContent() {
  const { user, csrfToken } = useAuth();
  const [pages, setPages] = useState<CmsPageRow[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.role === 'sysadmin') {
      loadPages();
    }
  }, [user]);

  async function loadPages() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/content', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch content');
      const data = await response.json();
      setPages(data.pages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch content');
    } finally {
      setLoading(false);
    }
  }

  function selectPage(page: CmsPageRow) {
    setSelectedSlug(page.slug);
    setForm({ title: page.title, content: page.content });
    setSuccess('');
    setError('');
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedSlug) return;
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/admin/content/${selectedSlug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('Failed to save content');
      setSuccess('Saved.');
      await loadPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save content');
    }
  }

  if (user?.role !== 'sysadmin') {
    return <div className="admin-content">Not authorized.</div>;
  }

  return (
    <div className="admin-content">
      <h2>Site Content</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="content-shell">
          <ul className="content-list">
            {pages.map((page) => (
              <li key={page.slug}>
                <button
                  className={page.slug === selectedSlug ? 'active' : ''}
                  onClick={() => selectPage(page)}
                >
                  {page.title}
                </button>
              </li>
            ))}
          </ul>

          {selectedSlug && (
            <form className="content-editor" onSubmit={handleSave}>
              {error && <div className="error">{error}</div>}
              {success && <div className="success">{success}</div>}
              <label>
                Title
                <input
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                />
              </label>
              <label>
                Content (HTML)
                <textarea
                  value={form.content}
                  onChange={(event) => setForm({ ...form, content: event.target.value })}
                  rows={16}
                  required
                />
              </label>
              <button type="submit">Save changes</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
