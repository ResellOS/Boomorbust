"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, Settings, ArrowRight, Trophy, Activity, Target } from 'lucide-react';

const ROSTERED_ASSETS = [
  { name: "Ja'Marr Chase", pos: "WR", team: "CIN", rpi: "9,842", trend: "+1.2%" },
  { name: "Breece Hall", pos: "RB", team: "NYJ", rpi: "9,210", trend: "-0.4%" },
  { name: "Garrett Wilson", pos: "WR", team: "NYJ", rpi: "8,950", trend: "+2.1%" },
  { name: "CeeDee Lamb", pos: "WR", team: "DAL", rpi: "9,715", trend: "+0.8%" }
];

const TRADES = [
  { league: "Alpha Dynasty", send: "Hall", receive: "Two 2027 1sts", powerShift: "+420 RPI" },
  { league: "The Gauntlet", send: "Chase", receive: "A.J. Brown + 2nd", powerShift: "+115 RPI" }
];

export default function DashboardMockup() {
  const [assetIdx, setAssetIdx] = useState(0);
  const [tradeIdx, setTradeIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setAssetIdx((p) => (p + 1) % ROSTERED_ASSETS.length);
      setTradeIdx((p) => (p + 1) % TRADES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-[#050507] rounded-none border border-white/10 shadow-2xl flex overflow-hidden font-sans text-white aspect-[16/10.5]">
      
      {/* 1. MINIMALIST SIDEBAR */}
      <div className="w-14 border-r border-white/5 flex flex-col items-center py-6 gap-8 bg-black">
        <div className="w-8 h-8 rounded-none bg-indigo-600/20 flex items-center justify-center text-indigo-400 border border-indigo-500/40">
          <Activity size={16} />
        </div>
        <div className="text-gray-700 hover:text-white transition-colors cursor-pointer"><Target size={16} /></div>
        <div className="text-gray-700 hover:text-white transition-colors cursor-pointer"><BarChart2 size={16} /></div>
        <div className="mt-auto text-gray-700 hover:text-white transition-colors cursor-pointer"><Settings size={16} /></div>
      </div>

      <div className="flex-1 flex flex-col p-6 gap-4 bg-[#0A0B0E]">
        
        {/* TOP BAR */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-black italic tracking-widest text-indigo-500 uppercase">RPI PROTOCOL v2.1</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          </div>
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">Live Market Flux: 2.4ms</div>
        </div>

        <div className="flex-1 grid grid-cols-12 gap-4">
          
          {/* PORTFOLIO POWER INDEX */}
          <div className="col-span-7 bg-white/[0.02] border border-white/5 p-5 relative overflow-hidden">
            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1 text-left">Portfolio Power Index</h3>
            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-black tracking-tighter italic">8,422</div>
              <div className="text-emerald-400 font-bold text-[11px] tracking-widest">+840 pts</div>
            </div>

            {/* RPI TREND GRAPH - SHARP LINES */}
            <div className="flex-1 mt-4 relative h-32">
              <svg viewBox="0 0 400 120" className="w-full h-full overflow-visible">
                <path d="M0,110 L100,90 L200,95 L300,40 L400,20" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="square" className="drop-shadow-[0_0_15px_rgba(99,102,241,0.6)]" />
                <path d="M0,115 L100,105 L200,110 L300,80 L400,70" fill="none" stroke="#6366f1" strokeWidth="1" strokeOpacity="0.2" />
              </svg>
            </div>
          </div>

          {/* ASSET FOCUS: NEW LIST FORMAT */}
          <div className="col-span-5 bg-white/[0.02] border border-white/5 p-5 flex flex-col justify-center">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 text-left">Core Exposures</h3>
            
            <div className="space-y-4">
              {ROSTERED_ASSETS.map((asset, i) => (
                <motion.div 
                  key={asset.name}
                  animate={{ opacity: i === assetIdx ? 1 : 0.3, x: i === assetIdx ? 5 : 0 }}
                  className="flex items-center justify-between border-b border-white/5 pb-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-5 bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-gray-400">
                      {asset.team}
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase italic tracking-tighter leading-none">{asset.name}</div>
                      <div className="text-[9px] font-bold text-indigo-500 uppercase mt-0.5">{asset.pos} • Unit ID: {8000 + i}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-black">{asset.rpi}</div>
                    <div className={`text-[9px] font-bold ${asset.trend.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                      {asset.trend}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* TRADE SCANNER FOOTER */}
          <div className="col-span-12 bg-black border border-white/5 p-4 flex items-center gap-6">
             <div className="shrink-0 flex flex-col items-center">
                <Trophy size={18} className="text-amber-500 mb-1" />
                <span className="text-[9px] font-black text-gray-500 uppercase">Rank #2</span>
             </div>
             <div className="h-8 w-px bg-white/10" />
             <div className="flex-1 relative h-6 overflow-hidden">
                <AnimatePresence mode="wait">
                   <motion.div
                      key={tradeIdx}
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -15, opacity: 0 }}
                      className="flex items-center justify-between"
                   >
                      <span className="text-[11px] font-bold italic text-indigo-400 uppercase tracking-tighter">{TRADES[tradeIdx].league}</span>
                      <div className="flex items-center gap-2 text-[11px] font-black">
                         <span className="text-gray-600 uppercase">Send:</span> {TRADES[tradeIdx].send}
                         <ArrowRight size={10} className="text-indigo-600" />
                         <span className="text-gray-600 uppercase">Receive:</span> {TRADES[tradeIdx].receive}
                      </div>
                      <span className="text-[11px] font-black text-emerald-500">{TRADES[tradeIdx].powerShift}</span>
                   </motion.div>
                </AnimatePresence>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}