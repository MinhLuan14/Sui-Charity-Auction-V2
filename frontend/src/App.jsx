import React, { useEffect, useState, useMemo } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu } from 'lucide-react';

// Layout & Pages
import Header from './components/Header';
import Home from './pages/Home';
import CreateAuction from './pages/CreateAuction';
import Explore from './pages/Explore';
import AIChatBot from './components/AIChatbot';
import ItemDetail from './pages/ItemDetail';
import Profile from './pages/Profile';
export const PACKAGE_ID = "0x5e4414f266147c07b0b15ded6239606c78333628b4fe251b1dbaa7600c637675";
const ParticleBackground = () => {
  // Tăng lên 150 hạt để tạo dải ngân hà cực rực rỡ
  const particles = useMemo(() => Array.from({ length: 150 }), []);
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            opacity: Math.random() * 0.6
          }}
          animate={{
            y: [null, -1000],
            opacity: [0, 0.8, 0],
            scale: [0.5, 1.2, 0.5]
          }}
          transition={{
            duration: Math.random() * 15 + 10,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            width: Math.random() * 3 + 'px',
            height: Math.random() * 3 + 'px',
            background: i % 3 === 0 ? '#00D1FF' : i % 2 === 0 ? '#8b5cf6' : '#ffffff',
            filter: `blur(${Math.random() * 1.5}px)`,
            boxShadow: '0 0 10px currentColor',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`
          }}
        />
      ))}
    </div>
  );
};

function App() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#00020a] text-white selection:bg-cyan-500/30 font-sans flex flex-col relative overflow-x-hidden">
      <Toaster position="bottom-right" />
      <ParticleBackground />

      {/* Ambient Glows */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-cyan-600/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full" />
      </div>

      <Header scrolled={scrolled} />

      <main className="relative grow flex flex-col z-10 pt-20">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/create" element={<CreateAuction />} />
            <Route path="/item/:id" element={<ItemDetail />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </AnimatePresence>
      </main>
      <AIChatBot />
      {/* THREEHUB LOGO FIXED */}
      <div className="fixed bottom-10 right-10 z-100 pointer-events-none">
        <div className="pointer-events-auto relative p-px rounded-2xl overflow-hidden group shadow-[0_0_40px_rgba(6,182,212,0.2)]">
          <div className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00D1FF_0%,#8b5cf6_50%,#00D1FF_100%)] opacity-50" />
          <div className="relative bg-[#050b18]/90 backdrop-blur-3xl px-6 py-3 flex items-center gap-4 rounded-2xl border border-white/10">
            <Cpu className="text-cyan-400 animate-pulse" size={20} />
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-cyan-300/60 uppercase tracking-[0.3em] leading-none mb-1">Architecture by</span>
              <h4 className="text-lg font-black italic tracking-tighter">THREE<span className="text-cyan-500">HUB</span></h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default App;