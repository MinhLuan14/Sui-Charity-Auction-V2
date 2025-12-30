import React, { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient, useSuiClientQuery } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import {
    Upload, Zap, ShieldCheck, PieChart,
    Loader2, Clock, AlignLeft, Target, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PACKAGE_ID, MODULE_NAME } from '../constants';

// --- UTILS (Giữ nguyên logic cũ) ---
const parseSuiData = (data) => {
    if (!data) return "";
    if (typeof data === 'object' && data.bytes) return new TextDecoder().decode(new Uint8Array(data.bytes));
    if (Array.isArray(data)) return new TextDecoder().decode(new Uint8Array(data));
    return String(data);
};

const formatAddress = (addr) => addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : "";

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const BACKEND_URL = "http://localhost:5000";

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

    // --- LOGIC FETCH DỰ ÁN (Giữ nguyên) ---
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
                console.error("Lỗi fetch dự án:", err);
            } finally {
                setIsFetchingCharities(false);
            }
        };
        fetchVerifiedCharities();
    }, [events, suiClient]);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://sui-charity-auction-v2.onrender.com';
    // --- LOGIC AI GENERATE (Giữ nguyên) ---
    const handleAIGenerate = async () => {
        if (!formData.name) return toast.error("Hãy nhập tên vật phẩm trước! 💙");
        setIsGeneratingAI(true);
        const toastId = toast.loading("AI đang sáng tạo...");
        try {
            const selectedCharity = charities.find(c => c.id === formData.charityId);
            const response = await fetch(`${BACKEND_URL}/api/generate-description`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    itemName: formData.name,
                    cause: selectedCharity ? selectedCharity.name : "Gây quỹ thiện nguyện",
                    donorName: account?.address ? formatAddress(account.address) : "Mạnh thường quân"
                })
            });
            const data = await response.json();
            if (data.description) {
                setFormData(prev => ({ ...prev, description: data.description }));
                toast.success("Mô tả AI đã sẵn sàng! ❤️", { id: toastId });
            }
        } catch (error) {
            toast.error("AI đang bận, thử lại sau nhé 💙", { id: toastId });
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // --- LOGIC BLOCKCHAIN (Giữ nguyên) ---
    const handleLaunchEngine = async (e) => {
        e.preventDefault();
        if (!account) return toast.error("Vui lòng kết nối ví Sui!");
        if (!selectedFile) return toast.error("Vui lòng tải lên hình ảnh!");
        if (!formData.charityId) return toast.error("Vui lòng chọn dự án!");

        setIsProcessing(true);
        const toastId = toast.loading("Bắt đầu khởi tạo...");

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
                        toast.success("Kích hoạt đấu giá thành công! 🚀", { id: toastId });
                        setIsProcessing(false);
                    },
                    onError: (err) => {
                        toast.error(`Giao dịch thất bại: ${err.message}`, { id: toastId });
                        setIsProcessing(false);
                    }
                }
            );
        } catch (error) {
            toast.error("Lỗi hệ thống: " + error.message, { id: toastId });
            setIsProcessing(false);
        }
    };

    return (
        // ĐỔI MÀU NỀN SANG SÁNG (Giống Explore)
        <div className="min-h-screen bg-[#F8F9FA] text-[#1F2937] pt-32 pb-20 font-sans">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* CỘT TRÁI: PREVIEW & INFO */}
                <div className="lg:col-span-5 space-y-6">
                    {/* ĐỔI STYLE CARD PREVIEW */}
                    <div className="relative group aspect-square bg-white rounded-[40px] border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden transition-all hover:border-[#C1121F]/50 shadow-sm">
                        {preview ? (
                            <img src={preview} className="w-full h-full object-cover p-4 rounded-[40px]" alt="NFT Preview" />
                        ) : (
                            <div className="text-center p-10">
                                <Upload className="mx-auto mb-4 text-[#C1121F] opacity-40 animate-pulse" size={40} />
                                <p className="text-[10px] font-black uppercase text-gray-400">Tải lên hình ảnh vật phẩm</p>
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) { setSelectedFile(file); setPreview(URL.createObjectURL(file)); }
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* ĐỔI STYLE CARD INFO */}
                    <div className="bg-white border border-gray-100 p-6 rounded-[30px] shadow-sm">
                        <h4 className="text-[10px] font-black uppercase text-[#C1121F] mb-4 flex items-center gap-2">
                            <PieChart size={14} /> Phân bổ tài chính & Phí
                        </h4>
                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-bold">Giá sàn khởi điểm</span>
                                <span className="text-[#2ECC71] font-mono font-black">{formData.basePrice || 0} SUI</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-50 pt-2">
                                <span className="text-gray-500 font-bold">Phí nền tảng duy trì</span>
                                <span className="text-[#C1121F] font-black">-{formData.feeType}% khi hoàn tất</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: FORM ĐĂNG KÝ */}
                <div className="lg:col-span-7">
                    {/* ĐỔI STYLE FORM CONTAINER */}
                    <form onSubmit={handleLaunchEngine} className="bg-white border border-gray-100 p-8 md:p-10 rounded-[50px] space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.02)]">

                        {/* CHỌN DỰ ÁN */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 flex items-center gap-2">
                                <Target size={14} className="text-[#C1121F]" /> Dự án thụ hưởng quỹ
                            </label>
                            <select
                                required
                                value={formData.charityId}
                                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl focus:border-[#C1121F]/30 outline-none font-bold text-sm transition-all text-[#1F2937]"
                                onChange={e => setFormData({ ...formData, charityId: e.target.value })}
                            >
                                <option value="">{isFetchingCharities ? "Đang tải danh sách..." : "-- Chọn dự án thiện nguyện --"}</option>
                                {charities.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({formatAddress(c.address)})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* LOẠI PHÍ */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 flex items-center gap-2">
                                <ShieldCheck size={14} className="text-[#C1121F]" /> Gói dịch vụ nền tảng
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, feeType: 3 })}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${formData.feeType === 3 ? 'border-[#C1121F] bg-[#C1121F]/5 text-[#C1121F]' : 'border-gray-100 bg-gray-50 text-gray-400 opacity-60'}`}
                                >
                                    <span className="text-sm font-black">3% PHÍ</span>
                                    <span className="text-[8px] uppercase font-bold">Ưu tiên quỹ</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, feeType: 5 })}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${formData.feeType === 5 ? 'border-[#F39C12] bg-[#F39C12]/5 text-[#F39C12]' : 'border-gray-100 bg-gray-50 text-gray-400 opacity-60'}`}
                                >
                                    <span className="text-sm font-black">5% PHÍ</span>
                                    <span className="text-[8px] uppercase font-bold">Quảng bá mạnh</span>
                                </button>
                            </div>
                        </div>

                        {/* TÊN VÀ GIÁ */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Tên vật phẩm đấu giá</label>
                                <input required value={formData.name} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl focus:border-[#C1121F]/30 outline-none font-bold text-sm text-[#1F2937]"
                                    placeholder="Ví dụ: Tác phẩm Ánh Sáng"
                                    onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Giá sàn khởi điểm (SUI)</label>
                                <input required type="number" step="0.1" value={formData.basePrice} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl outline-none font-bold text-sm text-[#2ECC71]"
                                    placeholder="0.0"
                                    onChange={e => setFormData({ ...formData, basePrice: e.target.value })} />
                            </div>
                        </div>

                        {/* MÔ TẢ AI */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-end px-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
                                    <AlignLeft size={14} className="text-[#C1121F]" /> Câu chuyện vật phẩm
                                </label>
                                <button type="button" onClick={handleAIGenerate} disabled={isGeneratingAI || !formData.name}
                                    className="flex items-center gap-2 text-[9px] font-black bg-[#C1121F]/10 border border-[#C1121F]/20 py-1.5 px-3 rounded-full transition-all text-[#C1121F] hover:scale-105">
                                    {isGeneratingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI VIẾT MÔ TẢ
                                </button>
                            </div>
                            <textarea rows="3" value={formData.description} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl focus:border-[#C1121F]/30 outline-none text-sm resize-none transition-all text-[#1F2937] font-medium"
                                placeholder="Hãy để AI giúp bạn kể câu chuyện ý nghĩa về vật phẩm này..."
                                onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>

                        {/* THỜI GIAN */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 flex items-center gap-2">
                                <Clock size={14} className="text-[#C1121F]" /> Thời hạn đấu giá kết thúc
                            </label>
                            <div className="grid grid-cols-3 gap-4">
                                {['days', 'hours', 'minutes'].map((unit) => (
                                    <div key={unit}>
                                        <input type="number" min="0" value={formData[unit]}
                                            className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl outline-none font-mono font-black text-center focus:border-[#C1121F]/30 text-[#1F2937]"
                                            onChange={e => setFormData({ ...formData, [unit]: e.target.value })} />
                                        <span className="text-[8px] uppercase text-gray-400 font-black mt-1 block text-center">{unit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* NÚT SUBMIT - ĐỔI SANG MÀU ĐỎ THƯƠNG HIỆU */}
                        <button type="submit" disabled={isProcessing} className="w-full py-6 bg-[#C1121F] hover:bg-[#a00f1a] disabled:bg-gray-200 rounded-2xl font-black uppercase italic text-sm transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#C1121F]/20 text-white">
                            {isProcessing ? <Loader2 className="animate-spin" /> : <Zap size={18} />}
                            {isProcessing ? "Đang xử lý dữ liệu..." : "Kích hoạt Đấu giá ngay"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}