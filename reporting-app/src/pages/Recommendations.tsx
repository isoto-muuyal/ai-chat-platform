import { useEffect, useState } from 'react';
import './Conversations.css';

interface RecommendationRow {
  id: string;
  robloxUserId: string;
  recommendation: string;
  sourceType: string;
  createdAt: string;
}

export default function Recommendations() {
  const [items, setItems] = useState<RecommendationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, [page]);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

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

  function handleExport() {
    window.open('/api/export/recommendations.xlsx', '_blank');
  }

  if (loading) return <div className="loading">Loading recommendations...</div>;

  return (
    <div className="conversations">
      <div className="conversations-header">
        <h2>Recommendations</h2>
        <div className="export-buttons">
          <button onClick={handleExport} className="export-btn">
            Export XLSX
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User ID</th>
              <th>Recommendation</th>
              <th>Source</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>{row.id.substring(0, 8)}...</td>
                <td>{row.robloxUserId}</td>
                <td>{row.recommendation}</td>
                <td>{row.sourceType}</td>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty">No recommendations found</div>}
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
