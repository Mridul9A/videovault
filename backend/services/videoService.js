const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

/**
 * Extract video metadata using ffprobe
 * @param {string} filePath - Path to video file
 * @returns {Promise<object>} Video metadata
 */
const extractMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        // ffprobe not available - return mock metadata
        console.warn('ffprobe not available, using mock metadata:', err.message);
        return resolve({
          duration: null,
          resolution: { width: null, height: null },
          bitrate: null,
          codec: null,
        });
      }

      const videoStream = metadata.streams?.find((s) => s.codec_type === 'video');
      const audioStream = metadata.streams?.find((s) => s.codec_type === 'audio');

      resolve({
        duration: metadata.format?.duration ? Math.round(metadata.format.duration) : null,
        resolution: {
          width: videoStream?.width || null,
          height: videoStream?.height || null,
        },
        bitrate: metadata.format?.bit_rate ? Math.round(metadata.format.bit_rate / 1000) : null,
        codec: videoStream?.codec_name || null,
        audioCodec: audioStream?.codec_name || null,
        fps: videoStream?.r_frame_rate
          ? eval(videoStream.r_frame_rate).toFixed(2)
          : null,
      });
    });
  });
};

/**
 * Generate video thumbnail using ffmpeg
 * @param {string} filePath - Input video path
 * @param {string} outputDir - Output directory for thumbnail
 * @param {string} filename - Output filename (without extension)
 * @returns {Promise<string|null>} Thumbnail path or null
 */
const generateThumbnail = (filePath, outputDir, filename) => {
  return new Promise((resolve) => {
    const thumbPath = path.join(outputDir, `${filename}.jpg`);

    ffmpeg(filePath)
      .screenshots({
        count: 1,
        folder: outputDir,
        filename: `${filename}.jpg`,
        timemarks: ['10%'],
        size: '320x240',
      })
      .on('end', () => resolve(thumbPath))
      .on('error', (err) => {
        console.warn('Thumbnail generation failed:', err.message);
        resolve(null);
      });
  });
};

module.exports = { extractMetadata, generateThumbnail };
