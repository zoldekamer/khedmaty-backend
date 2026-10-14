const Request = require('../models/Request');

exports.createRequest = async (req, res) => {
    try {
        const { service, icon, customerName, phone, address, date, time, notes } = req.body;
        const request = await Request.create({
            user: req.user.id,
            service,
            icon,
            customerName,
            phone,
            address,
            date,
            time,
            notes
        });
        res.status(201).json({ success: true, data: request });
    } catch (error) {
        console.error('Request creation failed:', error);
        const status = error.name === 'ValidationError' || error.name === 'CastError'
            ? 400
            : error.code === 11000 ? 409 : 500;
        res.status(status).json({
            success: false,
            message: status === 400 ? 'بيانات الطلب غير صحيحة' : status === 409 ? 'الطلب موجود مسبقًا' : 'فشل في إنشاء الطلب'
        });
    }
};

exports.getUserRequests = async (req, res) => {
    try {
        const requests = await Request.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: requests.length, data: requests });
    } catch (error) {
        console.error('Fetching user requests failed:', error);
        res.status(500).json({ success: false, message: 'فشل في جلب الطلبات' });
    }
};
