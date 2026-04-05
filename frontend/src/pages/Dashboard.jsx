import { useAuth } from '../contexts/AuthContext';
import { useVideos } from '../hooks/useVideos';
import { Spinner, formatBytes } from '../components/UI';
import VideoCard from '../components/VideoCard';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const { videos, stats, loading, deleteVideo } = useVideos({ limit: 6, sort: '-createdAt' });
  const navigate = useNavigate();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <div className="page-header">
        <h2>{greeting}, {user?.name?.split(' ')[0]} 👋</h2>
        <p>Here's what's happening with your video library</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.total ?? '—'}</div>
          <div className="stat-label">Total Videos</div>
        </div>
        <div className="stat-card safe">
          <div className="stat-value" style={{ color: 'var(--safe)' }}>{stats?.safe ?? '—'}</div>
          <div className="stat-label">Safe</div>
        </div>
        <div className="stat-card flagged">
          <div className="stat-value" style={{ color: 'var(--flagged)' }}>{stats?.flagged ?? '—'}</div>
          <div className="stat-label">Flagged</div>
        </div>
        <div className="stat-card processing">
          <div className="stat-value" style={{ color: 'var(--pending)' }}>{stats?.processing ?? '—'}</div>
          <div className="stat-label">Processing</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>{formatBytes(stats?.totalStorageBytes)}</div>
          <div className="stat-label">Storage Used</div>
        </div>
      </div>

      {/* Recent Videos */}
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Videos</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/library')}>
          View All →
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner size="lg" />
        </div>
      ) : videos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <svg width="48" height="48" fill="none" stroke="var(--text-muted)" strokeWidth="1" viewBox="0 0 24 24" style={{ margin: '0 auto 16px' }}>
            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
          </svg>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>No videos uploaded yet.</p>
          <button className="btn btn-primary" onClick={() => navigate('/upload')}>Upload Your First Video</button>
        </div>
      ) : (
        <div className="video-grid">
          {videos.map((v) => (
            <VideoCard
              key={v._id}
              video={v}
              onDelete={deleteVideo}
              onClick={() => navigate(`/video/${v._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
