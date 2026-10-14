const mongoose = require('mongoose');

const otpChallengeSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  codeHash: { type: String, required: true },
  sentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 }
}, { versionKey: false });

module.exports = mongoose.model('OTPChallenge', otpChallengeSchema);
