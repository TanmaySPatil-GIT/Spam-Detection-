const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  transcript: { type: String },
  riskScore: { type: Number, required: true, min: 0, max: 100 },
  riskLevel: { type: String, enum: ['Safe', 'Suspicious', 'Spam'], default: 'Safe' },
  reasons: [{ type: String }],
  isSpam: { type: Boolean, required: true },
  confidence: { type: Number, min: 0, max: 100 },
  callerLocation: {
    country: { type: String },
    state: { type: String },
    city: { type: String },
    carrier: { type: String },
    flag: { type: String },
    callingCode: { type: String },
    isValid: { type: Boolean }
  },
  spamDna: {
    urgencyScore: { type: Number, default: 0 },
    manipulationScore: { type: Number, default: 0 },
    fearScore: { type: Number, default: 0 },
    promotionalScore: { type: Number, default: 0 }
  },
  scamTypePrediction: {
    scamType: { type: String, default: 'None' },
    probability: { type: Number, default: 0 }
  },
  explainableAi: {
    explanation: { type: String, default: '' },
    topRiskFactors: [{ type: String }]
  },
  safetyAdvisor: [{ type: String }],
  trustScore: { type: Number, min: 0, max: 100, default: 100 },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Call', callSchema);
