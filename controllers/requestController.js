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
        res.status(500).json({ success: false, message: 'فشل في إنشاء الطلب', error: error.message });
    }
};

exports.getUserRequests = async (req, res) => {
    try {
        const requests = await Request.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: requests.length, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: 'فشل في جلب الطلبات', error: error.message });
    }
};
