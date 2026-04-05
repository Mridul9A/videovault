const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Video title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // in seconds
      default: null,
    },
    resolution: {
      width: { type: Number, default: null },
      height: { type: Number, default: null },
    },
    thumbnail: {
      type: String,
      default: null,
    },
    // Processing status
    status: {
      type: String,
      enum: ['uploading', 'queued', 'processing', 'completed', 'failed'],
      default: 'queued',
    },
    processingProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    processingStage: {
      type: String,
      default: '',
    },
    // Sensitivity Analysis
    sensitivityResult: {
      type: String,
      enum: ['safe', 'flagged', 'pending', 'error'],
      default: 'pending',
    },
    sensitivityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    sensitivityDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    sensitivityFlags: [
      {
        type: {
          type: String,
          enum: ['violence', 'adult_content', 'hate_speech', 'graphic_content', 'other'],
        },
        confidence: Number,
        timestamp: Number,
      },
    ],
    // Multi-tenant
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organisation: {
      type: String,
      required: true,
    },
    // Access control
    sharedWith: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        permission: { type: String, enum: ['view', 'edit'], default: 'view' },
      },
    ],
    tags: [{ type: String, trim: true }],
    category: {
      type: String,
      default: 'uncategorised',
    },
    views: {
      type: Number,
      default: 0,
    },
    processingError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
videoSchema.index({ owner: 1, createdAt: -1 });
videoSchema.index({ organisation: 1 });
videoSchema.index({ status: 1 });
videoSchema.index({ sensitivityResult: 1 });

module.exports = mongoose.model('Video', videoSchema);
