require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const phoneNumber = process.argv[2]?.trim();

if (!phoneNumber) {
    console.error('Usage: npm run create-admin -- <phone-number>');
    process.exit(1);
}

async function createAdmin() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI must be configured before creating an admin.');
    }

    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOneAndUpdate(
        { phoneNumber },
        { $set: { role: 'admin' } },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new Error('No account exists for this phone number. Sign in once before granting admin access.');
    }

    console.log(`Admin access enabled for account ending in ${phoneNumber.slice(-4)}.`);
}

createAdmin()
    .catch((error) => {
        console.error(`Could not grant admin access: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
