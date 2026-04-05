import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoAPI } from '../services/api';
import { useVideoProgress } from '../hooks/useVideos';
import { ProgressBar, Alert, Spinner, formatBytes } from '../components/UI';

const ACCEPTED = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

export default function Upload() {
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', tags: '', category: 'uncategorised' });
  const [dragover, setDragover] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadedVideoId, setUploadedVideoId] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | uploading | processing | done | error
  const [error, setError] = useState('');
  const inputRef = useRef();
  const navigate = useNavigate();

  const progress = useVideoProgress(uploadedVideoId);

  const selectFile = useCallback((f) => {
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      return setError(`Unsupported file type: ${f.type}. Please upload MP4, MOV, AVI, MPEG, or WebM.`);
    }
    if (f.size > 500 * 1024 * 1024) {
      return setError('File is too large. Maximum size is 500 MB.');
    }
    setError('');
    setFile(f);
    if (!form.title) setForm((prev) => ({ ...prev, title: f.name.replace(/\.[^.]+$/, '') }));
  }, [form.title]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    selectFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Please select a video file.');
    setError('');
    setPhase('uploading');

    const fd = new FormData();
    fd.append('video', file);
    fd.append('title', form.title || file.name);
    fd.append('description', form.description);
    fd.append('tags', form.tags);
    fd.append('category', form.category);

    try {
      const res = await videoAPI.upload(fd, setUploadPct);
      setUploadedVideoId(res.data.video._id);
      setPhase('processing');
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
      setPhase('idle');
    }
  };

  // When processing completes, show done state
  if (phase === 'processing' && progress.status === 'completed') {
    setTimeout(() => navigate(`/video/${uploadedVideoId}`), 1500);
  }

  const categories = ['uncategorised', 'education', 'entertainment', 'marketing', 'training', 'news', 'other'];

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="page-header">
        <h2>Upload Video</h2>
        <p>Upload a video for automated sensitivity analysis and streaming</p>
      </div>

      <Alert type="error" message={error} />

      {phase === 'idle' || phase === 'error' ? (
        <form onSubmit={handleSubmit}>
          {/* Drop Zone */}
          <div
            className={`upload-zone ${dragover ? 'dragover' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
            onDragLeave={() => setDragover(false)}
            onDrop={onDrop}
          >
            <svg width="40" height="40" fill="none" stroke={file ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <h3>{file ? file.name : 'Drop your video here'}</h3>
            <p>
              {file
                ? `${formatBytes(file.size)} — Click to change`
                : 'MP4, MOV, AVI, MPEG, WebM · Max 500 MB'}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(',')}
              style={{ display: 'none' }}
              onChange={(e) => selectFile(e.target.files[0])}
            />
          </div>

          {/* Metadata */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enter video title" required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Tags <span style={{ color: 'var(--text-muted)' }}>(comma-separated)</span></label>
                <input className="form-input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="news, training, q4" />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {categories.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary w-full" type="submit" disabled={!file}>
              Upload & Analyse
            </button>
          </div>
        </form>
      ) : (
        /* Upload / Processing Progress */
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          {phase === 'uploading' && (
            <>
              <h3 style={{ marginBottom: 20 }}>Uploading…</h3>
              <div style={{ marginBottom: 12 }}>
                <ProgressBar value={uploadPct} />
              </div>
              <p className="upload-pct">{uploadPct}%</p>
              <p className="upload-stage">{file?.name}</p>
            </>
          )}

          {phase === 'processing' && (
            <>
              <div className="spinner spinner-lg" style={{ margin: '0 auto 20px' }} />
              <h3 style={{ marginBottom: 8 }}>Analysing Content</h3>
              <p className="upload-stage" style={{ marginBottom: 16 }}>
                {progress.stage || 'Preparing analysis…'}
              </p>
              <div style={{ marginBottom: 8 }}>
                <ProgressBar value={progress.progress || 0} />
              </div>
              <p className="upload-pct">{progress.progress || 0}%</p>
              {progress.status === 'completed' && (
                <p className="upload-stage" style={{ color: 'var(--safe)', marginTop: 12 }}>
                  ✓ Analysis complete — redirecting…
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
