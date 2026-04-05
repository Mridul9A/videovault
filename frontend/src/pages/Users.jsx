import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { Spinner, Alert, formatDate } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';

const ROLES = ['viewer', 'editor', 'admin'];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(null);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    authAPI.getUsers()
      .then((res) => setUsers(res.data.users))
      .catch((e) => setError(e.response?.data?.message || 'Failed to load users.'))
      .finally(() => setLoading(false));
  }, []);

  const changeRole = async (id, role) => {
    setSaving(id);
    try {
      const res = await authAPI.updateUserRole(id, role);
      setUsers((prev) => prev.map((u) => (u._id === id ? res.data.user : u)));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update role.');
    } finally {
      setSaving(null);
    }
  };

  const roleColor = { admin: 'var(--accent)', editor: 'var(--safe)', viewer: 'var(--text-muted)' };

  return (
    <div>
      <div className="page-header">
        <h2>User Management</h2>
        <p>Manage roles and permissions for your organisation</p>
      </div>

      <Alert type="error" message={error} />

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size="lg" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last Login</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: 'var(--accent-dim)', border: '1.5px solid var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', flexShrink: 0
                      }}>
                        {u.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                      {u._id === currentUser._id && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '1px 6px', borderRadius: 4 }}>you</span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.email}</td>
                  <td>
                    <span style={{ color: roleColor[u.role] || 'var(--text-primary)', fontWeight: 600, fontSize: '0.82rem', textTransform: 'capitalize' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(u.lastLogin) || 'Never'}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(u.createdAt)}</td>
                  <td>
                    {u._id !== currentUser._id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {ROLES.filter((r) => r !== u.role).map((r) => (
                          <button
                            key={r}
                            className="btn btn-ghost btn-sm"
                            onClick={() => changeRole(u._id, r)}
                            disabled={saving === u._id}
                            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                          >
                            {saving === u._id ? <Spinner /> : `→ ${r}`}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
