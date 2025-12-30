import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, Users, ShieldCheck, ArrowRight,
    Loader2, Activity, Globe, ExternalLink,
    CheckCircle2, Trophy, Heart, Star
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSuiClient, useSuiClientQuery } from '@mysten/dapp-kit';
import { PACKAGE_ID, MODULE_NAME } from '../constants';

// --- UTILS ---
const parseSuiData = (data) => {
    if (!data) return "";
    if (typeof data === 'object' && data.fields?.bytes) {
        return new TextDecoder().decode(new Uint8Array(data.fields.bytes));
    }
    if (Array.isArray(data)) {
        return new TextDecoder().decode(new Uint8Array(data));
    }
    return String(data);
};

const getIPFSUrl = (rawInput) => {
    const cleanString = parseSuiData(rawInput).trim();
    if (!cleanString) return "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2070&auto=format&fit=crop";
    const cid = cleanString.replace('ipfs://', '').replace('https://gateway.pinata.cloud/ipfs/', '').split(',')[0];
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
};

// --- SUB-COMPONENTS ---
const SuccessProjectCard = ({ title, amount, date, color, delay }) => (
    <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay }}
        className="p-4 bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm flex items-center gap-4 hover:shadow-md hover:bg-white/80 transition-all cursor-default group"
    >
        <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center ${color} bg-opacity-10 group-hover:scale-110 transition-transform`}>
            <CheckCircle2 size={22} className={color.replace('bg-', 'text-')} />
        </div>
        <div className="flex-1">
            <h4 className="font-black text-[11px] text-[#1F2937] uppercase tracking-tighter">{title}</h4>
            <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-[#2ECC71]">{amount} SUI</span>
                <span className="text-[9px] text-gray-400 font-medium">• {date}</span>
            </div>
        </div>
        <Star size={14} className="text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" />
    </motion.div>
);

const StatCard = ({ stat, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        viewport={{ once: true }}
        className="bg-white p-8 rounded-[2rem] border border-[#E2E8F0] shadow-sm hover:border-[#C1121F]/30 transition-all group relative overflow-hidden"
    >
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            {React.cloneElement(stat.icon, { size: 80 })}
        </div>
        <div className={`${stat.bg} ${stat.color} w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform`}>
            {stat.icon}
        </div>
        <h3 className="text-4xl font-black text-[#1F2937] tracking-tighter mb-1 italic">
            {stat.value}<span className="text-[#C1121F] text-sm ml-1 not-italic">{stat.unit}</span>
        </h3>
        <p className="text-[10px] font-bold text-[#1F2937]/40 uppercase tracking-[0.2em]">{stat.label}</p>
    </motion.div>
);

// --- MAIN COMPONENT ---
export default function Home() {
    const suiClient = useSuiClient();
    const [campaigns, setCampaigns] = useState([]);
    const [isSyncing, setIsSyncing] = useState(true);

    const { data: events } = useSuiClientQuery('queryEvents', {
        query: { MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::CharityRegistered` },
        order: 'descending',
        limit: 6,
    });

    useEffect(() => {
        let isMounted = true;
        const fetchProjects = async () => {
            if (!events?.data?.length) {
                setIsSyncing(false);
                return;
            }
            try {
                const ids = events.data.map(e => e.parsedJson.charity_id);
                const objects = await suiClient.multiGetObjects({
                    ids,
                    options: { showContent: true }
                });

                const parsed = objects.map(obj => {
                    if (!obj.data?.content?.fields) return null;
                    const f = obj.data.content.fields;
                    return {
                        id: obj.data.objectId,
                        name: parseSuiData(f.name),
                        description: parseSuiData(f.description),
                        displayLogo: getIPFSUrl(f.logo || f.image_url || f.url),
                        is_verified: f.is_verified,
                        vault: f.vault ? Number(f.vault) / 1e9 : 0,
                        target: 100
                    };
                }).filter(Boolean);

                if (isMounted) setCampaigns(parsed);
            } catch (err) {
                console.error("Home Data Sync Error:", err);
            } finally {
                if (isMounted) setIsSyncing(false);
            }
        };
        fetchProjects();
        return () => { isMounted = false; };
    }, [events, suiClient]);

    const stats = [
        { label: "Tổng quyên góp", value: "128,450", unit: "SUI", icon: <TrendingUp size={22} />, color: "text-[#2ECC71]", bg: "bg-[#2ECC71]/10" },
        { label: "Nhà hảo tâm", value: "2,840", unit: "USERS", icon: <Users size={22} />, color: "text-[#C1121F]", bg: "bg-[#C1121F]/10" },
        { label: "Dự án thành công", value: "142", unit: "DONE", icon: <Trophy size={22} />, color: "text-[#F77F00]", bg: "bg-[#F77F00]/10" }
    ];

    return (
        <div className="w-full min-h-screen bg-[#F0F4F8] text-[#1F2937] font-sans selection:bg-[#C1121F]/20 overflow-x-hidden">

            {/* --- BACKGROUND DECORATION --- */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#C1121F]/5 blur-[120px]" />
                <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-[#2ECC71]/5 blur-[100px]" />
            </div>

            <div className="relative z-10">
                {/* --- HERO SECTION --- */}
                <section className="max-w-7xl mx-auto pt-40 pb-24 px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-8">

                        {/* Left Content */}
                        <div className="flex-1 space-y-8 text-center lg:text-left">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-[10px] font-black uppercase tracking-widest text-[#C1121F]"
                            >
                                <Activity size={12} className="animate-pulse" /> Live on Sui Network
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }}
                                className="text-6xl md:text-[7.5rem] font-[1000] leading-[0.85] tracking-tighter text-[#1F2937] uppercase"
                            >
                                Impact <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C1121F] via-[#F77F00] to-[#C1121F] bg-[length:200%_auto] animate-gradient italic">
                                    Realized.
                                </span>
                            </motion.h1>

                            <p className="text-lg md:text-xl text-gray-500 font-medium max-w-xl leading-relaxed">
                                Nền tảng quyên góp <span className="text-[#1F2937] font-bold underline decoration-[#2ECC71] decoration-4">phi tập trung</span> giúp minh bạch hóa 100% dòng tiền thiện nguyện trên Blockchain.
                            </p>

                            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                                <Link to="/explore" className="px-10 py-5 bg-[#C1121F] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-[0_20px_40px_-12px_rgba(193,18,31,0.3)] hover:scale-105 transition-all active:scale-95 flex items-center gap-3">
                                    Quyên góp ngay <ArrowRight size={18} />
                                </Link>
                                <Link to="/register-charity" className="px-10 py-5 bg-white text-[#1F2937] border-2 border-gray-200 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-50 transition-all shadow-sm">
                                    Tạo quỹ của bạn
                                </Link>
                            </div>
                        </div>

                        {/* Right Content: DỰ ÁN THÀNH CÔNG */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            className="flex-1 relative w-full max-w-[500px]"
                        >
                            <div className="relative z-10 bg-white/70 backdrop-blur-2xl border border-white p-8 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)]">
                                <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                                    <div className="flex items-center gap-2">
                                        <Trophy size={18} className="text-[#F77F00]" />
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1F2937]">Kỳ tích cộng đồng</h3>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-red-400" />
                                        <div className="w-2 h-2 rounded-full bg-yellow-400" />
                                        <div className="w-2 h-2 rounded-full bg-green-400" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <SuccessProjectCard title="Áo ấm vùng cao 2024" amount="45,000" date="Đã hoàn thành" color="bg-[#2ECC71]" delay={0.1} />
                                    <SuccessProjectCard title="Xây cầu từ thiện Kiên Giang" amount="120,500" date="Đã giải ngân" color="bg-[#C1121F]" delay={0.2} />
                                    <SuccessProjectCard title="Hỗ trợ nước sạch miền Tây" amount="32,800" date="Đã nghiệm thu" color="bg-[#F77F00]" delay={0.3} />
                                </div>

                                <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Hiệu quả on-chain</span>
                                        <span className="text-xs font-black text-[#2ECC71]">+100% Transparency</span>
                                    </div>
                                </div>
                            </div>

                            {/* Trang trí phía sau */}
                            <div className="absolute -top-6 -right-6 w-full h-full bg-[#C1121F]/5 rounded-[3rem] -z-10 rotate-3 transition-transform hover:rotate-0 duration-700" />
                            <div className="absolute -bottom-6 -left-6 w-full h-full bg-[#2ECC71]/5 rounded-[3rem] -z-10 -rotate-2" />
                        </motion.div>
                    </div>

                    {/* --- STATS GRID --- */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 relative z-10">
                        {stats.map((stat, i) => <StatCard key={i} stat={stat} index={i} />)}
                    </div>
                </section>

                {/* --- CAMPAIGNS SECTION --- */}
                <section className="max-w-7xl mx-auto px-6 py-24">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-[#2ECC71]">
                                <div className="w-12 h-1.5 bg-current rounded-full" />
                                <span className="font-black uppercase tracking-[0.3em] text-[10px]">Real-time Funding</span>
                            </div>
                            <h2 className="text-5xl md:text-6xl font-[1000] text-[#1F2937] uppercase tracking-tighter leading-none">
                                Dự án <span className="text-[#C1121F]">Đang Gây Quỹ</span>
                            </h2>
                        </div>
                        <Link to="/explore" className="group flex items-center gap-3 text-[#1F2937]/40 font-black uppercase text-[10px] tracking-widest hover:text-[#C1121F] transition-all pb-2">
                            Xem tất cả <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                        </Link>
                    </div>

                    <AnimatePresence mode='wait'>
                        {isSyncing ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-40 flex flex-col items-center bg-white/50 backdrop-blur-sm rounded-[3rem] border border-white/60">
                                <Loader2 className="animate-spin text-[#C1121F] mb-6" size={48} />
                                <p className="font-black text-[#1F2937]/30 uppercase text-[10px] tracking-[0.3em]">Connecting to Sui Mainnet...</p>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                {campaigns.map((campaign, idx) => {
                                    const progress = Math.min((campaign.vault / campaign.target) * 100, 100);
                                    return (
                                        <motion.div
                                            key={campaign.id}
                                            initial={{ opacity: 0, y: 30 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            whileHover={{ y: -15 }}
                                            className="group bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] transition-all flex flex-col relative"
                                        >
                                            <div className="relative aspect-[4/3] overflow-hidden">
                                                <img src={campaign.displayLogo} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={campaign.name} />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                                                    <span className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                        <Heart size={14} fill="currentColor" /> Quyên góp ngay
                                                    </span>
                                                </div>
                                                {campaign.is_verified && (
                                                    <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md text-[#2ECC71] px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest">
                                                        <ShieldCheck size={14} /> Verified
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-8 flex flex-col flex-1">
                                                <h3 className="text-xl font-black text-[#1F2937] uppercase mb-3 group-hover:text-[#C1121F] transition-colors line-clamp-1">{campaign.name}</h3>
                                                <p className="text-[#1F2937]/50 text-sm font-medium mb-8 line-clamp-2 leading-relaxed">{campaign.description}</p>

                                                <div className="mt-auto space-y-6">
                                                    <div className="flex justify-between items-end">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Cộng đồng đã góp</span>
                                                            <span className="text-2xl font-[1000] text-[#1F2937] tracking-tighter">
                                                                {campaign.vault.toLocaleString()} <span className="text-xs text-[#2ECC71] font-black">SUI</span>
                                                            </span>
                                                        </div>
                                                        <span className="text-xl font-[1000] text-[#C1121F] italic">{progress.toFixed(0)}%</span>
                                                    </div>

                                                    <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden p-0.5 border border-gray-100">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            whileInView={{ width: `${progress}%` }}
                                                            transition={{ duration: 1.5, ease: "circOut" }}
                                                            className="h-full bg-gradient-to-r from-[#C1121F] via-[#F77F00] to-[#C1121F] bg-[length:200%_auto] animate-gradient rounded-full"
                                                        />
                                                    </div>

                                                    <Link to={`/campaign/${campaign.id}`} className="flex items-center justify-center w-full py-5 bg-[#1F2937] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#C1121F] hover:shadow-lg hover:shadow-[#C1121F]/20 transition-all active:scale-95">
                                                        Theo dõi dòng tiền
                                                    </Link>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </AnimatePresence>
                </section>

                {/* --- FOOTER --- */}
                <footer className="bg-white border-t border-gray-100 pt-32 pb-12 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-12 text-center md:text-left">
                            <div className="max-w-sm">
                                <h4 className="text-[#C1121F] font-black text-3xl uppercase italic tracking-tighter mb-4">SuiCharity</h4>
                                <p className="text-gray-400 text-sm font-medium leading-relaxed">
                                    Minh bạch hóa thiện nguyện bằng sức mạnh của Blockchain SUI. Nơi mỗi giọt lòng tốt đều được ghi nhận vĩnh viễn.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-[#C1121F] hover:bg-white hover:shadow-md transition-all cursor-pointer border border-gray-100"><Globe size={20} /></div>
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-[#C1121F] hover:bg-white hover:shadow-md transition-all cursor-pointer border border-gray-100"><ExternalLink size={20} /></div>
                            </div>
                        </div>
                        <div className="mt-20 pt-8 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">© 2025 IMPACT PROTOCOL • SUI NETWORK</p>
                            <div className="flex items-center gap-2 px-4 py-1.5 bg-[#2ECC71]/5 rounded-full border border-[#2ECC71]/10">
                                <div className="w-2 h-2 rounded-full bg-[#2ECC71] animate-pulse" />
                                <span className="text-[9px] font-black text-[#2ECC71] uppercase tracking-tighter">Mainnet Connected</span>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>

            <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
        </div>
    );
}