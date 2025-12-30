import React, { useState, useEffect } from 'react';
import { useSuiClient, useSuiClientQuery, useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { ShieldCheck, CheckCircle, Zap, Loader2, RefreshCw, ClipboardList, Send, AlertCircle, Landmark } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PACKAGE_ID, MODULE_NAME, ADMIN_CAP_ID } from '../constants';

export default function CharityManagement() {
    const suiClient = useSuiClient();
    const account = useCurrentAccount();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();

    const [charityList, setCharityList] = useState([]);
    const [pendingProposals, setPendingProposals] = useState([]);
    const [isFetching, setIsFetching] = useState(false);

    // Form State (For Project Owners)
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawReason, setWithdrawReason] = useState('');

    // 1. Fetch Charity List from Events
    const { data: regEvents } = useSuiClientQuery('queryEvents', {
        query: { MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::CharityRegistered` },
        order: 'descending',
    });

    const syncData = async () => {
        if (!regEvents?.data) return;
        setIsFetching(true);
        try {
            const ids = [...new Set(regEvents.data.map(e => e.parsedJson.charity_id))];
            const objects = await suiClient.multiGetObjects({ ids, options: { showContent: true } });
            const formatted = objects
                .filter(obj => obj.data?.content)
                .map(obj => {
                    const f = obj.data.content.fields;
                    return {
                        id: obj.data.objectId,
                        name: f.name,
                        wallet: f.wallet,
                        is_verified: f.is_verified,
                        ai_verified: f.ai_verified,
                        vault: Number(f.vault) || 0,
                    };
                });
            setCharityList(formatted);
        } catch (e) {
            console.error("Sync Error:", e);
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => { syncData(); }, [regEvents]);

    // --- LOGIC 1: OWNER SUBMITS WITHDRAWAL REQUEST ---
    const handleCreateRequest = async (charity) => {
        if (!withdrawAmount || !withdrawReason) return toast.error("Please fill in all fields!");

        const txb = new Transaction();
        const amountInMist = BigInt(Math.floor(parseFloat(withdrawAmount) * 1e9));

        txb.moveCall({
            target: `${PACKAGE_ID}::${MODULE_NAME}::create_disbursement_request`,
            arguments: [
                txb.object(charity.id),
                txb.pure.u64(amountInMist),
                txb.pure.string(withdrawReason)
            ],
        });

        signAndExecute({ transaction: txb }, {
            onSuccess: () => {
                toast.success("Disbursement request submitted to blockchain!");
                setWithdrawAmount('');
                setWithdrawReason('');
            },
            onError: (err) => toast.error("Submission Error: " + err.message)
        });
    };

    // --- LOGIC 2: ADMIN APPROVES DISBURSEMENT ---
    const handleApproveDisbursement = async (proposalId, charityId) => {
        const txb = new Transaction();
        txb.moveCall({
            target: `${PACKAGE_ID}::${MODULE_NAME}::admin_approve_disbursement`,
            arguments: [
                txb.object(ADMIN_CAP_ID),
                txb.object(charityId),
                txb.object(proposalId),
                txb.object('0x6') // clock
            ],
        });

        signAndExecute({ transaction: txb }, {
            onSuccess: () => {
                toast.success("Funds successfully disbursed to organization wallet!");
                syncData();
            },
            onError: (err) => toast.error("Approval Failed: " + err.message)
        });
    };

    // --- LOGIC 3: VERIFICATION (AI/FINAL) ---
    const handleVerify = (targetFunc, charityId) => {
        const txb = new Transaction();
        txb.moveCall({
            target: `${PACKAGE_ID}::${MODULE_NAME}::${targetFunc}`,
            arguments: [txb.object(ADMIN_CAP_ID), txb.object(charityId)],
        });
        signAndExecute({ transaction: txb }, {
            onSuccess: () => {
                toast.success("Status updated successfully!");
                setTimeout(syncData, 1500);
            },
            onError: (err) => toast.error("Update Failed: " + err.message)
        });
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] p-8 pt-32 text-[#1F2937] font-sans">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex justify-between items-end border-b border-gray-200 pb-10">
                    <div>
                        <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none">
                            Vault <span className="text-[#C1121F]">Management</span>
                        </h1>
                        <p className="text-gray-400 mt-4 font-bold uppercase text-[10px] tracking-[0.3em]">Transparent Financial Control System</p>
                    </div>
                    <button
                        onClick={syncData}
                        className="w-14 h-14 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center hover:bg-[#C1121F] hover:text-white transition-all active:scale-95"
                    >
                        <RefreshCw size={24} className={isFetching ? "animate-spin" : ""} />
                    </button>
                </div>

                {/* CHARITY LIST & REQUEST FORMS */}
                <div className="grid gap-8">
                    {charityList.map((c) => {
                        const isOwner = account?.address === c.wallet;
                        return (
                            <div key={c.id} className="bg-white border border-gray-100 rounded-[45px] shadow-sm overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 transition-shadow">
                                <div className="p-10 flex flex-col lg:flex-row gap-10 items-center">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                                                <Landmark size={20} className="text-[#C1121F]" />
                                            </div>
                                            <h3 className="text-3xl font-black uppercase italic text-[#1F2937]">{c.name}</h3>
                                            {c.is_verified && <ShieldCheck className="text-cyan-500" size={24} />}
                                        </div>
                                        <div className="bg-gray-50 inline-flex flex-col p-6 rounded-[2rem] border border-gray-100">
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Available Vault Funds</span>
                                            <span className="text-3xl font-black text-[#1F2937]">{(c.vault / 1e9).toFixed(2)} <span className="text-[#C1121F] text-sm">SUI</span></span>
                                        </div>
                                    </div>

                                    {/* Admin Verification Actions */}
                                    <div className="flex gap-4">
                                        {!c.ai_verified && (
                                            <button onClick={() => handleVerify('verify_charity_ai', c.id)} className="bg-cyan-500 text-white px-8 py-5 rounded-3xl text-xs font-black uppercase flex items-center gap-3 hover:scale-105 transition-transform shadow-lg shadow-cyan-200">
                                                <Zap size={16} /> AI Verification
                                            </button>
                                        )}
                                        {c.ai_verified && !c.is_verified && (
                                            <button onClick={() => handleVerify('approve_charity_final', c.id)} className="bg-[#1F2937] text-white px-8 py-5 rounded-3xl text-xs font-black uppercase flex items-center gap-3 hover:bg-[#C1121F] transition-colors shadow-lg shadow-gray-200">
                                                <CheckCircle size={16} /> Final Approval
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Request Form - Only for Owner */}
                                {isOwner && c.is_verified && (
                                    <div className="bg-gray-50/50 p-10 border-t border-gray-100">
                                        <div className="flex items-center gap-3 mb-6 text-[#C1121F]">
                                            <Send size={18} />
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Submit Disbursement Request</span>
                                        </div>
                                        <div className="grid md:grid-cols-3 gap-6">
                                            <input
                                                type="number" placeholder="Amount (SUI)"
                                                value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
                                                className="bg-white border border-gray-200 p-5 rounded-2xl text-sm outline-none focus:border-[#C1121F] transition-all"
                                            />
                                            <input
                                                type="text" placeholder="Purpose of Withdrawal..."
                                                value={withdrawReason} onChange={(e) => setWithdrawReason(e.target.value)}
                                                className="bg-white border border-gray-200 p-5 rounded-2xl text-sm outline-none focus:border-[#C1121F] transition-all"
                                            />
                                            <button
                                                onClick={() => handleCreateRequest(c)}
                                                className="bg-[#C1121F] text-white font-black uppercase rounded-2xl hover:bg-[#1F2937] transition-all shadow-lg active:scale-95"
                                            >
                                                Submit Proposal
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ADMIN PENDING PROPOSALS SECTION */}
                <div className="pt-16">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-gray-100">
                            <ClipboardList className="text-[#C1121F]" size={24} />
                        </div>
                        <h2 className="text-3xl font-black uppercase italic text-[#1F2937]">Pending Requests</h2>
                    </div>

                    {pendingProposals.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-gray-100 rounded-[50px] p-24 text-center">
                            <AlertCircle className="mx-auto text-gray-200 mb-6" size={56} />
                            <p className="text-gray-300 font-black uppercase italic text-xs tracking-[0.3em]">No pending requests require attention</p>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {/* Proposal mapping would go here */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}