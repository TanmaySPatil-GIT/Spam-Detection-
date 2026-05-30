const mongoose = require('mongoose');

const listStatusSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['blacklisted', 'trusted', 'none'], default: 'none' }
}, { timestamps: true });

module.exports = mongoose.model('ListStatus', listStatusSchema);
