import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videoAPI } from '../services/api';
import { useVideoProgress } from '../hooks/useVideos';
import { StatusBadge, ProgressBar, formatBytes, formatDuration, formatDate, Spinner, Alert, Modal } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';

export default function VideoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const progress = useVideoProgress(
    video?.status === 'processing' || video?.status === 'queued' ? id : null
  );

  useEffect(() => {
    videoAPI.getOne(id)
      .then((res) => {
        setVideo(res.data.video);
        setEditForm({
          title: res.data.video.title,
          description: res.data.video.description,
          tags: res.data.video.tags?.join(', '),
          category: res.data.video.category,
        });
      })
      .catch((e) => setError(e.response?.data?.message || 'Video not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Refresh when processing completes
  useEffect(() => {
    if (progress.status === 'completed' && video?.status !== 'completed') {
      setTimeout(() => {
        videoAPI.getOne(id).then((res) => setVideo(res.data.video));
      }, 1000);
    }
  }, [progress.status, video?.status, id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await videoAPI.update(id, editForm);
      setVideo(res.data.video);
      setEditOpen(false);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this video permanently?')) return;
    await videoAPI.delete(id);
    navigate('/library');
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>;
  if (error) return <div className="page-enter"><Alert type="error" message={error} /><button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button></div>;
  if (!video) return null;

  const streamUrl = videoAPI.getStreamUrl(id);
  const isProcessing = video.status === 'processing' || video.status === 'queued';

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3 mb-4">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
        {hasRole('editor', 'admin') && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditOpen(true)}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Left: Player */}
        <div>
          <div className="player-wrap" style={{ marginBottom: 20 }}>
            {video.status === 'completed' ? (
              <video controls preload="metadata" src={streamUrl} style={{ width: '100%', height: '100%' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 32, background: '#111', aspectRatio: '16/9' }}>
                {isProcessing ? (
                  <>
                    <Spinner size="lg" />
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                      {progress.stage || video.processingStage || 'Processing…'}
                    </p>
                    <div style={{ width: '100%', maxWidth: 300 }}>
                      <ProgressBar value={progress.progress || video.processingProgress || 0} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: '0.85rem' }}>
                      {progress.progress || video.processingProgress || 0}%
                    </span>
                  </>
                ) : (
                  <>
                    <svg width="32" height="32" fill="none" stroke="var(--flagged)" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p style={{ color: 'var(--text-secondary)' }}>Processing failed</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Title & Meta */}
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10 }}>{video.title}</h2>
          {video.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 14 }}>{video.description}</p>
          )}
          <div className="flex gap-2" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
            {video.tags?.map((t) => (
              <span key={t} style={{ padding: '2px 10px', borderRadius: 20, background: 'var(--bg-hover)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Details Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Sensitivity Report */}
          <div className="card">
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 14 }}>
              Sensitivity Analysis
            </h4>
            <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
              <StatusBadge status={video.sensitivityResult !== 'pending' ? video.sensitivityResult : video.status} />
              {video.sensitivityScore !== null && video.sensitivityScore !== undefined && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700 }}>
                  {video.sensitivityScore}<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/100</span>
                </span>
              )}
            </div>

            {video.sensitivityScore !== null && (
              <div style={{ marginBottom: 14 }}>
                <ProgressBar
                  value={video.sensitivityScore}
                  variant={video.sensitivityResult === 'flagged' ? 'flagged' : 'safe'}
                />
              </div>
            )}

            {video.sensitivityFlags?.length > 0 && (
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>Detected Issues</p>
                {video.sensitivityFlags.map((flag, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{flag.type?.replace('_', ' ')}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--flagged)' }}>{flag.confidence}%</span>
                  </div>
                ))}
              </div>
            )}

            {video.sensitivityDetails && (
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 10 }}>
                {video.sensitivityDetails.framesAnalysed} frames analysed · Model v{video.sensitivityDetails.modelVersion}
              </p>
            )}
          </div>

          {/* File Info */}
          <div className="card">
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 14 }}>
              File Info
            </h4>
            {[
              ['File', video.originalName],
              ['Size', formatBytes(video.fileSize)],
              ['Duration', formatDuration(video.duration)],
              ['Resolution', video.resolution?.width ? `${video.resolution.width}×${video.resolution.height}` : '—'],
              ['Format', video.mimeType?.split('/')[1]?.toUpperCase() || '—'],
              ['Views', video.views],
              ['Uploaded', formatDate(video.createdAt)],
              ['Category', video.category],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ fontFamily: k === 'Size' || k === 'Duration' ? 'var(--font-mono)' : 'inherit', textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Video">
        <div className="form-group">
          <label className="form-label">Title</label>
          <input className="form-input" value={editForm.title || ''} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-input" rows={3} value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} style={{ resize: 'vertical' }} />
        </div>
        <div className="form-group">
          <label className="form-label">Tags</label>
          <input className="form-input" value={editForm.tags || ''} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} placeholder="tag1, tag2" />
        </div>
        <div className="flex gap-3" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={() => setEditOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner /> : 'Save Changes'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
