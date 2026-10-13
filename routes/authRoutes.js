const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP, registerProvider } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/provider/register', protect, registerProvider);

module.exports = router;
