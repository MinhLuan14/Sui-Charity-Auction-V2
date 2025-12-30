import React, { useMemo, useState, useEffect } from 'react';
import { useSuiClient, useSuiClientQuery, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import {
    ShieldCheck, CheckCircle, Loader2, Search,
    Box, Zap, Image as ImageIcon,
    ExternalLink, RefreshCcw, AlertCircle, TrendingUp, XCircle, Info, Landmark
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PACKAGE_ID, MODULE_NAME, ADMIN_CAP_ID } from '../constants';

// --- UTILS ---
const parseSuiData = (data) => {
    if (!data) return "";
    if (typeof data === 'object' && data.bytes) return new TextDecoder().decode(new Uint8Array(data.bytes));
    if (Array.isArray(data)) return new TextDecoder().decode(new Uint8Array(data));
    return String(data);
};

const getIPFSUrl = (rawInput) => {
    const cleanString = parseSuiData(rawInput).trim();
    if (!cleanString) return "https://placehold.co/600x400/f8f9fa/c1121f?text=No+Image";
    const cid = cleanString.replace('ipfs://', '').split(',')[0];
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
};

export default function AdminDashboard() {
    const suiClient = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();

    const [charityData, setCharityData] = useState([]);
    const [proposals, setProposals] = useState([]);
    const [isFetching, setIsFetching] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');

    const { data: events, refetch: refetchEvents } = useSuiClientQuery('queryEvents', {
        query: { MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::CharityRegistered` },
        order: 'descending',
    });

    const syncBlockchainData = async () => {
        setIsFetching(true);
        try {
            let currentCharities = [];
            if (events?.data) {
                const ids = [...new Set(events.data.map(e => e.parsedJson.charity_id))];
                const objects = await suiClient.multiGetObjects({
                    ids,
                    options: { showContent: true }
                });

                currentCharities = objects
                    .filter(obj => obj.data?.content)
                    .map(obj => {
                        const f = obj.data.content.fields;
                        return {
                            id: obj.data.objectId,
                            name: parseSuiData(f.name),
                            description: parseSuiData(f.description),
                            website: parseSuiData(f.website),
                            logo: f.logo,
                            ai_verified: f.ai_verified,
                            is_verified: f.is_verified,
                            vault: Number(f.vault || 0) / 1e9,
                            impact_level: f.impact_level,
                            wallet: f.wallet
                        };
                    });
                setCharityData(currentCharities);
            }

            const propEvents = await suiClient.queryEvents({
                query: { MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::DisbursementRequestCreated` }
            });

            if (propEvents.data.length > 0) {
                const propIds = propEvents.data.map(e => e.parsedJson.proposal_id);
                const propObjects = await suiClient.multiGetObjects({
                    ids: propIds,
                    options: { showContent: true }
                });

                const formattedProps = propObjects
                    .filter(obj => obj.data?.content)
                    .map(obj => {
                        const f = obj.data.content.fields;
                        const charity = currentCharities.find(c => c.id === f.charity_id);
                        return {
                            id: obj.data.objectId,
                            charityId: f.charity_id,
                            charityName: charity?.name || "Anonymous Org",
                            amount: Number(f.amount) / 1e9,
                            description: parseSuiData(f.description),
                            status: f.status,
                            admin_feedback: parseSuiData(f.admin_feedback)
                        };
                    })
                    .filter(p => p.status === 0);
                setProposals(formattedProps);
            }
        } catch (err) {
            console.error("Sync Error:", err);
            toast.error("Blockchain synchronization failed");
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => { syncBlockchainData(); }, [events]);

    const handleApproveDisbursement = async (prop) => {
        setIsProcessing(true);
        const txb = new Transaction();
        txb.moveCall({
            target: `${PACKAGE_ID}::${MODULE_NAME}::admin_approve_disbursement`,
            arguments: [
                txb.object(ADMIN_CAP_ID),
                txb.object(prop.charityId),
                txb.object(prop.id)
            ],
        });

        signAndExecute({ transaction: txb }, {
            onSuccess: () => {
                toast.success("Disbursement approved! Funds sent to project wallet.");
                syncBlockchainData();
                setIsProcessing(false);
            },
            onError: (err) => { toast.error(err.message); setIsProcessing(false); }
        });
    };

    const handleRejectDisbursement = async (propId) => {
        const reason = window.prompt("Reason for rejection:");
        if (!reason) return;

        setIsProcessing(true);
        const txb = new Transaction();
        txb.moveCall({
            target: `${PACKAGE_ID}::${MODULE_NAME}::admin_reject_disbursement`,
            arguments: [
                txb.object(ADMIN_CAP_ID),
                txb.object(propId),
                txb.pure.string(reason)
            ],
        });

        signAndExecute({ transaction: txb }, {
            onSuccess: () => { toast.success("Request rejected."); syncBlockchainData(); setIsProcessing(false); },
            onError: (err) => { toast.error(err.message); setIsProcessing(false); }
        });
    };

    const runAiAudit = (id) => {
        const txb = new Transaction();
        txb.moveCall({ target: `${PACKAGE_ID}::${MODULE_NAME}::verify_charity_ai`, arguments: [txb.object(ADMIN_CAP_ID), txb.object(id)] });
        signAndExecute({ transaction: txb }, { onSuccess: () => { toast.success("AI Security Audit Complete"); syncBlockchainData(); } });
    };

    const handleFinalVerify = (id) => {
        const txb = new Transaction();
        txb.moveCall({ target: `${PACKAGE_ID}::${MODULE_NAME}::approve_charity_final`, arguments: [txb.object(ADMIN_CAP_ID), txb.object(id)] });
        signAndExecute({ transaction: txb }, { onSuccess: () => { toast.success("Project Activated Successfully"); syncBlockchainData(); } });
    };

    const filteredCharities = useMemo(() =>
        charityData.filter(c => (activeTab === 'pending' ? !c.is_verified : c.is_verified) && c.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [charityData, activeTab, searchTerm]);

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#1F2937] p-8 pt-32 font-sans">
            <div className="max-w-6xl mx-auto">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                    <div>
                        <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">
                            Admin <span className="text-[#C1121F]">Panel</span>
                        </h1>
                        <p className="text-gray-400 text-[10px] font-bold mt-4 uppercase tracking-[0.4em]">Protocol V9 Security & Governance</p>
                    </div>
                    <div className="flex bg-white p-1.5 rounded-[2rem] border border-gray-100 shadow-sm backdrop-blur-xl">
                        {[
                            { id: 'pending', label: 'Review' },
                            { id: 'verified', label: 'Active' },
                            { id: 'disburse', label: 'Vault' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-10 py-4 rounded-[1.5rem] text-[11px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-[#C1121F] text-white shadow-lg shadow-red-100' : 'text-gray-400 hover:text-[#1F2937]'}`}
                            >
                                {tab.id === 'disburse' && proposals.length > 0 && <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                {activeTab === 'disburse' ? (
                    <div className="grid grid-cols-1 gap-8">
                        {proposals.length === 0 ? (
                            <div className="py-40 text-center border-2 border-dashed border-gray-100 rounded-[4rem] bg-white">
                                <Info className="mx-auto text-gray-200 mb-6" size={50} />
                                <p className="text-gray-300 font-black uppercase text-[11px] tracking-widest">No pending disbursement requests</p>
                            </div>
                        ) : (
                            proposals.map(p => (
                                <div key={p.id} className="bg-white border border-gray-100 rounded-[3rem] p-10 flex flex-col md:flex-row gap-10 items-center shadow-sm hover:shadow-xl transition-all">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                                            <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">Withdrawal Request</span>
                                        </div>
                                        <h3 className="text-4xl font-black italic uppercase mb-6 text-[#1F2937]">{p.charityName}</h3>
                                        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-6">
                                            <p className="text-[10px] text-gray-400 uppercase font-black mb-2 italic">Purpose of Funds:</p>
                                            <p className="text-[#1F2937] text-md font-medium leading-relaxed italic">"{p.description}"</p>
                                        </div>
                                        <div className="inline-flex flex-col bg-[#FDF0F1] px-6 py-3 rounded-2xl border border-[#FAD2D4]">
                                            <p className="text-[9px] text-[#C1121F] uppercase font-black tracking-tighter">Requested Amount</p>
                                            <p className="text-2xl font-black text-[#C1121F]">{p.amount} <span className="text-xs">SUI</span></p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-4 w-full md:w-72">
                                        <button
                                            onClick={() => handleApproveDisbursement(p)}
                                            className="w-full bg-[#1F2937] hover:bg-[#C1121F] text-white py-6 rounded-3xl font-black uppercase text-[11px] flex items-center justify-center gap-3 transition-all shadow-lg shadow-gray-200 active:scale-95"
                                        >
                                            <CheckCircle size={18} /> Approve Release
                                        </button>
                                        <button
                                            onClick={() => handleRejectDisbursement(p.id)}
                                            className="w-full bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 py-5 rounded-3xl font-black uppercase text-[11px] flex items-center justify-center gap-3 border border-gray-100 transition-all active:scale-95"
                                        >
                                            <XCircle size={18} /> Reject
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-8">
                        {filteredCharities.map(item => (
                            <div key={item.id} className="bg-white border border-gray-100 rounded-[3.5rem] p-10 flex flex-col lg:flex-row gap-10 relative overflow-hidden group hover:shadow-2xl transition-all">
                                <div className="w-full lg:w-72 h-56 rounded-[2.5rem] overflow-hidden border border-gray-50 shrink-0">
                                    <img src={getIPFSUrl(item.logo)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="charity" />
                                </div>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-4 mb-3">
                                            <h3 className="text-4xl font-black italic uppercase text-[#1F2937]">{item.name}</h3>
                                            <span className="text-[10px] bg-gray-100 px-4 py-1.5 rounded-full text-gray-500 font-bold">Lvl.{item.impact_level}</span>
                                        </div>
                                        <p className="text-gray-400 text-sm line-clamp-2 mb-6 italic leading-relaxed font-medium">{item.description}</p>
                                        <div className="flex flex-wrap gap-4">
                                            <div className="bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100">
                                                <p className="text-[9px] uppercase text-gray-400 font-black mb-0.5">Current Vault</p>
                                                <p className="text-xl font-black text-emerald-500">{item.vault} <span className="text-xs">SUI</span></p>
                                            </div>
                                            <div className="bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100 flex flex-col justify-center">
                                                <p className="text-[9px] uppercase text-gray-400 font-black mb-0.5">Wallet Identifier</p>
                                                <p className="text-[11px] font-mono text-gray-500 truncate w-32">{item.wallet}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-8">
                                        <button onClick={() => runAiAudit(item.id)} disabled={item.ai_verified} className={`py-5 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-3 transition-all ${item.ai_verified ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-[#1F2937] text-white hover:bg-cyan-600 shadow-lg shadow-gray-200'}`}>
                                            <Zap size={16} /> {item.ai_verified ? 'AI Audit Verified' : 'Initiate AI Scan'}
                                        </button>
                                        <button onClick={() => handleFinalVerify(item.id)} disabled={!item.ai_verified || item.is_verified} className={`py-5 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-3 transition-all ${item.is_verified ? 'bg-cyan-50 text-cyan-600 border border-cyan-100' : (!item.ai_verified ? 'bg-gray-50 text-gray-200 cursor-not-allowed' : 'bg-[#C1121F] text-white hover:bg-[#1F2937] shadow-lg shadow-red-100')}`}>
                                            <ShieldCheck size={16} /> {item.is_verified ? 'Project Active' : 'Activate Project'}
                                        </button>
                                    </div>
                                </div>
                                {isProcessing && <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-50"><Loader2 className="animate-spin text-[#C1121F]" size={40} /></div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}