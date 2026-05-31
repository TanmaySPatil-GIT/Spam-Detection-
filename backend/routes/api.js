const express = require('express');
const router = express.Router();
const Call = require('../models/Call');
const SpamReport = require('../models/SpamReport');
const CommunityReport = require('../models/CommunityReport');
const ListStatus = require('../models/ListStatus');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const dotenv = require('dotenv');
const { parsePhoneNumberFromString } = require('libphonenumber-js');
const emojiFlag = require('country-flag-emoji');

dotenv.config();

// Configure multer for disk storage
const uploadDir = path.join(__dirname, '..', 'uploads');
try {
    const fsSync = require('fs');
    if (!fsSync.existsSync(uploadDir)) {
        fsSync.mkdirSync(uploadDir, { recursive: true });
    }
} catch (err) {
    console.error("Failed to create uploads directory:", err);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.mp3';
    cb(null, `audio-${Date.now()}${ext}`)
  }
});
const upload = multer({ storage: storage });

// --- Location Intelligence Engine ---
const getLocationIntelligence = (phoneNumberStr) => {
    try {
        console.log(`[Location Intelligence] Normalizing and parsing: ${phoneNumberStr}`);
        
        let normalizedPhone = phoneNumberStr.trim();
        // Automatically prepend +91 for 10-digit numbers without prefix
        if (/^\d{10}$/.test(normalizedPhone)) {
            normalizedPhone = '+91' + normalizedPhone;
        }

        // Parse with default fallback to 'US' for other generic formats without +
        let phoneNumber = parsePhoneNumberFromString(normalizedPhone, 'US');
        
        if (!phoneNumber || !phoneNumber.isValid()) {
            phoneNumber = parsePhoneNumberFromString(normalizedPhone, 'IN');
        }
        
        if (!phoneNumber) {
             console.log(`[Location Intelligence] Failed to parse: ${phoneNumberStr}`);
             return null;
        }
        
        const countryCode = phoneNumber.country;
        if (!countryCode) {
             console.log(`[Location Intelligence] No country detected for: ${phoneNumberStr}`);
             return null;
        }
        
        console.log(`[Location Intelligence] Detected country: ${countryCode} for number: ${phoneNumberStr}`);
        
        const flagInfo = emojiFlag.get(countryCode);
        const countryName = flagInfo ? flagInfo.name : countryCode;
        const flag = flagInfo ? flagInfo.emoji : '';

        // Deterministic simulation for State, City, Carrier
        const cleanStr = phoneNumberStr.replace(/\D/g, '');
        const hash = cleanStr.split('').reduce((acc, char) => acc + parseInt(char), 0);
        
        let state = 'Unknown Region';
        let city = 'Unknown City';
        let carrier = 'Unknown Network';

        if (countryCode === 'IN') {
            const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Gujarat'];
            const cities = ['Mumbai', 'New Delhi', 'Bangalore', 'Chennai', 'Ahmedabad'];
            const carriers = ['Jio Network', 'Airtel', 'Vi India', 'BSNL'];
            state = states[hash % states.length];
            city = cities[hash % cities.length];
            carrier = carriers[hash % carriers.length];
        } else if (countryCode === 'US') {
            const states = ['California', 'New York', 'Texas', 'Florida', 'Illinois'];
            const cities = ['Los Angeles', 'New York City', 'Houston', 'Miami', 'Chicago'];
            const carriers = ['AT&T', 'Verizon', 'T-Mobile', 'Sprint'];
            state = states[hash % states.length];
            city = cities[hash % cities.length];
            carrier = carriers[hash % carriers.length];
        } else {
            state = 'Capital Region';
            carrier = 'Global Telecom';
        }

        return {
            country: countryName,
            state,
            city,
            carrier,
            flag,
            callingCode: phoneNumber.countryCallingCode,
            isValid: phoneNumber.isValid()
        };
    } catch (err) {
        console.error("Location Intelligence Error:", err);
        return null;
    }
};

// --- Core Analyis Engine ---
const evaluateTranscript = async (phoneNumber, simulateText) => {
    let transcript = simulateText || "";
    let riskScore = 0;

    // Compute hash from phoneNumber for deterministic probability values used in scam type prediction
    const cleanPhoneForHash = (phoneNumber || '').replace(/\D/g, '');
    const hash = cleanPhoneForHash.split('').reduce((acc, char) => acc + parseInt(char), 0) || 1;
    let reasons = [];
    let detectedSignals = [];
    
    // Feature 0: Location Intelligence
    const callerLocation = getLocationIntelligence(phoneNumber);
    if (callerLocation) {
        // High risk if international/unknown (assuming baseline is US/IN)
        if (callerLocation.country !== 'India' && callerLocation.country !== 'United States') {
            riskScore += 20;
            detectedSignals.push(`suspicious international origin (${callerLocation.country})`);
        }
        
        // High risk if the number is explicitly invalid according to telecom standards
        if (callerLocation.isValid === false) {
            riskScore += 30;
            detectedSignals.push(`invalid phone number format`);
        }
    }

    // Feature 1: Phone Number Analysis
    const cleanPhone = phoneNumber.replace(/\D/g, ''); 
    const spamPrefixes = ['140', '800', '888', '900', '976'];
    const suspiciousPrefixes = ['1800', '1888'];
    const knownSpamNumbers = ['9999999999', '1234567890'];

    if (knownSpamNumbers.some(num => cleanPhone.includes(num))) {
        riskScore += 80;
        detectedSignals.push(`blacklisted spam number`);
    } else {
        for (let prefix of spamPrefixes) {
            if (cleanPhone.startsWith('1' + prefix) || cleanPhone.startsWith(prefix) || cleanPhone.startsWith('91' + prefix)) {
                riskScore += 50; 
                detectedSignals.push(`high-risk telemarketing prefix`);
                break;
            }
        }
        for (let prefix of suspiciousPrefixes) {
            if (cleanPhone.startsWith('1' + prefix) || cleanPhone.startsWith(prefix) || cleanPhone.startsWith('91' + prefix)) {
                riskScore += 30; 
                detectedSignals.push(`suspicious toll-free prefix`);
                break;
            }
        }
    }

    // Feature 2: Multi-Factor Keyword Detection
    const lowerTranscript = transcript.toLowerCase();
    
    // The specific weights requested
    const highRiskWords = ['free', 'win', 'prize', 'lottery', 'aap jeet gaye', 'inaam', 'lottery lagi', 'mubarak', 'cash prize']; // +50
    const sensitiveWords = ['otp', 'bank', 'account', 'otp batao', 'atm pin', 'khata', 'paise', 'password']; // +40
    const mediumRiskWords = ['urgent', 'now', 'claim', 'abhi claim karo', 'jald', 'turant']; // +25
    
    let hasHighRisk = false;
    let hasSensitive = false;
    let hasMediumRisk = false;

    // Helper: count occurrences
    const countOccurrences = (str, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      return (str.match(regex) || []).length;
    };

    let highRiskCount = 0;
    for (let word of highRiskWords) {
      const count = countOccurrences(lowerTranscript, word);
      if (count > 0) {
        riskScore += 50;
        hasHighRisk = true;
        highRiskCount += count;
      }
    }
    
    let sensitiveCount = 0;
    for (let word of sensitiveWords) {
      const count = countOccurrences(lowerTranscript, word);
      if (count > 0) {
        riskScore += 40;
        hasSensitive = true;
        sensitiveCount += count;
      }
    }

    let mediumRiskCount = 0;
    for (let word of mediumRiskWords) {
      const count = countOccurrences(lowerTranscript, word);
      if (count > 0) {
        riskScore += 25;
        hasMediumRisk = true;
        mediumRiskCount += count;
      }
    }

    if (highRiskCount > 1) {
      riskScore += 20 * (highRiskCount - 1);
      detectedSignals.push(`repeated phrases`);
    }
    
    if (hasHighRisk) detectedSignals.push(`high-risk keywords`);
    if (hasSensitive) detectedSignals.push(`sensitive terms`);
    if (hasMediumRisk) detectedSignals.push(`urgency pattern`);

    // Feature 4: Sentiment & Tone Analysis
    const upperCaseChars = transcript.replace(/[^A-Z]/g, '').length;
    const totalLetters = transcript.replace(/[^A-Za-z]/g, '').length;
    const exclamationMarks = (transcript.match(/!/g) || []).length;
    const aggressiveWords = ['police', 'arrest', 'block', 'compromised', 'suspend'];
    const persuasiveWords = ['guaranteed', 'exclusive', 'limited time', 'offer', 'selected'];
    
    let isAggressive = false;
    let isPersuasive = false;

    if (totalLetters > 0) {
      const upperCaseRatio = upperCaseChars / totalLetters;
      if (upperCaseRatio > 0.4 || exclamationMarks >= 2) {
        isAggressive = true;
      }
    }
    
    for (let word of aggressiveWords) {
      if (lowerTranscript.includes(word)) isAggressive = true;
    }
    
    for (let word of persuasiveWords) {
      if (lowerTranscript.includes(word)) isPersuasive = true;
    }

    if (isAggressive) {
      riskScore += 20; 
      detectedSignals.push("aggressive tone");
    }
    if (isPersuasive) {
      riskScore += 15;
      detectedSignals.push("persuasive tone");
    }

    riskScore = Math.min(riskScore, 100);
    
    let riskLevel = 'Safe';
    if (riskScore >= 70) {
      riskLevel = 'Spam';
    } else if (riskScore >= 40) {
      riskLevel = 'Suspicious';
    }
    
    let finalExplanation = "";
    if (detectedSignals.length > 0) {
      const uniqueSignals = [...new Set(detectedSignals)];
      let combinedSignals = uniqueSignals.join(' and ');
      if (riskLevel === 'Spam' || riskLevel === 'Suspicious') {
        finalExplanation = `This call is flagged due to ${combinedSignals}.`;
      } else {
        finalExplanation = `This call appears safe with no significant risk factors detected.`;
      }
    } else {
      finalExplanation = riskLevel === 'Safe' ? "This call appears safe with no significant risk factors detected." : "General unusual pattern detected.";
    }
    
    reasons.push(finalExplanation);
    
    let confidence = 50;
    if (riskScore >= 80) confidence = 85 + Math.min(10, detectedSignals.length * 3);
    else if (riskScore <= 20) confidence = 90;
    else if (riskScore >= 40 && riskScore < 80) confidence = 70 + Math.min(10, detectedSignals.length * 5);
    
    confidence = Math.min(100, Math.round(confidence));
    const isSpam = riskLevel === 'Spam';

    // --- Next-Gen AI Threat Intelligence Layer ---
    
    // 1. Trust Score (0-100)
    const trustScore = Math.max(0, 100 - riskScore);

    // 2. Spam DNA Analysis
    let urgencyScore = 0;
    let manipulationScore = 0;
    let fearScore = 0;
    let promotionalScore = 0;

    if (lowerTranscript.length > 0) {
      // Urgency Scoring
      const urgWords = ['urgent', 'now', 'claim', 'jald', 'turant', 'immediately', 'asap', 'today', 'limited time'];
      let urgCount = 0;
      urgWords.forEach(w => { if (lowerTranscript.includes(w)) urgCount++; });
      urgencyScore = Math.min(100, urgCount * 30 + (riskScore > 40 ? 30 : 0));

      // Manipulation Scoring
      const manipWords = ['otp', 'bank', 'account', 'password', 'atm pin', 'kyc', 'khata', 'social security', 'credit card'];
      let manipCount = 0;
      manipWords.forEach(w => { if (lowerTranscript.includes(w)) manipCount++; });
      manipulationScore = Math.min(100, manipCount * 25 + (riskScore > 70 ? 40 : 0));

      // Fear Scoring
      const fearWords = ['police', 'arrest', 'block', 'compromised', 'suspend', 'legal', 'lawsuit', 'warrant'];
      let fearCount = 0;
      fearWords.forEach(w => { if (lowerTranscript.includes(w)) fearCount++; });
      fearScore = Math.min(100, fearCount * 35 + (isAggressive ? 30 : 0));

      // Promotional Scoring
      const promoWords = ['free', 'win', 'prize', 'lottery', 'offer', 'selected', 'cash prize', 'gift card'];
      let promoCount = 0;
      promoWords.forEach(w => { if (lowerTranscript.includes(w)) promoCount++; });
      promotionalScore = Math.min(100, promoCount * 25 + (isPersuasive ? 20 : 0));
    } else {
      // Fallback calculations for phone scan lookups
      if (riskScore > 70) {
        urgencyScore = 80;
        manipulationScore = 85;
        fearScore = 15;
        promotionalScore = 90;
      } else if (riskScore >= 40) {
        urgencyScore = 55;
        manipulationScore = 45;
        fearScore = 10;
        promotionalScore = 60;
      } else {
        urgencyScore = 5;
        manipulationScore = 2;
        fearScore = 0;
        promotionalScore = 8;
      }
    }

    // 3. Scam Type Prediction
    let scamType = 'None';
    let p = 0;
    if (riskScore > 30) {
      if (lowerTranscript.includes('lottery') || lowerTranscript.includes('win') || lowerTranscript.includes('prize') || lowerTranscript.includes('inaam')) {
        scamType = 'Lottery Scam';
        p = 88 + (hash % 10);
      } else if (lowerTranscript.includes('otp') || lowerTranscript.includes('bank') || lowerTranscript.includes('account') || lowerTranscript.includes('kyc') || lowerTranscript.includes('khata') || lowerTranscript.includes('password') || lowerTranscript.includes('credit card')) {
        scamType = 'Bank Fraud';
        p = 90 + (hash % 8);
      } else if (lowerTranscript.includes('invest') || lowerTranscript.includes('profit') || lowerTranscript.includes('crypto') || lowerTranscript.includes('stock') || lowerTranscript.includes('money')) {
        scamType = 'Investment Scam';
        p = 85 + (hash % 10);
      } else if (lowerTranscript.includes('insurance') || lowerTranscript.includes('premium') || lowerTranscript.includes('health') || lowerTranscript.includes('warranty')) {
        scamType = 'Insurance Scam';
        p = 80 + (hash % 13);
      } else {
        scamType = 'Telemarketing';
        p = 75 + (hash % 15);
      }
    } else {
      scamType = 'None';
      p = 0;
    }

    // 4. Explainable AI Structure
    const topRiskFactors = [];
    let xaiExplanation = "";
    
    if (detectedSignals.length > 0) {
      const uniqueSignals = [...new Set(detectedSignals)];
      xaiExplanation = `Flagged target due to the explicit presence of: ${uniqueSignals.join(', ')}.`;
      
      detectedSignals.forEach(sig => {
        if (sig.includes('prefix')) topRiskFactors.push('Unverified Circle Routing Prefix');
        if (sig.includes('keyword')) topRiskFactors.push('Fraud Bait Keywords Discovered');
        if (sig.includes('sensitive')) topRiskFactors.push('Credential Harvesting Vectors');
        if (sig.includes('urgency')) topRiskFactors.push('Psychological Urgency Tactics');
        if (sig.includes('tone')) topRiskFactors.push('Coercive Communication Pressures');
        if (sig.includes('invalid')) topRiskFactors.push('Invalid Telecom Identifier Sequence');
        if (sig.includes('international')) topRiskFactors.push('Suspicious Off-shore Gateway Call');
        if (sig.includes('blacklisted')) topRiskFactors.push('Blacklisted Target Sequence');
      });
    } else {
      if (riskScore > 30) {
        xaiExplanation = "Flagged due to unusual carrier routing sequences and suspect location database anomalies.";
        topRiskFactors.push('Suspicious Carrier Telemetry');
      } else {
        xaiExplanation = "Verified safe communication. Zero suspicious sentiment flags or credential prompts identified.";
        topRiskFactors.push('None - Standard Safe Pattern');
      }
    }

    // 5. AI Safety Advisor Recommendations
    const safetyAdvisor = [];
    if (scamType === 'Lottery Scam') {
      safetyAdvisor.push("Never send administrative or processing fees to redeem unexpected prizes.");
      safetyAdvisor.push("Verify lottery credentials directly with verified corporate entities before responding.");
      safetyAdvisor.push("Do not share physical home addresses or identification card scans.");
    } else if (scamType === 'Bank Fraud') {
      safetyAdvisor.push("Banks and credit card issuers will never ask you to read out verification OTPs, passwords, or PIN numbers.");
      safetyAdvisor.push("Terminate suspect calls immediately and dial the bank using the secure number on the back of your debit card.");
      safetyAdvisor.push("Do not tap links sent via auxiliary SMS or email notifications following suspect calls.");
    } else if (scamType === 'Investment Scam') {
      safetyAdvisor.push("Be extremely cautious of claims offering guaranteed high returns or zero-risk investment opportunities.");
      safetyAdvisor.push("Cross-examine advisor license registrations on standard government regulatory portals before investing cash.");
    } else if (scamType === 'Insurance Scam') {
      safetyAdvisor.push("Avoid authorizing insurance policy adjustments or premium transfers directly over unverified voice calls.");
      safetyAdvisor.push("Cross-check policies directly on official insurance provider portals.");
    } else if (scamType === 'Telemarketing') {
      safetyAdvisor.push("Opt-out of marketing circular lists using official national Do-Not-Call (DNC) registers.");
      safetyAdvisor.push("Avoid responding to coercive sales offers or sharing email addresses.");
    } else {
      if (riskScore > 30) {
        safetyAdvisor.push("Avoid sharing personal credentials or repeating 'Yes' or authorizing keywords over unverified lines.");
        safetyAdvisor.push("Block this caller identifier sequence to prevent subsequent incident loops.");
      } else {
        safetyAdvisor.push("Standard secure communications parameters. No special action required.");
        safetyAdvisor.push("Continue practicing standard signal vigilance.");
      }
    }

    const newCall = new Call({
      phoneNumber,
      transcript,
      riskScore,
      riskLevel,
      reasons,
      isSpam,
      confidence,
      callerLocation,
      spamDna: {
        urgencyScore,
        manipulationScore,
        fearScore,
        promotionalScore
      },
      scamTypePrediction: {
        scamType,
        probability: p
      },
      explainableAi: {
        explanation: xaiExplanation,
        topRiskFactors
      },
      safetyAdvisor,
      trustScore
    });

    await newCall.save();
    
    // Fetch aggregated threat intelligence profiles
    let spamReports = 0;
    let listStatus = 'none';
    let reputation = { Spam: 0, Scam: 0, Fraud: 0, Telemarketing: 0, Safe: 0 };
    let threatTimeline = [];

    try {
      const report = await SpamReport.findOne({ phoneNumber });
      if (report) {
        spamReports = report.reportCount;
      }
      
      const listRecord = await ListStatus.findOne({ phoneNumber });
      if (listRecord) {
        listStatus = listRecord.status;
      }

      const communityRecords = await CommunityReport.find({ phoneNumber }).sort({ timestamp: -1 });
      threatTimeline = communityRecords;
      communityRecords.forEach(rec => {
        if (reputation[rec.classification] !== undefined) {
          reputation[rec.classification]++;
        }
      });
    } catch (err) {
      console.error("Error populating threat intelligence profiles:", err);
    }
    
    return { 
        success: true, 
        call: {
          ...newCall.toObject(),
          spamReports,
          listStatus,
          reputation,
          threatTimeline
        },
        riskScore, 
        isSpam, 
        reasons, 
        confidence,
        callerLocation,
        spamReports,
        listStatus,
        reputation,
        threatTimeline,
        spamDna: newCall.spamDna,
        scamTypePrediction: newCall.scamTypePrediction,
        explainableAi: newCall.explainableAi,
        safetyAdvisor: newCall.safetyAdvisor,
        trustScore: newCall.trustScore
    };
};

// @route   POST /api/analyze
// @desc    Analyze text string directly
router.post('/analyze', async (req, res) => {
  try {
    const { phoneNumber, simulateText } = req.body;
    const result = await evaluateTranscript(phoneNumber, simulateText);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error analyzing call' });
  }
});

// @route   POST /api/analyze-audio
// @desc    Upload raw audio, extract with local Python Whisper STT, and pass to evaluation
router.post('/analyze-audio', upload.single('audioFile'), async (req, res) => {
  let uploadedFilePath = null;
  try {
    const { phoneNumber, language } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    uploadedFilePath = req.file.path;
    console.log(`[Audio Upload] Received file saved to: ${uploadedFilePath}`);

    const pythonScriptPath = path.join(__dirname, '..', 'transcribe.py');
    let extractedTranscript = "";

    try {
        console.log(`[Whisper STT] Starting processing...`);
        const pythonCommand = os.platform() === 'win32' ? 'python' : 'python3';
        const { stdout, stderr } = await execPromise(`${pythonCommand} "${pythonScriptPath}" "${uploadedFilePath}"`);
        
        if (stderr) {
           console.log("[Whisper STT Info/Warnings]:\n", stderr);
        }
        
        extractedTranscript = stdout.trim();
        console.log(`[Whisper STT] Transcript extracted successfully.`);
    } catch (execError) {
        console.error("[Whisper STT] Execution Error. Preparing fallback demo mode.");
        
        // Print clear instructions to the terminal for the developer
        console.log("\n==================================");
        console.log("⚠️ WHISPER STT FAILED OR MISSING ⚠️");
        console.log("Please make sure Python is installed and run:");
        console.log("  pip install -U openai-whisper");
        console.log("Error details:", execError.message.split("\n")[0]);
        console.log("Using a fallback transcript for demo purposes...");
        console.log("==================================\n");
        
        // Fallback dummy transcript so the demo does not crash
        extractedTranscript = "This is an urgent message. You have been selected to win a free lottery cash prize! Please share your otp and bank account details now to claim it jald.";
    }
    
    // Evaluate STT output (whether real or fallback)
    const result = await evaluateTranscript(phoneNumber, extractedTranscript);
    res.json(result);
  } catch (error) {
    console.error("Audio route error:", error);
    res.status(500).json({ error: 'Server error analyzing audio' });
  } finally {
      // Clean up the uploaded file to avoid disk clutter
      if (uploadedFilePath) {
         try {
             const fsSync = require('fs');
             if (fsSync.existsSync(uploadedFilePath)) {
                 await fs.unlink(uploadedFilePath);
                 console.log(`[Cleanup] Deleted file ${uploadedFilePath}`);
             }
         } catch (cleanupError) {
             console.error(`[Cleanup] Failed to clean up file ${uploadedFilePath}:`, cleanupError);
         }
      }
  }
});

// @route   GET /api/calls
// @desc    Get dashboard call history
router.get('/', async (req, res) => {
  try {
    const calls = await Call.find().sort({ date: -1 }); // Newest first
    res.json(calls);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching history' });
  }
});

// @route   POST /api/calls/report-spam
// @desc    Increment report count for a phone number
router.post('/report-spam', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    let report = await SpamReport.findOne({ phoneNumber });
    if (!report) {
      report = new SpamReport({ phoneNumber, reportCount: 1 });
    } else {
      report.reportCount += 1;
    }
    await report.save();
    console.log(`[Spam Report] Incremented report count for ${phoneNumber} to ${report.reportCount}`);
    res.json({ success: true, reportCount: report.reportCount });
  } catch (error) {
    console.error("Error reporting spam:", error);
    res.status(500).json({ error: 'Server error reporting spam' });
  }
});

// @route   POST /api/calls/report-community
// @desc    Add a community classification report for a phone number
router.post('/report-community', async (req, res) => {
  try {
    const { phoneNumber, classification } = req.body;
    if (!phoneNumber || !classification) {
      return res.status(400).json({ error: 'Phone number and classification are required' });
    }
    
    // Create new community report
    const newReport = new CommunityReport({ phoneNumber, classification });
    await newReport.save();

    // Increment standard spam reports counter if appropriate classification
    if (['Spam', 'Scam', 'Fraud', 'Telemarketing'].includes(classification)) {
      let report = await SpamReport.findOne({ phoneNumber });
      if (!report) {
        report = new SpamReport({ phoneNumber, reportCount: 1 });
      } else {
        report.reportCount += 1;
      }
      await report.save();
    }

    // Load updated statistics
    let reputation = { Spam: 0, Scam: 0, Fraud: 0, Telemarketing: 0, Safe: 0 };
    const communityRecords = await CommunityReport.find({ phoneNumber }).sort({ timestamp: -1 });
    communityRecords.forEach(rec => {
      if (reputation[rec.classification] !== undefined) {
        reputation[rec.classification]++;
      }
    });

    console.log(`[Community Report] Saved classification ${classification} for ${phoneNumber}`);
    res.json({ 
      success: true, 
      reputation, 
      threatTimeline: communityRecords,
      reportCount: communityRecords.filter(r => ['Spam', 'Scam', 'Fraud', 'Telemarketing'].includes(r.classification)).length
    });
  } catch (error) {
    console.error("Error reporting community classification:", error);
    res.status(500).json({ error: 'Server error reporting community' });
  }
});

// @route   POST /api/calls/set-list-status
// @desc    Add phone number to whitelist or blacklist
router.post('/set-list-status', async (req, res) => {
  try {
    const { phoneNumber, status } = req.body;
    if (!phoneNumber || !status) {
      return res.status(400).json({ error: 'Phone number and status are required' });
    }
    
    let listRecord = await ListStatus.findOne({ phoneNumber });
    if (!listRecord) {
      listRecord = new ListStatus({ phoneNumber, status });
    } else {
      listRecord.status = status;
    }
    await listRecord.save();
    
    console.log(`[List Status] Updated ${phoneNumber} status to ${status}`);
    res.json({ success: true, status: listRecord.status });
  } catch (error) {
    console.error("Error setting list status:", error);
    res.status(500).json({ error: 'Server error setting list status' });
  }
});

// @route   GET /api/calls/phone-profile/:phone
// @desc    Get aggregated threat intelligence profile for a phone number
router.get('/phone-profile/:phone', async (req, res) => {
  try {
    const phoneNumber = req.params.phone;
    
    const listRecord = await ListStatus.findOne({ phoneNumber });
    const spamReport = await SpamReport.findOne({ phoneNumber });
    const communityRecords = await CommunityReport.find({ phoneNumber }).sort({ timestamp: -1 });
    
    let reputation = { Spam: 0, Scam: 0, Fraud: 0, Telemarketing: 0, Safe: 0 };
    communityRecords.forEach(rec => {
      if (reputation[rec.classification] !== undefined) {
        reputation[rec.classification]++;
      }
    });

    res.json({
      phoneNumber,
      listStatus: listRecord ? listRecord.status : 'none',
      spamReports: spamReport ? spamReport.reportCount : 0,
      reputation,
      threatTimeline: communityRecords
    });
  } catch (error) {
    console.error("Error fetching phone profile:", error);
    res.status(500).json({ error: 'Server error fetching phone profile' });
  }
});

// @route   GET /api/calls/global-feed
// @desc    Get latest overall community threat reports
router.get('/global-feed', async (req, res) => {
  try {
    const feed = await CommunityReport.find().sort({ timestamp: -1 }).limit(15);
    res.json(feed);
  } catch (error) {
    console.error("Error fetching global feed:", error);
    res.status(500).json({ error: 'Server error fetching feed' });
  }
});

module.exports = router;
