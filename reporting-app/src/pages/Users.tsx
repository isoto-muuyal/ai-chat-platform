import { useEffect, useState } from 'react';
import './Users.css';

interface User {
  robloxUserId: string;
  robloxUsername: string;
  messageCount: number;
  conversationCount: number;
  lastSeen: string;
  country: string | null;
  inferredAgeRange: string | null;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);

  useEffect(() => {
    loadData();
  }, [days]);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch(`/api/users?days=${days}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div className="users">
      <div className="users-header">
        <h2>Users</h2>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Roblox User ID</th>
              <th>Username</th>
              <th>Messages</th>
              <th>Conversations</th>
              <th>Last Seen</th>
              <th>Country</th>
              <th>Age Range</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.robloxUserId}>
                <td>{user.robloxUserId}</td>
                <td>{user.robloxUsername || '-'}</td>
                <td>{user.messageCount.toLocaleString()}</td>
                <td>{user.conversationCount.toLocaleString()}</td>
                <td>{user.lastSeen ? new Date(user.lastSeen).toLocaleString() : '-'}</td>
                <td>{user.country || '-'}</td>
                <td>{user.inferredAgeRange || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="empty">No users found</div>}
      </div>
    </div>
  );
}

