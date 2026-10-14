const express = require('express');
const router = express.Router();
const {
  sendOTP,
  verifyOTP,
  loginWithPassword,
  resetPassword,
  updateProfile,
  registerMerchant,
  registerProvider,
  startOAuth,
  completeOAuth,
  exchangeOAuthTicket
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/login', loginWithPassword);
router.post('/password/reset', resetPassword);
router.put('/profile', protect, updateProfile);
router.post('/merchant/register', protect, registerMerchant);
router.get('/oauth/:provider', startOAuth);
router.get('/oauth/:provider/callback', (req, res, next) => {
  if (!['google', 'facebook'].includes(req.params.provider)) {
    return res.status(404).send('Unsupported sign-in provider.');
  }
  return completeOAuth(req.params.provider)(req, res, next);
});
router.post('/oauth/exchange', exchangeOAuthTicket);
router.post('/provider/register', protect, registerProvider);

module.exports = router;
