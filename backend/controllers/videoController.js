const fs = require('fs');
const path = require('path');
const Video = require('../models/Video');
const { analyseVideoSensitivity } = require('../services/sensitivityService');
const { extractMetadata, generateThumbnail } = require('../services/videoService');

let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

/**
 * POST /api/videos/upload
 */
const uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file provided.' });
    }

    const { title, description, tags, category } = req.body;
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';

    const video = await Video.create({
      title: title || req.file.originalname,
      description: description || '',
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'queued',
      owner: req.user._id,
      organisation: req.user.organisation,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      category: category || 'uncategorised',
    });

    // Respond immediately, process asynchronously
    res.status(201).json({
      success: true,
      message: 'Video uploaded. Processing started.',
      video,
    });

    // Run processing pipeline asynchronously
    processVideo(video._id, req.file.path, uploadDir).catch(console.error);
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * Background video processing pipeline
 */
const processVideo = async (videoId, filePath, uploadDir) => {
  try {
    // Update status to processing
    await Video.findByIdAndUpdate(videoId, {
      status: 'processing',
      processingProgress: 5,
      processingStage: 'Extracting metadata',
    });

    if (ioInstance) {
      ioInstance.emit(`video:progress:${videoId}`, {
        videoId,
        stage: 'Extracting metadata',
        progress: 5,
        status: 'processing',
      });
    }

    // Extract metadata
    const metadata = await extractMetadata(filePath);

    // Generate thumbnail
    const thumbDir = path.join(uploadDir, 'thumbnails');
    const thumbFilename = path.basename(filePath, path.extname(filePath));
    const thumbnailPath = await generateThumbnail(filePath, thumbDir, thumbFilename);

    await Video.findByIdAndUpdate(videoId, {
      duration: metadata.duration,
      resolution: metadata.resolution,
      thumbnail: thumbnailPath
        ? path.join('thumbnails', `${thumbFilename}.jpg`)
        : null,
      processingProgress: 15,
      processingStage: 'Running sensitivity analysis',
    });

    // Run sensitivity analysis
    const sensitivityResult = await analyseVideoSensitivity(
      videoId.toString(),
      filePath,
      ioInstance || { emit: () => {} }
    );

    // Save final results
    await Video.findByIdAndUpdate(videoId, {
      status: 'completed',
      processingProgress: 100,
      processingStage: 'Completed',
      sensitivityResult: sensitivityResult.result,
      sensitivityScore: sensitivityResult.score,
      sensitivityDetails: sensitivityResult.details,
      sensitivityFlags: sensitivityResult.flags,
    });

    if (ioInstance) {
      const updatedVideo = await Video.findById(videoId).populate('owner', 'name email');
      ioInstance.emit(`video:completed:${videoId}`, {
        videoId,
        status: 'completed',
        sensitivityResult: sensitivityResult.result,
        sensitivityScore: sensitivityResult.score,
        video: updatedVideo,
      });
      ioInstance.emit('video:list:updated', { action: 'updated', videoId });
    }
  } catch (error) {
    console.error('Video processing failed:', error);
    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
      processingError: error.message,
    });

    if (ioInstance) {
      ioInstance.emit(`video:progress:${videoId}`, {
        videoId,
        stage: 'Processing failed',
        progress: 0,
        status: 'failed',
        error: error.message,
      });
    }
  }
};

/**
 * GET /api/videos
 */
const getVideos = async (req, res, next) => {
  try {
    const { status, sensitivity, search, tags, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const query = {};

    // Multi-tenant: only own videos (admins see all in org)
    if (req.user.role === 'admin') {
      query.organisation = req.user.organisation;
    } else {
      query.$or = [
        { owner: req.user._id },
        { 'sharedWith.user': req.user._id },
      ];
    }

    if (status) query.status = status;
    if (sensitivity) query.sensitivityResult = sensitivity;
    if (search) query.title = { $regex: search, $options: 'i' };
    if (tags) query.tags = { $in: tags.split(',') };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [videos, total] = await Promise.all([
      Video.find(query)
        .populate('owner', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Video.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: videos.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      videos,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/videos/:id
 */
const getVideo = async (req, res, next) => {
  try {
    const video = req.video || await Video.findById(req.params.id).populate('owner', 'name email');
    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });

    // Increment view count
    await Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.json({ success: true, video });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/videos/:id/stream - HTTP Range Requests
 */
const streamVideo = async (req, res, next) => {
  try {
    const video = req.video || await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });

    // const filePath = video.filePath;
    const filePath = path.resolve(video.filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Video file not found on disk.' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': video.mimeType || 'video/mp4',
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': video.mimeType || 'video/mp4',
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/videos/:id
 */
const updateVideo = async (req, res, next) => {
  try {
    const { title, description, tags, category } = req.body;

    const video = await Video.findByIdAndUpdate(
      req.params.id,
      {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(tags && { tags: tags.split(',').map((t) => t.trim()).filter(Boolean) }),
        ...(category && { category }),
      },
      { new: true, runValidators: true }
    ).populate('owner', 'name email');

    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });

    res.json({ success: true, video });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/videos/:id
 */
const deleteVideo = async (req, res, next) => {
  try {
    const video = req.video || await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });

    // Delete file from disk
    if (video.filePath && fs.existsSync(video.filePath)) {
      fs.unlinkSync(video.filePath);
    }

    // Delete thumbnail
    if (video.thumbnail) {
      const thumbPath = path.join(process.env.UPLOAD_DIR || 'uploads', video.thumbnail);
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    }

    await Video.findByIdAndDelete(req.params.id);

    if (ioInstance) {
      ioInstance.emit('video:list:updated', { action: 'deleted', videoId: req.params.id });
    }

    res.json({ success: true, message: 'Video deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/videos/stats
 */
const getStats = async (req, res, next) => {
  try {
    const baseQuery =
      req.user.role === 'admin'
        ? { organisation: req.user.organisation }
        : { owner: req.user._id };

    const [total, safe, flagged, processing, failed, totalSize] = await Promise.all([
      Video.countDocuments(baseQuery),
      Video.countDocuments({ ...baseQuery, sensitivityResult: 'safe' }),
      Video.countDocuments({ ...baseQuery, sensitivityResult: 'flagged' }),
      Video.countDocuments({ ...baseQuery, status: 'processing' }),
      Video.countDocuments({ ...baseQuery, status: 'failed' }),
      Video.aggregate([
        { $match: baseQuery },
        { $group: { _id: null, totalSize: { $sum: '$fileSize' } } },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        total,
        safe,
        flagged,
        processing,
        failed,
        pending: total - safe - flagged - failed,
        totalStorageBytes: totalSize[0]?.totalSize || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadVideo,
  getVideos,
  getVideo,
  streamVideo,
  updateVideo,
  deleteVideo,
  getStats,
  setIO,
};
