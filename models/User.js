const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    passwordHash: { type: String, select: false },
    phoneNumber: { type: String, trim: true, unique: true, sparse: true },
    googleId: { type: String, select: false },
    facebookId: { type: String, select: false },
    role: { type: String, enum: ['client', 'provider', 'merchant', 'admin'], default: 'client' },
    city: { type: String, trim: true },
    providerInfo: {
        categories: [{ type: String }],
        bio: { type: String },
        verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'] }
    },
    merchantInfo: {
        storeName: { type: String, trim: true },
        materialType: { type: String, trim: true },
        businessAddress: { type: String, trim: true },
        sampleItem: { type: String, trim: true },
        samplePrice: { type: Number, min: 0 },
        latitude: { type: Number },
        longitude: { type: Number }
    }
}, { timestamps: true, autoIndex: false });

module.exports = mongoose.model('User', userSchema);
