const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or user is inactive.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired.' });
    }
    next(error);
  }
};

/**
 * Role-based access control middleware factory
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

/**
 * Check video ownership or admin access
 */
const checkVideoAccess = (permission = 'view') => {
  return async (req, res, next) => {
    try {
      const Video = require('../models/Video');
      const video = await Video.findById(req.params.id);

      if (!video) {
        return res.status(404).json({ success: false, message: 'Video not found.' });
      }

      const isOwner = video.owner.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';
      const isShared = video.sharedWith?.some(
        (s) =>
          s.user.toString() === req.user._id.toString() &&
          (permission === 'view' || s.permission === 'edit')
      );

      // Multi-tenant: same organisation check
      const sameOrg = video.organisation === req.user.organisation;

      if (!isOwner && !isAdmin && !isShared) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this video.',
        });
      }

      req.video = video;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { authenticate, authorize, checkVideoAccess };
