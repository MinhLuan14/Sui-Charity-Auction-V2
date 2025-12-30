import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSuiClient, useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction as SuiTransaction } from '@mysten/sui/transactions';
import { Loader2, Activity, ArrowLeft, Heart, ShieldCheck, Tag, Trophy, Info, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

import { PACKAGE_ID, MODULE_NAME, GLOBAL_CONFIG_ID } from '../constants';

export default function ItemDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const client = useSuiClient();
    const currentAccount = useCurrentAccount();
    const { mutate: signAndExecute, isPending: isTxPending } = useSignAndExecuteTransaction();

    const [auction, setAuction] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bidAmount, setBidAmount] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);

    const fetchAllData = useCallback(async (isManualUpdate = false, digest = null) => {
        if (!id) return;
        try {
            if (digest) await client.waitForTransaction({ digest });

            const res = await client.getObject({
                id,
                options: { showContent: true }
            });

            const fields = res.data?.content?.fields;
            if (!fields) return;

            const nftFields = fields.nft?.fields;
            const highestBidSui = Number(fields.highest_bid || 0) / 1e9;
            const minReserveSui = Number(fields.min_reserve_price || 0) / 1e9;

            setAuction({
                id,
                name: nftFields?.name || "Charity Item",
                description: nftFields?.description || "This item is being auctioned to raise funds for verified charitable causes.",
                image: nftFields?.url?.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/"),
                highestBid: highestBidSui,
                minReserve: minReserveSui,
                displayPrice: highestBidSui > 0 ? highestBidSui : minReserveSui,
                endTime: Number(fields.end_time),
                status: fields.active,
                highestBidder: fields.highest_bidder,
                seller: fields.seller,
                charityId: fields.charity_id
            });

            const events = await client.queryEvents({
                query: { MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::BidPlaced` },
                order: "descending",
                limit: 20
            });

            setHistory(events.data
                .filter(e => e.parsedJson.auction_id === id)
                .map(e => ({
                    bidder: e.parsedJson.bidder,
                    amount: Number(e.parsedJson.amount) / 1e9,
                    timestamp: e.timestampMs
                })));
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [id, client]);

    useEffect(() => {
        fetchAllData();
        const interval = setInterval(() => fetchAllData(), 15000);
        return () => clearInterval(interval);
    }, [fetchAllData]);

    useEffect(() => {
        if (!auction?.endTime) return;
        const timer = setInterval(() => {
            const diff = Math.max(0, Math.floor((auction.endTime - Date.now()) / 1000));
            setTimeLeft(diff);
        }, 1000);
        return () => clearInterval(timer);
    }, [auction?.endTime]);

    const handleBid = async () => {
        if (!currentAccount) return toast.error("Please connect your wallet!");
        const bidValue = parseFloat(bidAmount);
        if (isNaN(bidValue) || bidValue <= auction.highestBid) {
            return toast.error(`Bid must be higher than ${auction.highestBid} SUI`);
        }

        try {
            const txb = new SuiTransaction();
            const [coin] = txb.splitCoins(txb.gas, [txb.pure.u64(Math.round(bidValue * 1e9))]);
            txb.moveCall({
                target: `${PACKAGE_ID}::${MODULE_NAME}::place_bid`,
                arguments: [txb.object(GLOBAL_CONFIG_ID), txb.object(id), coin, txb.object('0x6')],
            });

            signAndExecute({ transaction: txb }, {
                onSuccess: (result) => {
                    toast.success("Bid placed successfully!");
                    setBidAmount('');
                    setTimeout(() => fetchAllData(true, result.digest), 2000);
                },
                onError: (err) => toast.error("Transaction failed: " + err.message)
            });
        } catch (e) { console.error(e); }
    };

    const handleClaim = async () => {
        if (!currentAccount) return toast.error("Please connect your wallet!");
        const toastId = toast.loading("Settling auction and transferring NFT...");

        try {
            const txb = new SuiTransaction();
            txb.moveCall({
                target: `${PACKAGE_ID}::${MODULE_NAME}::settle_auction`,
                arguments: [
                    txb.object(GLOBAL_CONFIG_ID),
                    txb.object(auction.charityId),
                    txb.object(id),
                    txb.object('0x6')
                ],
            });

            signAndExecute({ transaction: txb }, {
                onSuccess: (result) => {
                    toast.success("Auction settled! NFT transferred to your wallet.", { id: toastId });
                    setTimeout(() => fetchAllData(true, result.digest), 2000);
                },
                onError: (err) => {
                    toast.error("Settle failed: " + err.message, { id: toastId });
                }
            });
        } catch (e) { console.error(e); }
    };

    if (loading) return (
        <div className="flex h-screen flex-col gap-4 items-center justify-center bg-[#F8F9FA]">
            <Loader2 className="animate-spin text-[#C1121F]" size={40} />
            <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest italic">Syncing Blockchain Data...</p>
        </div>
    );

    const isWinner = currentAccount?.address === auction?.highestBidder;
    const isEnded = timeLeft === 0 || !auction?.status;

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#1F2937] p-4 md:p-8 pt-32 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* BACK BUTTON */}
                <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-gray-400 hover:text-[#C1121F] mb-12 transition-all text-[10px] font-black uppercase tracking-widest">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Marketplace
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">

                    {/* LEFT COLUMN: VISUALS */}
                    <div className="lg:col-span-5 space-y-8">
                        <div className="rounded-[3.5rem] overflow-hidden border border-gray-100 shadow-2xl bg-white p-4">
                            <div className="relative group">
                                <img src={auction?.image} alt={auction?.name} className="w-full aspect-square object-cover rounded-[2.5rem] transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-gray-100 text-[10px] font-black uppercase italic tracking-wider flex items-center gap-2 text-[#C1121F]">
                                    <ShieldCheck size={12} /> Verified Asset
                                </div>
                            </div>
                        </div>

                        <div className="p-10 rounded-[3rem] bg-white border border-gray-100 shadow-sm space-y-4">
                            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                                <Tag size={18} className="text-[#C1121F]" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Item Description</h3>
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed italic font-medium">"{auction?.description}"</p>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: BIDDING */}
                    <div className="lg:col-span-7 space-y-10">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-[#C1121F] bg-[#C1121F]/5 w-fit px-4 py-1.5 rounded-full border border-[#C1121F]/10">
                                <Heart size={14} fill="currentColor" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Philanthropy Fund</span>
                            </div>
                            <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.8] text-[#1F2937]">
                                {auction?.name}
                            </h1>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="p-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                                <p className="text-[10px] uppercase text-gray-400 font-black mb-2 tracking-widest">Current Bid</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-[#C1121F]">{auction?.displayPrice.toFixed(2)}</span>
                                    <span className="text-sm font-black text-gray-400">SUI</span>
                                </div>
                            </div>

                            <div className="p-8 bg-[#1F2937] rounded-[2.5rem] border border-gray-800 shadow-xl relative overflow-hidden group">
                                <p className="text-[10px] uppercase text-gray-500 font-black mb-2 tracking-widest">Time Remaining</p>
                                <div className="flex items-center gap-3">
                                    <Clock size={20} className={timeLeft < 300 && timeLeft > 0 ? 'text-[#C1121F] animate-pulse' : 'text-gray-400'} />
                                    <p className={`text-3xl font-mono font-black ${timeLeft < 300 && timeLeft > 0 ? 'text-[#C1121F] animate-pulse' : 'text-white'}`}>
                                        {timeLeft > 0 ? (
                                            `${String(Math.floor(timeLeft / 3600)).padStart(2, '0')}:${String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`
                                        ) : "AUCTION ENDED"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* BID & CLAIM ACTION PANEL */}
                        <div className={`p-10 rounded-[3.5rem] border-2 transition-all duration-500 ${isEnded ? 'bg-gray-50 border-gray-100' : 'bg-white border-[#C1121F]/20 shadow-[0_30px_60px_-15px_rgba(193,18,31,0.1)]'}`}>
                            {!isEnded ? (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center px-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Your Bid Amount</label>
                                        <span className="text-[10px] text-[#C1121F] font-black italic">MIN: {(auction.highestBid + 0.1).toFixed(2)} SUI</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={bidAmount}
                                            onChange={(e) => setBidAmount(e.target.value)}
                                            placeholder={`Higher than ${auction.highestBid}`}
                                            className="w-full bg-gray-50 border-2 border-transparent p-7 rounded-3xl outline-none focus:border-[#C1121F]/30 focus:bg-white transition-all font-black text-3xl text-[#1F2937]"
                                        />
                                        <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-gray-300">SUI</span>
                                    </div>
                                    <button onClick={handleBid} disabled={isTxPending} className="w-full py-7 bg-[#C1121F] text-white rounded-3xl font-black uppercase italic hover:bg-[#1F2937] transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#C1121F]/20 active:scale-95">
                                        {isTxPending ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                                        <span>Place Official Bid</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-4 space-y-6">
                                    <div className="space-y-2">
                                        <Info size={32} className="mx-auto text-gray-200" />
                                        <p className="font-black uppercase italic text-gray-400 tracking-widest text-xs">Bidding Period Closed</p>
                                    </div>

                                    {isWinner && auction?.status && (
                                        <div className="p-8 rounded-[2.5rem] bg-green-50 border border-green-100 space-y-5">
                                            <div className="flex items-center justify-center gap-2 text-green-600">
                                                <Trophy size={20} />
                                                <p className="text-xs font-black uppercase tracking-tighter">You are the winner!</p>
                                            </div>
                                            <button
                                                onClick={handleClaim}
                                                disabled={isTxPending}
                                                className="w-full py-6 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase italic transition-all flex items-center justify-center gap-2 shadow-md shadow-green-200"
                                            >
                                                {isTxPending ? <Loader2 className="animate-spin" /> : <ShieldCheck size={18} />}
                                                Claim NFT to Wallet
                                            </button>
                                        </div>
                                    )}

                                    {!auction?.status && (
                                        <div className="flex items-center justify-center gap-2 py-4 px-6 bg-blue-50 rounded-2xl border border-blue-100">
                                            <Activity size={16} className="text-blue-500" />
                                            <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">
                                                Ownership has been finalized and transferred
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* BID HISTORY SECTION */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 px-2">
                                <Activity size={18} className="text-[#C1121F]" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Bidding Activity</h3>
                            </div>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {history.length > 0 ? history.map((bid, index) => (
                                    <div key={index} className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all ${index === 0 ? 'bg-[#C1121F]/5 border-[#C1121F]/20' : 'bg-white border-gray-100'}`}>
                                        <div className="flex items-center gap-5">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black ${index === 0 ? 'bg-[#C1121F] text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="text-xs font-mono font-black text-[#1F2937]">{bid.bidder.slice(0, 10)}...{bid.bidder.slice(-6)}</p>
                                                <p className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">{new Date(bid.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                        <p className="font-black italic text-xl text-[#C1121F]">{bid.amount.toFixed(2)} SUI</p>
                                    </div>
                                )) : (
                                    <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-[2.5rem] text-gray-300 font-black uppercase text-[10px] tracking-widest">
                                        No bidding activity yet
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
            `}} />
        </div>
    );
}