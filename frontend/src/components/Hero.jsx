import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Activity } from 'lucide-react';

const Hero = ({ stats }) => {
  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden py-20 px-4">
      {/* Background glowing orbs */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primaryGlow rounded-full blur-[120px] opacity-60 z-0 pointer-events-none"></div>
      <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondaryGlow rounded-full blur-[120px] opacity-60 z-0 pointer-events-none"></div>

      <div className="z-10 text-center max-w-4xl mx-auto flex flex-col items-center">
        {/* Animated Cyber Shield */}
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, type: 'spring' }}
          className="relative mb-8"
        >
          <div className="absolute inset-0 bg-accent blur-xl opacity-50 rounded-full animate-pulse-slow"></div>
          <div className="relative bg-surface border border-accent/30 p-4 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] backdrop-blur-md">
            <ShieldCheck className="w-16 h-16 text-accent" />
          </div>
        </motion.div>

        {/* Large Glowing Title */}
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6"
        >
          <span className="text-white">Smart </span>
          <span className="text-gradient animate-pulse-slow block sm:inline">AI-Powered</span>
          <br className="hidden sm:block"/>
          <span className="text-white"> Spam Detection</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl"
        >
          Advanced cybersecurity system analyzing voice and text in real-time. Protect your organization from sophisticated scams with cutting-edge artificial intelligence.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const el = document.getElementById('analyze-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
                // Attempt to focus input after scrolling
                setTimeout(() => {
                  const input = document.getElementById('target-phone-input') || document.querySelector('input[type="text"]') || document.querySelector('textarea');
                  if (input) input.focus();
                }, 500);
              }
            }}
            className="neon-button neon-button-primary flex items-center justify-center gap-2 group w-full sm:w-auto"
          >
            Try Detector 
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const el = document.getElementById('analytics-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
                el.classList.add('red-alert-flash');
                setTimeout(() => el.classList.remove('red-alert-flash'), 1500);
              }
            }}
            className="neon-button bg-surface text-white border border-gray-700 hover:bg-gray-800 hover:border-gray-500 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 w-full sm:w-auto transition-all"
          >
            <Activity className="w-5 h-5 text-secondary" />
            View Analytics
          </motion.button>
        </motion.div>

        {/* Live Statistics Counters */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 w-full max-w-3xl"
        >
          <StatBox label="Total Scanned" value={stats?.total || 0} color="text-primary" />
          <StatBox label="Spam Blocked" value={stats?.spam || 0} color="text-danger" glow="var(--dangerGlow)" />
          <StatBox label="Safe Handled" value={stats?.safe || 0} color="text-success" glow="var(--successGlow)" />
          <StatBox label="Accuracy" value="99.8%" color="text-accent" glow="rgba(6,182,212,0.5)" />
        </motion.div>
      </div>
    </div>
  );
};

const StatBox = ({ label, value, color, glow }) => (
  <div className="glass-card p-4 flex flex-col items-center justify-center hover:-translate-y-1 transition-transform duration-300">
    <div className={`text-3xl font-bold ${color} mb-1`} style={{ textShadow: glow ? `0 0 10px ${glow}` : 'none' }}>
      {value}
    </div>
    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
      {label}
    </div>
  </div>
);

export default Hero;
