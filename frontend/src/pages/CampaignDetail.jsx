import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    useSuiClientQuery,
    useCurrentAccount
} from '@mysten/dapp-kit';
import {
    ShieldCheck, Copy, Globe,
    Loader2, Wallet,
    Gavel, ArrowRight, CheckCircle2,
    ArrowLeft, Coins, PackageCheck, ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { PACKAGE_ID, MODULE_NAME } from '../constants';

// Utils - GIỮ NGUYÊN LOGIC
const parseSuiData = (data) => {
    if (!data) return "";
    if (typeof data === 'object' && data.fields?.bytes) return new TextDecoder().decode(new Uint8Array(data.fields.bytes));
    if (Array.isArray(data)) return new TextDecoder().decode(new Uint8Array(data));
    return String(data);
};

const getIPFSUrl = (rawInput) => {
    const cleanString = parseSuiData(rawInput).trim();
    if (!cleanString) return null;
    const cid = cleanString.replace('ipfs://', '').split(',')[0].trim();
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
};

export default function CampaignDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Data Fetching - GIỮ NGUYÊN
    const { data: charity, isLoading } = useSuiClientQuery(
        'getObject',
        { id: id, options: { showContent: true } }
    );

    const { data: auctionEvents } = useSuiClientQuery(
        'queryEvents',
        { query: { MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::AuctionCreated` } }
    );

    const fields = charity?.data?.content?.fields;

    const campaignData = useMemo(() => {
        if (!fields) return null;

        const relatedAuctions = auctionEvents?.data?.filter(
            ev => ev.parsedJson.charity_id === id || ev.parsedJson.campaign_id === id
        ) || [];

        return {
            name: parseSuiData(fields.name),
            description: parseSuiData(fields.description),
            displayLogo: getIPFSUrl(fields.logo || fields.image_url),
            recipientAddress: fields.creator || fields.admin || fields.owner || "N/A",
            raisedSui: fields.vault
                ? (Number(fields.vault) / 1_000_000_000).toLocaleString(undefined, { minimumFractionDigits: 2 })
                : "0.00",
            auctionCount: relatedAuctions.length || 0
        };
    }, [fields, auctionEvents, id]);

    if (isLoading) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center text-[#C1121F] gap-4">
            <Loader2 className="animate-spin" size={40} />
            <span className="font-black uppercase tracking-[0.3em] animate-pulse text-xs">Syncing Protocol Data...</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FA] pt-32 pb-20 px-6 text-[#1F2937] relative overflow-hidden">
            {/* Background Accent - Chuyển sang màu xám nhạt/trắng của Home */}
            <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-gray-100 to-[#F8F9FA] -z-0" />

            <div className="max-w-7xl mx-auto relative z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-500 hover:text-[#C1121F] mb-12 transition-colors uppercase font-black text-[10px] tracking-widest"
                >
                    <ArrowLeft size={14} /> Back to explore
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* LEFT COLUMN: VISUALS & DESCRIPTION */}
                    <div className="lg:col-span-8 space-y-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <h1 className="text-5xl md:text-7xl font-[1000] italic uppercase tracking-tighter leading-[0.9] text-[#1F2937]">
                                {campaignData?.name?.split(' ')[0]} <span className="text-[#C1121F]">{campaignData?.name?.split(' ').slice(1).join(' ')}</span>
                            </h1>

                            <div className="aspect-video rounded-[40px] overflow-hidden border border-gray-200 shadow-2xl bg-white p-2">
                                <img
                                    src={campaignData?.displayLogo || "https://placehold.co/800x500/FFFFFF/C1121F?text=No+Image"}
                                    className="w-full h-full object-cover rounded-[32px]"
                                    alt="Campaign Header"
                                />
                            </div>
                        </motion.div>

                        <div className="space-y-6">
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-[#C1121F] flex items-center gap-3">
                                <div className="h-[2px] w-8 bg-[#C1121F]" /> Mission Background
                            </h3>
                            <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-gray-100 relative">
                                {/* Decor icon */}
                                <div className="absolute top-8 right-8 text-gray-100 italic font-black text-8xl -z-0 select-none opacity-50">“</div>
                                <p className="text-xl md:text-2xl text-gray-600 font-medium leading-relaxed italic relative z-10">
                                    "{campaignData?.description}"
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: RECIPIENT & STATS */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* RECIPIENT CARD */}
                        <div className="p-8 rounded-[40px] bg-white border border-gray-200 shadow-xl relative overflow-hidden">
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-[#C1121F]/10 text-[#C1121F] rounded-2xl">
                                        <Wallet size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recipient Address</p>
                                        <h4 className="font-bold text-[#1F2937] flex items-center gap-2">
                                            Verified Fund <CheckCircle2 size={14} className="text-[#2ECC71]" />
                                        </h4>
                                    </div>
                                </div>

                                <div
                                    className="bg-gray-50 border border-gray-100 p-5 rounded-3xl hover:border-[#C1121F]/30 transition-all cursor-pointer group relative"
                                    onClick={() => {
                                        navigator.clipboard.writeText(campaignData?.recipientAddress);
                                        toast.success("Address copied to clipboard");
                                    }}
                                >
                                    <p className="font-mono text-xs text-gray-600 break-all leading-relaxed mb-3 pr-8">
                                        {campaignData?.recipientAddress.slice(0, 10)}...{campaignData?.recipientAddress.slice(-10)}
                                    </p>
                                    <div className="flex justify-between items-center opacity-40 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[9px] font-black uppercase tracking-widest">Click to copy full ID</span>
                                        <Copy size={12} />
                                    </div>
                                    <ExternalLink size={14} className="absolute top-5 right-5 text-gray-300 group-hover:text-[#C1121F]" />
                                </div>
                            </div>
                        </div>

                        {/* STATS BOX */}
                        <div className="p-8 rounded-[40px] bg-[#1F2937] text-white shadow-2xl space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-white/5 rounded-3xl border border-white/5 text-center">
                                    <Coins size={20} className="mx-auto mb-3 text-[#2ECC71]" />
                                    <p className="text-2xl font-black italic">{campaignData?.raisedSui}</p>
                                    <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">SUI Vault</p>
                                </div>
                                <div className="p-5 bg-white/5 rounded-3xl border border-white/5 text-center">
                                    <PackageCheck size={20} className="mx-auto mb-3 text-[#FFB020]" />
                                    <p className="text-2xl font-black italic">{campaignData?.auctionCount}</p>
                                    <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Auctions</p>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate(`/create?campaignId=${id}`)}
                                className="w-full py-6 bg-[#C1121F] text-white rounded-2xl font-black italic text-sm uppercase hover:bg-[#A41019] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(193,18,31,0.3)]"
                            >
                                <Gavel size={18} />
                                Donate Physical Item
                                <ArrowRight size={18} />
                            </button>

                            <div className="flex items-center justify-center gap-3 opacity-40 pt-4 border-t border-white/5">
                                <ShieldCheck size={14} className="text-[#2ECC71]" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Immutable On-chain Record</span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}