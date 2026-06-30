"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import BootSequence from "@/components/landing/BootSequence";
import DashboardMockup from "@/components/landing/DashboardMockup";

const NAV_LINKS = [
  { label: "Features",    href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing",     href: "#pricing" },
  { label: "Resources",   href: "#resources", hasArrow: true },
];

export default function HeroSection() {
  const [isBooting, setIsBooting] = useState(false);

  return (
    <div className="relative flex flex-col text-white antialiased">
      <AnimatePresence>
        {isBooting && <BootSequence key="boot" />}
      </AnimatePresence>

      {/* Full-page atmospheric background — fixed so it persists on scroll */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Primary teal glow — large, upper-left, behind hero headline */}
        <div
          className="absolute"
          style={{
            top: "-20%",
            left: "-12%",
            width: "72%",
            height: "70%",
            background: "radial-gradient(ellipse at 40% 40%, rgba(0,242,195,0.11) 0%, rgba(0,242,195,0.04) 45%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        {/* Secondary teal highlight — tighter, sits right behind copy text */}
        <div
          className="absolute"
          style={{
            top: "2%",
            left: "2%",
            width: "38%",
            height: "40%",
            background: "radial-gradient(ellipse at 35% 35%, rgba(0,242,195,0.07) 0%, transparent 65%)",
            filter: "blur(40px)",
          }}
        />
        {/* Indigo glow — lower-right */}
        <div
          className="absolute"
          style={{
            bottom: "-18%",
            right: "-10%",
            width: "65%",
            height: "65%",
            background: "radial-gradient(ellipse at 55% 55%, rgba(99,102,241,0.13) 0%, rgba(99,102,241,0.05) 45%, transparent 68%)",
            filter: "blur(70px)",
          }}
        />
        {/* Faint mid-page indigo haze */}
        <div
          className="absolute"
          style={{
            top: "40%",
            right: "5%",
            width: "40%",
            height: "35%",
            background: "radial-gradient(ellipse at 60% 40%, rgba(99,102,241,0.06) 0%, transparent 65%)",
            filter: "blur(50px)",
          }}
        />
      </div>

      {/* ══════════════════ NAVBAR ══════════════════ */}
      <header
        className="sticky top-0 z-50 w-full border-b border-white/[0.05]"
        style={{
          background: "rgba(10,12,16,0.90)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <nav className="mx-auto flex h-[60px] max-w-[1400px] items-center justify-between px-8 md:px-14">

          {/* Logo — multiply removes white boxes from any PNG bg */}
          <Link href="/" aria-label="Boom or Bust" className="shrink-0 flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-full2.png"
              alt="Boom or Bust"
              className="h-10 w-auto max-w-[160px] object-contain"
              style={{ mixBlendMode: "screen" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fb) fb.classList.remove("hidden");
              }}
            />
            <span className="hidden font-black text-white text-[14px] tracking-[0.25em] uppercase italic">
              BOOM OR BUST
            </span>
          </Link>

          {/* Center nav */}
          <ul className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ label, href, hasArrow }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="flex items-center gap-1 text-[13px] font-medium text-slate-400 hover:text-white transition-colors"
                >
                  {label}
                  {hasArrow && <ChevronDown size={11} className="opacity-50" />}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right CTAs */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsBooting(true)}
              className="hidden sm:inline-flex items-center justify-center text-[13px] font-semibold border border-white/25 px-5 py-2.5 rounded-lg text-white hover:bg-white hover:text-[#0A0C10] transition-all cursor-pointer"
            >
              Sign In
            </button>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 text-[13px] font-black px-5 py-2.5 rounded-lg text-[#0A0C10] uppercase tracking-wide"
              style={{
                background: "linear-gradient(to right, #00F2C3, #6366F1)",
                boxShadow: "0 0 20px rgba(0,242,195,0.22)",
              }}
            >
              Import My Leagues
            </Link>
          </div>
        </nav>
      </header>

      {/* ══════════════════ HERO ══════════════════ */}
      <section className="relative z-10 px-8 md:px-14 pt-16 pb-20">
        <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-8 items-center">

          {/* ── 5-col copy ── */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-7">

            {/* Eyebrow */}
            <span
              className="inline-flex w-fit items-center px-4 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-[0.35em]"
              style={{
                background: "rgba(0,242,195,0.07)",
                borderColor: "rgba(0,242,195,0.24)",
                color: "#00F2C3",
              }}
            >
              Built for Fantasy Players
            </span>

            {/* Headline */}
            <div className="space-y-1">
              <h1 className="text-[60px] md:text-[68px] font-black tracking-tighter uppercase leading-[0.88]">
                Manage All Your<br />
                Fantasy Leagues<br />
                <span
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(90deg, #00F2C3 0%, #6366F1 100%)" }}
                >
                  Like a Portfolio.
                </span>
              </h1>
            </div>

            {/* Subtext */}
            <p className="text-[16px] font-medium text-slate-400 leading-[1.7] max-w-[440px] border-l-2 border-[#00F2C3] pl-5">
              Stop managing teams&mdash;start managing your assets.{" "}
              <span className="text-white font-semibold">Boom or Bust</span> syncs
              your entire dynasty portfolio into one command center.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-black text-[14px] uppercase tracking-wide text-[#0A0C10] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(to right, #00F2C3, #6366F1)",
                  boxShadow: "0 0 28px rgba(0,242,195,0.28)",
                }}
              >
                Import My Leagues
                <ArrowRight size={14} />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-black text-[14px] uppercase tracking-wide border border-white/20 text-white hover:bg-white/5 transition-colors"
              >
                See It In Action
              </Link>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] font-medium text-slate-500">
              {["100% Free to Start", "No Credit Card", "Secure with Sleeper"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* ── 7-col dashboard ── */}
          <div className="col-span-12 lg:col-span-7 [perspective:1200px]">
            <div
              className="hero-dashboard-tilt relative overflow-hidden rounded-2xl border border-white/10"
              style={{ boxShadow: "0 0 80px rgba(0,242,195,0.06), 0 40px 100px rgba(0,0,0,0.65)" }}
            >
              <DashboardMockup />
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
