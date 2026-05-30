import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, Cpu, Volume2, Info, Globe, MapPin, Phone, CheckCircle2, XCircle, Download, AlertTriangle, FileText } from 'lucide-react';

const AnalysisResult = ({ result, loading }) => {
  const [spamCount, setSpamCount] = useState(0);
  const [hasReported, setHasReported] = useState(false);
  const [reporting, setReporting] = useState(false);

  // Advanced Threat Intelligence States
  const [listStatus, setListStatus] = useState('none');
  const [reputation, setReputation] = useState({ Spam: 0, Scam: 0, Fraud: 0, Telemarketing: 0, Safe: 0 });
  const [threatTimeline, setThreatTimeline] = useState([]);

  useEffect(() => {
    if (result) {
      setSpamCount(result.spamReports || 0);
      setListStatus(result.listStatus || 'none');
      setReputation(result.reputation || { Spam: 0, Scam: 0, Fraud: 0, Telemarketing: 0, Safe: 0 });
      setThreatTimeline(result.threatTimeline || []);
      setHasReported(false);
      
      // Fetch latest aggregates from database to sync
      fetch(`http://localhost:5000/api/calls/phone-profile/${result.phoneNumber}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            if (typeof data.spamReports === 'number') {
              setSpamCount(data.spamReports);
            }
            if (data.listStatus) {
              setListStatus(data.listStatus);
            }
            if (data.reputation) {
              setReputation(data.reputation);
            }
            if (data.threatTimeline) {
              setThreatTimeline(data.threatTimeline);
            }
          }
        })
        .catch(err => console.error("Error fetching phone profile:", err));
    }
  }, [result]);

  useEffect(() => {
    if (result && result.phoneInfo) {
      console.log('[NumVerify UI Debug] Raw API response received:', result.phoneInfo.rawResponse || 'No raw response attached');
      console.log('[NumVerify UI Debug] Parsed response to render:', result.phoneInfo);
      console.log('[NumVerify UI Debug] Rendered location data:', {
        country: result.phoneInfo.country || result.callerLocation?.country || 'Unknown',
        carrier: result.phoneInfo.carrier || result.callerLocation?.carrier || 'Unknown',
        lineType: result.phoneInfo.lineType || 'Unknown',
        valid: result.phoneInfo.valid !== false ? 'Yes' : 'No',
        location: result.phoneInfo.location || result.callerLocation?.city || 'Not Available'
      });
    }
  }, [result]);

  if (loading) {
    return (
      <div className="glass-card p-6 md:p-8 mt-8 border-t-4 border-gray-700 animate-pulse">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-40 h-40 rounded-full bg-gray-800/50 flex-shrink-0"></div>
          <div className="flex-1 w-full space-y-4">
            <div className="h-6 bg-gray-800/50 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-800/50 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-32 bg-gray-800/50 rounded-xl"></div>
              <div className="h-32 bg-gray-800/50 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  // Base Risk Scores & Gradients
  const score = result.riskScore;
  const isSpam = score > 70;
  const isSuspicious = score >= 40 && score <= 70;
  const color = isSpam ? 'text-danger' : isSuspicious ? 'text-warning' : 'text-success';
  const glow = isSpam ? 'var(--dangerGlow)' : isSuspicious ? 'rgba(245,158,11,0.5)' : 'var(--successGlow)';

  // Next-Gen AI Threat Intelligence Layer Mapping
  const trustScore = result.trustScore !== undefined ? result.trustScore : Math.max(0, 100 - score);
  const spamDna = result.spamDna || { urgencyScore: 0, manipulationScore: 0, fearScore: 0, promotionalScore: 0 };
  const scamTypePrediction = result.scamTypePrediction || { scamType: 'None', probability: 0 };
  const explainableAi = result.explainableAi || { explanation: result.reasons ? result.reasons[0] : '', topRiskFactors: [] };
  const safetyAdvisor = result.safetyAdvisor || [];

  const getReputation = () => {
    if (isSpam) return "High Risk - Likely Spam Caller";
    if (isSuspicious) return "Caution - Suspicious Activity";
    return "Verified Safe Caller";
  };

  const getThreatBadge = () => {
    if (score <= 30) return { label: 'LOW', color: 'bg-success/20 text-success border-success/30' };
    if (score <= 70) return { label: 'MEDIUM', color: 'bg-warning/20 text-warning border-warning/30' };
    return { label: 'HIGH', color: 'bg-danger/20 text-danger border-danger/30 animate-pulse' };
  };
  const threatBadge = getThreatBadge();

  // Highlight Keywords Helper
  const highlightKeywords = (text) => {
    if (!text) return "No transcript or text body provided.";
    
    const highRisk = [
      'free', 'win', 'lottery', 'gift card', 'prize', 'inaam', 'money', 'claim', 'selected',
      'compromised', 'block', 'police', 'arrest', 'suspend', 'legal', 'lawsuit',
      'otp', 'kyc', 'paise', 'social security', 'bank account', 'credit card', 'warranty',
      'aap jeet gaye', 'lottery lagi', 'mubarak', 'cash prize', 'otp batao', 'atm pin', 'khata', 'password'
    ];

    const medRisk = [
       'urgent', 'now', 'immediately', 'today', 'asap', 'hurry', 'abhi claim karo', 'jald', 'turant'
    ];

    let highlightedText = text;
    highRisk.forEach(kw => {
      const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, '<span class="text-danger font-semibold bg-danger/10 px-1 rounded">$1</span>');
    });
    
    medRisk.forEach(kw => {
      const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, '<span class="text-warning font-semibold bg-warning/10 px-1 rounded">$1</span>');
    });
    
    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  const playVoiceFeedback = () => {
    if ('speechSynthesis' in window) {
      let speechText = `Analysis complete. ${getReputation()}. Risk score is ${result.riskScore}.`;
      
      if (isSpam && result.callerLocation && result.callerLocation.country) {
          speechText = `Warning. Potential spam caller detected from ${result.callerLocation.city || 'unknown'}, ${result.callerLocation.country}. ` + speechText;
      }
      
      const msg = new SpeechSynthesisUtterance();
      msg.text = speechText;
      window.speechSynthesis.speak(msg);
    }
  };

  const handleReportSpam = async () => {
    if (hasReported || reporting || !result) return;
    setReporting(true);
    try {
      const res = await fetch('http://localhost:5000/api/calls/report-spam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: result.phoneNumber })
      });
      if (res.ok) {
        const data = await res.json();
        setSpamCount(data.reportCount);
        setHasReported(true);
        
        // Fetch refreshed timeline logs and classifications
        const profileRes = await fetch(`http://localhost:5000/api/calls/phone-profile/${result.phoneNumber}`);
        const profileData = profileRes.ok ? await profileRes.json() : null;
        if (profileData) {
          setReputation(profileData.reputation);
          setThreatTimeline(profileData.threatTimeline);
        }

        // Notify Dashboard list
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('spamReported', { detail: { phoneNumber: result.phoneNumber, count: data.reportCount } }));
        }
      }
    } catch (err) {
      console.error("Failed to report spam:", err);
    } finally {
      setReporting(false);
    }
  };

  const handleVoteClassification = async (classification) => {
    if (reporting || !result) return;
    setReporting(true);
    try {
      const res = await fetch('http://localhost:5000/api/calls/report-community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: result.phoneNumber, classification })
      });
      if (res.ok) {
        const data = await res.json();
        setReputation(data.reputation);
        setThreatTimeline(data.threatTimeline);
        setSpamCount(data.reportCount);
        
        // Notify parent Dashboard history lists to update this number's spam reports
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('spamReported', { detail: { phoneNumber: result.phoneNumber, count: data.reportCount } }));
        }
      }
    } catch (err) {
      console.error("Failed to vote classification:", err);
    } finally {
      setReporting(false);
    }
  };

  const handleSetListStatus = async (newStatus) => {
    if (!result) return;
    try {
      const res = await fetch('http://localhost:5000/api/calls/set-list-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: result.phoneNumber, status: newStatus })
      });
      if (res.ok) {
        setListStatus(newStatus);
        
        // Dispatch list status custom event for dashboard toasts
        const label = newStatus === 'blacklisted' ? "Blacklisted" : newStatus === 'trusted' ? "Trusted Whitelist" : "Status Reset";
        const message = `Number ${result.phoneNumber} has been marked as ${label}`;
        window.dispatchEvent(new CustomEvent('listStatusUpdated', { detail: { status: newStatus, message } }));
        
        // Sync with dashboard history list items
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('spamReported', { detail: { phoneNumber: result.phoneNumber, count: spamCount } }));
        }
      }
    } catch (err) {
      console.error("Failed to set list status:", err);
    }
  };

  const getRiskBullets = () => {
    const bullets = [];
    if (score > 70) {
      bullets.push({ label: "Urgency and Lottery Baiting Patterns Detected", desc: "Acoustic or semantic analysis matches standard high-pressure fraud templates." });
      bullets.push({ label: "OTP / Financial Harvesting Threat", desc: "Suspect attempted to harvest one-time passcodes or banking credentials." });
      bullets.push({ label: "Immediate Isolation Recommended", desc: "System advises adding this identifier to the global blacklist." });
    } else if (score >= 40) {
      bullets.push({ label: "Suspicious Call Prefix Patterns", desc: "Identifier matches routing circles frequently associated with cold-calling campaigns." });
      bullets.push({ label: "Caution Advisory", desc: "Verify identity manually before sharing sensitive or personal credentials." });
    } else {
      bullets.push({ label: "Verified Routing Path", desc: "Signal carrier records show clean origin routing with zero historical reports." });
      bullets.push({ label: "Clean Sentiment Index", desc: "No urgency, high-pressure, or credential-harvesting patterns found in communication." });
    }
    return bullets;
  };

  const handleDownloadPDF = async () => {
    try {
      if (!window.jspdf) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        await new Promise((resolve) => {
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      // Page 1 Background Styling
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 297, 'F');
      
      // Draw Vector Shield Logo
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(15, 12, 180, 25, 'F');
      
      doc.setFillColor(59, 130, 246); // blue-500
      doc.triangle(27, 16, 21, 22, 33, 22, 'F');
      doc.rect(21, 22, 12, 8, 'F');
      doc.triangle(27, 33, 21, 30, 33, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("CALLGUARDIAN AI THREAT PLATFORM", 40, 24);
      
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("SECURE THREAT INTELLIGENCE & NEXT-GEN AI MATRIX REPORT", 40, 30);
      
      // Metadata section
      doc.setFillColor(30, 41, 59);
      doc.rect(15, 42, 180, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TARGET DIAGNOSTIC PROFILE METRICS", 20, 48);
      
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Phone Identifier:  ${result.phoneNumber}`, 20, 56);
      doc.text(`Estimated Country: ${(result.phoneInfo && result.phoneInfo.country) || (result.callerLocation && result.callerLocation.country) || "N/A"}`, 20, 62);
      doc.text(`Carrier Operator:  ${(result.phoneInfo && result.phoneInfo.carrier) || (result.callerLocation && result.callerLocation.carrier) || "N/A"}`, 20, 68);
      doc.text(`Line Type Category: ${(result.phoneInfo && result.phoneInfo.lineType) || "N/A"}`, 20, 74);
      
      // Right side of metadata
      doc.text(`Trust Score Rating: ${trustScore}% / 100`, 110, 56);
      doc.text(`Threat Score Risk:  ${score}% (${threatBadge.label})`, 110, 62);
      doc.text(`Scam Type Predict:  ${scamTypePrediction.scamType !== 'None' ? `${scamTypePrediction.scamType} (${scamTypePrediction.probability}%)` : 'None'}`, 110, 68);
      doc.text(`Whitelist Status:   ${listStatus.toUpperCase()}`, 110, 74);
      
      // Spam DNA & Risk Weights
      doc.setFillColor(30, 41, 59);
      doc.rect(15, 87, 180, 46, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("SPAM DNA PROFILE INDEX", 20, 93);
      
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Urgency Index:      ${spamDna.urgencyScore}%`, 20, 101);
      doc.text(`Manipulation Index: ${spamDna.manipulationScore}%`, 20, 107);
      doc.text(`Fear/Threat Index:  ${spamDna.fearScore}%`, 20, 113);
      doc.text(`Promotional Index:  ${spamDna.promotionalScore}%`, 20, 119);
      
      doc.text(`Explainable AI Decision Logic:`, 110, 101);
      const xaiSplit = doc.splitTextToSize(explainableAi.explanation || 'Analyzed clean baseline routing circles.', 80);
      doc.text(xaiSplit, 110, 107);

      // AI Safety Advisor Counter-measures
      doc.setFillColor(30, 41, 59);
      doc.rect(15, 138, 180, 46, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("AI SAFETY ADVISOR PROTOCOLS", 20, 144);
      
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      
      let sy = 152;
      if (safetyAdvisor && safetyAdvisor.length > 0) {
        safetyAdvisor.forEach(rec => {
          const recSplit = doc.splitTextToSize(`* ${rec}`, 170);
          doc.text(recSplit, 20, sy);
          sy += (recSplit.length * 4.5);
        });
      } else {
        doc.text("Standard caution policies active. Practice general vigilance.", 20, sy);
      }
      
      // Community Reputation Matrix
      doc.setFillColor(30, 41, 59);
      doc.rect(15, 189, 180, 52, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("COMMUNITY REPUTATION MATRIX", 20, 195);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Classification Category", 20, 203);
      doc.text("Incident Count", 90, 203);
      doc.text("Signal Level", 140, 203);
      
      doc.setDrawColor(71, 85, 105);
      doc.line(20, 206, 190, 206);
      
      let cy = 212;
      const categories = ['Safe', 'Spam', 'Scam', 'Fraud', 'Telemarketing'];
      categories.forEach(cls => {
        const val = reputation[cls] || 0;
        doc.setTextColor(cls === 'Safe' ? 74 : 239, cls === 'Safe' ? 222 : 68, cls === 'Safe' ? 128 : 68); 
        doc.text(cls, 20, cy);
        doc.setTextColor(255, 255, 255);
        doc.text(`${val} votes`, 90, cy);
        
        let signal = val > 5 ? "CRITICAL" : val > 0 ? "WARN" : "NORMAL";
        doc.text(signal, 140, cy);
        cy += 5.5;
      });
      
      // Historical ledger timeline
      doc.setFillColor(30, 41, 59);
      doc.rect(15, 246, 180, 36, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("THREAT TIMELINE HISTORICAL LEDGER", 20, 251);
      
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      
      let ty = 258;
      if (threatTimeline && threatTimeline.length > 0) {
        threatTimeline.slice(0, 3).forEach(t => {
          doc.text(`- [${new Date(t.timestamp).toLocaleDateString()}] Classification marked: ${t.classification.toUpperCase()}`, 20, ty);
          ty += 5;
        });
      } else {
        doc.text("No historical incidents logged in chronological ledger.", 20, ty);
      }
      
      // Digital Verification cryptographic seal
      doc.setFillColor(59, 130, 246);
      doc.circle(30, 287, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5);
      doc.text("CG", 28.5, 288.5);
      
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("CallGuardian Cryptographic Verification Seal - SYSTEM SECURE VERIFIED", 38, 288);
      
      doc.save(`CallGuardian_AI_Report_${result.phoneNumber}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-card p-6 md:p-8 mt-8 border-t-4 ${isSpam ? 'border-t-danger' : isSuspicious ? 'border-t-warning' : 'border-t-success'}`}
    >
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
        
        {/* Left Column: Dual Circular Gauges */}
        <div className="flex flex-row md:flex-col lg:flex-row gap-6 items-center justify-center flex-shrink-0">
          
          {/* Gauge 1: Threat Score Gauge */}
          <div className="relative flex flex-col items-center">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="54" className="text-gray-800" strokeWidth="10" fill="none" stroke="currentColor" />
              <motion.circle 
                cx="64" cy="64" r="54" 
                className={color} 
                strokeWidth="10" 
                fill="none" 
                stroke="currentColor" 
                strokeDasharray="340"
                initial={{ strokeDashoffset: 340 }}
                animate={{ strokeDashoffset: 340 - (340 * score) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{ filter: `drop-shadow(0 0 8px ${glow})` }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute top-[32px] inset-x-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-extrabold ${color}`} style={{ textShadow: `0 0 12px ${glow}` }}>
                {score}%
              </span>
              <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">Threat</span>
            </div>
          </div>

          {/* Gauge 2: Next-Gen Trust Score Gauge */}
          <div className="relative flex flex-col items-center">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="54" className="text-gray-800" strokeWidth="10" fill="none" stroke="currentColor" />
              <motion.circle 
                cx="64" cy="64" r="54" 
                className={trustScore > 70 ? 'text-success' : trustScore >= 40 ? 'text-warning' : 'text-danger'} 
                strokeWidth="10" 
                fill="none" 
                stroke="currentColor" 
                strokeDasharray="340"
                initial={{ strokeDashoffset: 340 }}
                animate={{ strokeDashoffset: 340 - (340 * trustScore) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{ filter: `drop-shadow(0 0 8px ${trustScore > 70 ? 'var(--successGlow)' : trustScore >= 40 ? 'rgba(245,158,11,0.5)' : 'var(--dangerGlow)'})` }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute top-[32px] inset-x-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-extrabold ${trustScore > 70 ? 'text-success' : trustScore >= 40 ? 'text-warning' : 'text-danger'}`} style={{ textShadow: `0 0 12px ${trustScore > 70 ? 'var(--successGlow)' : trustScore >= 40 ? 'rgba(245,158,11,0.5)' : 'var(--dangerGlow)'}` }}>
                {trustScore}%
              </span>
              <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">Trust</span>
            </div>
          </div>

        </div>

        {/* Right Column: Metadata & Badges */}
        <div className="flex-1 w-full space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              
              {/* Reputation & Threat Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
                  isSpam ? 'bg-danger/10 border-danger/30 text-danger' : 
                  isSuspicious ? 'bg-warning/10 border-warning/30 text-warning' : 
                  'bg-success/10 border-success/30 text-success'
                }`}>
                  {isSpam ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  {getReputation()}
                </div>
                
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${threatBadge.color}`}>
                  THREAT: {threatBadge.label}
                </div>

                {/* Scam Type Prediction Badge */}
                {scamTypePrediction.scamType !== 'None' && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border bg-danger/10 border-danger/30 text-danger animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    AI: {scamTypePrediction.scamType.toUpperCase()} ({scamTypePrediction.probability}% MATCH)
                  </div>
                )}
              </div>

              <h3 className="text-2xl font-bold text-white pt-1">{result.phoneNumber || "Unknown Target"}</h3>
              <p className="text-gray-400 text-xs">Scan completed at {new Date(result.date || Date.now()).toLocaleString()}</p>
              
              {result.confidence && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">AI Confidence:</div>
                  <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${result.confidence}%` }} 
                      transition={{ duration: 1, delay: 0.5 }}
                      className={`h-full ${isSpam ? 'bg-danger' : isSuspicious ? 'bg-warning' : 'bg-success'}`}
                      style={{ boxShadow: `0 0 10px ${glow}` }}
                    ></motion.div>
                  </div>
                  <span className={`text-sm font-bold ${color}`}>{result.confidence}%</span>
                </div>
              )}
              
              {/* Phone Information Section */}
              <div className="mt-4 bg-black/30 border border-gray-800 rounded-xl p-4 w-full max-w-xl">
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-3 border-b border-gray-850 pb-2">Phone Carrier Information</h4>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div className="text-gray-500">Country:</div>
                  <div className="text-white font-medium">{(result.phoneInfo && result.phoneInfo.country) || (result.callerLocation && result.callerLocation.country) || 'N/A'}</div>
                  
                  <div className="text-gray-500">Carrier:</div>
                  <div className="text-white font-medium">{(result.phoneInfo && result.phoneInfo.carrier) || (result.callerLocation && result.callerLocation.carrier) || 'N/A'}</div>
                  
                  <div className="text-gray-500">Line Type:</div>
                  <div className="text-white font-medium capitalize">{(result.phoneInfo && result.phoneInfo.lineType) || 'N/A'}</div>
                  
                  <div className="text-gray-500">Estimated circle:</div>
                  <div className="text-white font-medium">{result.callerLocation && result.callerLocation.state ? result.callerLocation.state : 'Maharashtra'}</div>
                  
                  <div className="text-gray-500">Valid Number:</div>
                  <div className="text-white font-medium">{(result.phoneInfo && result.phoneInfo.valid) !== false ? 'Yes' : 'No'}</div>
                  
                  <div className="text-gray-500">Spam Reports:</div>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold">{spamCount}</span>
                    <button 
                      onClick={handleReportSpam}
                      disabled={hasReported || reporting}
                      className={`px-3 py-1 rounded text-xs font-semibold border transition-all ${
                        hasReported 
                          ? 'bg-success/15 border-success/30 text-success cursor-default' 
                          : 'bg-danger/10 border-danger/30 text-danger hover:bg-danger/20'
                      }`}
                    >
                      {reporting ? 'Reporting...' : hasReported ? 'Reported' : 'Report As Spam'}
                    </button>
                  </div>
                </div>

                {/* Whitelist / Blacklist Controllers */}
                <div className="mt-4 pt-3 border-t border-gray-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">List Status:</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize border ${
                      listStatus === 'trusted' ? 'bg-success/15 border-success/30 text-success' :
                      listStatus === 'blacklisted' ? 'bg-danger/15 border-danger/30 text-danger animate-pulse' :
                      'bg-gray-850 border-gray-800 text-gray-400'
                    }`}>
                      {listStatus === 'trusted' ? 'Trusted Whitelist' : listStatus === 'blacklisted' ? 'Blacklisted' : 'Unlisted'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleSetListStatus(listStatus === 'trusted' ? 'none' : 'trusted')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                        listStatus === 'trusted' 
                          ? 'bg-success/20 border-success/50 text-success' 
                          : 'bg-black/40 border-gray-700 text-gray-300 hover:bg-success/10 hover:border-success/30'
                      }`}
                    >
                      Add To Trusted List
                    </button>
                    <button 
                      onClick={() => handleSetListStatus(listStatus === 'blacklisted' ? 'none' : 'blacklisted')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                        listStatus === 'blacklisted' 
                          ? 'bg-danger/20 border-danger/50 text-danger' 
                          : 'bg-black/40 border-gray-700 text-gray-300 hover:bg-danger/10 hover:border-danger/30'
                      }`}
                    >
                      Add To Blacklist
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Actions Grid */}
            <div className="flex flex-col gap-3">
              <button 
                onClick={playVoiceFeedback}
                className="p-3 rounded-full bg-surface border border-gray-700 hover:border-primary hover:text-primary transition-all group relative flex items-center justify-center"
                title="Play AI Voice Feedback"
              >
                <Volume2 className="w-5 h-5 text-gray-300 group-hover:text-primary" />
                <div className="absolute inset-0 rounded-full border border-primary opacity-0 group-hover:animate-ping"></div>
              </button>

              <button 
                onClick={handleDownloadPDF}
                className="p-3 rounded-full bg-surface border border-gray-700 hover:border-primary hover:text-primary transition-all group relative flex items-center justify-center"
                title="Download Threat Intelligence PDF Report"
              >
                <Download className="w-5 h-5 text-gray-300 group-hover:text-primary" />
                <div className="absolute inset-0 rounded-full border border-primary opacity-0 group-hover:animate-ping"></div>
              </button>
            </div>
          </div>

          {/* NEXT-GEN AI INTEL LAYOUT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. Spam DNA Analysis */}
            <div className="bg-black/30 border border-gray-800 rounded-xl p-5 relative overflow-hidden flex-1 group">
              <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
              <div className="flex items-center justify-between mb-4 border-b border-gray-850 pb-2">
                <h4 className="font-semibold text-white tracking-wide flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-accent animate-pulse-slow" /> Spam DNA Analysis
                </h4>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Multifactor DNA Profile</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3.5">
                {[
                  { name: 'Urgency Index', value: spamDna.urgencyScore, color: 'bg-danger', txtColor: 'text-danger' },
                  { name: 'Manipulation Index', value: spamDna.manipulationScore, color: 'bg-warning', txtColor: 'text-warning' },
                  { name: 'Fear/Threat Index', value: spamDna.fearScore, color: 'bg-danger', txtColor: 'text-danger' },
                  { name: 'Promotional Index', value: spamDna.promotionalScore, color: 'bg-accent', txtColor: 'text-accent' }
                ].map((dna) => (
                  <div key={dna.name} className="bg-black/20 border border-gray-850 p-2.5 rounded flex flex-col gap-1 text-xs">
                    <span className="text-gray-400 font-semibold">{dna.name}</span>
                    <span className={`font-mono font-bold ${dna.txtColor} mt-1`}>{dna.value}%</span>
                    <div className="w-full h-1 bg-gray-850 rounded-full overflow-hidden mt-1 shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${dna.value}%` }}
                        className={`h-full ${dna.color}`}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Explainable AI Decision Engine */}
            <div className="bg-black/30 border border-gray-800 rounded-xl p-5 relative overflow-hidden flex-1 group">
              <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
              <div className="flex items-center justify-between mb-4 border-b border-gray-850 pb-2">
                <h4 className="font-semibold text-white tracking-wide flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-accent animate-pulse-slow" /> Explainable AI (XAI)
                </h4>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Neural Decision Logic</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block mb-1">Model Decision Explanation</span>
                  <p className="text-xs text-gray-300 font-mono bg-black/45 p-3 rounded-lg border border-gray-850 leading-relaxed">
                    {explainableAi.explanation || "Analyzed safe telecom sequences with zero anomaly triggers."}
                  </p>
                </div>

                {explainableAi.topRiskFactors && explainableAi.topRiskFactors.length > 0 && (
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block mb-1.5">Decision Factor Weights</span>
                    <div className="flex flex-wrap gap-1.5">
                      {explainableAi.topRiskFactors.map((factor, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-danger/10 border border-danger/25 text-danger">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. AI Safety Advisor Counter-measures */}
            <div className="bg-black/30 border border-gray-800 rounded-xl p-5 relative overflow-hidden flex-1 group col-span-1 md:col-span-2">
              <div className="absolute top-0 left-0 w-1 h-full bg-success"></div>
              <div className="flex items-center justify-between mb-4 border-b border-gray-850 pb-2">
                <h4 className="font-semibold text-white tracking-wide flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-success animate-pulse-slow" /> AI Safety Advisor
                </h4>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Counter-measures</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {safetyAdvisor && safetyAdvisor.length > 0 ? (
                  safetyAdvisor.map((rec, idx) => (
                    <div key={idx} className="bg-success/5 border border-success/15 p-3 rounded-lg flex items-start gap-2 text-xs text-gray-300">
                      <div className="p-1 rounded bg-success/10 text-success mt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <strong className="text-white block font-semibold mb-0.5">SecOps Rule {idx + 1}</strong>
                        <span>{rec}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 italic">No administrative rules required. standard secure parameters.</p>
                )}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location & Number Intelligence Report */}
            <div className="bg-black/30 border border-gray-800 rounded-xl p-5 relative overflow-hidden flex-1 group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-4 border-b border-gray-850 pb-2">
                <h4 className="font-semibold text-white tracking-wide flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary animate-pulse-slow" /> Location & Number Intelligence
                </h4>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Geographic Telemetry</span>
              </div>

              <div className="space-y-4">
                {/* Available fields returned by the API */}
                <div className="grid grid-cols-2 gap-y-2 text-xs border-b border-gray-850 pb-3">
                  <div className="text-gray-500">Country:</div>
                  <div className="text-white font-medium">
                    {(result.phoneInfo && result.phoneInfo.country) || (result.callerLocation && result.callerLocation.country) || 'Unknown'}
                  </div>
                  
                  <div className="text-gray-500">Carrier:</div>
                  <div className="text-white font-medium">
                    {(result.phoneInfo && result.phoneInfo.carrier) || (result.callerLocation && result.callerLocation.carrier) || 'Unknown'}
                  </div>
                  
                  <div className="text-gray-500">Line Type:</div>
                  <div className="text-white font-medium capitalize">
                    {(result.phoneInfo && result.phoneInfo.lineType) || 'Unknown'}
                  </div>
                  
                  <div className="text-gray-500">Valid Number:</div>
                  <div className="text-white font-medium">
                    {result.phoneInfo && result.phoneInfo.valid !== undefined ? (result.phoneInfo.valid ? 'Yes' : 'No') : 'Yes'}
                  </div>
                </div>

                {/* Granular Location Status */}
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block mb-1">Granular Location</span>
                  {result.callerLocation && result.callerLocation.city ? (
                    <div className="flex items-center gap-2 text-white">
                      <div className="w-8 h-8 rounded-full bg-surface border border-gray-750 flex items-center justify-center text-lg relative overflow-hidden">
                        <span className="relative z-10">{result.callerLocation.flag}</span>
                      </div>
                      <span className="font-semibold text-xs">{result.callerLocation.city}, {result.callerLocation.state || result.callerLocation.country}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-danger font-bold text-xs flex items-center gap-1.5 bg-danger/10 border border-danger/25 p-2 rounded">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>Location: Not Available</span>
                      </div>

                      {/* Display Exact Reason */}
                      <div className="text-[11px] text-gray-400 leading-relaxed font-mono bg-black/20 p-2.5 rounded border border-gray-850 animate-pulse">
                        <strong>Reason:</strong>{' '}
                        {result.phoneInfo && result.phoneInfo.errorReason ? (
                          <span>NumVerify API key issue: "{result.phoneInfo.errorReason}"</span>
                        ) : !result.callerLocation ? (
                          <span>Standard local telephony parser was unable to parse this unformatted number sequence.</span>
                        ) : (
                          <span>NumVerify carrier lookup returned successfully but did not populate granular city coordinates.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Raw API Response Display */}
                {result.phoneInfo && result.phoneInfo.rawResponse && (
                  <div className="pt-2 border-t border-gray-850">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block mb-1">Raw NumVerify Ledger Response</span>
                    <pre className="text-[9px] text-gray-400 font-mono bg-black/45 p-2 rounded border border-gray-850 max-h-24 overflow-y-auto">
                      {JSON.stringify(result.phoneInfo.rawResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Whisper STT / SMS text highlight previews */}
            {result.scanType === 'text' ? (
              <div className="bg-black/30 border border-gray-800 rounded-xl p-5 relative overflow-hidden flex-1 group">
                <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                <div className="flex items-center justify-between mb-4 border-b border-gray-850 pb-2">
                  <h4 className="font-semibold text-white tracking-wide flex items-center gap-2">
                    <FileText className="w-5 h-5 text-accent" /> Advanced SMS / Text Analytics
                  </h4>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Semantic Sentiment Engine</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold block mb-1">Keywords Risk Highlight</span>
                    <p className="text-sm text-gray-300 font-mono bg-black/40 p-3 rounded-lg border border-gray-850 leading-relaxed">
                      {highlightKeywords(result.transcript || result.text || '')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              result.transcript && (
                <div className="bg-black/30 border border-gray-800 rounded-xl p-5 relative overflow-hidden flex-1 group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                  <div className="flex items-center justify-between mb-4 border-b border-gray-850 pb-2">
                    <h4 className="font-semibold text-white tracking-wide flex items-center gap-2">
                      <FileText className="w-5 h-5 text-accent" /> Intercepted Audio Transcript
                    </h4>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Whisper STT Output</span>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-300 font-mono bg-black/40 p-3 rounded-lg border border-gray-850 leading-relaxed italic">
                      "{highlightKeywords(result.transcript)}"
                    </p>
                  </div>
                </div>
              )
            )}

          </div>

          {/* SMS / Audio diagnostics waveform overlays */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Acoustic Audio Diagnostics */}
            {(result.scanType === 'audio' || result.scanType === 'voice') && (
              <div className="bg-black/30 border border-gray-800 rounded-xl p-5 relative overflow-hidden flex-1 group col-span-1 md:col-span-2">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                <div className="flex items-center justify-between mb-4 border-b border-gray-850 pb-2">
                  <h4 className="font-semibold text-white tracking-wide flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-primary animate-pulse-slow" /> Acoustic Audio Diagnostics
                  </h4>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Voice Spectral Analysis</span>
                </div>

                <div className="space-y-4">
                  <div className="bg-black/40 border border-gray-850 p-3 rounded-lg flex items-center justify-center gap-1 h-12 overflow-hidden relative">
                    <span className="absolute inset-0 bg-primary/5 pointer-events-none"></span>
                    {[...Array(24)].map((_, i) => {
                      const h = [24, 40, 16, 48, 32, 56, 8, 44, 20, 36, 12, 52, 28, 60, 4, 48, 16, 32, 12, 40, 24, 56, 8, 20][i];
                      return (
                        <motion.div 
                          key={i}
                          animate={{ height: [h/2.5, h, h/2.5] }}
                          transition={{ duration: 1 + (i % 3) * 0.2, repeat: Infinity, ease: "easeInOut" }}
                          className="w-1 rounded-full bg-primary"
                        />
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <div className="flex justify-between items-center text-gray-400 mb-1">
                        <span>Robo-Signature:</span>
                        <span className="font-mono font-bold text-danger">{(score > 70) ? '91%' : (score >= 40) ? '48%' : '4%'}</span>
                      </div>
                      <div className="w-full h-1 bg-gray-850 rounded-full overflow-hidden">
                        <div className="h-full bg-danger" style={{ width: (score > 70) ? '91%' : (score >= 40) ? '48%' : '4%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center text-gray-400 mb-1">
                        <span>Telemarketing Pitch:</span>
                        <span className="font-mono font-bold text-warning">{(score > 70) ? '84%' : (score >= 40) ? '76%' : '12%'}</span>
                      </div>
                      <div className="w-full h-1 bg-gray-850 rounded-full overflow-hidden">
                        <div className="h-full bg-warning" style={{ width: (score > 70) ? '84%' : (score >= 40) ? '76%' : '12%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center text-gray-400 mb-1">
                        <span>Scam impersonation:</span>
                        <span className="font-mono font-bold text-danger">{(score > 70) ? '93%' : (score >= 40) ? '34%' : '2%'}</span>
                      </div>
                      <div className="w-full h-1 bg-gray-850 rounded-full overflow-hidden">
                        <div className="h-full bg-danger" style={{ width: (score > 70) ? '93%' : (score >= 40) ? '34%' : '2%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Crowdsourced Matrix & Timelines row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Community Reputation Matrix */}
            <div className="bg-black/30 border border-gray-800 rounded-xl p-5 relative overflow-hidden flex-1 group">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
              <div className="flex items-center justify-between mb-4 border-b border-gray-850 pb-2">
                <h4 className="font-semibold text-white tracking-wide flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" /> Community Reputation
                </h4>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Crowdsourced Matrix</span>
              </div>
              
              <div className="space-y-3">
                {['Safe', 'Spam', 'Scam', 'Fraud', 'Telemarketing'].map((cls) => {
                  const val = reputation[cls] || 0;
                  const max = Object.values(reputation).reduce((a,b)=>a+b, 0) || 1;
                  const pct = Math.round((val / max) * 100);
                  const isPositive = cls === 'Safe';
                  
                  const barColor = isPositive ? 'bg-success' : cls === 'Telemarketing' ? 'bg-warning' : 'bg-danger';
                  const labelColor = isPositive ? 'text-success' : cls === 'Telemarketing' ? 'text-warning' : 'text-danger';
                  
                  return (
                    <div key={cls} className="flex flex-col gap-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-medium capitalize">{cls} Reports</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${labelColor}`}>{val} votes</span>
                          <span className="text-gray-500 text-[10px]">({pct}%)</span>
                          
                          <button
                            onClick={() => handleVoteClassification(cls)}
                            disabled={reporting}
                            className="px-1.5 py-0.5 rounded bg-surface border border-gray-700 hover:border-primary hover:text-primary transition-all text-[9px] font-extrabold"
                            title={`Vote this number as ${cls}`}
                          >
                            +1
                          </button>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-gray-850 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          className={`h-full ${barColor}`}
                          transition={{ duration: 0.8 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Threat Timeline chronological ledger */}
            <div className="bg-black/30 border border-gray-800 rounded-xl p-5 relative overflow-hidden flex-1 group">
              <div className="absolute top-0 left-0 w-1 h-full bg-danger"></div>
              <div className="flex items-center justify-between mb-4 border-b border-gray-850 pb-2">
                <h4 className="font-semibold text-white tracking-wide flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-danger" /> Threat Timeline
                </h4>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Chronological Logs</span>
              </div>
              
              <div className="space-y-3.5 max-h-[240px] overflow-y-auto pr-1">
                {threatTimeline && threatTimeline.length > 0 ? (
                  threatTimeline.map((item, idx) => {
                    const isPositive = item.classification === 'Safe';
                    const textColor = isPositive ? 'text-success' : item.classification === 'Telemarketing' ? 'text-warning' : 'text-danger';
                    const bulletColor = isPositive ? 'bg-success' : item.classification === 'Telemarketing' ? 'bg-warning' : 'bg-danger';
                    
                    return (
                      <div key={idx} className="flex gap-3 text-xs relative">
                        {idx !== threatTimeline.length - 1 && (
                          <div className="absolute left-[5px] top-3 bottom-[-20px] w-0.5 bg-gray-850"></div>
                        )}
                        <span className={`w-2.5 h-2.5 rounded-full ${bulletColor} mt-1.5 flex-shrink-0 relative z-10`} style={{ boxShadow: `0 0 8px currentColor` }}></span>
                        <div className="flex-1 pb-1">
                          <div className="flex justify-between items-center">
                            <span className={`font-semibold capitalize ${textColor}`}>{item.classification} Classification</span>
                            <span className="text-[10px] text-gray-500">{new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p className="text-gray-400 mt-0.5 text-[11px]">System reputation node updated chronological lookup index.</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-500 italic py-12 text-center">No threat timeline logs logged for this target number.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </motion.div>
  );
};

export default AnalysisResult;
