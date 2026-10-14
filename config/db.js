const mongoose = require('mongoose');
const User = require('../models/User');
const OTPChallenge = require('../models/OTPChallenge');
const OAuthTransaction = require('../models/OAuthTransaction');

const ensureUserIndexes = async () => {
    const collection = User.collection;
    const indexes = await collection.indexes();
    const requiredIndexes = [
        { key: { email: 1 }, options: { unique: true, sparse: true } },
        { key: { phoneNumber: 1 }, options: { unique: true, sparse: true } },
        { key: { googleId: 1 }, options: { unique: true, sparse: true } },
        { key: { facebookId: 1 }, options: { unique: true, sparse: true } }
    ];

    for (const required of requiredIndexes) {
        const field = Object.keys(required.key)[0];
        const duplicateGroups = await collection.aggregate([
            ...(required.options.sparse ? [{ $match: { [field]: { $exists: true } } }] : []),
            { $group: { _id: `$${field}`, count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } },
            { $count: 'groups' }
        ]).toArray();

        if (duplicateGroups.length > 0) {
            throw new Error(`Cannot create unique ${field} index: duplicate values exist.`);
        }

        const existing = indexes.find((index) => (
            Object.keys(required.key).length === Object.keys(index.key).length
            && Object.entries(required.key).every(([field, direction]) => index.key[field] === direction)
        ));

        if (existing) {
            const matchesOptions = existing.unique === required.options.unique
                && (required.options.sparse === undefined || existing.sparse === required.options.sparse);
            if (matchesOptions) continue;

            await collection.dropIndex(existing.name);
        }

        await collection.createIndex(required.key, required.options);
    }

    await OTPChallenge.collection.createIndex(
        { phoneNumber: 1 },
        { unique: true }
    );
    await OTPChallenge.collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
    );
    await OAuthTransaction.collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
    );
    await OAuthTransaction.collection.createIndex(
        { stateHash: 1 },
        { unique: true, sparse: true }
    );
    await OAuthTransaction.collection.createIndex(
        { ticketHash: 1 },
        { unique: true, sparse: true }
    );
};

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/my-database';
        const conn = await mongoose.connect(mongoUri);
        await ensureUserIndexes();
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
