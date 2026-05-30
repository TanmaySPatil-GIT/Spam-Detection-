import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ParticleBackground from './components/ParticleBackground';
import Hero from './components/Hero';

function App() {
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState({ total: 0, spam: 0, safe: 0 });
  const [activeSection, setActiveSection] = useState('Home');

  useEffect(() => {
    fetch('http://localhost:5000/api/calls')
      .then(res => res.json())
      .then(data => {
        setCalls(data);
        const spam = data.filter(c => c.riskLevel === 'Spam').length;
        const safe = data.filter(c => c.riskLevel === 'Safe').length;
        setStats({ total: data.length, spam, safe });
      })
      .catch(err => console.error("Error fetching calls:", err));
      
    const handleScroll = () => {
      const sections = ['hero-section', 'analyze-section', 'analytics-section', 'history-section'];
      let current = 'Home';
      
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            current = section === 'hero-section' ? 'Home' : section.replace('-section', '');
            current = current.charAt(0).toUpperCase() + current.slice(1);
            break;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden" id="hero-section">
      {/* Background Layers */}
      <ParticleBackground />
      <div className="animated-grid"></div>
      
      {/* Dynamic Sticky Navbar */}
      <nav className="fixed top-0 w-full p-4 z-50 transition-all duration-300">
        <div className="container mx-auto">
          <div className="glass-card bg-surface/70 border border-white/10 px-6 py-3 flex justify-between items-center mx-auto max-w-5xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/50 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <span className="text-white font-black text-xl">S</span>
              </div>
              <span className="text-white font-bold tracking-widest uppercase hidden sm:block">CallGuardian</span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-6">
              {['Home', 'Analyze', 'Analytics', 'History'].map((item) => {
                const sectionId = item === 'Home' ? 'hero-section' : `${item.toLowerCase()}-section`;
                const isActive = activeSection === item;
                
                return (
                  <button 
                    key={item}
                    onClick={() => {
                      const el = document.getElementById(sectionId);
                      if(el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`relative px-3 py-2 text-sm font-semibold tracking-wide transition-colors group ${isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    {item}
                    <div className={`absolute bottom-0 left-0 w-full h-[2px] bg-primary transition-transform origin-left shadow-[0_0_10px_rgba(59,130,246,0.8)] ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></div>
                    {isActive && <div className="absolute inset-0 bg-primary/10 blur-md rounded-lg -z-10"></div>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-16">
        <Hero stats={stats} />
        {/* We will add the rest of the dashboard layout below Hero */}
        <div className="container mx-auto px-4 pb-20">
          <Dashboard calls={calls} setCalls={setCalls} />
        </div>
      </main>
    </div>
  );
}

export default App;
