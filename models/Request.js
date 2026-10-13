const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    service: { type: String, required: true },
    icon: { type: String, required: true },
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    notes: { type: String, default: "" },
    status: { 
        type: String, 
        enum: ['قيد المراجعة', 'تم القبول', 'قيد التنفيذ', 'مكتمل', 'ملغي'], 
        default: 'قيد المراجعة' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);
