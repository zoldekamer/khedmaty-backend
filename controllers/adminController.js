const mongoose = require('mongoose');
const Request = require('../models/Request');
const User = require('../models/User');

const providerStatuses = ['pending', 'approved', 'rejected'];
const requestStatuses = Request.schema.path('status').enumValues;

exports.getDashboard = async (req, res) => {
    try {
        const [users, providers, pendingProviders, requests, pendingRequests, latestRequests] = await Promise.all([
            User.countDocuments({ role: 'client' }),
            User.countDocuments({ role: 'provider' }),
            User.countDocuments({ role: 'provider', 'providerInfo.verificationStatus': 'pending' }),
            Request.countDocuments(),
            Request.countDocuments({ status: 'قيد المراجعة' }),
            Request.find().sort({ createdAt: -1 }).limit(8).populate('user', 'name phoneNumber')
        ]);

        res.status(200).json({
            success: true,
            data: { users, providers, pendingProviders, requests, pendingRequests, latestRequests }
        });
    } catch (error) {
        console.error('Admin dashboard failed:', error);
        res.status(500).json({ success: false, message: 'تعذر تحميل لوحة الإدارة' });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select('name email phoneNumber role city providerInfo createdAt')
            .sort({ createdAt: -1 }).limit(100);
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        console.error('Admin user listing failed:', error);
        res.status(500).json({ success: false, message: 'تعذر تحميل المستخدمين' });
    }
};

exports.getRequests = async (req, res) => {
    try {
        const requests = await Request.find().sort({ createdAt: -1 }).limit(100)
            .populate('user', 'name phoneNumber');
        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        console.error('Admin request listing failed:', error);
        res.status(500).json({ success: false, message: 'تعذر تحميل الطلبات' });
    }
};

exports.getProviders = async (req, res) => {
    try {
        const providers = await User.find({ role: 'provider' })
            .select('name email phoneNumber city providerInfo createdAt')
            .sort({ createdAt: -1 }).limit(100);
        res.status(200).json({ success: true, data: providers });
    } catch (error) {
        console.error('Admin provider listing failed:', error);
        res.status(500).json({ success: false, message: 'تعذر تحميل مقدمي الخدمة' });
    }
};

exports.updateRequestStatus = async (req, res) => {
    const { status } = req.body;
    if (!requestStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'حالة الطلب غير صالحة' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'معرّف الطلب غير صالح' });
    }

    try {
        const request = await Request.findByIdAndUpdate(req.params.id, { status }, {
            new: true,
            runValidators: true
        }).populate('user', 'name phoneNumber');
        if (!request) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
        res.status(200).json({ success: true, data: request });
    } catch (error) {
        console.error('Admin request status update failed:', error);
        res.status(500).json({ success: false, message: 'تعذر تحديث حالة الطلب' });
    }
};

exports.updateProviderStatus = async (req, res) => {
    const { status } = req.body;
    if (!providerStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'حالة مقدم الخدمة غير صالحة' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'معرّف المستخدم غير صالح' });
    }

    try {
        const provider = await User.findOneAndUpdate(
            { _id: req.params.id, role: 'provider' },
            { 'providerInfo.verificationStatus': status },
            { new: true, runValidators: true }
        ).select('name email phoneNumber city providerInfo createdAt');
        if (!provider) return res.status(404).json({ success: false, message: 'مقدم الخدمة غير موجود' });
        res.status(200).json({ success: true, data: provider });
    } catch (error) {
        console.error('Admin provider status update failed:', error);
        res.status(500).json({ success: false, message: 'تعذر تحديث حالة مقدم الخدمة' });
    }
};
