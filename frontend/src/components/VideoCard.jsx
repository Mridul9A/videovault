import { useState } from 'react';
import { useVideoProgress } from '../hooks/useVideos';
import { StatusBadge, ProgressBar, formatBytes, formatDuration, formatDate, ConfirmDialog } from './UI';
import { videoAPI } from '../services/api';

export default function VideoCard({ video, onDelete, onClick }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const progress = useVideoProgress(
    video.status === 'processing' || video.status === 'queued' ? video._id : null
  );

  const isProcessing = video.status === 'processing' || video.status === 'queued';
  const progressValue = isProcessing ? (progress.progress || video.processingProgress || 0) : 100;

  const thumbUrl = video.thumbnail
    ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}/uploads/${video.thumbnail}`
    : null;

  return (
    <>
      <div className="video-card" onClick={() => !confirmOpen && onClick?.(video)}>
        <div className="video-thumbnail">
          {thumbUrl ? (
            <img src={thumbUrl} alt={video.title} />
          ) : (
            <div className="video-thumbnail-placeholder">
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
              <span>{formatDuration(video.duration)}</span>
            </div>
          )}

          {isProcessing && (
            <div className="processing-overlay">
              <div className="spinner" />
              <strong>{progress.stage || video.processingStage || 'Processing…'}</strong>
              <p style={{ width: '100%' }}>
                <ProgressBar value={progressValue} />
              </p>
              <p>{progressValue}%</p>
            </div>
          )}

          {!isProcessing && video.status === 'completed' && (
            <div className="video-thumb-overlay">
              <div className="play-btn-circle">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </div>
            </div>
          )}

          {video.status === 'failed' && (
            <div className="processing-overlay">
              <svg width="24" height="24" fill="none" stroke="var(--flagged)" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <strong style={{ color: 'var(--flagged)' }}>Processing Failed</strong>
            </div>
          )}
        </div>

        <div className="video-card-body">
          <div className="video-card-title" title={video.title}>{video.title}</div>
          <div className="video-card-meta">
            <StatusBadge status={video.sensitivityResult !== 'pending' ? video.sensitivityResult : video.status} />
            {video.sensitivityScore !== null && video.sensitivityScore !== undefined && (
              <span className="text-xs font-mono text-muted">Score: {video.sensitivityScore}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="video-card-size">{formatBytes(video.fileSize)}</span>
            <span className="text-xs text-muted">{formatDate(video.createdAt)}</span>
          </div>

          {video.status === 'completed' && (
            <div style={{ marginTop: 10 }}>
              <ProgressBar
                value={video.sensitivityScore ?? 0}
                variant={video.sensitivityResult === 'flagged' ? 'flagged' : 'safe'}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted">Sensitivity</span>
                <span className="text-xs font-mono">{video.sensitivityScore ?? 0}%</span>
              </div>
            </div>
          )}

          {onDelete && (
            <button
              className="btn btn-ghost btn-sm w-full"
              style={{ marginTop: 10 }}
              onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => onDelete(video._id)}
        title="Delete Video"
        message={`Are you sure you want to permanently delete "${video.title}"? This cannot be undone.`}
      />
    </>
  );
}
