import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import './Conversations.css';

interface RecommendationRow {
  id: string;
  robloxUserId: string;
  recommendation: string;
  sourceType: string;
  status: string;
  createdAt: string;
}

export default function Recommendations() {
  const { csrfToken } = useAuth();
  const { t } = useSettings();
  const [items, setItems] = useState<RecommendationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<RecommendationRow | null>(null);

  useEffect(() => {
    loadData();
  }, [page, statusFilter]);

  const statusOptions = useMemo(
    () => [
      { value: 'New', label: t('statusNew') },
      { value: 'Under Revision', label: t('statusUnderRevision') },
      { value: 'In Progress', label: t('statusInProgress') },
      { value: 'Done', label: t('statusDone') },
      { value: 'Cancelled', label: t('statusCancelled') },
      { value: 'Ignored', label: t('statusIgnored') },
    ],
    [t]
  );

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/recommendations?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setItems(data.recommendations || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const response = await fetch(`/api/recommendations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, status } : item))
      );
      if (selected?.id === id) {
        setSelected({ ...selected, status });
      }
    } catch (error) {
      console.error('Error updating recommendation status:', error);
    }
  }

  function handleExport() {
    window.open('/api/export/recommendations.xlsx', '_blank');
  }

  if (loading) return <div className="loading">Loading recommendations...</div>;

  return (
    <div className="conversations">
      <div className="conversations-header">
        <h2>{t('recommendations')}</h2>
        <div className="export-buttons">
          <label className="filter-select">
            {t('filterStatus')}
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
            >
              <option value="all">{t('allStatuses')}</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button onClick={handleExport} className="export-btn">
            {t('exportXlsx')}
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>{t('robloxUserId')}</th>
              <th>{t('recommendations')}</th>
              <th>Source</th>
              <th>{t('status')}</th>
              <th>Created</th>
              <th>{t('read')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>{row.id.substring(0, 8)}...</td>
                <td>{row.robloxUserId}</td>
                <td>{row.recommendation.length > 120 ? `${row.recommendation.slice(0, 120)}...` : row.recommendation}</td>
                <td>{row.sourceType}</td>
                <td>
                  <select
                    value={row.status}
                    onChange={(event) => updateStatus(row.id, event.target.value)}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td>
                  <button className="export-btn" onClick={() => setSelected(row)}>
                    {t('read')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty">No recommendations found</div>}
      </div>

      {selected && (
        <div className="conversation-detail">
          <div className="conversations-header">
            <h3>{t('read')}</h3>
            <button className="export-btn" onClick={() => setSelected(null)}>
              {t('close')}
            </button>
          </div>
          <p>{selected.recommendation}</p>
        </div>
      )}

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
