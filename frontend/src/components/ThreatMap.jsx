import React, { useState } from 'react';
import { Globe, MapPin, AlertCircle, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

const ThreatMap = ({ calls }) => {
  const [hoveredCountry, setHoveredCountry] = useState(null);

  // Compute actual or mock activity based on real call history
  const countByCountry = (countryName) => {
    return calls.filter(c => {
      const country = c.phoneInfo?.country || c.callerLocation?.country || '';
      return country.toLowerCase().includes(countryName.toLowerCase());
    }).length;
  };

  const getRiskIndex = (countryName) => {
    const countryCalls = calls.filter(c => {
      const country = c.phoneInfo?.country || c.callerLocation?.country || '';
      return country.toLowerCase().includes(countryName.toLowerCase());
    });
    if (countryCalls.length === 0) return 15; // default baseline risk
    const spamCount = countryCalls.filter(c => c.riskLevel === 'Spam' || c.riskScore > 70).length;
    return Math.round((spamCount / countryCalls.length) * 100);
  };

  const countries = [
    {
      id: 'IN',
      name: 'India',
      flag: '🇮🇳',
      scans: countByCountry('India') + 24, // include a baseline offset for realism
      reports: countByCountry('India') * 3 + 12,
      riskIndex: Math.max(getRiskIndex('India'), 42),
      x: 185,
      y: 95,
      markerStyle: 'left-[72%] top-[60%]',
      color: '#ef4444'
    },
    {
      id: 'US',
      name: 'USA',
      flag: '🇺🇸',
      scans: countByCountry('United States') + countByCountry('USA') + 48,
      reports: (countByCountry('United States') + countByCountry('USA')) * 2 + 18,
      riskIndex: Math.max(getRiskIndex('United States'), 32),
      x: 55,
      y: 65,
      markerStyle: 'left-[22%] top-[40%]',
      color: '#3b82f6'
    },
    {
      id: 'UK',
      name: 'UK',
      flag: '🇬🇧',
      scans: countByCountry('United Kingdom') + countByCountry('UK') + 15,
      reports: (countByCountry('United Kingdom') + countByCountry('UK')) * 2 + 5,
      riskIndex: Math.max(getRiskIndex('United Kingdom'), 28),
      x: 110,
      y: 48,
      markerStyle: 'left-[46%] top-[30%]',
      color: '#8b5cf6'
    },
    {
      id: 'CA',
      name: 'Canada',
      flag: '🇨🇦',
      scans: countByCountry('Canada') + 8,
      reports: countByCountry('Canada') * 2 + 2,
      riskIndex: Math.max(getRiskIndex('Canada'), 18),
      x: 48,
      y: 45,
      markerStyle: 'left-[18%] top-[25%]',
      color: '#06b6d4'
    }
  ];

  return (
    <div className="glass-card p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-3">
        <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
          <Globe className="w-5 h-5 text-accent animate-pulse-slow" /> Global Threat Intelligence Map
        </h3>
        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Neural Activity Overlay</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        
        {/* World Map Container (SVG Matrix) */}
        <div className="lg:col-span-2 relative bg-black/60 rounded-xl border border-gray-900/50 p-4 min-h-[260px] flex items-center justify-center overflow-hidden">
          {/* Cybernetic Grid Backdrop */}
          <div className="absolute inset-0 bg-cover bg-center opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='none' stroke='%233b82f6' stroke-width='0.5'/%3E%3C/svg%3E")` }}></div>
          
          {/* Conceptual Stylized SVG World Map Grid */}
          <svg viewBox="0 0 250 150" className="w-full h-auto opacity-40">
            {/* Conceptual Canada/USA shape */}
            <path d="M15,30 Q30,22 55,20 T95,32 Q70,70 50,85 T15,55 Z" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
            {/* South America shape */}
            <path d="M50,85 Q65,110 70,140 T52,145 Z" fill="#111827" stroke="#1f2937" strokeWidth="0.5" />
            {/* UK shape */}
            <path d="M102,40 Q106,30 112,38 T105,48 Z" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
            {/* Europe / Asia / Africa shape */}
            <path d="M120,40 Q145,28 190,30 T240,65 Q230,105 195,115 T150,90 Z" fill="#111827" stroke="#1f2937" strokeWidth="0.5" />
            {/* India shape */}
            <path d="M178,75 Q185,90 192,105 T175,98 Z" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
          </svg>

          {/* Interactive Glowing Marker Points */}
          {countries.map((c) => {
            const isHovered = hoveredCountry === c.id;
            
            return (
              <div 
                key={c.id} 
                className={`absolute ${c.markerStyle} -translate-x-1/2 -translate-y-1/2 cursor-pointer z-25`}
                onMouseEnter={() => setHoveredCountry(c.id)}
                onMouseLeave={() => setHoveredCountry(null)}
              >
                <div className="relative">
                  {/* Outer glowing ripple */}
                  <span className="absolute -inset-2.5 rounded-full opacity-60 animate-ping" style={{ backgroundColor: c.color }}></span>
                  {/* Middle solid ring */}
                  <span className="absolute -inset-1 rounded-full opacity-40 animate-pulse" style={{ backgroundColor: c.color }}></span>
                  {/* Center core node */}
                  <div 
                    className="w-3.5 h-3.5 rounded-full border border-white shadow-xl flex items-center justify-center transition-all duration-300 transform hover:scale-150" 
                    style={{ backgroundColor: c.color }}
                  ></div>
                  
                  {/* Floating Tooltip Indicator */}
                  {isHovered && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: -5, scale: 1 }}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur border border-gray-800 p-2.5 rounded-lg shadow-2xl z-50 min-w-[120px] text-xs pointer-events-none"
                    >
                      <div className="font-bold text-white flex items-center gap-1.5 mb-1.5 border-b border-gray-850 pb-1">
                        <span>{c.flag}</span> <span>{c.name}</span>
                      </div>
                      <div className="text-gray-400">Scans: <strong className="text-white">{c.scans}</strong></div>
                      <div className="text-gray-400">Threats: <strong className="text-danger">{c.reports}</strong></div>
                      <div className="text-gray-400">Risk Index: <strong style={{ color: c.color }}>{c.riskIndex}%</strong></div>
                    </motion.div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Intelligence Stats Sidebar */}
        <div className="space-y-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Regional Risk Index</span>
          {countries.map((c) => {
            const isHovered = hoveredCountry === c.id;
            const borderStyle = isHovered ? 'border-primary/50 bg-primary/5' : 'border-gray-800 bg-black/20';
            
            return (
              <div 
                key={c.id}
                className={`p-3.5 rounded-xl border transition-all duration-300 ${borderStyle}`}
                onMouseEnter={() => setHoveredCountry(c.id)}
                onMouseLeave={() => setHoveredCountry(null)}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{c.flag}</span>
                    <span className="text-sm font-bold text-white tracking-wide">{c.name}</span>
                  </div>
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-black/40 border border-gray-800" style={{ color: c.color }}>
                    Index: {c.riskIndex}%
                  </span>
                </div>
                
                {/* Threat Index Progress Bar */}
                <div className="w-full h-1.5 bg-gray-850 rounded-full overflow-hidden mb-1 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${c.riskIndex}%` }} 
                    transition={{ duration: 1, delay: 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: c.color, boxShadow: `0 0 8px ${c.color}80` }}
                  ></motion.div>
                </div>
                
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>Scans: {c.scans}</span>
                  <span>Alerts: {c.reports}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default ThreatMap;
