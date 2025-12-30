import React, { useEffect, useState, useMemo } from 'react';
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { Loader2, Search, Activity, Heart, ArrowRight, Sparkles, Gavel, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { PACKAGE_ID, MODULE_NAME } from '../constants';

// --- UTILS (Giữ nguyên logic từ source cũ) ---
const parseSuiString = (data) => {
    if (!data) return "";
    if (typeof data === 'object' && data.fields?.bytes) return new TextDecoder().decode(new Uint8Array(data.fields.bytes));
    if (Array.isArray(data)) return new TextDecoder().decode(new Uint8Array(data));
    return String(data);
};

const getIPFSUrl = (url) => {
    if (!url) return "https://placehold.co/600x400/F8F9FA/C1121F?text=Sui+NFT";
    const cleanString = parseSuiString(url).trim();
    const cid = cleanString.replace('ipfs://', '').replace('https://gateway.pinata.cloud/ipfs/', '');
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
};

export default function Explore() {
    const client = useSuiClient();
    const currentAccount = useCurrentAccount();
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState("");

    // Dữ liệu giả lập cho Top Impactors (Có thể thay bằng logic fetch từ event bid)
    const topImpactors = [
        { address: "0x7a...d21e", amount: 45000, label: "Đã hoàn thành", color: "bg-[#2ECC71]" },
        { address: "0x1b...f44a", amount: 120500, label: "Đã giải ngân", color: "bg-[#C1121F]" },
        { address: "0x3c...99b2", amount: 32800, label: "Đã nghiệm thu", color: "bg-[#F39C12]" },
    ];

    const extractAuctionData = (obj) => {
        const fields = obj.data?.content?.fields;
        if (!fields) return null;
        const nftData = fields.nft?.fields;
        if (!nftData) return null;

        return {
            id: obj.data.objectId,
            name: parseSuiString(nftData.name || "Charity Item"),
            currentBid: Number(fields.highest_bid || 0) / 1e9,
            basePrice: Number(fields.min_reserve_price || 0) / 1e9,
            image: getIPFSUrl(nftData.url),
            status: fields.active ? "LIVE" : "ENDED",
            seller: fields.seller,
            charityShare: "100% Impact",
        };
    };

    useEffect(() => {
        async function fetchAllAuctions() {
            try {
                setLoading(true);
                const events = await client.queryEvents({
                    query: { MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::AuctionCreated` }
                });
                const ids = events.data.map((e) => e.parsedJson.auction_id);
                if (ids.length === 0) return setAuctions([]);

                const response = await client.multiGetObjects({
                    ids: ids,
                    options: { showContent: true }
                });

                setAuctions(response.map(obj => extractAuctionData(obj)).filter(item => item && item.status === "LIVE"));
            } catch (err) {
                toast.error("Blockchain Sync Error");
            } finally {
                setLoading(false);
            }
        }
        fetchAllAuctions();
    }, [client]);

    const filteredAuctions = useMemo(() => {
        return auctions.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filter === 'all' || (filter === 'mine' && item.seller === currentAccount?.address);
            return matchesSearch && matchesFilter;
        });
    }, [auctions, filter, currentAccount, searchQuery]);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
            <Loader2 className="animate-spin text-[#C1121F]" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Syncing Market...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#1F2937]">
            {/* HERO SECTION */}
            <section className="relative w-full bg-white pt-44 pb-28 px-6 overflow-hidden border-b border-gray-100">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#C1121F]/5 rounded-full blur-[120px] -z-0" />

                <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
                    {/* LEFT: CONTENT & SEARCH */}
                    <div className="lg:col-span-7">
                        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C1121F]/10 border border-[#C1121F]/20 text-[#C1121F] text-[10px] font-black uppercase tracking-widest mb-8">
                                <Sparkles size={14} /> Global Impact Protocol
                            </div>
                            <h1 className="text-7xl md:text-[90px] font-[1000] text-[#1F2937] leading-[0.8] mb-10 uppercase italic tracking-tighter">
                                Auctions <br />
                                <span className="text-[#C1121F]">For Change.</span>
                            </h1>

                            <div className="relative max-w-xl group">
                                <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C1121F] transition-colors" size={22} />
                                <input
                                    type="text"
                                    placeholder="Search items for social impact..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-gray-50 rounded-[30px] py-7 pl-16 pr-8 shadow-[0_15px_40px_rgba(0,0,0,0.03)] text-[#1F2937] font-bold outline-none border border-gray-200 focus:border-[#C1121F]/20 focus:bg-white focus:shadow-[0_20px_50px_rgba(193,18,31,0.08)] transition-all"
                                />
                            </div>
                        </motion.div>
                    </div>

                    {/* RIGHT: TOP IMPACTORS (Đồng bộ trang Home) */}
                    <div className="lg:col-span-5 hidden lg:block">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-[45px] p-10 border border-gray-100 shadow-[0_30px_100px_rgba(0,0,0,0.04)] relative"
                        >
                            {/* Window buttons decor */}
                            <div className="absolute top-0 right-0 p-8 flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                                <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                            </div>

                            <div className="flex items-center gap-3 mb-10">
                                <Trophy size={24} className="text-[#F39C12]" />
                                <h3 className="font-black uppercase italic text-[#1F2937] tracking-tight text-2xl">Kỳ tích cộng đồng</h3>
                            </div>

                            <div className="space-y-5">
                                {topImpactors.map((user, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-5 rounded-[28px] bg-white border border-gray-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-14 h-14 ${user.color} rounded-2xl shadow-inner flex-shrink-0 group-hover:rotate-6 transition-transform`} />
                                            <div>
                                                <p className="font-black text-[#1F2937] text-sm uppercase mb-0.5 tracking-tight">{user.address}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">{user.label}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-[#2ECC71] leading-none">{user.amount.toLocaleString()} SUI</p>
                                            <p className="text-[9px] font-black text-gray-300 uppercase mt-1">Total Impact</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-10 pt-8 border-t border-dashed border-gray-100 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-gray-400">Hiệu quả on-chain</span>
                                <span className="text-[#2ECC71]">+100% Transparency</span>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* MAIN CONTENT GRID */}
            <section className="max-w-7xl mx-auto px-6 mt-20 relative z-20 pb-40">
                <div className="flex flex-wrap items-center justify-between gap-8 mb-16">
                    <div className="flex bg-white p-2 rounded-[22px] shadow-sm border border-gray-100">
                        {['all', 'mine'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setFilter(t)}
                                className={`px-10 py-4 rounded-[18px] text-[11px] font-black uppercase transition-all duration-300 ${filter === t ? 'bg-[#C1121F] text-white shadow-lg' : 'text-gray-400 hover:text-gray-900'}`}
                            >
                                {t === 'all' ? 'Live Auctions' : 'My Contributions'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-4 px-8 py-4 bg-[#2ECC71]/10 rounded-[22px] border border-[#2ECC71]/20">
                        <Activity size={18} className="text-[#2ECC71] animate-pulse" />
                        <span className="text-[#2ECC71] font-black uppercase text-[11px]">
                            {filteredAuctions.length} Active Rounds
                        </span>
                    </div>
                </div>

                <AnimatePresence mode='popLayout'>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                        {filteredAuctions.map((item, idx) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group bg-white rounded-[45px] p-5 border border-gray-50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_40px_80px_rgba(193,18,31,0.12)] transition-all duration-500"
                            >
                                <div className="relative aspect-square rounded-[35px] overflow-hidden mb-7 bg-gray-50">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                    <div className="absolute top-5 left-5">
                                        <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 shadow-sm border border-white/40">
                                            <Heart size={14} className="text-[#C1121F]" fill="currentColor" />
                                            <span className="text-[10px] font-black text-gray-900 uppercase">Verified</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-3 space-y-6">
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-300 uppercase tracking-[0.2em] mb-2 font-mono">Lot #{item.id.slice(0, 8)}</p>
                                        <h3 className="text-2xl font-[1000] text-[#1F2937] uppercase italic leading-tight group-hover:text-[#C1121F] transition-colors line-clamp-1">
                                            {item.name}
                                        </h3>
                                    </div>

                                    <div className="flex items-center justify-between p-5 bg-gray-50/80 rounded-[30px] border border-gray-100 group-hover:bg-white transition-all">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase mb-1">Current Bid</span>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-3xl font-[1000] text-[#1F2937] tracking-tighter leading-none">{item.currentBid}</span>
                                                <span className="text-[11px] font-extrabold text-[#C1121F]">SUI</span>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/item/${item.id}`}
                                            className="w-14 h-14 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-900 shadow-sm group-hover:bg-[#C1121F] group-hover:text-white group-hover:border-[#C1121F] group-hover:scale-110 transition-all duration-300"
                                        >
                                            <ArrowRight size={24} />
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </AnimatePresence>
            </section>
        </div>
    );
}