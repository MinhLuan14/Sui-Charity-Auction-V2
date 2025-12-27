import React, { useState, useEffect } from 'react';

import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';

import { motion, AnimatePresence } from 'framer-motion';

import { Wallet, Heart, Zap, ShieldCheck, ImageOff, PackagePlus, Loader2, ExternalLink, Activity } from 'lucide-react';

import { Link } from 'react-router-dom';



const PACKAGE_ID = "0x5e4414f266147c07b0b15ded6239606c78333628b4fe251b1dbaa7600c637675";



export default function Profile() {

    const client = useSuiClient();

    const currentAccount = useCurrentAccount();



    const [activeTab, setActiveTab] = useState('bidding');

    const [myNFTs, setMyNFTs] = useState([]);

    const [activeBids, setActiveBids] = useState([]);

    const [createdAuctions, setCreatedAuctions] = useState([]);

    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({ totalDonated: 0, itemsWon: 0, balance: "0" });



    // --- HELPERS (GIỮ NGUYÊN LOGIC) ---

    const getIPFSUrl = (url) => {

        if (!url || typeof url !== 'string') return "https://placehold.jp/24/0a1120/ffffff/400x400.png?text=No+Image";

        const parts = url.split('/');

        const cid = parts[parts.length - 1].trim();

        return cid ? `https://gateway.pinata.cloud/ipfs/${cid}` : "https://placehold.jp/24/0a1120/ffffff/400x400.png?text=Invalid+CID";

    };



    const extractNFTData = (obj) => {

        const fields = obj.data?.content?.fields;

        if (!fields) return null;

        const nft = fields.nft?.fields?.contents?.fields || fields.nft?.fields || fields.nft;

        const rawImage = nft?.image_url || nft?.url || nft?.metadata || obj.data?.display?.data?.image_url;



        return {

            id: obj.data.objectId,

            name: (nft?.name || "Unnamed").split('|')[0].trim(),

            currentBid: (Number(fields.highest_bid || 0) / 1e9).toFixed(2),

            image: getIPFSUrl(rawImage),

            status: fields.status === true ? "LIVE" : "ENDED",

            seller: fields.seller || fields.creator,

            highest_bidder: fields.highest_bidder

        };

    };



    const fetchProfileData = async () => {

        if (!currentAccount) return;

        try {

            setLoading(true);

            const balance = await client.getBalance({ owner: currentAccount.address });

            const suiBalance = (Number(balance.totalBalance) / 1e9).toFixed(3);



            const events = await client.queryEvents({

                query: { MoveEventType: `${PACKAGE_ID}::charity_auction::AuctionCreated` }

            });

            const allAuctionIds = [...new Set(events.data.map((e) => e.parsedJson.auction_id))];



            const auctionDetails = await client.multiGetObjects({

                ids: allAuctionIds,

                options: { showContent: true, showDisplay: true }

            });



            const participating = [];

            const createdMap = new Map();



            auctionDetails.forEach((obj) => {

                const processed = extractNFTData(obj);

                if (!processed) return;

                if (processed.seller === currentAccount.address) createdMap.set(processed.id, processed);

                if (processed.status === "LIVE" && processed.highest_bidder === currentAccount.address) {

                    participating.push(processed);

                }

            });



            const ownedNFTs = await client.getOwnedObjects({

                owner: currentAccount.address,

                filter: { StructType: `${PACKAGE_ID}::charity_auction::CharityNFT` },

                options: { showContent: true, showDisplay: true }

            });



            const nfts = ownedNFTs.data.map((obj) => {

                const f = obj.data.content.fields;

                return {

                    id: obj.data.objectId,

                    name: (f.name || "Charity NFT").split('|')[0].trim(),

                    image: getIPFSUrl(f.image_url || f.metadata || obj.data.display?.data?.image_url)

                };

            });



            setStats({ totalDonated: 0, itemsWon: nfts.length, balance: suiBalance });

            setMyNFTs(nfts);

            setActiveBids(participating);

            setCreatedAuctions(Array.from(createdMap.values()));

        } catch (error) {

            console.error("Profile Sync Error:", error);

        } finally { setLoading(false); }

    };



    useEffect(() => { fetchProfileData(); }, [currentAccount?.address, client]);



    if (!currentAccount) return (

        <div className="min-h-screen bg-sui-dark flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">

            <div className="absolute w-125 h-125 bg-sui-cyan/5 blur-3xl rounded-full" />

            <Wallet size={84} className="text-sui-cyan mb-8 animate-pulse relative z-10" />

            <h2 className="text-2xl font-black uppercase italic tracking-widest relative z-10">Connect your wallet to continue</h2>

        </div>

    );



    return (

        <div className="min-h-screen text-white pt-40 pb-20 px-10">

            <div className="max-w-7xl mx-auto">

                {/* HEADER */}

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-20 gap-10">

                    <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>

                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sui-cyan/10 border border-sui-cyan/20 text-sui-cyan text-[10px] font-black uppercase tracking-widest mb-6">

                            <Activity size={12} className="animate-pulse" />

                            Live on Sui

                        </div>

                        <h1 className="text-8xl md:text-9xl font-black italic uppercase tracking-tighter leading-none mt-2">

                            MY <span className="text-transparent bg-clip-text bg-linear-to-b from-sui-cyan to-sui-primary drop-shadow-2xl">STASH</span>

                        </h1>

                        <div className="flex items-center gap-3 mt-8 bg-white/5 border border-white/10 p-4 rounded-2xl w-fit backdrop-blur-xl group hover:border-sui-cyan/30 transition-colors">

                            <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />

                            <p className="font-mono text-[11px] text-white/50 tracking-tight">{currentAccount.address}</p>

                        </div>

                    </motion.div>



                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}

                        className="glass-card neon-border p-10 rounded-3xl min-w-75 text-center relative overflow-hidden group">

                        <div className="absolute inset-0 bg-linear-to-br from-sui-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Balance</p>

                        <div className="flex justify-center items-baseline gap-2 relative z-10">

                            <span className="text-6xl font-black italic text-sui-cyan drop-shadow-md">{stats.balance}</span>

                            <span className="text-sm font-black text-white/40 italic uppercase">Sui</span>

                        </div>

                    </motion.div>

                </div>



                {/* STATS */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">

                    <StatCard icon={<Heart size={32} className="text-pink-500" />} label="Total Donations" value={`${stats.totalDonated} SUI`} />

                    <StatCard icon={<PackagePlus size={32} className="text-sui-cyan" />} label="Sản phẩm đã tạo" value={createdAuctions.length} />

                    <StatCard icon={<Zap size={32} className="text-white" />} label="Currently Leading" value={activeBids.length} highlight />

                </div>



                {/* TABS */}

                <div className="flex gap-12 mb-16 border-b border-white/5 pb-8 overflow-x-auto no-scrollbar">

                    {['bidding', 'created', 'inventory'].map((id) => (

                        <button key={id} onClick={() => setActiveTab(id)}

                            className={`text-xs font-black uppercase italic tracking-widest transition-all relative ${activeTab === id ? 'text-sui-cyan' : 'text-white/30 hover:text-white/60'}`}>

                            {id === 'bidding' ? 'Auction in Progress' : id === 'created' ? 'Uploaded' : 'Artwork Collection'}

                            {activeTab === id && (

                                <motion.div layoutId="tab-active-bar" className="absolute -bottom-8.25 left-0 right-0 h-1 bg-sui-cyan shadow-lg shadow-sui-cyan/50" />

                            )}

                        </button>

                    ))}

                </div>



                {/* LISTING */}

                {loading ? (

                    <div className="py-40 flex flex-col items-center gap-6">

                        <Loader2 className="animate-spin text-sui-cyan" size={56} />

                    </div>

                ) : (

                    <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

                        <AnimatePresence mode="wait">

                            {activeTab === 'bidding' && (

                                activeBids.length > 0 ? activeBids.map(item => <CardItem key={item.id} item={item} badge="LEADING" />) : <EmptyState msg="Bạn chưa dẫn đầu phiên nào" />

                            )}

                            {activeTab === 'created' && (

                                createdAuctions.length > 0 ? createdAuctions.map(item => <CardItem key={item.id} item={item} badge={item.status} />) : <EmptyState msg="Bạn chưa tải lên vật phẩm nào" />

                            )}

                            {activeTab === 'inventory' && (

                                myNFTs.length > 0 ? myNFTs.map(nft => <CardItem key={nft.id} item={nft} type="NFT" />) : <EmptyState msg="Kho chứa đang trống" />

                            )}

                        </AnimatePresence>

                    </motion.div>

                )}

            </div>

        </div>

    );

}



function CardItem({ item, badge, type }) {

    return (

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}

            className="group glass-card p-6 rounded-[50px] border border-white/5 hover:border-sui-cyan/40 transition-all duration-500 relative overflow-hidden">

            <div className="aspect-square rounded-[40px] overflow-hidden mb-6 bg-black relative shadow-inner">

                <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"

                    onError={(e) => { e.target.src = "https://placehold.jp/24/0a1120/ffffff/400x400.png?text=ERROR"; }} />

                {badge && (

                    <div className="absolute top-4 right-4 bg-sui-dark/80 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[8px] font-black text-sui-cyan tracking-widest uppercase italic">

                        {badge}

                    </div>

                )}

            </div>

            <div className="px-2">

                <h4 className="text-xl font-black italic uppercase truncate mb-5 text-white group-hover:text-sui-cyan transition-colors">{item.name}</h4>

                {type !== 'NFT' ? (

                    <div className="flex justify-between items-center bg-white/5 rounded-[30px] p-5 border border-white/5 group-hover:bg-sui-cyan/10 transition-all">

                        <div>

                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Current Bid</p>

                            <p className="text-2xl font-black italic text-sui-cyan tracking-tighter">{item.currentBid} <span className="text-[10px] text-white/40">SUI</span></p>

                        </div>

                        <Link to={`/item/${item.id}`} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-sui-cyan text-white transition-all shadow-lg">

                            <ExternalLink size={18} />

                        </Link>

                    </div>

                ) : (

                    <div className="flex items-center gap-3 py-3 px-5 bg-sui-cyan/5 rounded-full w-fit border border-sui-cyan/10">

                        <ShieldCheck size={16} className="text-sui-cyan" />

                        <span className="text-[9px] font-black uppercase tracking-widest text-sui-cyan/80">Verified</span>

                    </div>

                )}

            </div>

        </motion.div>

    );

}



function StatCard({ icon, label, value, highlight }) {

    return (

        <div className={`p-12 rounded-[60px] border transition-all duration-500 relative overflow-hidden group ${highlight ? 'bg-sui-cyan border-transparent shadow-2xl shadow-sui-cyan/25' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>

            <div className={`mb-8 w-16 h-16 rounded-2xl flex items-center justify-center relative z-10 ${highlight ? 'bg-white/20' : 'bg-white/5'}`}>{icon}</div>

            <p className={`text-[10px] font-black uppercase tracking-widest relative z-10 ${highlight ? 'text-white/80' : 'text-white/30'}`}>{label}</p>

            <h2 className="text-5xl font-black italic mt-3 tracking-tighter relative z-10 text-white">{value}</h2>

        </div>

    );

}



function EmptyState({ msg }) {

    return (

        <div className="col-span-full py-40 text-center bg-white/2 rounded-[80px] border-2 border-dashed border-white/5 backdrop-blur-sm">

            <ImageOff size={64} className="mx-auto text-white/10 mb-8" />

            <p className="text-white/20 text-lg font-black uppercase italic tracking-widest">{msg}</p>

        </div>

    );

}