import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldAlert, CheckCircle, AlertTriangle, Database, Globe, PhoneCall } from 'lucide-react';
import Analytics from './Analytics';
import AnalyzePanel from './AnalyzePanel';
import AnalysisResult from './AnalysisResult';
import ThreatMap from './ThreatMap';

const Dashboard = ({ calls, setCalls }) => {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [latestResult, setLatestResult] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [criticalAlertCall, setCriticalAlertCall] = useState(null);
  const [phone, setPhone] = useState('');
  const [globalThreatFeed, setGlobalThreatFeed] = useState([]);

  // Local storage recent manual scans (up to 20 unique entries)
  const [recentScans, setRecentScans] = useState(() => {
    try {
      const saved = localStorage.getItem('recent_scans');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Calculate dynamic dashboard stats
  const totalScans = calls.length;
  const spamNumbers = calls.filter(c => c.riskLevel === 'Spam' || c.riskScore > 70).length;
  const safeNumbers = calls.filter(c => c.riskLevel === 'Safe' || c.riskScore <= 30).length;
  const highRiskNumbers = calls.filter(c => c.riskScore > 70).length;

  // Calculate Admin KPIs dynamically
  const adminStats = useMemo(() => {
    if (calls.length === 0) {
      return { mostReported: 'N/A', topCarrier: 'N/A', topCountry: 'N/A', totalReports: 0 };
    }

    const phoneCounts = {};
    const carrierCounts = {};
    const countryCounts = {};
    let totalReports = 0;

    calls.forEach(c => {
      // Sum standard and community reports
      const reports = (c.spamReports || 0) + (c.reputation ? Object.values(c.reputation).reduce((a, b) => a + b, 0) : 0);
      totalReports += reports || 1;

      if (c.phoneNumber) {
        phoneCounts[c.phoneNumber] = (phoneCounts[c.phoneNumber] || 0) + (reports || 1);
      }
      
      const carrier = c.phoneInfo?.carrier || c.callerLocation?.carrier;
      if (carrier && carrier !== 'N/A' && carrier !== 'Unknown Network' && carrier !== 'Unknown') {
        carrierCounts[carrier] = (carrierCounts[carrier] || 0) + 1;
      }
      
      const country = c.phoneInfo?.country || c.callerLocation?.country;
      if (country && country !== 'N/A' && country !== 'Unknown') {
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      }
    });

    const mostReported = Object.entries(phoneCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const topCarrier = Object.entries(carrierCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const topCountry = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { mostReported, topCarrier, topCountry, totalReports };
  }, [calls]);

  // Global Threat Feed auto-update loop (polls every 10s)
  useEffect(() => {
    const fetchGlobalFeed = () => {
      fetch('http://localhost:5000/api/calls/global-feed')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setGlobalThreatFeed(data);
          }
        })
        .catch(err => console.error("Error fetching global feed:", err));
    };

    fetchGlobalFeed();
    const interval = setInterval(fetchGlobalFeed, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Listen for incremental spam events to sync calls history counts in real-time
    const handleSpamEvent = (e) => {
      const { phoneNumber, count } = e.detail;
      setCalls(prev => prev.map(c => c.phoneNumber === phoneNumber ? { ...c, spamReports: count } : c));
      
      // Update global feed on manual reports
      fetch('http://localhost:5000/api/calls/global-feed')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setGlobalThreatFeed(data);
          }
        })
        .catch(err => console.error(err));
    };
    window.addEventListener('spamReported', handleSpamEvent);
    return () => window.removeEventListener('spamReported', handleSpamEvent);
  }, [setCalls]);

  const playAlertSound = (type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === 'high') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.4);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.8);
        osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 1.2);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 1.6);
        
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + 1.8);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 2.0);
      } else if (type === 'medium') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0, ctx.currentTime + 0.2);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0, ctx.currentTime + 0.45);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  };

  const addToast = (message, title = "High Risk Alert") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Sync Whitelist / Blacklist custom notifications from children
  useEffect(() => {
    const handleListEvent = (e) => {
      const { status, message } = e.detail;
      addToast(message, status === 'blacklisted' ? "Blacklisted" : status === 'trusted' ? "Trusted Whitelist" : "Status Reset");
    };
    window.addEventListener('listStatusUpdated', handleListEvent);
    return () => window.removeEventListener('listStatusUpdated', handleListEvent);
  }, []);

  const handleAnalyze = async (data) => {
    if (!data.phone) return alert("Enter a phone number");
    
    console.log('[Number Scan] Scan started');
    console.log(`[Number Scan] Number entered: ${data.phone}`);
    
    setLoading(true);
    setLatestResult(null);

    // Cycle progressive loading texts
    const messages = [
      "Scanning Number...",
      "Fetching Carrier Data...",
      "Checking Threat Intelligence...",
      "Generating Report..."
    ];
    let msgIdx = 0;
    setLoadingMessage(messages[0]);
    const loaderInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      setLoadingMessage(messages[msgIdx]);
    }, 1200);
    
    try {
      let res;
      if ((data.type === 'audio' || data.type === 'voice') && data.audioFile) {
        console.log('[Number Scan] API request sent');
        const formData = new FormData();
        formData.append('phoneNumber', data.phone);
        formData.append('audioFile', data.audioFile);
        formData.append('language', 'en'); 

        res = await fetch('http://localhost:5000/api/calls/analyze-audio', {
          method: 'POST',
          body: formData
        });
      } else {
        console.log('[Number Scan] API request sent');
        // Text or Number
        res = await fetch('http://localhost:5000/api/calls/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: data.phone, simulateText: data.text || '' })
        });
      }
      
      if (!res.ok) {
        const errText = await res.text();
        console.error(`[Number Scan] Error received: ${errText}`);
        throw new Error(errText);
      }

      const responseData = await res.json();
      console.log('[Number Scan] API response received:', responseData);
      
      // Load full phone profile (whitelist status, reputations matrix)
      let phoneInfo = null;
      let finalCallData = null;
      try {
        console.log('[Number Scan] Fetching full phone profile metrics');
        const profileRes = await fetch(`http://localhost:5000/api/calls/phone-profile/${data.phone}`);
        const profileData = profileRes.ok ? await profileRes.json() : null;

        const phoneInfoRes = await fetch('http://localhost:5000/api/phone-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: data.phone })
        });
        phoneInfo = phoneInfoRes.ok ? await phoneInfoRes.json() : null;

        if (responseData.success) {
          finalCallData = {
            ...responseData.call,
            callerLocation: responseData.callerLocation || responseData.call.callerLocation,
            phoneInfo,
            scanType: data.type,
            listStatus: profileData ? profileData.listStatus : 'none',
            spamReports: profileData ? profileData.spamReports : 0,
            reputation: profileData ? profileData.reputation : null,
            threatTimeline: profileData ? profileData.threatTimeline : []
          };
        }
      } catch (err) {
        console.error("[Number Scan] Profile aggregation error:", err);
      }
      
      if (finalCallData) { 
        setCalls(prev => [finalCallData, ...prev]);
        setLatestResult(finalCallData);

        // Update persistent recent scans (stores up to 20 lookups)
        setRecentScans(prev => {
          const filtered = prev.filter(num => num !== data.phone);
          const next = [data.phone, ...filtered].slice(0, 20);
          localStorage.setItem('recent_scans', JSON.stringify(next));
          return next;
        });

        addToast("Scan completed successfully.", "Threat System");

        if (finalCallData.riskScore > 70) {
            playAlertSound('high');
            setCriticalAlertCall(finalCallData);
        } else if (finalCallData.riskScore >= 40) {
            playAlertSound('medium');
            addToast(`Suspicious Call: ${finalCallData.phoneNumber}`, "Warning");
        }
      }

      clearInterval(loaderInterval);
      setLoadingMessage('');
      setLoading(false);

    } catch (error) {
      console.error("[Number Scan] Error received:", error.message || error);
      clearInterval(loaderInterval);
      setLoadingMessage('');
      setLoading(false);
      addToast("Failed to analyze number", "Scan Error");
    }
  };

  const highlightKeywords = (text) => {
    if (!text) return "";
    
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
      highlightedText = highlightedText.replace(regex, '<span class="bg-danger/20 text-danger font-semibold px-1 rounded">$1</span>');
    });
    
    medRisk.forEach(kw => {
      const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, '<span class="bg-warning/20 text-warning font-semibold px-1 rounded">$1</span>');
    });
    
    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  return (
    <div className="space-y-8">
      
      {/* Primary KPI Grid (Total Lookups / Community Warnings) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 text-primary">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <h4 className="text-3xl font-extrabold text-white mb-1">{totalScans}</h4>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Total Scans</p>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 rounded-lg bg-danger/10 border border-danger/30 text-danger">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <h4 className="text-3xl font-extrabold text-white mb-1 text-danger">{spamNumbers}</h4>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Spam Numbers</p>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 rounded-lg bg-success/10 border border-success/30 text-success">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <h4 className="text-3xl font-extrabold text-white mb-1 text-success">{safeNumbers}</h4>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Safe Numbers</p>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 rounded-lg bg-warning/10 border border-warning/30 text-warning">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <h4 className="text-3xl font-extrabold text-white mb-1 text-warning">{highRiskNumbers}</h4>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">High Risk Numbers</p>
        </div>
      </div>

      {/* Admin Intelligence Sub-KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-4 border border-gray-800 bg-surface/40 hover:-translate-y-1 transition-all duration-300">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1">Confidential Database Reports</div>
          <h5 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-accent" /> {adminStats.totalReports} total
          </h5>
        </div>

        <div className="glass-card p-4 border border-gray-800 bg-surface/40 hover:-translate-y-1 transition-all duration-300">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1">Most Scanned / Reported</div>
          <h5 className="text-sm font-mono font-bold text-danger truncate" title={adminStats.mostReported}>
            {adminStats.mostReported}
          </h5>
        </div>

        <div className="glass-card p-4 border border-gray-800 bg-surface/40 hover:-translate-y-1 transition-all duration-300">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1">Top Offending Carrier</div>
          <h5 className="text-sm font-bold text-warning truncate" title={adminStats.topCarrier}>
            {adminStats.topCarrier}
          </h5>
        </div>

        <div className="glass-card p-4 border border-gray-800 bg-surface/40 hover:-translate-y-1 transition-all duration-300">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1">Top Target Region</div>
          <h5 className="text-sm font-bold text-accent truncate" title={adminStats.topCountry}>
            <Globe className="inline w-3.5 h-3.5 mr-1" /> {adminStats.topCountry}
          </h5>
        </div>
      </div>
      
      {/* Interactive Command Columns */}
      <motion.section 
        id="analyze-section" 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="scroll-mt-24"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Double Sidebars column (20 scans + Live global feeds) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Recent scans index */}
            <div className="glass-card p-5 border border-gray-800/80">
              <h3 className="text-xs font-bold text-gray-300 mb-4 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-2.5">
                <PhoneCall className="w-4 h-4 text-primary" /> Scan History (20)
              </h3>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {recentScans.length > 0 ? (
                  recentScans.map((number, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPhone(number)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-black/40 border border-gray-850 text-xs text-gray-400 font-mono hover:border-primary/50 hover:text-white transition-all flex justify-between items-center group"
                    >
                      <span>{number}</span>
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] text-primary transition-opacity font-sans">Fill ➜</span>
                    </button>
                  ))
                ) : (
                  <p className="text-[10px] text-gray-500 italic py-4 text-center">No recent scans.</p>
                )}
              </div>
            </div>

            {/* Real-time Threat Ticker */}
            <div className="glass-card p-5 border border-gray-800/80">
              <h3 className="text-xs font-bold text-gray-300 mb-4 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-2.5">
                <ShieldAlert className="w-4 h-4 text-danger animate-pulse" /> Live Threat Feed
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {globalThreatFeed.length > 0 ? (
                  globalThreatFeed.map((item, idx) => (
                    <div key={idx} className="bg-black/35 border border-gray-850 p-2.5 rounded-lg flex flex-col gap-1 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-0.5 h-full bg-danger"></div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono text-white font-semibold">{item.phoneNumber.replace(/.(?=.{4})/g, 'X')}</span>
                        <span className="text-danger font-extrabold uppercase tracking-wider text-[9px] px-1 rounded bg-danger/10 border border-danger/25">{item.classification}</span>
                      </div>
                      <div className="text-[9px] text-gray-500 flex justify-between">
                        <span>Reported Lookup</span>
                        <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-gray-500 italic py-4 text-center">Awaiting incoming data...</p>
                )}
              </div>
            </div>

          </div>

          {/* Core threat scanner block */}
          <div className="lg:col-span-9 space-y-6">
            <AnalyzePanel 
              onAnalyze={handleAnalyze} 
              loading={loading} 
              phone={phone} 
              setPhone={setPhone} 
              loadingMessage={loadingMessage}
            />
            {latestResult ? (
              <AnalysisResult result={latestResult} loading={loading} />
            ) : loading ? (
              <AnalysisResult result={null} loading={loading} />
            ) : null}
          </div>

        </div>
      </motion.section>

      {/* Global Interactive Vector Threat Map */}
      <ThreatMap calls={calls} />

      {/* Recharts Analytics Charts Panel */}
      <motion.section 
        id="analytics-section" 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="scroll-mt-24"
      >
        <h2 className="text-2xl font-bold text-white mb-6 animate-pulse-slow">Threat Intelligence Overview</h2>
        <Analytics calls={calls} />
      </motion.section>

      {/* Call Scan Cards Timeline */}
      <motion.section 
        id="history-section"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="scroll-mt-24"
      >
        <h2 className="text-2xl font-bold text-white mb-6">Recent Scans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {calls.map(call => {
             const score = call.riskScore;
             const isSpam = score > 70;
             const isSuspicious = score >= 40 && score <= 70;
             const borderColor = isSpam ? 'border-danger' : isSuspicious ? 'border-warning' : 'border-success';
             const badgeColor = isSpam ? 'bg-danger/20 text-danger border border-danger/30' : isSuspicious ? 'bg-warning/20 text-warning border border-warning/30' : 'bg-success/20 text-success border border-success/30';
             
             return (
               <div key={call._id} className={`glass-card p-5 border-l-4 ${borderColor} hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between`}>
                 <div>
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <h3 className="text-lg font-bold text-white">{call.phoneNumber}</h3>
                       <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mt-1 ${badgeColor}`}>
                         {call.riskLevel}
                       </span>
                     </div>
                     <div className={`text-xl font-extrabold ${isSpam ? 'text-danger' : isSuspicious ? 'text-warning' : 'text-success'}`}>
                       {score}
                     </div>
                   </div>
                   
                   {call.transcript && (
                     <p className="text-sm text-gray-300 line-clamp-3 mb-4 italic font-mono bg-black/30 p-2.5 rounded-lg border border-gray-800/50">
                       "{highlightKeywords(call.transcript)}"
                     </p>
                   )}

                   <div className="grid grid-cols-2 gap-y-1 text-xs text-gray-500 bg-black/10 p-2.5 rounded-lg border border-gray-850 mt-2">
                     <div>Country:</div>
                     <div className="text-gray-300 font-medium">{(call.phoneInfo && call.phoneInfo.country) || (call.callerLocation && call.callerLocation.country) || 'N/A'}</div>
                     
                     <div>Circle:</div>
                     <div className="text-gray-300 font-medium">{call.callerLocation?.state || 'Maharashtra'}</div>
                     
                     <div>Whitelist Status:</div>
                     <div className="capitalize text-gray-300 font-medium">{call.listStatus || 'none'}</div>

                     <div>Spam Reports:</div>
                     <div className="text-gray-300 font-medium">{call.spamReports || 0}</div>
                   </div>
                 </div>

                 <div className="text-[10px] text-gray-500 mt-4 pt-2 border-t border-gray-850">
                   {new Date(call.date).toLocaleString()}
                 </div>
               </div>
             );
          })}
          {calls.length === 0 && <p className="text-gray-500">No recent scans available.</p>}
        </div>
      </motion.section>

      {/* Real-time Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map(t => (
              <div key={t.id} className="glass-card border border-danger/50 p-4 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-bounce">
                  <strong className="text-danger flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-danger animate-ping"></span>
                    {t.title}
                  </strong>
                  <div className="text-sm text-gray-300 mt-1">{t.message}</div>
              </div>
          ))}
      </div>

      {/* Critical Alert Modal */}
      {criticalAlertCall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md red-alert-flash"></div>
          <div className="relative glass-card border-2 border-danger p-8 max-w-lg w-full shadow-[0_0_80px_rgba(239,68,68,0.6)]">
            <h2 className="text-3xl font-bold text-danger mb-4 flex items-center gap-3">
              <span className="animate-ping">⚠️</span> HIGH RISK DETECTED
            </h2>
            <p className="text-lg text-white mb-2 font-bold">Incoming from: {criticalAlertCall.phoneNumber}</p>
            <p className="text-danger mb-6">Threat Score: {criticalAlertCall.riskScore}/100</p>
            
            <div className="bg-danger/10 border border-danger/30 p-4 rounded-xl mb-8">
              <p className="text-gray-300">{criticalAlertCall.reasons && criticalAlertCall.reasons[0]}</p>
            </div>
            
            <button 
              className="w-full neon-button neon-button-primary bg-danger/20 text-danger border-danger hover:bg-danger/40 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              onClick={() => setCriticalAlertCall(null)}
            >
              Block Threat & Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
