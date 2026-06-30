"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type Phase = "glow" | "flicker";

interface BootSequenceProps {
  /** Override the default redirect target (/dashboard). */
  destination?: string;
  /** Called after the animation completes instead of routing (for storybook / tests). */
  onComplete?: () => void;
}

export default function BootSequence({
  destination = "/dashboard",
  onComplete,
}: BootSequenceProps) {
  const [phase, setPhase] = useState<Phase>("glow");
  const router = useRouter();

  useEffect(() => {
    /* 0 → 1200ms : soft glow pulse */
    const t1 = setTimeout(() => setPhase("flicker"), 1200);

    /* 1200 → 1800ms : neon flicker, then navigate */
    const t2 = setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else {
        router.push(destination);
      }
    }, 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── per-phase logo motion props ── */
  const logoAnimate =
    phase === "glow"
      ? {
          filter: [
            "drop-shadow(0 0 0px rgba(0,242,195,0))",
            "drop-shadow(0 0 32px rgba(0,242,195,0.8))",
            "drop-shadow(0 0 12px rgba(0,242,195,0.4))",
            "drop-shadow(0 0 52px rgba(0,242,195,1))",
          ],
          scale: [1, 1.05, 1, 1.07],
          opacity: [0.5, 1, 0.9, 1],
          transition: { duration: 1.2, ease: "easeInOut" as const },
        }
      : {
          /* rapid neon-flicker: opacity pulses, bright glow locked */
          opacity: [1, 0.3, 1, 0.2, 1, 0.4, 1, 0.15, 1, 0.35, 1],
          filter: "drop-shadow(0 0 30px rgba(0,242,195,0.9))",
          transition: { duration: 0.55, ease: "linear" as const },
        };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8"
      style={{
        background: "#0A0C10",
        /* same subtle bento grid as the hero */
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    >
      {/* Ambient halo */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 480,
          height: 480,
          background:
            "radial-gradient(circle, rgba(0,242,195,0.07) 0%, transparent 68%)",
          filter: "blur(60px)",
        }}
      />

      {/* Logo */}
      <motion.img
        src="/images/logo-icon.png"
        alt="Boom or Bust"
        className="relative z-10 w-24 h-24 object-contain"
        style={{ mixBlendMode: "screen" }}
        animate={logoAnimate}
        onError={(e) => {
          /* Fallback text if image is missing */
          e.currentTarget.style.display = "none";
        }}
      />

      {/* Status label + pulsing dots */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
      >
        <span
          className="text-[11px] font-black uppercase tracking-[0.55em]"
          style={{ color: "var(--color-boom)" }}
        >
          {phase === "glow" ? "Initializing" : "Syncing Portfolio"}
        </span>

        {/* Three bouncing dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block w-1 h-1 rounded-full"
              style={{ background: "var(--color-boom)" }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: i * 0.22,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Bottom version tag */}
      <motion.p
        className="absolute bottom-10 text-[10px] font-black uppercase tracking-[0.4em] text-slate-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Boom or Bust — v2.1
      </motion.p>
    </motion.div>
  );
}
