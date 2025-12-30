import React, { useEffect, useState, useMemo } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu } from 'lucide-react';
import { useCurrentAccount, useSuiClientQuery } from '@mysten/dapp-kit';

// Layout & Pages
import Header from './components/Header';
import Home from './pages/Home';
import CreateAuction from './pages/CreateAuction';
import Explore from './pages/Explore';
import ItemDetail from './pages/ItemDetail';
import AIChatBot from './components/AIChatbot';
import Profile from './pages/Profile';
import RegisterCharity from './pages/RegisterCharity';
import AdminDashboard from './pages/AdminDashboard';
import CharityManagement from './pages/CharityManagement';
import CampaignDetail from './pages/CampaignDetail';
/// --- CẤU HÌNH HẰNG SỐ CHUẨN V9 ---
export const PACKAGE_ID = "0x698079ffcf2436f3be5378af493af705354b3d0587f494740c4191a1a206950a";
export const GLOBAL_CONFIG_ID = "0xea563927b8558b37476001e334a27b329d44776f7c98d9e4b678c485cc2d9afb";
export const ADMIN_CAP_ID = "0xad3b92bf72fcc6c31787b1b79c7d73be8f188da07dddb642ba18c173fea2f2e5";

// TÊN MODULE CHUẨN TỪ CODE MOVE CỦA BẠN
export const MODULE_NAME = "charity_impact_protocol";
const ParticleBackground = () => {
  const particles = useMemo(() => Array.from({ length: 80 }), []);
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
            opacity: Math.random() * 0.6
          }}
          animate={{ y: [null, -1000], opacity: [0, 0.8, 0] }}
          transition={{ duration: Math.random() * 15 + 10, repeat: Infinity, ease: "linear" }}
          style={{
            width: Math.random() * 2 + 'px',
            height: Math.random() * 2 + 'px',
            background: i % 2 === 0 ? '#00D1FF' : '#ffffff',
            left: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
  );
};

function App() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const account = useCurrentAccount();

  // 1. TRUY VẤN OBJECTS SỞ HỮU BỞI VÍ (Tự động cập nhật mỗi 10s)
  const { data: ownedObjects } = useSuiClientQuery('getOwnedObjects', {
    owner: account?.address || '',
  }, {
    enabled: !!account?.address,
    refetchInterval: 10000
  });

  // 2. KIỂM TRA QUYỀN ADMIN THỰC TẾ
  const isAdmin = useMemo(() => {
    if (!ownedObjects?.data) return false;
    // Kiểm tra objectId khớp với ADMIN_CAP_ID
    return ownedObjects.data.some(obj => obj.data?.objectId === ADMIN_CAP_ID);
  }, [ownedObjects]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#00020a] text-white selection:bg-cyan-500/30 font-sans flex flex-col relative overflow-x-hidden">
      <Toaster position="bottom-right" toastOptions={{
        style: { background: '#0a101f', color: '#fff', border: '1px solid #1e293b' }
      }} />

      <ParticleBackground />

      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-cyan-600/5 blur-[120px] rounded-full animate-pulse" />
      </div>

      <Header scrolled={scrolled} isAdmin={isAdmin} />

      <main className="relative grow z-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/campaign/:id" element={<CampaignDetail />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/item/:id" element={<ItemDetail />} />
            <Route path="/create" element={<CreateAuction />} />
            <Route path="/register-charity" element={<RegisterCharity />} />
            <Route path="/governance" element={<CharityManagement />} />

            {/* ROUTE ADMIN CÓ BẢO VỆ */}
            <Route
              path="/admin"
              element={isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />}
            />

            <Route path="/profile" element={<Profile />} />

            {/* Catch-all: Nếu sai đường dẫn thì về Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      <AIChatBot />

      <div className="fixed bottom-6 right-6 z-[100] hidden md:block">
        <div className="relative p-px rounded-xl overflow-hidden group shadow-2xl">
          <div className="absolute inset-[-1000%] animate-[spin_5s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00D1FF_0%,#8b5cf6_50%,#00D1FF_100%)] opacity-30" />
          <div className="relative bg-[#050b18]/80 backdrop-blur-xl px-4 py-2 flex items-center gap-3 rounded-xl border border-white/5">
            <Cpu className="text-cyan-400" size={16} />
            <div className="flex flex-col">
              <span className="text-[6px] font-bold text-white/40 uppercase tracking-widest">Powered by</span>
              <h4 className="text-sm font-black italic tracking-tight">THREE<span className="text-cyan-500">HUB</span></h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;