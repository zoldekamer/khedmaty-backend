const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.sendOTP = async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ message: 'Phone number is required' });

  console.log(`OTP sent to ${phoneNumber}: 1234`);
  res.status(200).json({ success: true, message: 'OTP sent successfully' });
};

exports.verifyOTP = async (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (otp !== '1234') {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  let user = await User.findOne({ phoneNumber });
  if (!user) {
    user = await User.create({ phoneNumber, isVerified: true });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.status(200).json({ success: true, token, user });
};

exports.registerProvider = async (req, res) => {
  const { categories, bio, fullName, city } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      fullName,
      city,
      role: 'provider',
      'providerInfo.categories': categories,
      'providerInfo.bio': bio,
      'providerInfo.verificationStatus': 'pending'
    },
    { new: true }
  );

  res.status(200).json({ success: true, user });
};
