import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { LayoutGrid, User, Upload, Activity, Bell, TrendingUp, TrendingDown, Wallet, Menu, X, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PACKAGE_ID = "0x5e4414f266147c07b0b15ded6239606c78333628b4fe251b1dbaa7600c637675";

export default function Header({ scrolled }) {
  const account = useCurrentAccount();
  const location = useLocation();
  const client = useSuiClient();

  const [showNotifs, setShowNotifs] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [balance, setBalance] = useState("0.00");
  const [lastEventId, setLastEventId] = useState(null);
  const prevBalanceRef = useRef(null);

  // 1. Khởi tạo notifications từ localStorage để không bị mất khi F5
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('sui_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  // Tự động lưu vào localStorage mỗi khi notifications thay đổi
  useEffect(() => {
    localStorage.setItem('sui_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const navLinks = [
    { path: '/', label: 'HOME', icon: <Home size={14} /> },
    { path: '/explore', label: 'AUCTION', icon: <LayoutGrid size={14} /> },
    { path: '/create', label: 'SELL', icon: <Upload size={14} /> },
    { path: '/profile', label: 'PROFILE', icon: <User size={14} /> },
  ];

  // 2. Logic theo dõi số dư
  const checkBalanceChange = useCallback(async () => {
    if (!account?.address) return;
    try {
      const coinBalance = await client.getBalance({ owner: account.address, coinType: '0x2::sui::SUI' });
      const currentBalanceRaw = Number(coinBalance.totalBalance) / 1e9;

      if (prevBalanceRef.current !== null) {
        const diff = currentBalanceRaw - prevBalanceRef.current;
        // Nếu biến động > 0.0001 SUI
        if (Math.abs(diff) > 0.0001) {
          const isIncrease = diff > 0;
          const newNotif = {
            id: `bal-${Date.now()}`,
            amount: Math.abs(diff).toFixed(4),
            isUp: isIncrease,
            title: isIncrease ? "Wallet Credited" : "Wallet Debited",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isNew: true
          };
          setNotifications(prev => [newNotif, ...prev].slice(0, 15));
        }
      }

      setBalance(currentBalanceRaw.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      prevBalanceRef.current = currentBalanceRaw;
    } catch (err) { console.error("Error updating balance:", err); }
  }, [client, account?.address]);

  // 3. Logic theo dõi sự kiện đấu giá
  const fetchAuctionEvents = useCallback(async () => {
    if (!account?.address) return;
    try {
      const events = await client.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::charity_auction::BidPlaced` },
        limit: 5,
        order: 'descending',
      });

      if (events.data?.length > 0) {
        const latestEvent = events.data[0];
        if (latestEvent.id.txDigest !== lastEventId) {
          const bidData = latestEvent.parsedJson;
          const isMyBid = bidData.bidder === account.address;
          const isMyPrevBid = bidData.previous_bidder === account.address;

          if (isMyBid || isMyPrevBid) {
            const auctionNotif = {
              id: latestEvent.id.txDigest,
              amount: (Number(bidData.bid_amount || 0) / 1e9).toFixed(2),
              isUp: isMyBid,
              title: isMyBid ? "BID PLACED SUCCESSFULLY" : "YOU HAVE BEEN OUTBID",
              time: new Date(Number(latestEvent.timestampMs)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isNew: true
            };
            setNotifications(prev => [auctionNotif, ...prev.filter(n => n.id !== auctionNotif.id)].slice(0, 15));
          }
          setLastEventId(latestEvent.id.txDigest);
        }
      }
    } catch (err) { console.error("Event processing error:", err); }
  }, [client, account?.address, lastEventId]);

  useEffect(() => {
    if (account?.address) {
      checkBalanceChange();
      fetchAuctionEvents();
      const timer = setInterval(() => {
        checkBalanceChange();
        fetchAuctionEvents();
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [account?.address, checkBalanceChange, fetchAuctionEvents]);

  return (
    <nav className={`fixed top-0 w-full z-[9999] transition-all duration-300 ${scrolled ? 'bg-[#050B18]/90 backdrop-blur-xl border-b border-white/5 py-3' : 'bg-transparent py-5'
      }`}>

      {/* --- NÂNG CẤP: CÁC NÉT CHẠY NGANG (FLOWING LINES) --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        {[
          { top: '10%', duration: 3, delay: 0, opacity: 0.2 },
          { top: '50%', duration: 5, delay: 1, opacity: 0.1 },
          { top: '85%', duration: 4, delay: 2, opacity: 0.15 },
        ].map((line, i) => (
          <motion.div
            key={i}
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{
              duration: line.duration,
              repeat: Infinity,
              ease: "linear",
              delay: line.delay
            }}
            className="absolute h-[1px] w-[40%] bg-gradient-to-r from-transparent via-[#00D1FF] to-transparent"
            style={{ top: line.top, opacity: line.opacity }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center relative z-10">

        {/* LOGO */}
        <Link to="/" className="flex flex-col relative group">
          <span className="text-xl md:text-2xl font-black italic tracking-tighter text-white">
            SUI<span className="text-[#00D1FF] drop-shadow-[0_0_10px_#00D1FF] transition-all group-hover:drop-shadow-[0_0_20px_#00D1FF]">CHARITY</span>
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-bold text-white/30 tracking-[0.3em] uppercase">Impact Protocol</span>
            {/* Nét gạch nhỏ chạy dưới chữ Impact Protocol */}
            <motion.div
              animate={{ width: ['0%', '100%', '0%'], left: ['0%', '0%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="h-[1px] bg-[#00D1FF]/50 absolute -bottom-1 w-full"
            />
          </div>
        </Link>

        {/* DESKTOP NAV */}
        <div className="hidden lg:flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl">
          {navLinks.map((link) => (
            <Link key={link.path} to={link.path} className={`relative px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-colors rounded-xl flex items-center gap-2 ${location.pathname === link.path ? 'text-white' : 'text-white/50 hover:text-white'
              }`}>
              {location.pathname === link.path && (
                <motion.div layoutId="active-nav" className="absolute inset-0 bg-[#00D1FF]/10 border border-[#00D1FF]/30 rounded-xl" />
              )}
              <span className="relative z-10 flex items-center gap-2">{link.icon} {link.label}</span>
            </Link>
          ))}
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-3">
          {account && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#00D1FF]/5 rounded-xl border border-[#00D1FF]/20">
                <Wallet size={14} className="text-[#00D1FF]" />
                <span className="text-xs font-black text-white">{balance} SUI</span>
              </div>

              <div className="relative">
                <button
                  onClick={() => { setShowNotifs(!showNotifs); setNotifications(prev => prev.map(n => ({ ...n, isNew: false }))); }}
                  className={`p-2.5 rounded-xl border transition-all relative ${showNotifs ? 'bg-[#00D1FF]/20 border-[#00D1FF]/50 text-white' : 'bg-white/5 border-white/10 text-white/70'
                    }`}
                >
                  <Bell size={20} />
                  {notifications.some(n => n.isNew) && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-[#00D1FF] rounded-full animate-pulse shadow-[0_0_8px_#00D1FF]" />
                  )}
                </button>

                <AnimatePresence>
                  {showNotifs && (
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}
                      className="absolute right-0 mt-4 w-72 sm:w-80 bg-[#0A1120] border border-white/10 rounded-3xl p-5 shadow-2xl">
                      <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Hoạt động</span>
                        <button onClick={() => { setNotifications([]); localStorage.removeItem('sui_notifications'); }} className="text-[9px] text-red-400/50 hover:text-red-400 uppercase font-bold">Xóa hết</button>
                      </div>
                      <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? notifications.map(notif => (
                          <div key={notif.id} className={`p-3 rounded-2xl border flex gap-3 items-center ${notif.isUp ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                            <div className={`p-2 rounded-lg ${notif.isUp ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {notif.isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <p className={`text-[9px] font-black truncate ${notif.isUp ? 'text-green-400' : 'text-red-400'}`}>{notif.title}</p>
                                <span className="text-[8px] text-white/20 ml-2">{notif.time}</span>
                              </div>
                              <p className="text-white font-black text-sm">{notif.isUp ? '+' : '-'}{notif.amount} SUI</p>
                            </div>
                          </div>
                        )) : <div className="py-10 text-center text-[10px] text-white/20 font-black uppercase">Trống</div>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          <div className="connect-btn-wrapper scale-90 sm:scale-100"><ConnectButton /></div>

          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-white bg-white/5 rounded-xl border border-white/10">
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#050B18] border-t border-white/5 overflow-hidden">
            <div className="p-4 space-y-2">
              {navLinks.map((link) => (
                <Link key={link.path} to={link.path} onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-4 p-4 rounded-2xl text-xs font-black uppercase tracking-widest ${location.pathname === link.path ? 'bg-[#00D1FF]/10 text-[#00D1FF] border border-[#00D1FF]/20' : 'text-white/60 bg-white/5'
                    }`}>
                  {link.icon} {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}