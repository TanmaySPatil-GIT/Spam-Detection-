const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json({ limit: '50mb' }));

// Database Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/spam_detector';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/calls', apiRoutes);

app.post('/api/phone-info', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const apiKey = process.env.NUMVERIFY_API_KEY;
    if (!apiKey) {
      console.error('[NumVerify Debug] Missing NUMVERIFY_API_KEY in environment.');
      return res.json({
        success: false,
        valid: false,
        country: 'Unknown',
        carrier: 'Unknown',
        lineType: 'Unknown',
        errorReason: 'NumVerify API Key is missing in server configuration .env'
      });
    }

    console.log(`[NumVerify Debug] Calling NumVerify API for phone: ${phone}`);
    const response = await fetch(`http://apilayer.net/api/validate?access_key=${apiKey}&number=${phone}`);
    const data = await response.json();

    console.log('[NumVerify Debug] Raw NumVerify API response received:', data);

    if (data.success === false) {
      console.warn('[NumVerify Debug] NumVerify returned success: false', data.error);
      return res.json({
        success: false,
        valid: false,
        country: 'Unknown',
        carrier: 'Unknown',
        lineType: 'Unknown',
        errorReason: data.error.info || 'API access key validation or rate limit error.',
        rawResponse: data
      });
    }

    const parsedData = {
      success: true,
      valid: data.valid,
      country: data.country_name || 'Unknown',
      carrier: data.carrier || 'Unknown',
      lineType: data.line_type || 'Unknown',
      location: data.location || '',
      rawResponse: data
    };

    console.log('[NumVerify Debug] Returning parsed response:', parsedData);
    res.json(parsedData);
  } catch (error) {
    console.error('[NumVerify Debug] Exception in phone-info route:', error);
    res.json({
      success: false,
      valid: false,
      country: 'Unknown',
      carrier: 'Unknown',
      lineType: 'Unknown',
      errorReason: error.message || 'Failed to fetch phone info due to network issues.',
    });
  }
});
app.get("/", (req, res) => {
  res.json({
    status: "running",
    message: "Spam Detection Backend Running"
  });
});
// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
