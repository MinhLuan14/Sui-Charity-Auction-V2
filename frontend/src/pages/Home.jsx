import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
    const stats = [
        { label: "Total Donations", value: "128,450", unit: "SUI", icon: <TrendingUp />, color: "from-cyan-500 to-blue-600" },
        { label: "Children Helped", value: "3,200", unit: "+", icon: <Users />, color: "from-purple-500 to-pink-500" },
        { label: "Secure Transactions", value: "100", unit: "%", icon: <ShieldCheck />, color: "from-emerald-500 to-teal-400" }
    ];

    // Tạo 100 hạt sáng rải rác toàn màn hình
    const backgroundStars = useMemo(() => [...Array(100)].map((_, i) => ({
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: Math.random() * 2 + 0.5,
        duration: Math.random() * 4 + 2,
        delay: Math.random() * 10
    })), []);

    // Hiệu ứng tia sáng ngang chạy vô tận
    const streakVariants = {
        animate: (custom) => ({
            x: ['-100vw', '100vw'],
            opacity: [0, 1, 1, 0],
            transition: { duration: custom.duration, repeat: Infinity, ease: "linear", delay: custom.delay }
        })
    };

    // Component đường uốn lượn full chiều ngang
    const FullWavyLine = ({ top, delay, duration, color = "#22d3ee" }) => (
        <motion.div
            className="absolute left-0 right-0 w-full pointer-events-none"
            style={{ top }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration, delay, repeat: Infinity }}
        >
            <svg width="100%" height="100" viewBox="0 0 1440 100" preserveAspectRatio="none" className="w-full">
                <motion.path
                    d="M0 50 C 200 0, 400 100, 600 50 C 800 0, 1000 100, 1200 50 C 1400 0, 1600 100, 1800 50"
                    stroke={color}
                    strokeWidth="1.5"
                    fill="none"
                    initial={{ pathOffset: 0 }}
                    animate={{ pathOffset: [0, 1] }}
                    transition={{ duration: duration * 2, repeat: Infinity, ease: "linear" }}
                    style={{ filter: `blur(1px) drop-shadow(0 0 12px ${color})` }}
                />
            </svg>
        </motion.div>
    );

    return (
        <div className="w-full min-h-screen bg-[#020406] text-white relative overflow-x-hidden flex flex-col items-center">

            {/* --- HỆ THỐNG FULL SCREEN FX (Luôn nằm dưới cùng) --- */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {/* Hạt sáng nền cực nhiều */}
                {backgroundStars.map((star) => (
                    <motion.div
                        key={star.id}
                        className="absolute bg-white rounded-full opacity-20"
                        style={{ top: star.top, left: star.left, width: star.size, height: star.size, boxShadow: '0 0 8px #fff' }}
                        animate={{ opacity: [0.1, 0.6, 0.1], scale: [1, 1.3, 1] }}
                        transition={{ duration: star.duration, repeat: Infinity, delay: star.delay }}
                    />
                ))}

                {/* Các đường uốn éo rải khắp từ trên xuống dưới */}
                <FullWavyLine top="10%" delay={0} duration={8} color="#0891b2" />
                <FullWavyLine top="35%" delay={3} duration={12} color="#1e40af" />
                <FullWavyLine top="60%" delay={1} duration={10} color="#06b6d4" />
                <FullWavyLine top="85%" delay={5} duration={15} color="#3b82f6" />

                {/* Tia sáng ngang dài chói lóa */}
                {[12, 18, 25, 45, 70, 90].map((top, i) => (
                    <motion.div
                        key={i}
                        variants={streakVariants}
                        custom={{ duration: 5 + i, delay: i * 2 }}
                        animate="animate"
                        className="absolute h-[1px] w-screen bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                        style={{ top: `${top}%`, opacity: 0.3 }}
                    />
                ))}

                {/* Hào quang trung tâm khổng lồ */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vh] bg-cyan-900/10 blur-[250px] rounded-full" />
            </div>

            {/* --- NỘI DUNG CHÍNH --- */}
            <section className="relative z-10 pt-44 pb-24 text-center px-6 w-full max-w-7xl">
                <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 1.2 }}
                >
                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-[0.4em] mb-12 backdrop-blur-md shadow-2xl shadow-cyan-500/20">
                        <Sparkles size={14} /> Next-Gen Charity Protocol
                    </div>

                    <h1 className="text-7xl md:text-[12rem] font-[1000] italic tracking-tighter leading-[0.85] mb-12 uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                        Giving is <br />
                        <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-600">
                            Living

                            {/* 50 hạt sáng bắn ra từ chữ */}
                            {[...Array(50)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-1 h-1 bg-cyan-300 rounded-full blur-[0.5px]"
                                    style={{ bottom: '15%', left: `${Math.random() * 100}%` }}
                                    animate={{
                                        y: [0, -(Math.random() * 200 + 100)],
                                        x: [(Math.random() - 0.5) * 400],
                                        opacity: [0, 1, 0],
                                        scale: [0, 1.5, 0],
                                    }}
                                    transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 5 }}
                                />
                            ))}
                        </span>
                    </h1>

                    <p className="text-slate-400 max-w-2xl mx-auto text-xl font-medium mb-16 leading-relaxed">
                        An NFT Auction Platform for Charity <span className="text-white font-bold">Transparency</span> on-Sui. <br />
                        All contributions are permanently recorded and delivered directly to those in need.
                    </p>

                    <div className="flex flex-col md:flex-row justify-center gap-6">
                        <Link to="/explore" className="group relative px-16 py-7 bg-white text-black rounded-2xl font-black uppercase italic overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(255,255,255,0.2)]">
                            <span className="relative z-10 flex items-center gap-3 text-xl"> GET STARTED<ArrowRight size={24} /></span>
                            <div className="absolute inset-0 bg-cyan-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </Link>
                        <Link to="/create" className="px-16 py-7 bg-[#ffffff08] border border-white/10 rounded-2xl font-black uppercase italic hover:bg-white/10 transition-all backdrop-blur-xl text-xl">
                            CREATE CAMPAIGN
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* STATS SECTION */}
            <section className="relative z-10 w-full max-w-7xl px-6 py-32 grid grid-cols-1 md:grid-cols-3 gap-10">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ y: 60, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.2 }}
                        className="group relative p-16 rounded-[50px] bg-gradient-to-b from-white/10 to-transparent border border-white/5 text-center backdrop-blur-sm overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <div className={`mx-auto w-24 h-24 mb-10 flex justify-center items-center rounded-3xl bg-gradient-to-br ${stat.color} shadow-2xl shadow-cyan-500/20 group-hover:scale-110 transition-transform`}>
                            <div className="text-white scale-[2.2]">{stat.icon}</div>
                        </div>
                        <h2 className="text-7xl font-[1000] italic text-white mb-4 tracking-tighter">
                            {stat.value}<span className="text-cyan-400 text-3xl ml-1 font-black">{stat.unit}</span>
                        </h2>
                        <p className="text-slate-500 font-black uppercase text-[12px] tracking-[0.5em]">{stat.label}</p>
                    </motion.div>
                ))}
            </section>

            {/* HIỆU ỨNG GRID NỀN PHỦ TOÀN BỘ */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1]"
                style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
    );
}