const mongoose = require('mongoose');

const spamReportSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true, index: true },
  reportCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('SpamReport', spamReportSchema);
