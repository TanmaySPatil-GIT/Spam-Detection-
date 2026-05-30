const mongoose = require('mongoose');

const communityReportSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, index: true },
  classification: { type: String, enum: ['Spam', 'Scam', 'Fraud', 'Telemarketing', 'Safe'], required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CommunityReport', communityReportSchema);
