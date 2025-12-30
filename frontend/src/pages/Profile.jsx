import React, { useState, useEffect } from 'react';
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet, Heart, Zap, ShieldCheck, ImageOff,
    PackagePlus, Loader2, ExternalLink, Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PACKAGE_ID, MODULE_NAME } from '../constants';

// --- HELPERS ---
const getIPFSUrl = (url) => {
    if (!url || typeof url !== 'string') return "https://placehold.jp/24/F8F9FA/1F2937/400x400.png?text=No+Image";
    const cid = url.replace("ipfs://", "").trim();
    return cid.startsWith('http') ? cid : `https://gateway.pinata.cloud/ipfs/${cid}`;
};

const parseSuiString = (data) => {
    if (!data) return "";
    if (typeof data === 'object' && data.bytes) return new TextDecoder().decode(new Uint8Array(data.bytes));
    return String(data);
};

export default function Profile() {
    const client = useSuiClient();
    const currentAccount = useCurrentAccount();

    const [activeTab, setActiveTab] = useState('bidding');
    const [myNFTs, setMyNFTs] = useState([]);
    const [activeBids, setActiveBids] = useState([]);
    const [createdAuctions, setCreatedAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState("0.00");

    const fetchProfileData = async () => {
        if (!currentAccount?.address) return;

        try {
            setLoading(true);

            // 1. Fetch Wallet Balance
            const bal = await client.getBalance({ owner: currentAccount.address });
            setBalance((Number(bal.totalBalance) / 1e9).toFixed(3));

            // 2. Fetch Auctions
            const eventType = `${PACKAGE_ID}::${MODULE_NAME}::AuctionCreated`;
            const events = await client.queryEvents({
                query: { MoveEventType: eventType }
            });
            const allAuctionIds = [...new Set(events.data.map((e) => e.parsedJson.auction_id))];

            if (allAuctionIds.length > 0) {
                const auctionObjects = await client.multiGetObjects({
                    ids: allAuctionIds,
                    options: { showContent: true }
                });

                const participating = [];
                const created = [];
                const myAddr = currentAccount.address.toLowerCase();

                auctionObjects.forEach((obj) => {
                    const fields = obj.data?.content?.fields;
                    if (!fields) return;

                    const nftData = fields.nft?.fields;
                    if (!nftData) return;

                    const rawHighestBid = fields.highest_bid ? BigInt(fields.highest_bid) : 0n;
                    const currentBidSui = Number(rawHighestBid) / 1_000_000_000;

                    const item = {
                        id: obj.data.objectId,
                        name: parseSuiString(nftData.name || "Unnamed Item"),
                        currentBid: currentBidSui.toLocaleString(undefined, { minimumFractionDigits: 2 }),
                        image: getIPFSUrl(nftData.url),
                        status: fields.active === true ? "LIVE" : "ENDED",
                        seller: fields.seller,
                        highest_bidder: fields.highest_bidder
                    };

                    // Classification
                    if (item.seller.toLowerCase() === myAddr) {
                        created.push(item);
                    }
                    if (item.status === "LIVE" && item.highest_bidder?.toLowerCase() === myAddr) {
                        participating.push(item);
                    }
                });

                setActiveBids(participating);
                setCreatedAuctions(created);
            }

            // 3. Fetch Owned NFT Collection
            const ownedNFTs = await client.getOwnedObjects({
                owner: currentAccount.address,
                filter: { StructType: `${PACKAGE_ID}::${MODULE_NAME}::CharityNFT` },
                options: { showContent: true }
            });

            setMyNFTs(ownedNFTs.data.map(obj => {
                const f = obj.data?.content?.fields;
                return {
                    id: obj.data.objectId,
                    name: parseSuiString(f?.name || "Charity NFT"),
                    image: getIPFSUrl(f?.url)
                };
            }));

        } catch (error) {
            console.error("Profile Sync Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfileData();
    }, [currentAccount?.address, client]);

    if (!currentAccount) return <ConnectWalletState />;

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#1F2937] pt-32 pb-20 px-6 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-20 gap-10">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <div className="flex items-center gap-2 mb-4 bg-[#C1121F]/5 w-fit px-4 py-1.5 rounded-full border border-[#C1121F]/10 text-[#C1121F] text-[10px] font-black uppercase tracking-widest">
                            <Activity size={12} className="animate-pulse" /> Network: Sui Mainnet
                        </div>
                        <h1 className="text-7xl md:text-9xl font-black italic uppercase tracking-tighter leading-[0.8]">
                            MY <span className="text-[#C1121F]">STASH</span>
                        </h1>
                        <p className="mt-6 font-mono text-[10px] text-gray-400 bg-white px-4 py-2 rounded-xl border border-gray-100 w-fit shadow-sm">
                            {currentAccount.address}
                        </p>
                    </motion.div>

                    <div className="bg-white border border-gray-100 p-10 rounded-[40px] min-w-[300px] text-center shadow-xl shadow-gray-200/50">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Available Balance</p>
                        <div className="flex justify-center items-baseline gap-2">
                            <span className="text-6xl font-black italic text-[#1F2937]">{balance}</span>
                            <span className="text-[#C1121F] font-black italic text-sm">SUI</span>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                    <StatCard icon={<Zap size={24} />} label="Leading Bids" value={activeBids.length} color="crimson" />
                    <StatCard icon={<PackagePlus size={24} />} label="Items Listed" value={createdAuctions.length} color="slate" />
                    <StatCard icon={<Heart size={24} />} label="NFT Collection" value={myNFTs.length} color="green" />
                </div>

                {/* Tabs */}
                <div className="flex gap-12 mb-12 border-b border-gray-100">
                    {[
                        { id: 'bidding', label: 'Active Bids' },
                        { id: 'created', label: 'My Listings' },
                        { id: 'inventory', label: 'NFT Inventory' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-6 text-xs font-black uppercase italic tracking-widest relative transition-all ${activeTab === tab.id ? 'text-[#C1121F]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div layoutId="profileTab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#C1121F] rounded-full shadow-[0_4px_12px_rgba(193,18,31,0.3)]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content Grid */}
                {loading ? (
                    <div className="py-40 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-[#C1121F]" size={40} />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Syncing Stash Data...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        <AnimatePresence mode="wait">
                            {activeTab === 'bidding' && (
                                activeBids.length > 0 ? activeBids.map(item => <ItemCard key={item.id} item={item} badge="LEADING" />) : <EmptyState msg="You are not leading any auctions" />
                            )}
                            {activeTab === 'created' && (
                                createdAuctions.length > 0 ? createdAuctions.map(item => <ItemCard key={item.id} item={item} badge={item.status} />) : <EmptyState msg="No items listed for auction yet" />
                            )}
                            {activeTab === 'inventory' && (
                                myNFTs.length > 0 ? myNFTs.map(nft => <ItemCard key={nft.id} item={nft} isNFT />) : <EmptyState msg="Your NFT vault is currently empty" />
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---

function StatCard({ icon, label, value, color }) {
    const colorClass = color === 'crimson' ? 'text-[#C1121F]' : color === 'green' ? 'text-green-500' : 'text-[#1F2937]';
    return (
        <div className="p-10 rounded-[40px] border border-gray-100 bg-white hover:border-[#C1121F]/20 transition-all group shadow-sm hover:shadow-xl hover:shadow-gray-200/50">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 bg-gray-50 group-hover:scale-110 transition-transform ${colorClass}`}>
                {icon}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">{label}</p>
            <h3 className="text-5xl font-black italic mt-2 text-[#1F2937]">{value}</h3>
        </div>
    );
}

function ItemCard({ item, badge, isNFT }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group bg-white border border-gray-100 p-5 rounded-[3.5rem] hover:border-[#C1121F]/20 transition-all shadow-sm hover:shadow-2xl hover:shadow-gray-200/60"
        >
            <div className="aspect-square rounded-[2.5rem] overflow-hidden mb-6 relative bg-gray-50">
                <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                {badge && (
                    <div className="absolute top-4 right-4 px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-full border border-gray-100 text-[9px] font-black text-[#C1121F] italic shadow-sm">
                        {badge}
                    </div>
                )}
            </div>

            <h4 className="text-lg font-black italic uppercase truncate px-2 mb-5 text-[#1F2937]">{item.name}</h4>

            {!isNFT ? (
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-3xl border border-gray-100">
                    <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Current Bid</p>
                        <p className="text-xl font-black italic text-[#1F2937]">{item.currentBid} <span className="text-[10px] text-[#C1121F]">SUI</span></p>
                    </div>
                    <Link to={`/item/${item.id}`} className="w-12 h-12 bg-[#1F2937] text-white rounded-2xl flex items-center justify-center hover:bg-[#C1121F] transition-all active:scale-90 shadow-lg">
                        <ExternalLink size={18} />
                    </Link>
                </div>
            ) : (
                <div className="flex items-center gap-3 py-3 px-6 bg-green-50 rounded-full w-fit border border-green-100">
                    <ShieldCheck size={16} className="text-green-500" />
                    <span className="text-[10px] font-black uppercase text-green-600 tracking-widest">Verified Collection</span>
                </div>
            )}
        </motion.div>
    );
}

function ConnectWalletState() {
    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center text-[#1F2937] p-6 font-sans">
            <div className="w-28 h-28 bg-white shadow-2xl shadow-gray-200 rounded-[40px] flex items-center justify-center mb-10 border border-gray-100 animate-bounce">
                <Wallet size={48} className="text-[#C1121F]" />
            </div>
            <h2 className="text-3xl font-black uppercase italic tracking-widest text-center">Connect Wallet to View Profile</h2>
            <p className="text-gray-400 text-sm mt-4 font-bold uppercase tracking-widest">Please use Sui Wallet to access your stash</p>
        </div>
    );
}

function EmptyState({ msg }) {
    return (
        <div className="col-span-full py-32 text-center border-2 border-dashed border-gray-100 rounded-[50px] bg-white/50">
            <ImageOff size={48} className="mx-auto text-gray-200 mb-6" />
            <p className="text-gray-300 font-black uppercase italic text-xs tracking-[0.3em]">{msg}</p>
        </div>
    );
}