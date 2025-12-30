import React, { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient, useSuiClientQuery } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import {
    Upload, Zap, ShieldCheck, PieChart,
    Loader2, Clock, AlignLeft, Target, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PACKAGE_ID, MODULE_NAME } from '../constants';

// --- UTILS ---
const parseSuiData = (data) => {
    if (!data) return "";
    if (typeof data === 'object' && data.bytes) return new TextDecoder().decode(new Uint8Array(data.bytes));
    if (Array.isArray(data)) return new TextDecoder().decode(new Uint8Array(data));
    return String(data);
};

const formatAddress = (addr) => addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : "";

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function CreateAuction() {
    const account = useCurrentAccount();
    const suiClient = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();

    const [isProcessing, setIsProcessing] = useState(false);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [preview, setPreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [charities, setCharities] = useState([]);
    const [isFetchingCharities, setIsFetchingCharities] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        basePrice: '',
        charityId: '',
        days: '1',
        hours: '0',
        minutes: '0',
        feeType: 3
    });

    // --- FETCH CHARITIES LOGIC ---
    const { data: events } = useSuiClientQuery('queryEvents', {
        query: { MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::CharityRegistered` },
        order: 'descending',
    });

    useEffect(() => {
        const fetchVerifiedCharities = async () => {
            if (!events?.data) return;
            setIsFetchingCharities(true);
            try {
                const ids = [...new Set(events.data.map(e => e.parsedJson.charity_id))];
                const objects = await suiClient.multiGetObjects({ ids, options: { showContent: true } });

                const formatted = objects
                    .filter(obj => obj.data?.content?.fields?.is_verified === true)
                    .map(obj => ({
                        id: obj.data.objectId,
                        name: parseSuiData(obj.data.content.fields.name),
                        address: obj.data.objectId
                    }));
                setCharities(formatted);
            } catch (err) {
                console.error("Error fetching charities:", err);
            } finally {
                setIsFetchingCharities(false);
            }
        };
        fetchVerifiedCharities();
    }, [events, suiClient]);

    // --- AI GENERATE LOGIC ---
    const handleAIGenerate = async () => {
        if (!formData.name) return toast.error("Please enter the item name first! 💙");
        setIsGeneratingAI(true);
        const toastId = toast.loading("AI is creating content...");
        try {
            const selectedCharity = charities.find(c => c.id === formData.charityId);
            const response = await fetch(`${BACKEND_URL}/api/generate-description`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    itemName: formData.name,
                    cause: selectedCharity ? selectedCharity.name : "Charity Fundraising",
                    donorName: account?.address ? formatAddress(account.address) : "Philanthropist"
                })
            });
            const data = await response.json();
            if (data.description) {
                setFormData(prev => ({ ...prev, description: data.description }));
                toast.success("AI description is ready! ❤️", { id: toastId });
            } else {
                throw new Error("No response from AI");
            }
        } catch (error) {
            toast.error("AI is busy, please try again later 💙", { id: toastId });
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // --- BLOCKCHAIN LOGIC ---
    const handleLaunchEngine = async (e) => {
        e.preventDefault();
        if (!account) return toast.error("Please connect your Sui wallet!");
        if (!selectedFile) return toast.error("Please upload an item image!");
        if (!formData.charityId) return toast.error("Please select a charity project!");

        setIsProcessing(true);
        const toastId = toast.loading("Initializing auction...");

        try {
            const uploadData = new FormData();
            uploadData.append('file', selectedFile);
            const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
                method: "POST",
                headers: { Authorization: `Bearer ${PINATA_JWT}` },
                body: uploadData
            });
            const uploadJson = await pinataRes.json();
            const imageUrl = `https://gateway.pinata.cloud/ipfs/${uploadJson.IpfsHash}`;

            const txb = new Transaction();
            const minPriceMist = BigInt(Math.floor(parseFloat(formData.basePrice) * 1_000_000_000));
            const durationMs = ((parseInt(formData.days || 0) * 86400) + (parseInt(formData.hours || 0) * 3600) + (parseInt(formData.minutes || 0) * 60)) * 1000;

            txb.moveCall({
                target: `${PACKAGE_ID}::${MODULE_NAME}::create_auction`,
                arguments: [
                    txb.object(formData.charityId),
                    txb.pure.string(formData.name),
                    txb.pure.string(imageUrl),
                    txb.pure.string(formData.description || ""),
                    txb.pure.u64(minPriceMist),
                    txb.pure.u64(durationMs),
                    txb.object('0x6'),
                ],
            });

            signAndExecute(
                { transaction: txb },
                {
                    onSuccess: (result) => {
                        toast.success("Auction activated successfully! 🚀", { id: toastId });
                        setIsProcessing(false);
                    },
                    onError: (err) => {
                        toast.error(`Transaction failed: ${err.message}`, { id: toastId });
                        setIsProcessing(false);
                    }
                }
            );
        } catch (error) {
            toast.error("System error: " + error.message, { id: toastId });
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#1F2937] pt-32 pb-20 font-sans">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* LEFT COLUMN: PREVIEW & INFO */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="relative group aspect-square bg-white rounded-[40px] border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden transition-all hover:border-[#C1121F]/50 shadow-sm">
                        {preview ? (
                            <img src={preview} className="w-full h-full object-cover p-4 rounded-[40px]" alt="NFT Preview" />
                        ) : (
                            <div className="text-center p-10">
                                <Upload className="mx-auto mb-4 text-[#C1121F] opacity-40 animate-pulse" size={40} />
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Upload Item Image</p>
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) { setSelectedFile(file); setPreview(URL.createObjectURL(file)); }
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-gray-100 p-6 rounded-[30px] shadow-sm">
                        <h4 className="text-[10px] font-black uppercase text-[#C1121F] mb-4 flex items-center gap-2 tracking-widest">
                            <PieChart size={14} /> Allocation & Fees
                        </h4>
                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-bold">Starting Floor Price</span>
                                <span className="text-[#2ECC71] font-mono font-black">{formData.basePrice || 0} SUI</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-50 pt-2">
                                <span className="text-gray-500 font-bold">Platform Maintenance Fee</span>
                                <span className="text-[#C1121F] font-black">-{formData.feeType}% upon completion</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: REGISTRATION FORM */}
                <div className="lg:col-span-7">
                    <form onSubmit={handleLaunchEngine} className="bg-white border border-gray-100 p-8 md:p-10 rounded-[50px] space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.02)]">

                        {/* SELECT PROJECT */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 flex items-center gap-2 tracking-widest">
                                <Target size={14} className="text-[#C1121F]" /> Beneficiary Project
                            </label>
                            <select
                                required
                                value={formData.charityId}
                                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl focus:border-[#C1121F]/30 outline-none font-bold text-sm transition-all text-[#1F2937]"
                                onChange={e => setFormData({ ...formData, charityId: e.target.value })}
                            >
                                <option value="">{isFetchingCharities ? "Loading charity list..." : "-- Select a Charity Project --"}</option>
                                {charities.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({formatAddress(c.address)})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* FEE TYPE */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 flex items-center gap-2 tracking-widest">
                                <ShieldCheck size={14} className="text-[#C1121F]" /> Platform Service Plan
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, feeType: 3 })}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${formData.feeType === 3 ? 'border-[#C1121F] bg-[#C1121F]/5 text-[#C1121F]' : 'border-gray-100 bg-gray-50 text-gray-400 opacity-60'}`}
                                >
                                    <span className="text-sm font-black">3% FEE</span>
                                    <span className="text-[8px] uppercase font-bold">Fund Optimized</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, feeType: 5 })}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${formData.feeType === 5 ? 'border-[#F39C12] bg-[#F39C12]/5 text-[#F39C12]' : 'border-gray-100 bg-gray-50 text-gray-400 opacity-60'}`}
                                >
                                    <span className="text-sm font-black">5% FEE</span>
                                    <span className="text-[8px] uppercase font-bold">High Exposure</span>
                                </button>
                            </div>
                        </div>

                        {/* NAME AND PRICE */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Auction Item Name</label>
                                <input required value={formData.name} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl focus:border-[#C1121F]/30 outline-none font-bold text-sm text-[#1F2937]"
                                    placeholder="e.g., Artwork of Light"
                                    onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Starting Price (SUI)</label>
                                <input required type="number" step="0.1" value={formData.basePrice} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none font-bold text-sm text-[#2ECC71]"
                                    placeholder="0.0"
                                    onChange={e => setFormData({ ...formData, basePrice: e.target.value })} />
                            </div>
                        </div>

                        {/* AI DESCRIPTION */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-end px-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2 tracking-widest">
                                    <AlignLeft size={14} className="text-[#C1121F]" /> Item Story
                                </label>
                                <button type="button" onClick={handleAIGenerate} disabled={isGeneratingAI || !formData.name}
                                    className="flex items-center gap-2 text-[9px] font-black bg-[#C1121F]/10 border border-[#C1121F]/20 py-1.5 px-3 rounded-full transition-all text-[#C1121F] hover:scale-105 active:scale-95 disabled:opacity-50">
                                    {isGeneratingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI WRITE DESCRIPTION
                                </button>
                            </div>
                            <textarea rows="3" value={formData.description} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl focus:border-[#C1121F]/30 outline-none text-sm resize-none transition-all text-[#1F2937] font-medium"
                                placeholder="Let AI help you tell a meaningful story about this item to attract bidders..."
                                onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>

                        {/* DURATION */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 flex items-center gap-2 tracking-widest">
                                <Clock size={14} className="text-[#C1121F]" /> Auction Duration
                            </label>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <input type="number" min="0" value={formData.days}
                                        className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl outline-none font-mono font-black text-center focus:border-[#C1121F]/30 text-[#1F2937]"
                                        onChange={e => setFormData({ ...formData, days: e.target.value })} />
                                    <span className="text-[8px] uppercase text-gray-400 font-black mt-1 block text-center tracking-tighter">Days</span>
                                </div>
                                <div>
                                    <input type="number" min="0" max="23" value={formData.hours}
                                        className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl outline-none font-mono font-black text-center focus:border-[#C1121F]/30 text-[#1F2937]"
                                        onChange={e => setFormData({ ...formData, hours: e.target.value })} />
                                    <span className="text-[8px] uppercase text-gray-400 font-black mt-1 block text-center tracking-tighter">Hours</span>
                                </div>
                                <div>
                                    <input type="number" min="0" max="59" value={formData.minutes}
                                        className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl outline-none font-mono font-black text-center focus:border-[#C1121F]/30 text-[#1F2937]"
                                        onChange={e => setFormData({ ...formData, minutes: e.target.value })} />
                                    <span className="text-[8px] uppercase text-gray-400 font-black mt-1 block text-center tracking-tighter">Minutes</span>
                                </div>
                            </div>
                        </div>

                        {/* SUBMIT BUTTON */}
                        <button type="submit" disabled={isProcessing} className="w-full py-6 bg-[#C1121F] hover:bg-[#a00f1a] disabled:bg-gray-200 rounded-2xl font-black uppercase italic text-sm transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#C1121F]/20 text-white active:scale-[0.98]">
                            {isProcessing ? <Loader2 className="animate-spin" /> : <Zap size={18} />}
                            {isProcessing ? "Processing Data..." : "Activate Auction Now"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}