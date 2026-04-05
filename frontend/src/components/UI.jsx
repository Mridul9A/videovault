// ─── Spinner ──────────────────────────────────────────────────────
export const Spinner = ({ size = '' }) => (
  <div className={`spinner ${size === 'lg' ? 'spinner-lg' : ''}`} />
);

// ─── Badge ────────────────────────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const map = {
    safe: '✓ Safe',
    flagged: '⚑ Flagged',
    pending: '◌ Pending',
    processing: '⟳ Processing',
    completed: '✓ Done',
    failed: '✕ Failed',
    queued: '◌ Queued',
    uploading: '↑ Uploading',
    error: '✕ Error',
  };
  return <span className={`badge badge-${status}`}>{map[status] || status}</span>;
};

// ─── Progress Bar ─────────────────────────────────────────────────
export const ProgressBar = ({ value, variant = '' }) => (
  <div className="progress-bar-wrap">
    <div
      className={`progress-bar-fill ${variant}`}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

// ─── Format helpers ───────────────────────────────────────────────
export const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
};

export const formatDuration = (secs) => {
  if (!secs) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
};

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Empty State ──────────────────────────────────────────────────
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="empty-state">
    <div>{icon}</div>
    <h3>{title}</h3>
    <p>{description}</p>
    {action && <div style={{ marginTop: 20 }}>{action}</div>}
  </div>
);

// ─── Alert ────────────────────────────────────────────────────────
export const Alert = ({ type = 'error', message }) =>
  message ? <div className={`alert alert-${type}`}>{message}</div> : null;

// ─── Modal ────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ─── Confirm Dialog ───────────────────────────────────────────────
export const ConfirmDialog = ({ open, onClose, onConfirm, title, message }) => (
  <Modal open={open} onClose={onClose} title={title || 'Confirm'}>
    <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>{message}</p>
    <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>Delete</button>
    </div>
  </Modal>
);
