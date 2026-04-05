const express = require('express');
const router = express.Router();
const {
  uploadVideo,
  getVideos,
  getVideo,
  streamVideo,
  updateVideo,
  deleteVideo,
  getStats,
} = require('../controllers/videoController');
const { authenticate, authorize, checkVideoAccess } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

// All video routes require authentication
router.use(authenticate);

// Stats
router.get('/stats', getStats);

// List & Upload
router.get('/', getVideos);
router.post(
  '/upload',
  authorize('editor', 'admin'),
  upload.single('video'),
  handleUploadError,
  uploadVideo
);

// Single video operations
router.get('/:id', checkVideoAccess('view'), getVideo);
router.get('/:id/stream', checkVideoAccess('view'), streamVideo);
router.patch('/:id', authorize('editor', 'admin'), checkVideoAccess('edit'), updateVideo);
router.delete('/:id', authorize('editor', 'admin'), checkVideoAccess('edit'), deleteVideo);

module.exports = router;
