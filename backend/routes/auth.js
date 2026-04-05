const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, getMe, getUsers, updateUserRole } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

// Validation rules
const registerRules = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('organisation').optional().trim(),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

router.post('/register', registerRules, register);
router.post('/login', loginRules, login);
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, authorize('admin'), getUsers);
router.patch('/users/:id/role', authenticate, authorize('admin'), updateUserRole);

module.exports = router;
