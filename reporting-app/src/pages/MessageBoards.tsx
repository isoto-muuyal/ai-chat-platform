import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import './MessageBoards.css';

interface MessageBoardRow {
  id?: number;
  message: string;
}

const pageSize = 10;
const maxMessageLength = 500;

export default function MessageBoards() {
  const { csrfToken } = useAuth();
  const { t } = useSettings();
  const [items, setItems] = useState<MessageBoardRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const draftPageRef = useRef<number | null>(null);

  useEffect(() => {
    if (draftPageRef.current === page) {
      return;
    }
    loadData();
  }, [page]);

  async function loadData() {
    setLoading(true);
    setStatus('');

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      const response = await fetch(`/api/message-boards?${params}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to load message boards');
      }
      const data = await response.json();
      setItems(data.messages || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setDirty(false);
      draftPageRef.current = null;
    } catch (error) {
      console.error('Error loading message boards:', error);
      setStatus(t('messageBoardsLoadError'));
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    if (items.length >= pageSize) {
      const nextPage = totalPages + 1;
      draftPageRef.current = nextPage;
      setPage(nextPage);
      setTotalPages(nextPage);
      setItems([{ message: '' }]);
      setDirty(true);
      setStatus('');
      return;
    }
    setItems((current) => [...current, { message: '' }]);
    setDirty(true);
    setStatus('');
  }

  function handleChange(index: number, message: string) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, message: message.slice(0, maxMessageLength) } : item
      )
    );
    setDirty(true);
    setStatus('');
  }

  async function handleSave() {
    setSaving(true);
    setStatus('');

    try {
      const response = await fetch('/api/message-boards', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ messages: items }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save message boards');
      }

      setStatus(t('saved'));
      await loadData();
    } catch (error) {
      console.error('Error saving message boards:', error);
      setStatus(t('messageBoardsSaveError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: MessageBoardRow, index: number) {
    setStatus('');

    if (!item.id) {
      setItems((current) => current.filter((_currentItem, itemIndex) => itemIndex !== index));
      setDirty(true);
      return;
    }

    setDeletingId(item.id);

    try {
      const response = await fetch(`/api/message-boards/${item.id}`, {
        method: 'DELETE',
        headers: {
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete message board');
      }

      setStatus(t('deleted'));
      const remainingOnPage = items.length - 1;
      if (remainingOnPage === 0 && page > 1) {
        setPage(page - 1);
      } else {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting message board:', error);
      setStatus(t('messageBoardsDeleteError'));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <div className="loading">{t('loadingMessageBoards')}</div>;
  }

  return (
    <div className="message-boards">
      <div className="message-boards-header">
        <h2>{t('messageBoards')}</h2>
        <div className="message-board-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={handleAdd}
          >
            {t('addMessageBoard')}
          </button>
          <button
            type="button"
            className="save-btn"
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? t('saving') : t('saveChanges')}
          </button>
        </div>
      </div>

      <div className="message-board-list">
        {items.length === 0 && <div className="empty">{t('noMessageBoards')}</div>}
        {items.map((item, index) => (
          <div className="message-board-item" key={item.id ?? `new-${index}`}>
            <div className="message-board-meta">
              <div className="message-board-id">{item.id ? `#${item.id}` : t('newMessageBoard')}</div>
              <button
                type="button"
                className="delete-btn"
                onClick={() => handleDelete(item, index)}
                disabled={deletingId === item.id}
              >
                {deletingId === item.id ? t('deleting') : t('delete')}
              </button>
            </div>
            <div className="message-board-editor">
              <textarea
                value={item.message}
                maxLength={maxMessageLength}
                onChange={(event) => handleChange(index, event.target.value)}
              />
              <span className="character-count">
                {item.message.length}/{maxMessageLength}
              </span>
            </div>
          </div>
        ))}
      </div>

      {status && <div className="status">{status}</div>}

      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
