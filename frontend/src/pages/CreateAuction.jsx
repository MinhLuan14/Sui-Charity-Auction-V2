import React, { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, Zap, Clock, Tag, FileText,
    Loader2, X, ChevronRight, AlertCircle, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Giữ nguyên JWT và Package ID
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI5NjRiZDE0OS1mNTQ4LTRiYzAtODZjOS1kNzJlZjljMTZjZTYiLCJlbWFpbCI6Imx1YW4xNDEwMjAwNWluQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiIzODg3MTBkZDcxNTY2ZTRlYzhjMiIsInNjb3BlZEtleVNlY3JldCI6IjE5NTAxMGQ0ZGY5ODY2YjIwMmFlOGExMjFmMDVlNTQ3ZGI3MjA1Mjk4NDVkMjFhMTEwYTFlZjA5MDAwMGE3MDQiLCJleHAiOjE3OTc4NzMyOTB9.J6n9nFxVE1Om2j9F4AVaoglkxL-cVT4cRr90gj0vIag";
const PACKAGE_ID = "0x5e4414f266147c07b0b15ded6239606c78333628b4fe251b1dbaa7600c637675";

const SuiIcon = () => (
    <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100C77.6142 100 100 77.6142 100 50C100 22.3858 77.6142 0 50 0Z" fill="#38BDF8" fillOpacity="0.2" />
        <path d="M49.9 15.1C30.7 15.1 15.1 30.7 15.1 49.9C15.1 69.1 30.7 84.7 49.9 84.7C69.1 84.7 84.7 69.1 84.7 49.9C84.7 30.7 69.1 15.1 49.9 15.1ZM65.8 54.1L51.9 68C50.8 69.1 49 69.1 47.9 68L34 54.1C32.9 53 32.9 51.2 34 50.1C35.1 49 36.9 49 38 50.1L46.5 58.6V34C46.5 32.5 47.7 31.3 49.2 31.3C50.7 31.3 51.9 32.5 51.9 34V58.6L60.4 50.1C61.5 49 63.3 49 64.4 50.1C66.9 51.2 66.9 53 65.8 54.1Z" fill="#38BDF8" />
    </svg>
);

export default function CreateAuction() {
    const account = useCurrentAccount();
    const client = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const navigate = useNavigate();
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startPrice: '',
        hours: '24',
        minutes: '0'
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };/*
    const handleAiGenerate = async () => {
        // Kiểm tra nếu chưa nhập tên thì không gọi AI
        if (!formData.name) {
            return toast.error("Vui lòng nhập tên vật phẩm để AI có dữ liệu viết bài!");
        }

        setIsAiLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/generate-description', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    itemName: formData.name,
                    story: "Vật phẩm này được đóng góp để ủng hộ quỹ thiện nguyện mổ tim cho trẻ em.",
                    cause: "Gây quỹ phẫu thuật tim",
                    donorName: account?.address ? `Nhà hảo tâm (${account.address.slice(0, 6)}...)` : "Một nhà hảo tâm ẩn danh"
                })
            });

            if (!response.ok) throw new Error("Server AI không phản hồi");

            const data = await response.json();

            // Cập nhật mô tả vào form
            if (data.description) {
                setFormData(prev => ({ ...prev, description: data.description }));
                toast.success("AI đã soạn xong mô tả nhân văn cho bạn! 💙");
            }
        } catch (err) {
            console.error("AI Error:", err);
            toast.error("Không thể kết nối với server AI. Hãy chắc chắn bạn đã chạy Backend!");
        } finally {
            setIsAiLoading(false);
        }
    }; Chạy local*/
    const handleAiGenerate = async () => {
        // Kiểm tra nếu chưa nhập tên thì không gọi AI
        if (!formData.name) {
            return toast.error("Vui lòng nhập tên vật phẩm để AI có dữ liệu viết bài!");
        }

        setIsAiLoading(true);

        // TỰ ĐỘNG NHẬN DIỆN ĐỊA CHỈ BACKEND
        // Nếu bạn đang mở web ở localhost thì dùng cổng 5000, 
        // nếu đã đưa lên web thì dùng link Render.
        const API_BASE_URL = window.location.hostname === 'localhost'
            ? 'http://localhost:5000'
            : 'https://sui-threehub-charityauction.onrender.com';

        try {
            // Sử dụng API_BASE_URL đã định nghĩa ở trên
            const response = await fetch(`${API_BASE_URL}/api/generate-description`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    itemName: formData.name,
                    story: formData.description || "Vật phẩm này được đóng góp để ủng hộ quỹ thiện nguyện mổ tim cho trẻ em.",
                    cause: "Gây quỹ phẫu thuật tim",
                    donorName: account?.address ? `Nhà hảo tâm (${account.address.slice(0, 6)}...)` : "Một nhà hảo tâm ẩn danh"
                })
            });

            if (!response.ok) throw new Error("Server AI không phản hồi");

            const data = await response.json();

            // Cập nhật mô tả vào form
            if (data.description) {
                setFormData(prev => ({ ...prev, description: data.description }));
                toast.success("AI đã soạn xong mô tả nhân văn cho bạn! 💙");
            }
        } catch (err) {
            console.error("AI Error:", err);
            // Cập nhật câu thông báo lỗi cho chuyên nghiệp hơn
            toast.error("AI đang bận hoặc server chưa khởi động xong. Vui lòng thử lại sau 30 giây! 💙");
        } finally {
            setIsAiLoading(false);
        }
    };
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const uploadToIPFS = async (file) => {
        const data = new FormData();
        data.append('file', file);

        const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
            method: "POST",
            headers: {
                'Authorization': `Bearer ${PINATA_JWT.trim()}`
            },
            body: data
        });

        if (!response.ok) {
            const errorDetail = await response.json();
            throw new Error(`Pinata error: ${JSON.stringify(errorDetail)}`);
        }

        const res = await response.json();
        return res.IpfsHash;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!account) return toast.error("Vui lòng kết nối ví!");
        if (!selectedFile) return toast.error("Vui lòng tải lên hình ảnh!");

        // KÍCH HOẠT OVERLAY GIỮA MÀN HÌNH
        setIsProcessing(true);

        try {
            const cid = await uploadToIPFS(selectedFile);

            const finalNameOnChain = `${formData.name.trim()} | ${formData.description.trim()}`;
            const priceInMist = BigInt(Math.floor(parseFloat(formData.startPrice) * 1_000_000_000));
            const totalMs = (parseInt(formData.hours || 0) * 3600 + parseInt(formData.minutes || 0) * 60) * 1000;
            const durationInMs = BigInt(totalMs);

            const txb = new Transaction();
            txb.moveCall({
                target: `${PACKAGE_ID}::charity_auction::mint_and_auction`,
                arguments: [
                    txb.pure.string(finalNameOnChain),
                    txb.pure.string(cid),
                    txb.pure.u64(priceInMist),
                    txb.pure.u64(durationInMs),
                    txb.object('0x6'),
                ],
            });

            signAndExecute({ transaction: txb }, {
                onSuccess: async (result) => {
                    await client.waitForTransaction({ digest: result.digest });
                    setIsProcessing(false); // TẮT OVERLAY
                    toast.success("ĐÃ ĐƯA TRANH LÊN SÀN THÀNH CÔNG!");
                    navigate('/');
                },
                onError: (err) => {
                    setIsProcessing(false); // TẮT OVERLAY ĐỂ HIỆN LỖI
                    toast.error(`Giao dịch thất bại: ${err.message}`);
                }
            });
        } catch (err) {
            setIsProcessing(false); // TẮT OVERLAY
            toast.error(err.message);
        }
    };

    return (
        <div className="pt-20 md:pt-32 pb-10 md:pb-20 min-h-screen text-white relative overflow-hidden">

            {/* --- LOADING MODAL (Đã tối ưu width cho Mobile) --- */}
            <AnimatePresence>
                {isProcessing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md px-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="bg-[#0A1120] border border-blue-500/30 p-8 md:p-10 rounded-[30px] md:rounded-[40px] shadow-2xl flex flex-col items-center max-w-sm w-full"
                        >
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse" />
                                <Loader2 className="animate-spin text-blue-500 relative z-10" size={40} />
                            </div>
                            <h3 className="text-lg md:text-xl font-black italic uppercase tracking-tighter mb-2 text-center">
                                Processing… <span className="text-blue-500">Data</span>
                            </h3>
                            <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] text-center leading-relaxed">
                                The system is uploading the artwork to IPFS<br /> & Authenticating on the Sui Blockchain…
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Background Glows */}
            <div className="fixed top-[-10%] left-[-10%] w-[60%] md:w-[40%] h-[40%] bg-blue-600/10 blur-[80px] md:blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
                {/* HEADER - Responsive Text Size */}
                <header className="text-center mb-10 md:mb-16 space-y-4">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl sm:text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40"
                    >
                        CREATE <span className="text-blue-500">IMPACT</span>
                    </motion.h1>
                    <div className="flex items-center justify-center gap-2 md:gap-3">
                        <div className="h-px w-8 md:w-12 bg-blue-500/50" />
                        <p className="text-blue-400 font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-[8px] md:text-[10px]">Mint NFT & Launch Charity Auction</p>
                        <div className="h-px w-8 md:w-12 bg-blue-500/50" />
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

                    {/* LEFT: MEDIA UPLOAD AREA */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:col-span-5 w-full h-full">
                        <div className="relative group h-full">
                            {/* Lớp nền phát sáng khi hover */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-[40px] md:rounded-[50px] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>

                            {/* Khung chứa chính */}
                            <div className="relative bg-[#050B18] border border-white/10 rounded-[35px] md:rounded-[45px] p-2 md:p-3 min-h-[550px] md:min-h-[650px] flex flex-col items-center justify-center overflow-hidden shadow-2xl">

                                {/* Nội dung bên trong khung */}
                                <div className="w-full h-full border-2 border-dashed border-white/5 rounded-[30px] md:rounded-[40px] flex items-center justify-center relative bg-[#0A1120]/50">

                                    <AnimatePresence mode='wait'>
                                        {preview ? (
                                            <motion.div
                                                key="preview"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="relative w-full h-full p-2 flex items-center justify-center"
                                            >
                                                {/* Ảnh chính với bo góc và shadow nội bộ */}
                                                <img
                                                    src={preview}
                                                    className="max-w-full max-h-[580px] md:max-h-[600px] object-contain rounded-[25px] md:rounded-[35px] shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10"
                                                    alt="Preview"
                                                />

                                                {/* Nút xóa ảnh tối ưu lại */}
                                                <motion.button
                                                    whileHover={{ scale: 1.1, backgroundColor: '#ef4444' }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => { setPreview(null); setSelectedFile(null); }}
                                                    className="absolute top-6 right-6 p-3 bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl text-white shadow-xl transition-colors z-30"
                                                >
                                                    <X size={20} />
                                                </motion.button>

                                                {/* Overlay thông tin nhẹ khi có ảnh */}
                                                <div className="absolute bottom-6 left-6 right-6 pointer-events-none">
                                                    <div className="bg-black/20 backdrop-blur-sm border border-white/5 rounded-2xl px-4 py-2 inline-flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Ready to Mint</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="upload"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-center p-8 space-y-6 flex flex-col items-center justify-center w-full"
                                            >
                                                {/* Icon Upload với hiệu ứng tầng lớp */}
                                                <div className="relative group/icon">
                                                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full group-hover/icon:bg-blue-500/40 transition-all duration-500" />
                                                    <div className="w-20 h-20 md:w-28 md:h-28 bg-gradient-to-b from-blue-500/10 to-transparent border border-blue-500/20 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center relative z-10 transition-transform duration-500 group-hover/icon:-translate-y-2">
                                                        <Upload className="text-blue-500" size={40} />
                                                    </div>
                                                </div>

                                                <div className="space-y-3 relative z-10">
                                                    <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">
                                                        Consign <span className="text-blue-500 text-glow">Art Work</span>
                                                    </h3>
                                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] max-w-[200px] mx-auto leading-relaxed">
                                                        Supports High-Quality Image Formats
                                                    </p>
                                                </div>

                                                <div className="relative z-10 px-6 py-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                                                    <span className="text-[10px] font-black uppercase italic tracking-widest">Choose File</span>
                                                </div>

                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                                    onChange={handleImageChange}
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* RIGHT: FORM DATA AREA */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-7">
                        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[35px] md:rounded-[50px] p-6 md:p-12 space-y-6 md:space-y-10">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Tên vật phẩm */}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <Tag size={12} /> Asset Name
                                    </label>
                                    <input required name="name" placeholder="EXAMPLE: DA LAT NIGHT SKY... " className="w-full bg-black/40 px-5 py-4 rounded-[18px] md:rounded-[22px] border border-white/5 outline-none focus:border-blue-500/50 transition-all font-black uppercase text-[10px] md:text-xs" onChange={handleInputChange} />
                                </div>

                                {/* Giá khởi điểm */}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <SuiIcon /> PRICE (SUI)
                                    </label>

                                    <input required name="startPrice" type="number" step="0.1" placeholder="0.00" className="w-full bg-black/40 px-5 py-4 rounded-[18px] md:rounded-[22px] border border-white/5 outline-none focus:border-blue-500/50 transition-all font-black text-sm text-blue-400" onChange={handleInputChange} />
                                </div>
                            </div>

                            {/* Miêu tả */}
                            <div className="space-y-3">
                                {/* Hàng tiêu đề: Nhãn bên trái, Nút bên phải */}
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <FileText size={12} /> Detailed Description
                                    </label>

                                    <motion.button
                                        type="button"
                                        onClick={handleAiGenerate}
                                        disabled={isAiLoading || !formData.name}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-[8px] font-black text-blue-400 hover:bg-blue-500 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-tighter"
                                    >
                                        {isAiLoading ? (
                                            <Loader2 className="animate-spin" size={10} />
                                        ) : (
                                            <Sparkles size={10} />
                                        )}
                                        {isAiLoading ? "Đang soạn..." : "✨ AI Writing"}
                                    </motion.button>
                                </div>

                                {/* Ô nhập liệu bên dưới */}
                                <textarea
                                    required
                                    name="description"
                                    value={formData.description} // Đừng quên thêm value để AI điền chữ vào được
                                    placeholder="SHARE YOUR STORY... "
                                    rows="3"
                                    className="w-full bg-black/40 p-5 rounded-[22px] md:rounded-[30px] border border-white/5 outline-none focus:border-blue-500/50 transition-all text-[10px] md:text-xs font-bold uppercase leading-relaxed"
                                    onChange={handleInputChange}
                                />
                            </div>
                            {/* Thời gian */}
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <Clock size={12} /> End Date
                                </label>
                                <div className="grid grid-cols-2 gap-3 md:gap-4">
                                    <div className="flex items-center bg-black/40 rounded-[18px] border border-white/5 pr-4 focus-within:border-blue-500/50">
                                        <input required name="hours" type="number" className="w-full bg-transparent px-5 py-4 outline-none font-black text-xs" placeholder="HOURS" onChange={handleInputChange} />
                                        <span className="text-[9px] font-black text-slate-600">H</span>
                                    </div>
                                    <div className="flex items-center bg-black/40 rounded-[18px] border border-white/5 pr-4 focus-within:border-blue-500/50">
                                        <input required name="minutes" type="number" className="w-full bg-transparent px-5 py-4 outline-none font-black text-xs" placeholder="MINUTES" onChange={handleInputChange} />
                                        <span className="text-[9px] font-black text-slate-600">M</span>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    disabled={isProcessing}
                                    className={`w-full py-5 md:py-7 rounded-[25px] md:rounded-[35px] font-black uppercase italic tracking-[0.1em] md:tracking-[0.2em] text-sm md:text-lg transition-all flex items-center justify-center gap-3 ${isProcessing
                                        ? 'bg-slate-800 text-slate-500'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20'
                                        }`}
                                >
                                    {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                                    {isProcessing ? "PROCESSING… " : "START AUCTION"}
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}