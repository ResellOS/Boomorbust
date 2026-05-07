"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, LayoutDashboard, Search, RefreshCcw } from 'lucide-react';

const FEATURE_DATA = [
  {
    id: "01",
    title: "IMPORT LEAGUES",
    icon: <Download size={20} />,
    frontDesc: "SECURELY LOGGING EVERY TRADE DATA IMMEDIATELY",
    backTitle: "THE DATA ADVANTAGE",
    backDesc: "Standard tools wait for manual entry. BBSM syncs every waiver, trade, and bench move in real-time across your entire portfolio to find hidden market inefficiencies."
  },
  {
    id: "02",
    title: "BBSM OPTIMIZER",
    icon: <LayoutDashboard size={20} />,
    frontDesc: "BBSM-DRIVEN ENGINE FOR OPTIMAL ROSTER OUTPUT",
    backTitle: "BEYOND PROJECTIONS",
    backDesc: "Points don't win titles; probability does. The BBSM engine calculates floor/ceiling variance specifically for dynasty formats, ensuring you start the player with the highest win-probability."
  },
  {
    id: "03",
    title: "TRADE ANALYZER",
    icon: <Search size={20} />,
    frontDesc: "BEHAVIORAL TRADE FINDER AND BBSM SCORING",
    backTitle: "MARKET MANIPULATION",
    backDesc: "We don't just value players; we value psychology. Our analyzer identifies manager 'tilt-patterns' and suggests deals that exploit their specific roster construction flaws."
  }
];

export default function FeatureGrid() {
  return (
    <section className="py-24 px-6 bg-[#050507]">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-black italic uppercase tracking-[0.3em] text-center mb-12">
          THE BOOM OR BUST PROTOCOL
        </h2>

        <div className="grid md:grid-cols-3 gap-3">
          {FEATURE_DATA.map((feature) => (
            <FlipCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface FeatureItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  frontDesc: string;
  backTitle: string;
  backDesc: string;
}

function FlipCard({ feature }: { feature: FeatureItem }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="relative h-80 w-full cursor-pointer"
      style={{ perspective: "1200px" }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 25 }}
      >
        {/* FRONT SIDE */}
        <div 
          className="absolute inset-0 bg-[#08090C] border border-white/5 p-8 flex flex-col items-center text-center"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="absolute top-4 left-4 text-[8px] font-black text-indigo-500/30 tracking-widest">{feature.id}</div>
          <div className="mb-6 text-indigo-500">{feature.icon}</div>
          <h3 className="text-xs font-black italic mb-2 tracking-widest">{feature.title}</h3>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight leading-tight max-w-[140px]">
            {feature.frontDesc}
          </p>
          <div className="mt-auto text-[7px] font-black text-gray-700 flex items-center gap-2 uppercase tracking-widest">
            <RefreshCcw size={10} /> Reveal Intel
          </div>
        </div>

        {/* BACK SIDE - The "rotateY(180deg)" here fixes the mirroring */}
        <div 
          className="absolute inset-0 bg-[#0A0B14] border border-indigo-500/30 p-8 flex flex-col justify-center text-left"
          style={{ 
            backfaceVisibility: "hidden", 
            transform: "rotateY(180deg)" 
          }}
        >
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3 border-b border-indigo-500/20 pb-2">
            {feature.backTitle}
          </div>
          <p className="text-[11px] font-bold text-gray-400 leading-relaxed uppercase tracking-tighter">
            {feature.backDesc}
          </p>
        </div>
      </motion.div>
    </div>
  );
}