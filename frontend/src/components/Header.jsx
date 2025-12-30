import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton, useCurrentAccount, useSuiClient, useSuiClientQuery } from '@mysten/dapp-kit';
import {
  User, Upload, Activity, Wallet, Menu, X, Home,
  ShieldCheck, Gavel
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { ADMIN_CAP_ID } from '../constants';

export default function Header({ scrolled }) {
  const account = useCurrentAccount();
  const location = useLocation();
  const client = useSuiClient();

  const userAddress = useMemo(() => account?.address || null, [account]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [balance, setBalance] = useState("0.00");

  const { data: adminObjects } = useSuiClientQuery('getOwnedObjects', {
    owner: userAddress,
    filter: { ObjectId: ADMIN_CAP_ID }
  }, {
    enabled: !!userAddress,
    refetchInterval: 10000
  });

  const isAdmin = useMemo(() => adminObjects?.data?.length > 0, [adminObjects]);

  const checkBalance = useCallback(async () => {
    if (!userAddress) {
      setBalance("0.00");
      return;
    }
    try {
      const coinBalance = await client.getBalance({
        owner: userAddress,
        coinType: '0x2::sui::SUI'
      });
      const currentBalanceRaw = Number(coinBalance.totalBalance) / 1e9;
      setBalance(currentBalanceRaw.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }));
    } catch (err) {
      console.error("Balance fetch error:", err);
    }
  }, [client, userAddress]);

  useEffect(() => {
    checkBalance();
    const timer = setInterval(checkBalance, 8000);
    return () => clearInterval(timer);
  }, [checkBalance]);

  const navLinks = useMemo(() => {
    const links = [
      { path: '/', label: 'HOME', icon: <Home size={14} /> },
      { path: '/explore', label: 'AUCTION', icon: <Gavel size={14} /> },
      { path: '/create', label: 'SELL', icon: <Upload size={14} /> },
      { path: '/register-charity', label: 'REGISTER', icon: <Activity size={14} className="text-[#2ECC71]" /> },
      { path: '/profile', label: 'PROFILE', icon: <User size={14} /> },
      { path: '/governance', label: 'VOTE', icon: <ShieldCheck size={14} className="text-[#C1121F]" /> },
    ];
    if (isAdmin) {
      links.push({
        path: '/admin',
        label: 'ADMIN',
        icon: <ShieldCheck size={14} className="text-rose-500" />
      });
    }
    return links;
  }, [isAdmin]);

  return (
    <nav className={`fixed top-0 w-full z-[9999] transition-all duration-500 ${scrolled
      ? 'bg-white/95 backdrop-blur-md border-b border-gray-100 py-3 shadow-md'
      : 'bg-white/40 backdrop-blur-sm py-5'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center relative z-10">

        {/* LOGO: Fix màu đen rõ nét */}
        <Link to="/" className="flex flex-col group no-underline">
          <span className="text-xl md:text-2xl font-black italic tracking-tighter text-[#1F2937]">
            SUI<span className="text-[#C1121F] drop-shadow-sm">CHARITY</span>
          </span>
          <span className="text-[8px] font-bold text-gray-500 tracking-[0.4em] uppercase">Impact Protocol</span>
        </Link>

        {/* DESKTOP NAV: Nền trắng đục rõ ràng hơn */}
        <div className={`hidden lg:flex items-center gap-1 p-1 border rounded-2xl transition-all ${scrolled ? 'bg-gray-50 border-gray-200' : 'bg-white/60 border-gray-200/50'
          }`}>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`relative px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl flex items-center gap-2 no-underline ${location.pathname === link.path
                ? 'text-[#C1121F]'
                : 'text-gray-600 hover:text-[#1F2937]'
                }`}
            >
              {location.pathname === link.path && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 bg-[#C1121F]/10 border border-[#C1121F]/20 rounded-xl"
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {link.icon} {link.label}
              </span>
            </Link>
          ))}
        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-3">
          {userAddress && (
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-xl border border-gray-200 shadow-sm">
                <Wallet size={14} className="text-[#2ECC71]" />
                <span className="text-xs font-black text-gray-800 tracking-tighter">
                  {balance} SUI
                </span>
              </div>
            </div>
          )}

          <div className="scale-90 sm:scale-100 shadow-sm rounded-xl transition-transform active:scale-95">
            <ConnectButton />
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-gray-700 bg-white/80 rounded-xl border border-gray-200"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden absolute top-full left-0 w-full bg-white border-b border-gray-100 overflow-hidden shadow-2xl"
          >
            <div className="py-6 flex flex-col gap-2 px-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-4 p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all no-underline ${location.pathname === link.path
                    ? 'bg-[#C1121F] text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
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