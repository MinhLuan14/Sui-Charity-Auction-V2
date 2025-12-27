import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Activity } from 'lucide-react';

export default function AuctionCard({ nft }) {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="glass-card p-5 rounded-5xl border border-white/5 hover:border-sui-cyan/40 transition-all duration-500 group relative overflow-hidden"
    >
      {/* Background Glow Effect khi hover */}
      <div className="absolute inset-0 bg-linear-to-br from-sui-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* IMAGE SECTION */}
      <div className="relative overflow-hidden rounded-4xl mb-6 bg-black aspect-square">
        <img
          src={nft.image}
          alt={nft.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          onError={(e) => {
            if (e.target.dataset.errorTriggered) return;
            e.target.dataset.errorTriggered = "true";

            if (nft.image && !nft.image.includes('cloudflare-ipfs.com')) {
              const cid = nft.image.replace(/\/$/, "").split('/').pop();
              e.target.src = `https://cloudflare-ipfs.com/ipfs/${cid}`;
            } else {
              e.target.src = "https://placehold.jp/24/0a1120/ffffff/400x400.png?text=Lỗi+Ảnh";
            }
          }}
        />

        {/* Badge Live */}
        <div className="absolute top-4 right-4 bg-sui-dark/80 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[8px] font-black text-sui-cyan uppercase tracking-widest italic flex items-center gap-1.5">
          <Activity size={10} className="animate-pulse" />
          Live
        </div>
      </div>

      {/* INFO SECTION */}
      <div className="px-2 relative z-10">
        <h3 className="text-xl font-black italic text-white uppercase mb-1 truncate group-hover:text-sui-cyan transition-colors">
          {nft.name}
        </h3>
        <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-5">
          {nft.category || "Charity Collection"}
        </p>

        <div className="flex justify-between items-center bg-white/5 rounded-3xl p-4 border border-white/5 group-hover:bg-sui-cyan/10 transition-all">
          <div>
            <p className="text-[8px] text-white/40 font-black uppercase tracking-widest mb-1">Current Price</p>
            <p className="text-xl font-black text-sui-cyan italic tracking-tighter">
              {nft.price} <span className="text-[10px] text-white/40">SUI</span>
            </p>
          </div>

          <Link
            to={`/item/${nft.id}`}
            className="w-12 h-12 bg-sui-cyan rounded-2xl text-sui-dark flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,209,255,0.3)]"
          >
            <Zap size={20} fill="currentColor" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}