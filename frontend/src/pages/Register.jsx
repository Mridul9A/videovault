import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Spinner } from '../components/UI';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', organisation: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>VIDEOVAULT</h1>
        <p>Create an account to get started</p>

        <Alert type="error" message={error} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" type="text" placeholder="Jane Smith" value={form.name} onChange={set('name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="At least 6 characters" value={form.password} onChange={set('password')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Organisation <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
            <input className="form-input" type="text" placeholder="my-company" value={form.organisation} onChange={set('organisation')} />
            <p className="form-error" style={{ color: 'var(--text-muted)' }}>First user in an organisation becomes admin.</p>
          </div>

          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? <Spinner /> : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: '0.85rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
