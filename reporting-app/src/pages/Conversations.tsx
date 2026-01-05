import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Conversations.css';

interface Conversation {
  id: string;
  robloxUserId: string;
  robloxUsername: string;
  startedAt: string;
  lastMessageAt: string;
  topic: string | null;
  sentiment: string | null;
  messageCount: number;
}

export default function Conversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    topic: '',
    sentiment: '',
    user: '',
    is_troll: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [page, filters]);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
      });

      const response = await fetch(`/api/conversations?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setConversations(data.conversations);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function handleExport(format: 'csv' | 'xlsx') {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
    );
    window.open(`/api/export/messages.${format}?${params}`, '_blank');
  }

  if (loading) return <div className="loading">Loading conversations...</div>;

  return (
    <div className="conversations">
      <div className="conversations-header">
        <h2>Conversations</h2>
        <div className="export-buttons">
          <button onClick={() => handleExport('csv')} className="export-btn">
            Export CSV
          </button>
          <button onClick={() => handleExport('xlsx')} className="export-btn">
            Export XLSX
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Date From</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => handleFilterChange('from', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Date To</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => handleFilterChange('to', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Topic</label>
          <input
            type="text"
            value={filters.topic}
            onChange={(e) => handleFilterChange('topic', e.target.value)}
            placeholder="Enter topic"
          />
        </div>
        <div className="filter-group">
          <label>Sentiment</label>
          <select
            value={filters.sentiment}
            onChange={(e) => handleFilterChange('sentiment', e.target.value)}
          >
            <option value="">All</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
        </div>
        <div className="filter-group">
          <label>User (ID or Username)</label>
          <input
            type="text"
            value={filters.user}
            onChange={(e) => handleFilterChange('user', e.target.value)}
            placeholder="User ID or username"
          />
        </div>
        <div className="filter-group">
          <label>Is Troll</label>
          <select
            value={filters.is_troll}
            onChange={(e) => handleFilterChange('is_troll', e.target.value)}
          >
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <button onClick={() => setFilters({ from: '', to: '', topic: '', sentiment: '', user: '', is_troll: '' })} className="clear-btn">
          Clear
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Started</th>
              <th>Last Message</th>
              <th>Topic</th>
              <th>Sentiment</th>
              <th>Messages</th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((conv) => (
              <tr
                key={conv.id}
                onClick={() => navigate(`/conversations/${conv.id}`)}
                className="clickable-row"
              >
                <td>{conv.id.substring(0, 8)}...</td>
                <td>{conv.robloxUsername || conv.robloxUserId}</td>
                <td>{new Date(conv.startedAt).toLocaleString()}</td>
                <td>{new Date(conv.lastMessageAt).toLocaleString()}</td>
                <td>{conv.topic || '-'}</td>
                <td>{conv.sentiment || '-'}</td>
                <td>{conv.messageCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {conversations.length === 0 && <div className="empty">No conversations found</div>}
      </div>

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

