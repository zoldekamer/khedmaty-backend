const mongoose = require('mongoose');

const oauthTransactionSchema = new mongoose.Schema({
  stateHash: { type: String, unique: true, sparse: true },
  ticketHash: { type: String, unique: true, sparse: true },
  provider: { type: String, enum: ['google', 'facebook'], required: true },
  intent: { type: String, enum: ['client', 'provider'], default: 'client' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date, required: true }
}, { versionKey: false });

module.exports = mongoose.model('OAuthTransaction', oauthTransactionSchema);
