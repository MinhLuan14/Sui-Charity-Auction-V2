import React, { useState, useMemo } from 'react';
import {
    useCurrentAccount,
    useSignAndExecuteTransaction,
    useSuiClientQuery,
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import {
    Upload, CheckCircle2, Loader2, ShieldCheck, Globe, Info,
    Fingerprint, ExternalLink, Image as ImageIcon, Plus, X,
    FileText, ArrowRight, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PACKAGE_ID, MODULE_NAME } from '../constants';

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

const RegisterCharity = () => {
    // --- LOGIC REMAINS UNCHANGED ---
    const account = useCurrentAccount();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        website: '',
        images: [],
        legalDoc: '',
        feeRate: '3',
    });

    const [isUploading, setIsUploading] = useState({ images: false, legal: false });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [legalFileName, setLegalFileName] = useState("");

    const { data: allCharities, refetch: reloadStatus } = useSuiClientQuery(
        'queryObjects',
        {
            filter: { StructType: `${PACKAGE_ID}::${MODULE_NAME}::Charity` },
            options: { showContent: true }
        },
        { enabled: !!PACKAGE_ID }
    );

    const registration = useMemo(() => {
        if (!allCharities?.data || !account) return null;
        const myObj = allCharities.data.find(obj =>
            obj.data?.content?.fields?.wallet === account.address
        );
        return myObj ? { id: myObj.data.objectId, fields: myObj.data.content.fields } : null;
    }, [allCharities, account]);

    const uploadFileToIPFS = async (file) => {
        const data = new FormData();
        data.append("file", file);
        const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
            method: "POST",
            headers: { Authorization: `Bearer ${PINATA_JWT}` },
            body: data,
        });
        if (!res.ok) throw new Error("Pinata upload failed");
        const resData = await res.json();
        return resData.IpfsHash;
    };

    const handleImagesUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        const validFiles = files.filter(file => {
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`File ${file.name} is too large (>5MB)`);
                return false;
            }
            return true;
        });
        setIsUploading(prev => ({ ...prev, images: true }));
        try {
            const uploadPromises = validFiles.map(file => uploadFileToIPFS(file));
            const hashes = await Promise.all(uploadPromises);
            setFormData(prev => ({ ...prev, images: [...prev.images, ...hashes] }));
            toast.success(`Successfully uploaded ${hashes.length} images`);
        } catch (error) {
            toast.error("IPFS Connection Error");
        } finally {
            setIsUploading(prev => ({ ...prev, images: false }));
        }
    };

    const handleLegalUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(prev => ({ ...prev, legal: true }));
        try {
            const hash = await uploadFileToIPFS(file);
            setFormData(prev => ({ ...prev, legalDoc: hash }));
            setLegalFileName(file.name);
            toast.success("Legal document is ready");
        } catch (error) {
            toast.error("Document upload failed");
        } finally {
            setIsUploading(prev => ({ ...prev, legal: false }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!account) return toast.error("Please connect your wallet!");
        if (formData.images.length === 0) return toast.error("At least 1 activity image is required!");
        if (!formData.legalDoc) return toast.error("Legal documentation is required!");

        setIsSubmitting(true);
        const txb = new Transaction();
        const imagesString = formData.images.join(',');

        try {
            txb.moveCall({
                target: `${PACKAGE_ID}::${MODULE_NAME}::register_charity`,
                arguments: [
                    txb.pure.address(account.address),
                    txb.pure.string(formData.name),
                    txb.pure.string(formData.description),
                    txb.pure.string(formData.website),
                    txb.pure.string(imagesString),
                    txb.pure.u8(formData.feeRate === '3' ? 0 : 1),
                ],
            });

            signAndExecute(
                { transaction: txb },
                {
                    onSuccess: () => {
                        toast.success("Registration submitted to blockchain!");
                        setFormData({ name: '', description: '', website: '', images: [], legalDoc: '', feeRate: '3' });
                        setTimeout(() => reloadStatus(), 2000);
                    },
                    onError: (err) => toast.error(err.message),
                    onSettled: () => setIsSubmitting(false)
                }
            );
        } catch (error) {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#1F2937] pt-32 pb-20 font-sans">
            <div className="max-w-6xl mx-auto px-6">

                {/* --- HEADER --- */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-[#C1121F]/10 text-[#C1121F] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Verification Protocol
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">
                        Register <span className="text-[#C1121F]">Organization</span>
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium max-w-xl">
                        Empowering transparency on the SUI Blockchain. Your application will be reviewed for verification by the community.
                    </p>
                </div>

                {/* --- CURRENT STATUS (If registered) --- */}
                {registration && (
                    <div className="mb-10 bg-white border border-gray-100 p-6 rounded-[30px] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-5">
                            <div className={`p-4 rounded-2xl ${registration.fields.is_verified ? 'bg-green-50' : 'bg-amber-50'}`}>
                                <ShieldCheck className={registration.fields.is_verified ? 'text-green-500' : 'text-amber-500'} size={32} />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Organization Name</h4>
                                <p className="text-xl font-black text-[#1F2937]">{registration.fields.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="text-[11px] text-gray-400">{registration.id.slice(0, 20)}...</code>
                                    <a href={`https://suivision.xyz/object/${registration.id}`} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-[#C1121F] transition-colors">
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className={`px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-tighter border-2 ${registration.fields.is_verified ? 'border-green-500 text-green-500 bg-green-50' : 'border-amber-400 text-amber-500 bg-amber-50 animate-pulse'}`}>
                            {registration.fields.is_verified ? 'Verification Confirmed' : 'Pending Verification Review'}
                        </div>
                    </div>
                )}

                {/* --- MAIN FORM --- */}
                <form onSubmit={handleSubmit} className={`grid grid-cols-1 lg:grid-cols-12 gap-8 ${registration && !registration.fields.is_verified ? 'opacity-40 grayscale pointer-events-none' : ''}`}>

                    {/* LEFT COLUMN: MEDIA & LEGAL */}
                    <div className="lg:col-span-5 space-y-6">

                        {/* Gallery Section */}
                        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-6 flex items-center gap-2 tracking-widest italic">
                                <ImageIcon size={14} className="text-[#C1121F]" /> Activity Gallery ({formData.images.length}/6)
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                                {formData.images.map((hash, index) => (
                                    <div key={index} className="relative aspect-square rounded-3xl overflow-hidden border border-gray-100 group shadow-sm bg-gray-50">
                                        <img
                                            src={`https://gateway.pinata.cloud/ipfs/${hash}`}
                                            className="w-full h-full object-cover"
                                            alt="Activity Preview"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))}
                                            className="absolute top-2 right-2 p-1.5 bg-white text-[#C1121F] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}

                                {formData.images.length < 6 && (
                                    <label className="aspect-square rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-[#C1121F]/30 hover:bg-[#C1121F]/5 transition-all">
                                        {isUploading.images ? <Loader2 className="animate-spin text-[#C1121F]" /> : (
                                            <>
                                                <Plus size={24} className="text-gray-300" />
                                                <span className="text-[9px] font-black uppercase mt-2 text-gray-400">Add Image</span>
                                            </>
                                        )}
                                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleImagesUpload} disabled={isUploading.images} />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Legal Section */}
                        <div className={`bg-white p-8 rounded-[40px] border-2 border-dashed transition-all ${formData.legalDoc ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-6 flex items-center gap-2 tracking-widest italic">
                                <FileText size={14} className="text-[#C1121F]" /> Legal Documentation
                            </label>

                            <label className="flex flex-col items-center justify-center py-6 cursor-pointer group">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-lg ${formData.legalDoc ? 'bg-green-500 text-white' : 'bg-[#C1121F] text-white'}`}>
                                    {isUploading.legal ? <Loader2 className="animate-spin" /> : formData.legalDoc ? <CheckCircle2 size={32} /> : <Upload size={32} />}
                                </div>
                                <div className="text-center">
                                    <span className="block text-xs font-black uppercase tracking-tighter text-[#1F2937]">
                                        {legalFileName || "Upload PDF or Image"}
                                    </span>
                                    <p className="text-[10px] text-gray-400 mt-1 font-medium">Business License or Tax ID Certificate</p>
                                </div>
                                <input type="file" className="hidden" onChange={handleLegalUpload} disabled={isUploading.legal} />
                            </label>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: INFORMATION */}
                    <div className="lg:col-span-7 bg-white p-8 md:p-12 rounded-[50px] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] space-y-8">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 italic tracking-widest">Organization Name</label>
                                <input
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:border-[#C1121F]/30 font-bold text-sm text-[#1F2937] transition-all"
                                    placeholder="e.g. SUI Heart Foundation"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 italic tracking-widest">Website / Official Link</label>
                                <input
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 outline-none focus:border-[#C1121F]/30 font-bold text-sm text-[#1F2937] transition-all"
                                    placeholder="https://charity.org"
                                    value={formData.website}
                                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 italic tracking-widest">Mission Statement</label>
                            <textarea
                                className="w-full bg-gray-50 border border-gray-100 rounded-3xl p-5 outline-none focus:border-[#C1121F]/30 font-medium text-sm text-[#1F2937] h-32 resize-none transition-all"
                                placeholder="Briefly describe your fund's purpose and the beneficiaries you serve..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 italic tracking-widest">Operating Model Selection</label>
                            <div className="grid grid-cols-2 gap-4">
                                {[3, 5].map((rate) => (
                                    <button
                                        key={rate}
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, feeRate: rate.toString() }))}
                                        className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-start gap-1 relative ${formData.feeRate === rate.toString() ? 'border-[#C1121F] bg-[#C1121F]/5 shadow-sm' : 'border-gray-50 bg-gray-50 text-gray-400'}`}
                                    >
                                        <span className={`text-3xl font-black ${formData.feeRate === rate.toString() ? 'text-[#C1121F]' : 'text-gray-300'}`}>{rate}%</span>
                                        <span className="text-[10px] uppercase font-black tracking-tighter">{rate === 3 ? 'Standard Protocol' : 'Verified Plus'}</span>
                                        <p className="text-[9px] font-medium mt-1 opacity-70 leading-tight text-left">
                                            {rate === 3 ? 'For emergency relief and rapid response projects.' : 'For long-term sustainable development orgs.'}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || isUploading.images || isUploading.legal || !!registration}
                            className="w-full bg-[#C1121F] hover:bg-[#a00f1a] disabled:bg-gray-100 disabled:text-gray-400 text-white font-black italic uppercase py-6 rounded-3xl shadow-xl shadow-[#C1121F]/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                            <span>{registration ? "Pending System Processing" : "Submit Registration to Blockchain"}</span>
                            {!isSubmitting && !registration && <ArrowRight size={18} />}
                        </button>

                        <div className="flex items-start gap-2 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                            <AlertCircle size={14} className="text-blue-500 mt-0.5" />
                            <p className="text-[9px] font-bold text-blue-600/70 uppercase leading-normal tracking-tight">
                                Note: All registration data is stored permanently on the SUI Network to ensure maximum transparency.
                            </p>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterCharity;