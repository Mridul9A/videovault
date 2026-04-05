import { useState, useEffect, useCallback, useRef } from 'react';
import { videoAPI } from '../services/api';
import { getSocket } from '../services/socket';

export const useVideos = (filters = {}) => {
  const [videos, setVideos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const filtersRef = useRef(filters);

  const fetchVideos = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const res = await videoAPI.getAll({ ...filtersRef.current, ...params });
      const data = res.data;
      setVideos(data.videos);
      setPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await videoAPI.getStats();
      setStats(res.data.stats);
    } catch {}
  }, []);

  useEffect(() => {
    fetchVideos();
    fetchStats();
  }, [fetchVideos, fetchStats]);

  // Real-time updates via Socket.io
  useEffect(() => {
    const socket = getSocket();

    const handleListUpdate = () => {
      fetchVideos();
      fetchStats();
    };

    socket.on('video:list:updated', handleListUpdate);
    return () => socket.off('video:list:updated', handleListUpdate);
  }, [fetchVideos, fetchStats]);

  // Update a single video in the list when processing completes
  useEffect(() => {
    const socket = getSocket();

    const handleVideoUpdate = (data) => {
      if (data.video) {
        setVideos((prev) =>
          prev.map((v) => (v._id === data.videoId ? data.video : v))
        );
        fetchStats();
      }
    };

    // Listen for all in-progress videos
    videos
      .filter((v) => v.status === 'processing' || v.status === 'queued')
      .forEach((v) => {
        socket.on(`video:completed:${v._id}`, handleVideoUpdate);
      });

    return () => {
      videos.forEach((v) => {
        socket.off(`video:completed:${v._id}`, handleVideoUpdate);
      });
    };
  }, [videos, fetchStats]);

  const deleteVideo = useCallback(async (id) => {
    await videoAPI.delete(id);
    setVideos((prev) => prev.filter((v) => v._id !== id));
    fetchStats();
  }, [fetchStats]);

  return { videos, stats, loading, error, pagination, fetchVideos, fetchStats, deleteVideo };
};

export const useVideoProgress = (videoId) => {
  const [progress, setProgress] = useState({ stage: '', progress: 0, status: 'queued' });

  useEffect(() => {
    if (!videoId) return;
    const socket = getSocket();

    const handler = (data) => setProgress(data);
    socket.on(`video:progress:${videoId}`, handler);
    return () => socket.off(`video:progress:${videoId}`, handler);
  }, [videoId]);

  return progress;
};
