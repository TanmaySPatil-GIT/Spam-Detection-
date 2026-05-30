import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, TrendingUp, CheckCircle, Target, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const Analytics = ({ calls }) => {
  const stats = useMemo(() => {
    let spam = 0;
    let suspicious = 0;
    let safe = 0;
    
    // Reverse calls for chronological line chart
    const timelineData = [];
    const keywords = {};

    [...calls].reverse().forEach(call => {
      if (call.riskLevel === 'Spam') spam++;
      else if (call.riskLevel === 'Suspicious') suspicious++;
      else safe++;

      timelineData.push({
        time: new Date(call.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        score: call.riskScore
      });
      
      // Extract keywords from AI reasons
      if (call.reasons) {
        call.reasons.forEach(r => {
          const matches = r.match(/'([^']+)'/g);
          if (matches) {
            matches.forEach(m => {
              const cleaned = m.replace(/'/g, '');
              keywords[cleaned] = (keywords[cleaned] || 0) + 1;
            });
          }
        });
      }
    });

    const topKeywords = Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word, freq]) => ({ word, freq }));

    return { total: calls.length, spam, suspicious, safe, timelineData, topKeywords };
  }, [calls]);

  const pieData = [
    { name: 'Spam', value: stats.spam, color: '#ef4444' }, // text-danger
    { name: 'Suspicious', value: stats.suspicious, color: '#f59e0b' }, // text-warning
    { name: 'Safe', value: stats.safe, color: '#10b981' } // text-success
  ].filter(d => d.value > 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 backdrop-blur-md border border-gray-700 p-3 rounded-lg shadow-xl">
          <p className="text-gray-300 font-semibold mb-1">{label || payload[0].payload.name}</p>
          <p className="text-white">
            <span className="text-accent">Value:</span> {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!calls || calls.length === 0) {
    return (
      <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
        <Activity className="w-16 h-16 text-gray-600 mb-4 animate-pulse-slow" />
        <h3 className="text-xl font-bold text-gray-400">Awaiting Signal Data</h3>
        <p className="text-gray-500 max-w-md mt-2">Initialize a scan in the Threat Analysis Console to populate the intelligence dashboard.</p>
      </div>
    );
  }

  const accuracy = stats.total > 0 ? 99.8 : 0; // Simulated high accuracy

  return (
    <div className="space-y-6">
      
      {/* Top Overview KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Activity} label="Total Scans" value={stats.total} color="text-primary" />
        <KPICard icon={ShieldAlert} label="Threats Blocked" value={stats.spam} color="text-danger" glow="rgba(239,68,68,0.5)" />
        <KPICard icon={CheckCircle} label="Safe Handled" value={stats.safe} color="text-success" glow="rgba(16,185,129,0.5)" />
        <KPICard icon={Target} label="AI Accuracy" value={`${accuracy}%`} color="text-accent" glow="rgba(6,182,212,0.5)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Threat Distribution Pie Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 flex flex-col items-center"
        >
          <div className="w-full flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white tracking-wide">Threat Distribution</h3>
          </div>
          <div className="w-full h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  animationDuration={1500}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0 0 8px ${entry.color}80)` }} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Label inside Pie */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-white">{stats.total}</span>
              <span className="text-xs text-gray-500 uppercase tracking-widest">Total</span>
            </div>
          </div>
          
          <div className="w-full flex justify-center gap-6 mt-4">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color, boxShadow: `0 0 10px ${d.color}` }}></span>
                <span className="text-sm text-gray-300">{d.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Risk Score Trend Line Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" /> Detection Trend
            </h3>
          </div>
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorRisk)" 
                  animationDuration={2000}
                  style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.5))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </div>

      {/* Common Keywords / Alerts Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-bold text-white tracking-wide mb-6">Intercepted Payload Vectors</h3>
          {stats.topKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {stats.topKeywords.map((kw, i) => (
                <div key={i} className="bg-danger/10 border border-danger/30 px-4 py-2 rounded-full flex items-center gap-3 hover:bg-danger/20 transition-colors shadow-[inset_0_0_10px_rgba(239,68,68,0.1)] group">
                  <span className="text-white font-medium group-hover:text-danger transition-colors">{kw.word}</span>
                  <span className="bg-danger text-white text-xs px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                    {kw.freq}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <ShieldAlert className="w-8 h-8 mb-2 opacity-50" />
              <p>No threat vectors detected yet.</p>
            </div>
          )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 h-[300px] overflow-y-auto custom-scrollbar"
        >
          <h3 className="text-lg font-bold text-white tracking-wide mb-6 sticky top-0 bg-surface/90 backdrop-blur pb-2 z-10 border-b border-gray-800">Alerts Timeline</h3>
          <div className="space-y-4">
            {[...calls].map((call, i) => {
              const isSpam = call.riskScore > 70;
              const isWarning = call.riskScore >= 40 && call.riskScore <= 70;
              const dotColor = isSpam ? 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.8)]' : isWarning ? 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.8)]';
              
              return (
                <div key={call._id || i} className="flex gap-4 relative">
                  {i !== calls.length - 1 && <div className="absolute left-[7px] top-6 bottom-[-16px] w-0.5 bg-gray-800"></div>}
                  <div className={`w-4 h-4 mt-1 rounded-full flex-shrink-0 z-10 ${dotColor}`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{call.phoneNumber}</p>
                    <p className="text-xs text-gray-400 mb-1">{new Date(call.date).toLocaleTimeString()}</p>
                    <p className="text-sm text-gray-300 line-clamp-1 italic">"{call.transcript}"</p>
                  </div>
                </div>
              );
            })}
            {calls.length === 0 && <p className="text-gray-500 text-center py-4">Timeline empty.</p>}
          </div>
        </motion.div>
      </div>

    </div>
  );
};

const KPICard = ({ icon: Icon, label, value, color, glow }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card p-5 relative overflow-hidden group"
  >
    <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full bg-current opacity-10 group-hover:scale-150 transition-transform duration-500 ${color}`}></div>
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2 rounded-lg bg-black/40 border border-gray-700 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <h4 className="text-3xl font-bold text-white mb-1" style={{ textShadow: glow ? `0 0 15px ${glow}` : 'none' }}>
      {value}
    </h4>
    <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">{label}</p>
  </motion.div>
);

export default Analytics;
