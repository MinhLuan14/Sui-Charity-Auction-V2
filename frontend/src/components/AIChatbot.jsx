import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Draggable from 'react-draggable';

export default function AIChatBot({ onAiGenerate, productContext }) {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Chào bạn! Tôi là Guardian Bot. Bạn cần tôi hỗ trợ chat hay viết mô tả sản phẩm?' },
    ]);

    const messagesEndRef = useRef(null);
    const nodeRef = useRef(null);
    const dragPos = useRef({ x: 0, y: 0 });

    const AI_AVATAR = "https://cdn-icons-png.flaticon.com/512/4712/4712035.png";

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen, isLoading]);

    // --- HÀM XỬ LÝ CHUNG CHO AI ---
    const askAI = async (prompt, type = 'chat') => {
        try {
            // nếu chạy local đổi lệnh const response = await fetch('http://localhost:5000/api/chat', { ... });
            const response = await fetch('https://sui-threehub-charityauction.onrender.com/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: prompt,
                    type: type, // 'chat' hoặc 'generate_description'
                    history: messages.slice(-5)
                }),
            });
            const data = await response.json();
            return data.reply;
        } catch (error) {
            console.error("AI Error:", error);
            return null;
        }
    };

    // Gửi tin nhắn trong khung chat
    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        const reply = await askAI(input, 'chat');

        if (reply) {
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        } else {
            setMessages(prev => [...prev, { role: 'assistant', content: 'The system is under maintenance. Please try again later!' }]);
        }
        setIsLoading(false);
    };

    // Lệnh AI Viết Hộ (Có thể gọi từ bên ngoài thông qua Ref hoặc Props)
    const handleTriggerAiWriter = async () => {
        if (!productContext?.name) return "Item name is required!";

        setIsLoading(true);
        setIsOpen(true); // Mở khung chat để người dùng thấy quá trình

        const prompt = `Write a short, engaging description for the NFT named: ${productContext.name}`;
        setMessages(prev => [...prev, { role: 'user', content: `✨ Please write a description for: ${productContext.name}` }]);

        const aiText = await askAI(prompt, 'generate_description');

        if (aiText) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Done! I’ve filled in the description for you.' }]);
            onAiGenerate(aiText); // Truyền dữ liệu ngược lại cho Form chính
        }
        setIsLoading(false);
    };

    // Tối ưu click
    const onStart = (e, data) => { dragPos.current = { x: data.x, y: data.y }; };
    const onStop = (e, data) => {
        const dist = Math.sqrt(Math.pow(data.x - dragPos.current.x, 2) + Math.pow(data.y - dragPos.current.y, 2));
        if (dist < 5) setIsOpen(true);
    };

    return (
        <>
            {/* NÚT AI VIẾT HỘ TRONG FORM (Dùng để đồng bộ) */}
            {/* Bạn có thể đặt logic gọi handleTriggerAiWriter ở component Cha */}

            <Draggable nodeRef={nodeRef} handle=".drag-handle" bounds="body" onStart={onStart} onStop={onStop}>
                <div ref={nodeRef} className="fixed z-[9999]" style={{ bottom: '100px', right: '30px' }}>

                    <style>{`
                        @keyframes floating { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
                        .ai-pet-active { animation: floating 3s ease-in-out infinite; filter: drop-shadow(0 0 15px rgba(6, 182, 212, 0.6)); transition: all 0.3s; }
                        .ai-pet-active:hover { filter: drop-shadow(0 0 25px rgba(6, 182, 212, 0.9)); transform: scale(1.05); }
                    `}</style>

                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.7, y: 50 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.7, y: 50 }}
                                className="mb-4 w-[350px] h-[520px] bg-[#0b1426]/95 backdrop-blur-2xl border border-cyan-500/30 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
                            >
                                {/* Header */}
                                <div className="drag-handle p-4 bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border-b border-white/10 flex justify-between items-center cursor-move">
                                    <div className="flex items-center gap-2 pointer-events-none">
                                        <img src={AI_AVATAR} className="w-7 h-7" alt="bot" />
                                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest italic">Guardian Core</span>
                                    </div>
                                    <button onClick={() => setIsOpen(false)} className="text-white/30 hover:text-white transition-colors"><X size={18} /></button>
                                </div>

                                {/* Chat Box */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
                                    {messages.map((m, i) => (
                                        <motion.div
                                            initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            key={i}
                                            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[85%] p-4 rounded-2xl text-[12px] leading-relaxed shadow-sm ${m.role === 'user'
                                                ? 'bg-cyan-600 text-white rounded-tr-none'
                                                : 'bg-white/5 text-slate-200 border border-white/10 rounded-tl-none'
                                                }`}>
                                                {m.content}
                                            </div>
                                        </motion.div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex items-center gap-2 text-cyan-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                                            <Loader2 size={12} className="animate-spin" /> The system is processing…
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <div className="p-4 bg-black/20 border-t border-white/5">
                                    <div className="flex items-center gap-2 bg-[#050b18] border border-white/10 rounded-xl p-2 focus-within:border-cyan-500/50 transition-all">
                                        <input
                                            className="flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/20"
                                            placeholder="Gửi yêu cầu..."
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        />
                                        <button
                                            onClick={handleSend}
                                            disabled={isLoading}
                                            className="bg-cyan-500/10 text-cyan-400 p-2 rounded-lg hover:bg-cyan-500 hover:text-white transition-all disabled:opacity-30"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* AI Pet Button */}
                    {!isOpen && (
                        <div className="flex flex-col items-center group">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                whileHover={{ opacity: 1, y: 0 }}
                                className="bg-cyan-500 text-white text-[9px] font-black px-3 py-1.5 rounded-full mb-3 shadow-lg pointer-events-none uppercase tracking-tighter"
                            >
                                The AI assistant is ready!
                            </motion.div>
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="ai-pet-active drag-handle cursor-pointer"
                            >
                                <img src={AI_AVATAR} className="w-20 h-20 md:w-24 md:h-24 object-contain" alt="AI Pet" />
                            </motion.div>
                        </div>
                    )}
                </div>
            </Draggable>
        </>
    );
}