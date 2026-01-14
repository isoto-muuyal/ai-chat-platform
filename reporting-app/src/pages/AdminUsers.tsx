import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AdminUsers.css';

type AppUser = {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
  role: 'sysadmin' | 'user';
  account_number: number;
  language: string;
  theme: string;
  created_at: string;
};

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    company: '',
    password: '',
    role: 'user',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.role === 'sysadmin') {
      loadUsers();
    }
  }, [user]);

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          company: form.company || null,
          password: form.password,
          role: form.role === 'sysadmin' ? 'sysadmin' : 'user',
        }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Failed to create user');
      }
      setForm({ fullName: '', email: '', company: '', password: '', role: 'user' });
      setSuccess('User created and email sent.');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  }

  if (user?.role !== 'sysadmin') {
    return <div className="admin-users">Not authorized.</div>;
  }

  return (
    <div className="admin-users">
      <h2>Admin Users</h2>

      <form className="admin-form" onSubmit={handleCreate}>
        <h3>Create new user</h3>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        <div className="form-row">
          <label>
            Full name
            <input
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Company (optional)
            <input
              value={form.company}
              onChange={(event) => setForm({ ...form, company: event.target.value })}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Role
            <select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
            >
              <option value="user">User</option>
              <option value="sysadmin">Sysadmin</option>
            </select>
          </label>
        </div>
        <button type="submit">Create user</button>
      </form>

      <div className="admin-table">
        <h3>Existing users</h3>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Account #</th>
                <th>Company</th>
              </tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr key={row.id}>
                  <td>{row.email}</td>
                  <td>{row.full_name || '-'}</td>
                  <td>{row.role}</td>
                  <td>{row.account_number}</td>
                  <td>{row.company || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
