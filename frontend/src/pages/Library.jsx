import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVideos } from '../hooks/useVideos';
import VideoCard from '../components/VideoCard';
import { Spinner, EmptyState } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';

const SENSITIVITY_FILTERS = ['all', 'safe', 'flagged', 'pending'];
const STATUS_FILTERS = ['all', 'completed', 'processing', 'queued', 'failed'];

export default function Library() {
  const [sensitivityFilter, setSensitivityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const params = {
    ...(sensitivityFilter !== 'all' && { sensitivity: sensitivityFilter }),
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(search && { search }),
    limit: 50,
  };

  const { videos, loading, deleteVideo } = useVideos(params);

  const handleSearch = useCallback((e) => setSearch(e.target.value), []);

  return (
    <div>
      <div className="page-header flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>Video Library</h2>
          <p>{videos.length} video{videos.length !== 1 ? 's' : ''} found</p>
        </div>
        {hasRole('editor', 'admin') && (
          <button className="btn btn-primary" onClick={() => navigate('/upload')}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Upload
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input-wrap">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Search videos…" value={search} onChange={handleSearch} />
        </div>

        <div className="flex gap-2">
          {SENSITIVITY_FILTERS.map((f) => (
            <button
              key={f}
              className={`filter-chip ${sensitivityFilter === f ? 'active' : ''}`}
              onClick={() => setSensitivityFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <select
          className="form-input"
          style={{ width: 'auto', padding: '6px 12px', borderRadius: 20 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f} value={f}>
              {f === 'all' ? 'All Status' : f.charAt(0).toUpperCase() + f.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spinner size="lg" />
        </div>
      ) : videos.length === 0 ? (
        <EmptyState
          icon={
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
          }
          title="No videos found"
          description={search || sensitivityFilter !== 'all' ? 'Try adjusting your filters.' : 'Upload your first video to get started.'}
          action={
            hasRole('editor', 'admin') && !search && sensitivityFilter === 'all' ? (
              <button className="btn btn-primary" onClick={() => navigate('/upload')}>Upload Video</button>
            ) : null
          }
        />
      ) : (
        <div className="video-grid">
          {videos.map((v) => (
            <VideoCard
              key={v._id}
              video={v}
              onDelete={hasRole('editor', 'admin') ? deleteVideo : null}
              onClick={() => navigate(`/video/${v._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
