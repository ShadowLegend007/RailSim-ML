import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimStore } from '../store/useSimStore';
import { generateRandomStation } from '../utils/stationGenerator';
import { generateInitialBatch } from '../utils/trainGenerator';
import { Globe } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
//  EMBEDDED STYLES
// ─────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --amber:       #F59E0B;
    --amber-10:    rgba(245,158,11,0.10);
    --amber-20:    rgba(245,158,11,0.20);
    --amber-30:    rgba(245,158,11,0.30);
    --amber-glow:  rgba(245,158,11,0.14);
    --amber-deep:  #D97706;
    --navy:        #0F172A;
    --slate:       #334155;
    --mid:         #64748B;
    --muted:       #94A3B8;
    --border:      #E2E8F0;
    --border-soft: #F1F5F9;
    --surface:     #F8FAFC;
    --white:       #FFFFFF;
    --green:       #22C55E;
    --blue:        #3B82F6;
    --red:         #EF4444;
    --ff-display:  'Space Grotesk', 'Inter', sans-serif;
    --ff-body:     'Inter', system-ui, sans-serif;
    --ff-mono:     'JetBrains Mono', monospace;
    --ease-out:    cubic-bezier(0.2, 0.8, 0.2, 1);
    --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
    --ease-smooth: cubic-bezier(0.4, 0.0, 0.2, 1);
  }

  html { scroll-behavior: smooth; }
  body { background: var(--white); color: var(--navy); font-family: var(--ff-body); }

  /* ── Loading Screen ── */
  .loading-screen {
    position: fixed; inset: 0; z-index: 9999;
    background: var(--white);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0;
    transition: opacity 0.9s var(--ease-out), transform 0.9s var(--ease-out);
    overflow: hidden;
  }
  .loading-screen.fade-out { opacity: 0; transform: translateY(-24px); pointer-events: none; }

  /* Track rails for loading screen */
  .loading-rails {
    position: absolute; left: 0; right: 0;
    display: flex; flex-direction: column; gap: 6px;
    pointer-events: none;
  }
  .loading-rail {
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.15) 20%, rgba(245,158,11,0.35) 50%, rgba(245,158,11,0.15) 80%, transparent 100%);
  }

  /* Text reveal: train wipes across revealing the logo */
  .reveal-wrapper {
    position: relative;
    display: flex; flex-direction: column; align-items: center; gap: 32px;
    z-index: 2;
  }

  .reveal-text-container {
    font-family: var(--ff-display);
    font-size: clamp(3.5rem, 9vw, 7rem);
    font-weight: 900; letter-spacing: -0.05em;
    position: relative; user-select: none; line-height: 1;
    overflow: hidden; display: inline-block;
  }

  /* Ghost text (visible baseline) */
  .reveal-text-ghost {
    color: transparent;
    -webkit-text-stroke: 1.5px rgba(226, 232, 240, 0.8);
  }

  /* Revealed gradient text, clipped by the wipe mask */
  .reveal-text-colored {
    position: absolute; inset: 0;
    background: linear-gradient(135deg, var(--navy) 0%, #1E3A5F 35%, var(--amber) 60%, var(--navy) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    clip-path: inset(0 100% 0 0);
    animation: wipe-reveal 2s var(--ease-out) 0.8s forwards;
  }
  @keyframes wipe-reveal {
    0%   { clip-path: inset(0 100% 0 0); }
    100% { clip-path: inset(0 0% 0 0); }
  }

  /* Train that runs across revealing text */
  .loading-train-wrapper {
    position: absolute; top: 50%; transform: translateY(-52%);
    left: -300px; z-index: 10; pointer-events: none;
    animation: train-run 2s var(--ease-out) 0.8s forwards;
  }
  @keyframes train-run {
    0%   { left: -300px; }
    100% { left: calc(100% + 80px); }
  }

  /* Smoke puffs from train */
  .smoke-puff {
    position: absolute; border-radius: 50%;
    background: rgba(100, 116, 139, 0.22);
    animation: smoke-float 1.2s ease-out forwards;
    pointer-events: none;
  }
  @keyframes smoke-float {
    0%   { opacity: 0.8; transform: scale(0.6) translateY(0); }
    100% { opacity: 0; transform: scale(2.5) translateY(-32px); }
  }

  /* Loading subtitle */
  .loading-subtitle {
    font-family: var(--ff-mono); font-size: 0.72rem;
    letter-spacing: 0.3em; text-transform: uppercase;
    color: var(--muted);
    opacity: 0; animation: fade-in-up 0.6s var(--ease-out) 1.4s forwards;
  }
  @keyframes fade-in-up {
    0%   { opacity: 0; transform: translateY(12px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  /* Progress bar */
  .loading-progress-bar {
    width: 220px; height: 2px;
    background: var(--border);
    border-radius: 2px; overflow: hidden;
    opacity: 0; animation: fade-in-up 0.4s var(--ease-out) 1.6s forwards;
    margin-top: 24px;
  }
  .loading-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--amber-deep), var(--amber));
    border-radius: 2px;
    animation: progress-run 1.8s var(--ease-smooth) 0.9s forwards;
    width: 0%;
  }
  @keyframes progress-run { 0%{width:0%} 100%{width:100%} }

  /* ── Top status bar ── */
  .top-bar {
    position: fixed; top: 0; left: 0; right: 0; height: 44px;
    background: rgba(255,255,255,0.92); backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 32px; z-index: 50;
    box-shadow: 0 1px 0 rgba(0,0,0,0.04);
  }

  /* ── Hero ── */
  .hero-tag {
    display: inline-block;
    font-family: var(--ff-mono); font-size: 0.72rem; letter-spacing: 0.3em;
    color: var(--amber); text-transform: uppercase;
    background: var(--amber-10); padding: 7px 18px; border-radius: 24px;
    border: 1px solid var(--amber-20); margin-bottom: 22px;
    transition: background 0.3s, box-shadow 0.3s;
  }
  .hero-tag:hover { background: var(--amber-20); box-shadow: 0 4px 16px var(--amber-glow); }

  .hero-title {
    font-family: var(--ff-display);
    font-size: clamp(3.8rem, 7.5vw, 6.5rem);
    font-weight: 900; letter-spacing: -0.05em; line-height: 0.95; margin-bottom: 22px;
    color: var(--navy);
  }
  .hero-title-ml {
    display: inline-block;
    background: linear-gradient(135deg, var(--amber-deep) 0%, var(--amber) 50%, #FCD34D 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    position: relative;
  }
  .hero-title-ml::after {
    content: '';
    position: absolute; bottom: -4px; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, var(--amber-deep), var(--amber));
    border-radius: 2px;
    transform: scaleX(0); transform-origin: left;
    transition: transform 0.6s var(--ease-out);
  }
  .hero-title:hover .hero-title-ml::after { transform: scaleX(1); }

  .hero-subtitle {
    font-family: var(--ff-body); color: var(--mid);
    font-size: 1.05rem; line-height: 1.7;
    max-width: 500px; margin: 0 auto 44px;
  }

  .hero-tag-pill {
    padding: 6px 16px; border-radius: 20px;
    border: 1px solid var(--border);
    font-size: 0.72rem; color: var(--mid);
    font-family: var(--ff-mono);
    background: var(--white);
    box-shadow: 0 1px 4px rgba(0,0,0,0.05), 0 0 0 0 var(--amber-glow);
    transition: border-color 0.3s var(--ease-smooth), color 0.3s var(--ease-smooth),
                box-shadow 0.4s var(--ease-smooth), transform 0.3s var(--ease-spring),
                background 0.3s var(--ease-smooth);
    cursor: default; display: inline-block;
  }
  .hero-tag-pill:hover {
    border-color: var(--amber-30); color: var(--amber-deep);
    box-shadow: 0 4px 16px var(--amber-glow), 0 0 0 3px var(--amber-10);
    transform: translateY(-3px) scale(1.04);
    background: var(--amber-10);
  }

  /* ── CTA Buttons ── */
  .cta-primary {
    padding: 14px 32px; border-radius: 12px; border: none; cursor: pointer;
    font-family: var(--ff-body); font-size: 0.93rem; font-weight: 600;
    background: var(--amber); color: var(--navy);
    box-shadow: 0 4px 16px rgba(245,158,11,0.32), 0 1px 0 rgba(255,255,255,0.2) inset;
    transition: transform 0.25s var(--ease-spring), box-shadow 0.3s var(--ease-smooth),
                background 0.25s var(--ease-smooth);
    position: relative; overflow: hidden;
  }
  .cta-primary::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 55%);
    pointer-events: none; border-radius: 12px;
  }
  .cta-primary::after {
    content: ''; position: absolute;
    inset: -50%; width: 60%; height: 200%;
    background: rgba(255,255,255,0.18);
    transform: skewX(-20deg) translateX(-200%);
    transition: transform 0.7s var(--ease-smooth);
    pointer-events: none;
  }
  .cta-primary:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 12px 32px rgba(245,158,11,0.42), 0 4px 12px rgba(245,158,11,0.2); background: var(--amber-deep); }
  .cta-primary:hover::after { transform: skewX(-20deg) translateX(300%); }
  .cta-primary:active { transform: translateY(-1px) scale(0.99); }

  .cta-secondary {
    padding: 14px 32px; border-radius: 12px; cursor: pointer;
    font-family: var(--ff-body); font-size: 0.93rem; font-weight: 600;
    background: var(--white); color: var(--navy);
    border: 1.5px solid var(--border);
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    transition: transform 0.25s var(--ease-spring), box-shadow 0.3s var(--ease-smooth),
                border-color 0.3s var(--ease-smooth), background 0.3s var(--ease-smooth);
    position: relative; overflow: hidden;
  }
  .cta-secondary:hover {
    transform: translateY(-4px) scale(1.02); border-color: var(--amber-30);
    box-shadow: 0 10px 28px rgba(0,0,0,0.1), 0 0 0 3px var(--amber-10);
    background: rgba(245,158,11,0.03);
  }
  .cta-secondary:active { transform: translateY(-1px) scale(0.99); }

  /* ── Scroll reveal ── */
  .scroll-reveal {
    opacity: 0; transform: translateY(40px);
    transition: opacity 0.7s var(--ease-out) var(--reveal-delay, 0ms), transform 0.7s var(--ease-out) var(--reveal-delay, 0ms);
    will-change: opacity, transform;
  }
  .scroll-reveal.visible { opacity: 1; transform: translateY(0); }

  .scroll-reveal-scale {
    opacity: 0; transform: translateY(28px) scale(0.96);
    transition: opacity 0.65s var(--ease-out) var(--reveal-delay, 0ms), transform 0.65s var(--ease-out) var(--reveal-delay, 0ms);
    will-change: opacity, transform;
  }
  .scroll-reveal-scale.visible { opacity: 1; transform: translateY(0) scale(1); }

  .scroll-reveal-left {
    opacity: 0; transform: translateX(-40px);
    transition: opacity 0.7s var(--ease-out) var(--reveal-delay, 0ms), transform 0.7s var(--ease-out) var(--reveal-delay, 0ms);
    will-change: opacity, transform;
  }
  .scroll-reveal-left.visible { opacity: 1; transform: translateX(0); }

  @media (prefers-reduced-motion: reduce) {
    .scroll-reveal, .scroll-reveal-scale, .scroll-reveal-left { transition: opacity 0.3s; transform: none; }
  }

  /* ── Section chrome ── */
  .section-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: var(--ff-mono); font-size: 0.68rem;
    letter-spacing: 0.3em; text-transform: uppercase;
    color: var(--amber); margin-bottom: 16px;
  }
  .section-eyebrow::before {
    content: ''; display: block; width: 18px; height: 2px;
    background: var(--amber); border-radius: 2px;
  }
  .section-title {
    font-family: var(--ff-display); font-size: clamp(2rem, 3.8vw, 2.8rem);
    font-weight: 800; letter-spacing: -0.035em; color: var(--navy);
    line-height: 1.1; margin-bottom: 18px;
  }
  .section-sub {
    font-family: var(--ff-body); color: var(--mid);
    font-size: 1rem; line-height: 1.7; max-width: 520px;
  }

  /* ── Stats Ticker Band ── */
  .stats-ticker-band {
    background: var(--navy); overflow: hidden; padding: 14px 0;
    position: relative;
  }
  .stats-ticker-band::before,
  .stats-ticker-band::after {
    content: ''; position: absolute; top: 0; width: 100px; height: 100%; z-index: 2;
  }
  .stats-ticker-band::before { left: 0; background: linear-gradient(90deg, var(--navy), transparent); }
  .stats-ticker-band::after  { right: 0; background: linear-gradient(-90deg, var(--navy), transparent); }
  .ticker-track { overflow: hidden; }
  .ticker-inner {
    display: flex; align-items: center; white-space: nowrap;
    animation: ticker-scroll 32s linear infinite;
  }
  .ticker-inner:hover { animation-play-state: paused; }
  @keyframes ticker-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  .ticker-item {
    font-family: var(--ff-mono); font-size: 0.7rem; letter-spacing: 0.14em;
    color: var(--amber); padding: 0 8px; display: inline-flex; align-items: center; gap: 8px;
    white-space: nowrap;
  }
  .ticker-dot { font-size: 0.4rem; color: var(--amber); opacity: 0.6; }
  .ticker-sep { color: var(--slate); font-size: 0.7rem; padding: 0 12px; opacity: 0.5; }

  /* ── Capabilities ── */
  .capabilities-section {
    background: var(--surface); padding: 112px 40px;
    border-top: 1px solid var(--border);
  }
  .capabilities-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 24px; max-width: 1080px; margin: 0 auto;
  }
  .cap-card {
    background: var(--white); border: 1px solid var(--border);
    border-radius: 18px; padding: 32px 28px; cursor: default;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04), 0 0 0 0 var(--amber-10);
    transition: transform 0.4s var(--ease-out), box-shadow 0.4s var(--ease-smooth),
                border-color 0.35s var(--ease-smooth);
    position: relative; overflow: hidden;
  }
  .cap-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, var(--amber-deep), var(--amber));
    transform: scaleX(0); transform-origin: left;
    transition: transform 0.4s var(--ease-out);
    border-radius: 0 0 2px 2px;
  }
  .cap-card::after {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at 50% 0%, rgba(245,158,11,0.04) 0%, transparent 65%);
    opacity: 0; transition: opacity 0.4s var(--ease-smooth);
  }
  .cap-card:hover {
    transform: translateY(-9px) scale(1.01);
    box-shadow: 0 24px 48px rgba(245,158,11,0.13), 0 8px 16px rgba(0,0,0,0.07), 0 0 0 1px var(--amber-20);
    border-color: var(--amber-20);
  }
  .cap-card:hover::before { transform: scaleX(1); }
  .cap-card:hover::after { opacity: 1; }

  .cap-icon-wrap {
    width: 50px; height: 50px; border-radius: 14px;
    background: var(--amber-10); border: 1px solid var(--amber-20);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 22px;
    transition: background 0.3s var(--ease-smooth), transform 0.35s var(--ease-spring),
                box-shadow 0.3s var(--ease-smooth);
  }
  .cap-card:hover .cap-icon-wrap {
    background: rgba(245,158,11,0.18); transform: scale(1.12) rotate(-3deg);
    box-shadow: 0 6px 18px var(--amber-glow);
  }
  .cap-title {
    font-family: var(--ff-display); font-size: 1.05rem; font-weight: 700;
    color: var(--navy); margin-bottom: 12px; letter-spacing: -0.015em;
  }
  .cap-body {
    font-family: var(--ff-body); font-size: 0.875rem; color: var(--mid);
    line-height: 1.68; margin-bottom: 18px;
  }
  .cap-more {
    font-family: var(--ff-mono); font-size: 0.72rem; color: var(--amber);
    letter-spacing: 0.05em; background: none; border: none; cursor: pointer; padding: 0;
    opacity: 0; transform: translateX(-8px);
    transition: opacity 0.28s var(--ease-smooth), transform 0.28s var(--ease-out);
    display: flex; align-items: center; gap: 4px;
  }
  .cap-more::after { content: '→'; transition: transform 0.2s var(--ease-spring); }
  .cap-card:hover .cap-more { opacity: 1; transform: translateX(0); }
  .cap-card:hover .cap-more::after { transform: translateX(3px); }

  /* ── How It Works ── */
  .how-section {
    background: var(--white); padding: 112px 40px;
    border-top: 1px solid var(--border);
  }
  .how-row {
    display: flex; align-items: flex-start; gap: 0;
    max-width: 980px; margin: 0 auto;
  }
  .how-step {
    flex: 1; padding: 38px 30px; border-radius: 18px;
    background: var(--surface); border: 1px solid var(--border);
    position: relative; overflow: hidden;
    transition: transform 0.35s var(--ease-out), box-shadow 0.35s var(--ease-smooth),
                border-color 0.3s var(--ease-smooth), background 0.3s var(--ease-smooth);
  }
  .how-step::after {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at 30% 20%, rgba(245,158,11,0.05) 0%, transparent 60%);
    opacity: 0; transition: opacity 0.35s var(--ease-smooth);
  }
  .how-step:hover {
    transform: translateY(-8px); border-color: var(--amber-20);
    box-shadow: 0 20px 44px rgba(245,158,11,0.12), 0 4px 12px rgba(0,0,0,0.06);
    background: var(--white);
  }
  .how-step:hover::after { opacity: 1; }
  .how-step-num {
    font-family: var(--ff-mono); font-size: 5.5rem; font-weight: 700;
    line-height: 1; color: rgba(226,232,240,0.9);
    position: absolute; top: 12px; right: 14px; user-select: none;
    transition: color 0.35s var(--ease-smooth), transform 0.35s var(--ease-out);
  }
  .how-step:hover .how-step-num { color: rgba(245,158,11,0.14); transform: scale(1.05); }
  .how-step-icon-wrap {
    width: 44px; height: 44px; border-radius: 12px;
    background: var(--amber-10); border: 1px solid var(--amber-20);
    display: flex; align-items: center; justify-content: center; margin-bottom: 18px;
    transition: transform 0.3s var(--ease-spring), background 0.3s var(--ease-smooth);
    position: relative; z-index: 1;
  }
  .how-step:hover .how-step-icon-wrap { transform: scale(1.1) rotate(-4deg); background: var(--amber-20); }
  .how-step-title {
    font-family: var(--ff-display); font-size: 1.12rem; font-weight: 700;
    color: var(--navy); margin-bottom: 10px; letter-spacing: -0.02em;
    position: relative; z-index: 1;
  }
  .how-step-body {
    font-family: var(--ff-body); font-size: 0.875rem; color: var(--mid);
    line-height: 1.7; position: relative; z-index: 1;
  }
  .how-arrow { display: flex; align-items: center; justify-content: center; padding: 0 14px; flex-shrink: 0; margin-top: 56px; }

  /* ── Allocation Engine ── */
  .alloc-section {
    background: var(--surface); padding: 112px 40px;
    border-top: 1px solid var(--border);
  }
  .alloc-layout {
    display: grid; grid-template-columns: 1fr 340px;
    gap: 64px; max-width: 1080px; margin: 0 auto; align-items: start;
  }
  .acc-chip {
    border: 1px solid var(--border); border-radius: 12px;
    background: var(--white); overflow: hidden; cursor: pointer;
    transition: border-color 0.28s var(--ease-smooth), box-shadow 0.28s var(--ease-smooth),
                transform 0.25s var(--ease-spring);
  }
  .acc-chip:hover { border-color: var(--amber-20); transform: translateX(4px); }
  .acc-chip.open { border-color: var(--amber-20); box-shadow: 0 6px 20px var(--amber-glow); transform: translateX(0); }
  .acc-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px; gap: 12px; transition: background 0.25s var(--ease-smooth);
  }
  .acc-chip.open .acc-header { background: rgba(245,158,11,0.04); }
  .acc-sym {
    width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
    background: var(--surface); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--ff-mono); font-size: 0.65rem; font-weight: 700; color: var(--mid);
    transition: background 0.25s, color 0.25s, border-color 0.25s, transform 0.25s var(--ease-spring);
  }
  .acc-chip.open .acc-sym { background: var(--amber-10); color: var(--amber-deep); border-color: var(--amber-20); transform: rotate(-5deg); }
  .acc-title-text { flex: 1; font-family: var(--ff-body); font-size: 0.88rem; font-weight: 600; color: var(--navy); }
  .acc-count {
    font-family: var(--ff-mono); font-size: 0.65rem; letter-spacing: 0.08em;
    color: var(--muted); background: var(--surface);
    padding: 2px 8px; border-radius: 12px; border: 1px solid var(--border);
    transition: color 0.25s, border-color 0.25s, background 0.25s;
  }
  .acc-chip.open .acc-count { color: var(--amber-deep); border-color: var(--amber-20); background: var(--amber-10); }
  .acc-chevron {
    color: var(--muted); flex-shrink: 0;
    transition: transform 0.3s var(--ease-out), color 0.25s;
  }
  .acc-chip.open .acc-chevron { transform: rotate(180deg); color: var(--amber); }
  .acc-body { max-height: 0; overflow: hidden; transition: max-height 0.4s var(--ease-out); border-top: 0px solid var(--border); }
  .acc-chip.open .acc-body { max-height: 320px; border-top-width: 1px; }
  .acc-body-inner { padding: 14px 18px; display: flex; flex-direction: column; gap: 10px; }
  .acc-rule {
    display: flex; gap: 10px; align-items: flex-start;
    font-family: var(--ff-body); font-size: 0.83rem; color: var(--mid); line-height: 1.55;
  }
  .acc-bullet { color: var(--amber); font-size: 0.75rem; margin-top: 2px; flex-shrink: 0; }
  .alloc-counter-side {
    background: var(--white); border: 1px solid var(--border);
    border-radius: 20px; padding: 44px 36px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.05);
    position: sticky; top: 64px; text-align: center;
    transition: box-shadow 0.3s var(--ease-smooth);
  }
  .alloc-counter-side:hover { box-shadow: 0 8px 32px rgba(245,158,11,0.12), 0 4px 12px rgba(0,0,0,0.06); }
  .alloc-big-num {
    font-family: var(--ff-display); font-size: 7.5rem; font-weight: 900;
    letter-spacing: -0.06em; line-height: 1;
    color: var(--amber); display: block;
    text-shadow: 0 0 60px rgba(245,158,11,0.2);
  }
  .alloc-big-label {
    font-family: var(--ff-mono); font-size: 0.68rem; letter-spacing: 0.15em;
    text-transform: uppercase; color: var(--mid); margin-top: 10px; margin-bottom: 36px; display: block;
  }
  .alloc-mini-grid { display: flex; flex-direction: column; gap: 18px; border-top: 1px solid var(--border); padding-top: 30px; }
  .alloc-mini-item { text-align: center; }
  .alloc-mini-val {
    display: block; font-family: var(--ff-mono); font-size: 1.5rem; font-weight: 700;
    color: var(--navy); letter-spacing: -0.02em; margin-bottom: 2px;
  }
  .alloc-mini-lbl { font-family: var(--ff-body); font-size: 0.78rem; color: var(--muted); }

  /* ── Live Demo Teaser ── */
  .demo-section { background: var(--white); padding: 112px 40px; border-top: 1px solid var(--border); }
  .floating-mockup {
    border-radius: 18px; overflow: visible;
    animation: float 5.5s ease-in-out infinite; will-change: transform;
    filter: drop-shadow(0 48px 96px rgba(0,0,0,0.12)) drop-shadow(0 16px 32px rgba(0,0,0,0.08));
    position: relative;
  }
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
  .annotation-bubble {
    position: absolute; background: var(--white);
    border: 1px solid var(--border); border-left: 3px solid var(--amber);
    border-radius: 10px; padding: 8px 14px;
    font-family: var(--ff-mono); font-size: 0.68rem; color: var(--slate);
    box-shadow: 0 6px 20px rgba(0,0,0,0.1);
    white-space: nowrap; display: flex; align-items: center; gap: 7px;
    opacity: 0; transform: translateY(8px);
    animation: bubble-in 0.5s var(--ease-out) forwards;
    transition: box-shadow 0.3s var(--ease-smooth), transform 0.3s var(--ease-spring);
  }
  .annotation-bubble:hover { box-shadow: 0 10px 30px rgba(245,158,11,0.18); transform: translateY(-3px) !important; }
  @keyframes bubble-in { to { opacity:1; transform:translateY(0); } }

  /* ── Team ── */
  .team-section { background: var(--surface); padding: 112px 40px; border-top: 1px solid var(--border); }
  .team-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; max-width: 1080px; margin: 0 auto; }
  .team-card {
    background: var(--white); border: 1px solid var(--border);
    border-radius: 20px; padding: 30px 24px 24px; text-align: center;
    cursor: default; position: relative; overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    transition: transform 0.38s var(--ease-out), box-shadow 0.38s var(--ease-smooth),
                border-color 0.32s var(--ease-smooth);
  }
  .team-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 0;
    background: linear-gradient(135deg, var(--amber) 0%, #FCD34D 100%);
    transition: height 0.38s var(--ease-out);
  }
  .team-card::after {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at 50% -20%, rgba(245,158,11,0.06) 0%, transparent 65%);
    opacity: 0; transition: opacity 0.38s var(--ease-smooth);
  }
  .team-card:hover {
    transform: translateY(-12px) scale(1.01);
    box-shadow: 0 28px 56px rgba(245,158,11,0.16), 0 8px 16px rgba(0,0,0,0.07);
    border-color: rgba(245,158,11,0.28);
  }
  .team-card:hover::before { height: 3px; }
  .team-card:hover::after { opacity: 1; }
  .team-avatar {
    width: 76px; height: 76px; border-radius: 50%;
    background: linear-gradient(135deg, var(--amber) 0%, #FCD34D 60%, #FDE68A 100%);
    color: var(--navy); font-family: var(--ff-display); font-weight: 800; font-size: 1.6rem;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px;
    transition: transform 0.35s var(--ease-spring), box-shadow 0.35s var(--ease-smooth);
    position: relative; z-index: 1;
  }
  .team-card:hover .team-avatar {
    transform: scale(1.1) rotate(-3deg);
    box-shadow: 0 0 0 5px rgba(245,158,11,0.22), 0 10px 24px rgba(245,158,11,0.28);
  }
  .team-status { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 10px; }
  .status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; animation: pulse-dot 2.4s ease-in-out infinite; }
  .status-dot.green { background: var(--green); }
  .status-dot.amber { background: var(--amber); }
  .status-dot.blue  { background: var(--blue); }
  @keyframes pulse-dot {
    0%,100%{ opacity:1; transform:scale(1); }
    50%    { opacity:0.75; transform:scale(1.3); }
  }
  .status-text { font-family: var(--ff-mono); font-size: 0.62rem; color: var(--muted); letter-spacing: 0.1em; }
  .team-name { font-family: var(--ff-display); font-size: 1rem; font-weight: 700; color: var(--navy); margin-bottom: 3px; letter-spacing: -0.015em; }
  .team-role { font-family: var(--ff-mono); font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--amber-deep); margin-bottom: 2px; }
  .team-dept { font-family: var(--ff-body); font-size: 0.78rem; color: var(--muted); margin-bottom: 18px; }
  .team-divider { height: 1px; background: var(--border); margin: 0 -2px 18px; transition: background 0.3s var(--ease-smooth); }
  .team-card:hover .team-divider { background: var(--amber-20); }
  .team-bio { font-family: var(--ff-body); font-size: 0.81rem; color: var(--mid); line-height: 1.58; margin-bottom: 18px; font-style: italic; }
  .team-socials { display: flex; justify-content: center; gap: 8px; }
  .team-social {
    width: 32px; height: 32px; border-radius: 8px;
    background: var(--surface); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    color: var(--mid); cursor: pointer;
    transition: background 0.25s var(--ease-smooth), color 0.25s var(--ease-smooth),
                border-color 0.25s var(--ease-smooth), transform 0.28s var(--ease-spring),
                box-shadow 0.25s var(--ease-smooth);
    text-decoration: none;
  }
  .team-social:hover {
    background: var(--amber-10); color: var(--amber-deep); border-color: var(--amber-20);
    transform: translateY(-4px) scale(1.12);
    box-shadow: 0 6px 14px var(--amber-glow);
  }

  /* ── Tech Stack — REBUILT ── */
  .tech-section { background: var(--white); padding: 112px 40px; border-top: 1px solid var(--border); }
  .tech-strip { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; max-width: 1080px; margin: 0 auto 72px; }
  .tech-chip {
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    padding: 22px 26px; border-radius: 16px;
    background: var(--surface); border: 1px solid var(--border);
    min-width: 100px; position: relative; overflow: hidden;
    transition: transform 0.32s var(--ease-spring), box-shadow 0.32s var(--ease-smooth),
                border-color 0.3s var(--ease-smooth), background 0.3s var(--ease-smooth);
    cursor: default;
  }
  .tech-chip::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at 50% 0%, var(--chip-color-10, rgba(245,158,11,0.08)) 0%, transparent 70%);
    opacity: 0; transition: opacity 0.35s var(--ease-smooth);
  }
  .tech-chip:hover {
    transform: translateY(-8px) scale(1.04);
    box-shadow: 0 16px 40px rgba(0,0,0,0.1), 0 0 0 1px var(--border);
    border-color: var(--chip-border, var(--border));
    background: var(--white);
  }
  .tech-chip:hover::before { opacity: 1; }

  .tech-chip-logo {
    width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;
    transition: transform 0.32s var(--ease-spring);
    position: relative; z-index: 1;
  }
  .tech-chip:hover .tech-chip-logo { transform: scale(1.15) rotate(-4deg); }

  .tech-chip-name {
    font-family: var(--ff-body); font-size: 0.74rem; color: var(--mid); font-weight: 500;
    position: relative; z-index: 1;
    transition: color 0.25s var(--ease-smooth);
  }
  .tech-chip:hover .tech-chip-name { color: var(--navy); }

  .pull-quote {
    max-width: 680px; margin: 0 auto; text-align: center; position: relative;
    padding: 44px 56px;
    background: var(--surface); border-radius: 20px; border: 1px solid var(--border);
    transition: box-shadow 0.35s var(--ease-smooth), border-color 0.35s var(--ease-smooth);
  }
  .pull-quote:hover { box-shadow: 0 12px 40px rgba(245,158,11,0.1); border-color: var(--amber-20); }
  .pull-quote-mark { font-family: var(--ff-display); font-size: 5rem; font-weight: 900; color: var(--amber); line-height: 0.6; display: block; opacity: 0.4; user-select: none; }
  .pull-quote-mark.open { margin-bottom: 14px; }
  .pull-quote-mark.close { margin-top: 14px; }
  .pull-quote-text { font-family: var(--ff-body); font-size: 1.08rem; color: var(--slate); line-height: 1.75; font-style: italic; }

  /* ── Hackathon Banner ── */
  .hack-band { background: var(--amber); overflow: hidden; padding: 14px 0; border-top: 1px solid rgba(245,158,11,0.4); }
  .hack-band .ticker-inner { animation: ticker-scroll 26s linear infinite; }
  .hack-item { font-family: var(--ff-mono); font-size: 0.7rem; letter-spacing: 0.14em; color: var(--navy); padding: 0 6px; white-space: nowrap; display: inline-flex; align-items: center; font-weight: 600; }
  .hack-sep { color: rgba(15,23,42,0.3); font-size: 0.9rem; padding: 0 12px; }

  /* ── Footer ── */
  .landing-footer { background: var(--navy); padding: 72px 40px 0; border-top: 3px solid var(--amber); }
  .footer-inner { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 56px; max-width: 1080px; margin: 0 auto 64px; }
  .footer-logo { font-family: var(--ff-display); font-size: 1.6rem; font-weight: 900; letter-spacing: -0.05em; color: var(--white); margin-bottom: 12px; }
  .footer-tagline { font-family: var(--ff-body); font-size: 0.85rem; color: var(--slate); line-height: 1.65; }
  .footer-col-head { font-family: var(--ff-mono); font-size: 0.65rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--amber); margin-bottom: 18px; }
  .footer-links { list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .footer-links li a, .footer-links li span { font-family: var(--ff-body); font-size: 0.85rem; color: var(--slate); text-decoration: none; transition: color 0.25s var(--ease-smooth); display: inline-block; }
  .footer-links li a:hover { color: var(--amber); }
  .footer-bottom { border-top: 1px solid rgba(255,255,255,0.07); padding: 22px 0; max-width: 1080px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
  .footer-bottom-txt { font-family: var(--ff-mono); font-size: 0.65rem; letter-spacing: 0.12em; color: var(--slate); }

  /* ── Parallax Track Decor ── */
  .track-decor { position: absolute; left: -5%; right: -5%; top: 0; bottom: 0; pointer-events: none; overflow: hidden; z-index: 0; will-change: transform; }
`;

// ─────────────────────────────────────────────────────────────
//  SVG ICON LIBRARY
// ─────────────────────────────────────────────────────────────
const Ico = ({ w = 24, h = 24, vb = '0 0 24 24', stroke = '#F59E0B', sw = 1.5, fill = 'none', children }) => (
  <svg width={w} height={h} viewBox={vb} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const IcRouting = () => <Ico><circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="M12 7L5 17M12 7L19 17M5 19h14" /></Ico>;
const IcConflict = () => <Ico><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" /><line x1="12" y1="8" x2="12" y2="13" /><circle cx="12" cy="16" r="1" fill="#F59E0B" stroke="none" /></Ico>;
const IcMetrics = () => <Ico><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" /></Ico>;
const IcBuilder = () => <Ico><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Ico>;
const IcSpecial = () => <Ico><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="rgba(245,158,11,0.1)" /></Ico>;
const IcSignal = () => <Ico><rect x="8" y="2" width="8" height="15" rx="4" /><circle cx="12" cy="7" r="2.2" fill="rgba(245,158,11,0.2)" /><circle cx="12" cy="13" r="2.2" /><line x1="12" y1="17" x2="12" y2="22" /><line x1="9" y1="22" x2="15" y2="22" /></Ico>;
const IcConfig = () => <Ico w={22} h={22}><line x1="3" y1="6" x2="19" y2="6" /><line x1="7" y1="12" x2="19" y2="12" /><line x1="3" y1="18" x2="19" y2="18" /><circle cx="4.5" cy="12" r="2" fill="rgba(245,158,11,0.15)" /></Ico>;
const IcPlay = () => <Ico w={22} h={22}><circle cx="11" cy="11" r="9" /><polygon points="9 7 16 11 9 15" fill="rgba(245,158,11,0.15)" stroke="#F59E0B" /></Ico>;
const IcAnalyze = () => <Ico w={22} h={22}><polyline points="22 6 13 15 8.5 10.5 1 18" /><polyline points="16 6 22 6 22 12" /></Ico>;
const IcGitHub = () => <Ico w={14} h={14} stroke="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></Ico>;
const IcLinkedIn = () => <Ico w={14} h={14} stroke="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></Ico>;
const IcTwitter = () => <Ico w={14} h={14} stroke="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" /></Ico>;
const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
//  TECH STACK LOGOS (inline SVG — crisp, real logos)
// ─────────────────────────────────────────────────────────────
const ReactLogo = () => (
  <svg viewBox="-12 -12 24 24" width="100%" height="100%" fill="none">
    <circle cx="0" cy="0" r="2" fill="#61DAFB"/>
    <g stroke="#61DAFB" strokeWidth="1" fill="none">
      <ellipse rx="10" ry="4.5"/>
      <ellipse rx="10" ry="4.5" transform="rotate(60)"/>
      <ellipse rx="10" ry="4.5" transform="rotate(120)"/>
    </g>
  </svg>
);
const ViteLogo = () => (
  <svg viewBox="-10 -10 276 276" width="100%" height="100%" fill="none">
    <path fill="url(#viteA)" d="M253.9 66.8L134.4 249.2a9 9 0 0 1-15 0L1.7 66.8a9 9 0 0 1 12.3-11.8l113.8 54 113.8-54a9 9 0 0 1 12.3 11.8z" />
    <path fill="url(#viteB)" d="M253.9 66.8l-123.6 57.6-56.1-92.4 167.4 23a9 9 0 0 1 12.3 11.8z" />
    <defs>
      <linearGradient id="viteA" x1="-31" y1="21.5" x2="216" y2="249.2" gradientUnits="userSpaceOnUse">
        <stop stopColor="#41D1FF" />
        <stop offset="1" stopColor="#BD34FE" />
      </linearGradient>
      <linearGradient id="viteB" x1="255.7" y1="58.7" x2="119.5" y2="129.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFEA83" />
        <stop offset="1" stopColor="#FFDD35" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);
const ZustandLogo = () => (
  <svg viewBox="-2 -2 28 28" width="100%" height="100%" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h16M4 6l16 12M20 18H4" />
  </svg>
);
const TailwindLogo = () => (
  <svg viewBox="-2 -2 28 28" width="100%" height="100%" fill="none">
    <path fill="#06B6D4" d="M12,4.8c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.9,0.2,1.6,0.9,2.3,1.6 C13.7,10.6,15,12,18,12c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.9-0.2-1.6-0.9-2.3-1.6C16.3,6.2,15,4.8,12,4.8z M6,12 c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.9,0.2,1.6,0.9,2.3,1.6C7.7,17.8,9,19.2,12,19.2c3.2,0,5.2-1.6,6-4.8 c-1.2,1.6-2.6,2.2-4.2,1.8c-0.9-0.2-1.6-0.9-2.3-1.6C10.3,13.4,9,12,6,12z" />
  </svg>
);
const PythonLogo = () => (
  <svg viewBox="-2 -2 28 28" width="100%" height="100%" fill="none">
    <path fill="#3B82F6" d="M11.95 1.63c-2.6 0-5.1.2-5.1.2s-2.4.2-2.4 2.5v3.4h7.6v1.1H4.43c-2.4 0-3.3 2.1-3.3 4.2 0 2.2.8 4.2 3.3 4.2h1.4v-3.2c0-2.8 2.2-5 5-5h5c2.3 0 2.3-2.3 2.3-2.3V3.83c0-2.3-2.3-2.2-2.3-2.2zm-2.8 1.9a1 1 0 011 1 1 1 0 01-1 1 1 1 0 01-1-1 1 1 0 011-1z"/>
    <path fill="#FCD34D" d="M12.05 22.37c2.6 0 5.1-.2 5.1-.2s2.4-.2 2.4-2.5v-3.4h-7.6v-1.1h7.6c2.4 0 3.3-2.1 3.3-4.2 0-2.2-.8-4.2-3.3-4.2h-1.4v3.2c0 2.8-2.2 5-5 5h-5c-2.3 0-2.3 2.3-2.3 2.3v3c0 2.3 2.3 2.2 2.3 2.2s-2.5.2-5.1.2c-2.6 0-5.1-.2-5.1-.2s-2.4-.2-2.4-2.5v3.4h7.6v1.1h-7.6c-2.4 0-3.3 2.1-3.3 4.2 0 2.2.8 4.2 3.3 4.2h1.4z"/>
    <circle fill="#fff" cx="14.75" cy="20.4" r="1"/>
  </svg>
);
const FlaskLogo = () => (
  <svg viewBox="-2 -2 28 28" width="100%" height="100%" fill="none">
    <path fill="#94A3B8" d="M12 2C8 2 8 4 8 4v7L4 18c0 2.209 3.582 4 8 4s8-1.791 8-4l-4-7V4s0-2-4-2zm0 2c1.477 0 2 .5 2 1v6c0 .552.448 1 1 1l3 5.25V18c0 1.105-2.686 2-6 2s-6-.895-6-2v-.75L9 12c.552 0 1-.448 1-1V5c0-.5.523-1 2-1z" />
  </svg>
);
const MongoLogo = () => (
  <svg viewBox="-2 -2 28 28" width="100%" height="100%" fill="none">
    <path fill="#22C55E" d="M11.66 22.9C10.5 22.9 8.25 18 8.25 12C8.25 6 11.66 1.1 11.66 1.1S15.08 6 15.08 12C15.08 18 12.83 22.9 11.66 22.9Z" />
    <path fill="#16A34A" d="M11.66 1.1C11.66 1.1 8.25 6 8.25 12C8.25 18 10.5 22.9 11.66 22.9V1.1Z" />
  </svg>
);
const NodeLogo = () => (
  <svg viewBox="-2 -2 28 28" width="100%" height="100%" fill="none">
    <path fill="#84CC16" d="M11.83 0L1.44 6V18L11.83 24L22.22 18V6L11.83 0ZM11.83 1.34L21.05 6.66V17.33L11.83 22.65L2.61 17.33V6.66L11.83 1.34ZM11.14 7V17L7.04 14.63V9.38L11.14 7ZM12.52 7L16.63 9.38V12.18L12.52 9.81V7ZM12.52 10.9L16.63 13.28V14.63L12.52 12.25V10.9Z"/>
  </svg>
);
const SVGCanvasLogo = () => (
  <svg viewBox="-2 -2 28 28" width="100%" height="100%" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
//  PARALLAX TRACK DECORATION
// ─────────────────────────────────────────────────────────────
function TrackDecor({ scrollY, speed = 0.1, opacity = 0.045 }) {
  const col = `rgba(245,158,11,${opacity})`;
  return (
    <div className="track-decor" style={{ transform: `translateY(${scrollY * speed}px)` }}>
      <svg width="110%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }} preserveAspectRatio="xMidYMid slice">
        {[12, 35, 58, 80].map(pct => (
          <g key={pct}>
            <line x1="0" y1={`${pct}%`} x2="110%" y2={`${pct}%`} stroke={col} strokeWidth="1.5" />
            <line x1="0" y1={`${pct + 2.8}%`} x2="110%" y2={`${pct + 2.8}%`} stroke={col} strokeWidth="1.5" />
            {[...Array(30)].map((_, j) => (
              <rect key={j} x={`${j * 3.7}%`} y={`${pct - 0.8}%`} width="0.7%" height="4.4%" rx="1" fill={col} />
            ))}
          </g>
        ))}
        {[5, 20, 38, 55, 72, 88].map((x, i) => (
          <circle key={i} cx={`${x}%`} cy={i % 2 === 0 ? '6%' : '94%'} r="5" fill={col} />
        ))}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  LOADING SCREEN — Train reveals the logo
// ─────────────────────────────────────────────────────────────
function TrainSVG() {
  return (
    <svg width="120" height="42" viewBox="0 0 120 42" fill="none">
      {/* Sleek locomotive head */}
      <path d="M 5 15 L 70 15 C 90 15 105 22 110 38 L 5 38 Z" fill="#0F172A" />
      <path d="M 5 15 L 70 15 C 90 15 105 22 110 38 L 5 38 Z" fill="url(#trainGrad)" />
      
      {/* Striping */}
      <path d="M 5 26 L 85 26 L 90 28 L 5 28 Z" fill="#F59E0B" />
      
      {/* Window */}
      <path d="M 45 18 L 75 18 C 85 18 92 22 95 28 L 45 28 Z" fill="#1E3A5F" />
      <path d="M 48 20 L 73 20 C 80 20 86 23 88 26 L 48 26 Z" fill="#3B82F6" opacity="0.6" />
      
      {/* Headlight */}
      <ellipse cx="108" cy="32" rx="2" ry="3" fill="#FCD34D" />
      
      {/* Wheels */}
      <circle cx="20" cy="38" r="4" fill="#334155" stroke="#475569" strokeWidth="1" />
      <circle cx="40" cy="38" r="4" fill="#334155" stroke="#475569" strokeWidth="1" />
      <circle cx="60" cy="38" r="4" fill="#334155" stroke="#475569" strokeWidth="1" />
      
      <defs>
        <linearGradient id="trainGrad" x1="0" y1="15" x2="0" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.6)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function LoadingScreen({ isLoading }) {
  return (
    <div className={`loading-screen${!isLoading ? ' fade-out' : ''}`}>

      <div className="reveal-wrapper">
        {/* Main logo with train wipe reveal */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div className="reveal-text-container">
            <span className="reveal-text-ghost">RAILSIM ML</span>
            <span className="reveal-text-colored">RAILSIM ML</span>
          </div>
          {/* Train runs across the text */}
          <div className="loading-train-wrapper">
            <TrainSVG />
          </div>
        </div>

        <div className="loading-subtitle">
          ML-Powered Railway Simulation
        </div>

        <div className="loading-progress-bar">
          <div className="loading-progress-fill" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TOP BAR
// ─────────────────────────────────────────────────────────────
function StatTicker() {
  const items = ['Tracks: 10', 'Platforms: 8', 'Crossings: 27', 'Signals: 52', 'ML Engine: READY', 'Rush Modes: 3', 'Greedy Fallback: ON'];
  const [idx, setIdx] = React.useState(0);
  useEffect(() => { const t = setInterval(() => setIdx(i => (i + 1) % items.length), 2400); return () => clearInterval(t); }, []);
  return (
    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.68rem', color: '#22C55E', letterSpacing: '0.12em', opacity: 0.9, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#22C55E', animation: 'pulse-dot 2.4s ease-in-out infinite' }} />
      {items[idx]}
    </div>
  );
}
function LiveClock() {
  const [t, setT] = React.useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#64748B', fontSize: '0.72rem' }}>{t.toLocaleTimeString('en-IN', { hour12: false })}</span>;
}

// ─────────────────────────────────────────────────────────────
//  STATS TICKER BAND
// ─────────────────────────────────────────────────────────────
const TICKER_ITEMS = [
  'RULES IMPLEMENTED: 28', 'TRACKS SUPPORTED: UP TO 20', 'RUSH LEVELS: 3',
  'AVG ALLOCATION TIME: <50ms', 'CONFLICT RESOLUTION: REAL-TIME',
  'TRAIN TYPES: 5', 'SESSION EXPORT: JSON', 'CONFLICT DETECTION: 100%',
];
function StatsBand() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="stats-ticker-band">
      <div className="ticker-track">
        <div className="ticker-inner">
          {items.map((item, i) => (
            <React.Fragment key={i}>
              <span className="ticker-item"><span className="ticker-dot">&#x25A0;</span>{item}</span>
              <span className="ticker-sep">&#x25C6;</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  CAPABILITIES
// ─────────────────────────────────────────────────────────────
const CAP_CARDS = [
  { Icon: IcRouting, title: 'Live ML Routing', desc: 'Trains are dynamically allocated to tracks and platforms using a 28-rule constraint engine, with an ML API bridge ready for model inference.' },
  { Icon: IcConflict, title: 'Conflict Detection', desc: 'Real-time overlap detection across all track timelines with automatic signal interlocking and a deterministic resolution fallback.' },
  { Icon: IcMetrics, title: 'Metrics & Heatmaps', desc: 'Per-track congestion heatmaps, average dwell time, throughput counters, and station health score updated every simulation tick.' },
  { Icon: IcBuilder, title: 'Custom Station Builder', desc: 'Design any Indian Railways junction from scratch — tracks, platforms, signals, and crossings — or load a reference station instantly.' },
  { Icon: IcSpecial, title: 'Special Train Injection', desc: 'Inject VIP, Military, or Medical priority trains at any point with forced platform constraints and live override conflict alerts.' },
  { Icon: IcSignal, title: 'Signal Interlocking Engine', desc: 'Physics-based signal clearing: tail-clearance time computed from train length divided by speed, releasing signals the moment the intersection is free.' },
];
function CapabilitiesSection({ scrollY }) {
  return (
    <section className="capabilities-section" id="capabilities" style={{ position: 'relative', overflow: 'hidden' }}>
      <TrackDecor scrollY={scrollY} speed={0.07} opacity={0.04} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', maxWidth: 580, margin: '0 auto 64px' }}>
          <span className="section-eyebrow">Capabilities</span>
          <h2 className="section-title">Next-Gen Railway Simulation</h2>
          <p className="section-sub" style={{ margin: '0 auto' }}>Everything you need to stress-test allocation models under real operational constraints.</p>
        </div>
        <div className="capabilities-grid">
          {CAP_CARDS.map(({ Icon, title, desc }, i) => (
            <div key={i} className="cap-card scroll-reveal" style={{ '--reveal-delay': `${i * 110}ms` }}>
              <div className="cap-icon-wrap"><Icon /></div>
              <h3 className="cap-title">{title}</h3>
              <p className="cap-body">{desc}</p>
              <button className="cap-more">Learn more</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
//  HOW IT WORKS
// ─────────────────────────────────────────────────────────────
const HOW_STEPS = [
  { Icon: IcConfig, num: '01', title: 'Configure', body: "Define your station's infrastructure — tracks, platforms, signals, and crossings — or load a reference station instantly. Every parameter maps to a real operational constraint." },
  { Icon: IcPlay, num: '02', title: 'Simulate', body: "Set the rush level and hit Play. Trains spawn at realistic intervals, the 28-rule engine allocates each one in under 50ms, and the live track map reflects every decision." },
  { Icon: IcAnalyze, num: '03', title: 'Analyze', body: "Review the allocation log, congestion heatmap, and conflict resolution events. Export the full session as JSON to feed your ML model's training pipeline." },
];
function HowItWorksSection({ scrollY }) {
  const ref = useRef(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setDrawn(true); obs.unobserve(el); } }, { threshold: 0.3 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return (
    <section className="how-section" ref={ref} id="how-it-works" style={{ position: 'relative', overflow: 'hidden' }}>
      <TrackDecor scrollY={scrollY} speed={0.1} opacity={0.035} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', maxWidth: 580, margin: '0 auto 64px' }}>
          <span className="section-eyebrow">Process</span>
          <h2 className="section-title">From Station to Decision in Milliseconds</h2>
          <p className="section-sub" style={{ margin: '0 auto' }}>Three phases. One seamless pipeline from layout to insight.</p>
        </div>
        <div className="how-row">
          {HOW_STEPS.map(({ Icon, num, title, body }, i) => (
            <React.Fragment key={i}>
              <div className="how-step scroll-reveal" style={{ '--reveal-delay': `${i * 150}ms` }}>
                <span className="how-step-num">{num}</span>
                <div className="how-step-icon-wrap"><Icon /></div>
                <h3 className="how-step-title">{title}</h3>
                <p className="how-step-body">{body}</p>
              </div>
              {i < HOW_STEPS.length - 1 && (
                <div className="how-arrow">
                  <svg width="56" height="24" viewBox="0 0 56 24" fill="none">
                    <line x1="0" y1="12" x2="46" y2="12" stroke="#F59E0B" strokeWidth="1.5"
                      strokeDasharray="46" strokeDashoffset={drawn ? 0 : 46}
                      style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s' }} />
                    <polyline points="40,6 50,12 40,18" fill="none" stroke="#F59E0B" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      opacity={drawn ? 1 : 0} style={{ transition: 'opacity 0.3s 1.1s' }} />
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
//  ALLOCATION ENGINE
// ─────────────────────────────────────────────────────────────
const RULE_CATS = [
  { sym: 'T', title: 'Temporal Safety', count: 3, rules: ['Timeline collision checks with ±5 min safety buffers', 'Missing arrival/departure time inference from standby durations', 'Minimum dwell time enforcement per platform'] },
  { sym: 'P', title: 'Passenger Optimization', count: 6, rules: ['Platform density matched to train type and crowd volume', 'Coach count vs platform length boundary enforcement', 'Electrification compatibility pre-check', 'Water filling bay availability filtering'] },
  { sym: 'F', title: 'Freight Routing', count: 4, rules: ['Goods-line restriction — Track 9 excluded from goods matrix', 'Bypass and loop track preference for non-stopping freight', 'Goods termination track assignment enforced'] },
  { sym: 'C', title: 'Traffic Control', count: 6, rules: ['Direction match: Up/Down trains filtered before any other rule', 'SUPERFAST express reserved to main_line at 130 kmph', 'Loop line fallback cascade when primary lines are blocked'] },
  { sym: 'S', title: 'Signal Interlocking', count: 5, rules: ['Dynamic signal clearing — Time = track_length / speed', 'Crossing conflict filter for goods and terminal crossings', 'Shunting signal coordination for engine movements'] },
  { sym: 'X', title: 'Termination & Shunting', count: 4, rules: ['Terminal track priority for originating/terminating trains', 'Carshade routing for extended overnight halts', 'Stub-end platform detection and ban for pass-through trains'] },
];

function AnimatedCounter({ target, duration = 1500 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null); const started = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true; obs.unobserve(el);
        const start = performance.now();
        const step = now => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setCount(Math.floor(eased * target));
          if (p < 1) requestAnimationFrame(step); else setCount(target);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.5 });
    obs.observe(el); return () => obs.disconnect();
  }, [target, duration]);
  return <span ref={ref} className="alloc-big-num">{count}</span>;
}

function AllocationEngineSection({ scrollY }) {
  const [openIdx, setOpenIdx] = useState(null);
  return (
    <section className="alloc-section" id="engine" style={{ position: 'relative', overflow: 'hidden' }}>
      <TrackDecor scrollY={scrollY} speed={0.05} opacity={0.03} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 64px' }}>
          <span className="section-eyebrow">Under the Hood</span>
          <h2 className="section-title">28 Rules. Zero Guesswork.</h2>
          <p className="section-sub" style={{ margin: '0 auto' }}>Every train allocation is deterministic — explainable, auditable, and fast enough to never be the bottleneck.</p>
        </div>
        <div className="alloc-layout">
          <div className="scroll-reveal-left" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {RULE_CATS.map((cat, i) => (
              <div key={i} className={`acc-chip${openIdx === i ? ' open' : ''}`} onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                <div className="acc-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <span className="acc-sym">{cat.sym}</span>
                    <span className="acc-title-text">{cat.title}</span>
                    <span className="acc-count">{cat.count} rules</span>
                  </div>
                  <span className="acc-chevron"><ChevronDown /></span>
                </div>
                <div className="acc-body">
                  <div className="acc-body-inner">
                    {cat.rules.map((rule, j) => (
                      <div key={j} className="acc-rule">
                        <span className="acc-bullet">›</span>
                        {rule}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="alloc-counter-side scroll-reveal" style={{ '--reveal-delay': '200ms' }}>
            <AnimatedCounter target={28} />
            <span className="alloc-big-label">deterministic routing constraints</span>
            <div className="alloc-mini-grid">
              {[['5+', 'train types handled'], ['< 50ms', 'average allocation time'], ['100%', 'conflict detection coverage']].map(([v, l], i) => (
                <div key={i} className="alloc-mini-item">
                  <span className="alloc-mini-val">{v}</span>
                  <span className="alloc-mini-lbl">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
//  LIVE DEMO TEASER
// ─────────────────────────────────────────────────────────────
const DEMO_TRACKS = [
  [74, [{ x: 18, w: 148, c: '#F59E0B' }], 'Track 0', ''],
  [122, [{ x: 198, w: 152, c: '#3B82F6' }], 'Track 1', ''],
  [170, [{ x: 48, w: 154, c: '#22C55E' }, { x: 362, w: 76, c: '#F59E0B' }], 'Track 2', ''],
  [218, [], 'Track 3 — Maintenance', 'maint'],
  [266, [{ x: 98, w: 180, c: '#3B82F6' }], 'Track 4', ''],
  [314, [{ x: 334, w: 164, c: '#22C55E' }], 'Track 5 — SUPERFAST', 'sf'],
  [362, [{ x: 26, w: 102, c: '#94A3B8' }], 'Track 6 — Goods', 'goods'],
  [410, [{ x: 236, w: 120, c: '#F59E0B' }], 'Track 7', ''],
];
const DEMO_METRICS = [['Station Health', '94/100', '#22C55E'], ['Throughput', '142 trains', '#F59E0B'], ['Avg Dwell', '4.2 min', '#3B82F6'], ['Conflicts', '3 resolved', '#EF4444']];
const DEMO_CONG = [['T0', 85, '#F59E0B'], ['T1', 45, '#22C55E'], ['T2', 72, '#F59E0B'], ['T4', 91, '#EF4444'], ['T5', 38, '#22C55E'], ['T6', 55, '#F59E0B']];
const DEMO_LOGS = [
  { t: '14:23:01', msg: 'EXP-147  →  Track 0  ·  ML:38ms  ·  Rule #04', c: '#475569' },
  { t: '14:23:09', msg: 'CONFLICT T2 vs T3  →  EXP-148 rerouted  →  Track 0', c: '#EF4444' },
  { t: '14:23:17', msg: 'GDS-022  →  Track 6 (GOODS)  ·  Rule #12', c: '#475569' },
];
function DashboardMockup() {
  return (
    <svg width="100%" viewBox="0 0 820 500" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 0 rgba(255,255,255,0.06) inset, 0 48px 96px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.08)' }}>
      <rect width="820" height="500" rx="16" fill="#0B1629" />
      <rect width="820" height="40" rx="16" fill="#060F1E" />
      <rect y="28" width="820" height="12" fill="#060F1E" />
      <circle cx="20" cy="20" r="5.5" fill="#EF4444" opacity="0.9" />
      <circle cx="36" cy="20" r="5.5" fill="#F59E0B" opacity="0.9" />
      <circle cx="52" cy="20" r="5.5" fill="#22C55E" opacity="0.9" />
      <rect x="96" y="11" width="460" height="18" rx="4" fill="#0F172A" stroke="#1E293B" strokeWidth="1" />
      <text x="326" y="24" fill="#475569" fontSize="8.5" fontFamily="JetBrains Mono,monospace" textAnchor="middle">railsim-ml.vercel.app/sim</text>
      <rect x="0" y="40" width="820" height="30" fill="#050E1C" />
      <text x="16" y="60" fill="#F59E0B" fontSize="10" fontFamily="JetBrains Mono,monospace" fontWeight="700" letterSpacing="1.5">RAILSIM ML</text>
      <text x="114" y="60" fill="#334155" fontSize="8" fontFamily="Inter,sans-serif">Station: HOWRAH-JN  ·  Rush: MODERATE  ·  Tick: 142</text>
      <circle cx="800" cy="55" r="4.5" fill="#22C55E" />
      <text x="789" y="59" fill="#22C55E" fontSize="7.5" fontFamily="JetBrains Mono,monospace" textAnchor="end">LIVE</text>
      <rect x="0" y="70" width="540" height="370" fill="#081018" />
      <text x="14" y="88" fill="#F59E0B" fontSize="7" fontFamily="JetBrains Mono,monospace" letterSpacing="2.5" opacity="0.85">TRACK TIMELINE MAP</text>
      {DEMO_TRACKS.map(([cy, trains, label, type], ti) => (
        <g key={ti}>
          <text x="14" y={cy - 6} fill={type === 'maint' ? '#EF4444' : type === 'sf' ? '#22C55E' : type === 'goods' ? '#F59E0B' : '#2D4055'} fontSize="6.5" fontFamily="JetBrains Mono,monospace">{label}</text>
          <rect x="10" y={cy} width="522" height="2" rx="1" fill={type === 'maint' ? '#2A0A0A' : '#1A2E4A'} opacity="0.9" />
          {[...Array(22)].map((_, si) => <rect key={si} x={10 + si * 24} y={cy - 2} width="3" height="11" rx="0.5" fill={type === 'maint' ? '#1A0808' : '#0E2236'} opacity="0.8" />)}
          <rect x="10" y={cy + 8} width="522" height="2" rx="1" fill={type === 'maint' ? '#2A0A0A' : '#1A2E4A'} opacity="0.9" />
          {type === 'maint' && <rect x="10" y={cy - 4} width="522" height="16" rx="2" fill="rgba(239,68,68,0.06)" stroke="rgba(239,68,68,0.25)" strokeWidth="0.5" strokeDasharray="5 3" />}
          {trains.map((tr, tri) => (
            <g key={tri}>
              <rect x={tr.x} y={cy - 5} width={tr.w} height="20" rx="4" fill={tr.c} opacity="0.88" />
              <rect x={tr.x} y={cy - 5} width="9" height="20" rx="4" fill="rgba(255,255,255,0.16)" />
            </g>
          ))}
        </g>
      ))}
      <rect x="541" y="70" width="1" height="370" fill="#1E2D42" />
      <rect x="541" y="70" width="279" height="370" fill="#060F1E" />
      <text x="558" y="94" fill="#F59E0B" fontSize="7" fontFamily="JetBrains Mono,monospace" letterSpacing="2.5">METRICS</text>
      {DEMO_METRICS.map(([label, val, col], i) => (
        <g key={i}>
          <text x="558" y={112 + i * 30} fill="#475569" fontSize="8.5" fontFamily="Inter,sans-serif">{label}</text>
          <text x="808" y={112 + i * 30} fill={col} fontSize="9.5" fontFamily="JetBrains Mono,monospace" fontWeight="600" textAnchor="end">{val}</text>
          <rect x="558" y={116 + i * 30} width="250" height="0.5" fill="#111827" />
        </g>
      ))}
      <text x="558" y="260" fill="#F59E0B" fontSize="7" fontFamily="JetBrains Mono,monospace" letterSpacing="2.5">CONGESTION</text>
      {DEMO_CONG.map(([label, pct, col], i) => (
        <g key={i}>
          <text x="558" y={276 + i * 24} fill="#2D3F52" fontSize="7" fontFamily="JetBrains Mono,monospace">{label}</text>
          <rect x="558" y={279 + i * 24} width="250" height="9" rx="3" fill="#0A1527" />
          <rect x="558" y={279 + i * 24} width={pct * 2.5} height="9" rx="3" fill={col} opacity="0.78" />
        </g>
      ))}
      <rect x="0" y="440" width="820" height="60" fill="#050C18" />
      <rect x="0" y="440" width="820" height="1" fill="#1A2A3A" />
      <text x="16" y="455" fill="#F59E0B" fontSize="7" fontFamily="JetBrains Mono,monospace" letterSpacing="2.5">ALLOCATION LOG</text>
      {DEMO_LOGS.map((log, i) => (
        <text key={i} x="16" y={467 + i * 11} fill={log.c} fontSize="7" fontFamily="JetBrains Mono,monospace">{'[ ' + log.t + ' ]  ' + log.msg}</text>
      ))}
    </svg>
  );
}

function LiveDemoTeaser({ onLaunch, scrollY }) {
  return (
    <section className="demo-section" id="demo" style={{ position: 'relative', overflow: 'hidden' }}>
      <TrackDecor scrollY={scrollY} speed={0.12} opacity={0.038} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 60px' }}>
          <span className="section-eyebrow">Live Preview</span>
          <h2 className="section-title">See the Engine in Action</h2>
          <p className="section-sub" style={{ margin: '0 auto' }}>Load a sample station and watch the 28-rule engine allocate trains in real time — no setup required.</p>
        </div>
        <div className="floating-mockup scroll-reveal" style={{ maxWidth: 820, width: '100%', position: 'relative' }}>
          <DashboardMockup />
          <div className="annotation-bubble" style={{ top: '14%', left: '0.5%', animationDelay: '0.7s' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', flexShrink: 0, display: 'inline-block' }} />
            Track 0 — Allocated [ML: 38ms]
          </div>
          <div className="annotation-bubble" style={{ top: '38%', left: '24%', animationDelay: '1.4s' }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#F59E0B', fontSize: '0.6rem', marginRight: 2 }}>[!]</span>
            Conflict resolved — rerouted to Track 0
          </div>
          <div className="annotation-bubble" style={{ bottom: '18%', right: '0.5%', animationDelay: '2.1s' }}>
            Station Health: 94 / 100
          </div>
        </div>
        <div style={{ marginTop: 52, textAlign: 'center' }}>
          <button className="cta-primary" onClick={onLaunch}>Launch Simulator →</button>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
//  TEAM
// ─────────────────────────────────────────────────────────────
const TEAM = [
  { name: 'Rajdeep Pal', role: 'ML Engineer', dept: 'Machine Learning', bio: 'Trains the models that train the trains.', status: 'Online', dot: 'green', init: 'R' },
  { name: 'Ritabhas Barick', role: 'Simulation Architect', dept: 'Engine Design', bio: 'Designed the 28-rule allocation engine from scratch.', status: 'Active', dot: 'amber', init: 'R' },
  { name: 'Subhodeep Mondal', role: 'Full Stack Dev', dept: 'Platform Engineering', bio: 'Built the live track map and real-time state engine.', status: 'Routing', dot: 'green', init: 'S' },
  { name: 'Manasi', role: 'UI / UX Designer', dept: 'Design Systems', bio: "Turned a dispatcher's nightmare into a clean dashboard.", status: 'Syncing', dot: 'blue', init: 'M' },
];
function TeamSection({ scrollY }) {
  return (
    <section className="team-section" id="team" style={{ position: 'relative', overflow: 'hidden' }}>
      <TrackDecor scrollY={scrollY} speed={0.045} opacity={0.03} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 64px' }}>
          <span className="section-eyebrow">Meet the Team</span>
          <h2 className="section-title">Architects of RailSim</h2>
          <p className="section-sub" style={{ margin: '0 auto' }}>Four builders. One mission: make railway simulation smart enough for real ML research.</p>
        </div>
        <div className="team-grid">
          {TEAM.map((m, i) => (
            <div key={i} className="team-card scroll-reveal-scale" style={{ '--reveal-delay': `${i * 140}ms` }}>
              <div className="team-avatar">{m.init}</div>
              <div className="team-status">
                <span className={`status-dot ${m.dot}`} />
                <span className="status-text">{m.status}</span>
              </div>
              <p className="team-name">{m.name}</p>
              <p className="team-role">{m.role}</p>
              <p className="team-dept">{m.dept}</p>
              <div className="team-divider" />
              <p className="team-bio">{m.bio}</p>
              <div className="team-socials">
                <a href="#" className="team-social" aria-label="GitHub"><IcGitHub /></a>
                <a href="#" className="team-social" aria-label="Portfolio"><Globe size={14} /></a>
                <a href="#" className="team-social" aria-label="LinkedIn"><IcLinkedIn /></a>
                <a href="#" className="team-social" aria-label="Twitter"><IcTwitter /></a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
//  TECH STACK — Real SVG logos, smooth hover
// ─────────────────────────────────────────────────────────────
const TECH = [
  { Logo: ReactLogo, name: 'React', chipBorder: 'rgba(97,218,251,0.35)', chipBg: 'rgba(97,218,251,0.08)' },
  { Logo: ViteLogo, name: 'Vite', chipBorder: 'rgba(100,108,255,0.35)', chipBg: 'rgba(100,108,255,0.08)' },
  { Logo: ZustandLogo, name: 'Zustand', chipBorder: 'rgba(139,92,246,0.35)', chipBg: 'rgba(139,92,246,0.08)' },
  { Logo: TailwindLogo, name: 'Tailwind', chipBorder: 'rgba(6,182,212,0.35)', chipBg: 'rgba(6,182,212,0.08)' },
  { Logo: SVGCanvasLogo, name: 'SVG Canvas', chipBorder: 'rgba(245,158,11,0.35)', chipBg: 'rgba(245,158,11,0.08)' },
  { Logo: PythonLogo, name: 'Python', chipBorder: 'rgba(59,130,246,0.35)', chipBg: 'rgba(59,130,246,0.08)' },
  { Logo: FlaskLogo, name: 'Flask', chipBorder: 'rgba(100,116,139,0.35)', chipBg: 'rgba(100,116,139,0.08)' },
  { Logo: MongoLogo, name: 'MongoDB', chipBorder: 'rgba(34,197,94,0.35)', chipBg: 'rgba(34,197,94,0.08)' },
  { Logo: NodeLogo, name: 'Node.js', chipBorder: 'rgba(132,204,22,0.35)', chipBg: 'rgba(132,204,22,0.08)' },
];

function TechChip({ Logo, name, chipBorder, chipBg, delay }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="tech-chip scroll-reveal"
      style={{
        '--reveal-delay': `${delay}ms`,
        '--chip-border': chipBorder,
        '--chip-color-10': chipBg,
        borderColor: hovered ? chipBorder : 'var(--border)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="tech-chip-logo"><Logo /></div>
      <span className="tech-chip-name">{name}</span>
    </div>
  );
}

function TechStackSection({ scrollY }) {
  return (
    <section className="tech-section" id="stack" style={{ position: 'relative', overflow: 'hidden' }}>
      <TrackDecor scrollY={scrollY} speed={0.09} opacity={0.038} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 60px' }}>
          <span className="section-eyebrow">Built With</span>
          <h2 className="section-title">The Stack Behind the Signal</h2>
          <p className="section-sub" style={{ margin: '0 auto' }}>Every layer chosen for reliability under simulation load and ML pipeline compatibility.</p>
        </div>
        <div className="tech-strip" style={{ transform: `translateY(${scrollY * 0.05}px)`, willChange: 'transform' }}>
          {TECH.map((t, i) => (
            <TechChip key={i} {...t} delay={i * 60} />
          ))}
        </div>
        <div style={{ transform: `translateY(${scrollY * 0.02}px)`, willChange: 'transform' }}>
          <div className="pull-quote scroll-reveal" style={{ '--reveal-delay': '200ms' }}>
            <span className="pull-quote-mark open">&ldquo;</span>
            <p className="pull-quote-text">A 28-rule constraint engine that allocates tracks in under 50 milliseconds &mdash; before any ML model is even plugged in.</p>
            <span className="pull-quote-mark close">&rdquo;</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
//  HACKATHON BANNER
// ─────────────────────────────────────────────────────────────
const HACK_ITEMS = ['Built for FAR AWAY 2026 Hackathon', 'ML Integration in Active Development', 'Phase 1: Complete', 'Rule Engine: 28 Constraints Deployed', 'Live Track Map: Active', 'Session Export: JSON Ready'];
function HackathonBanner() {
  const items = [...HACK_ITEMS, ...HACK_ITEMS];
  return (
    <div className="hack-band">
      <div className="ticker-track">
        <div className="ticker-inner" style={{ animationDuration: '26s' }}>
          {items.map((item, i) => (
            <React.Fragment key={i}>
              <span className="hack-item">
                <span style={{ color: 'rgba(15,23,42,0.35)', marginRight: 6, fontSize: '0.45rem' }}>&#x25A0;</span>
                {item}
              </span>
              <span className="hack-sep">&#xB7;</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  FOOTER
// ─────────────────────────────────────────────────────────────
function FooterSection({ onNavigate }) {
  return (
    <footer className="landing-footer" id="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-logo">RAILSIM <span style={{ color: '#F59E0B' }}>ML</span></div>
          <p className="footer-tagline">Simulating smarter railways,<br />one track at a time.</p>
        </div>
        <div>
          <p className="footer-col-head">Quick Links</p>
          <ul className="footer-links">
            {[{ l: 'Home', h: '/' }, { l: 'Station Builder', h: '/builder' }, { l: 'Simulation', h: '/sim' }, { l: 'Team', h: '#team' }, { l: 'GitHub', h: 'https://github.com/', t: '_blank' }].map((link, i) => (
              <li key={i}>
                <a href={link.h} target={link.t} rel={link.t ? 'noopener noreferrer' : undefined}
                  onClick={link.h.startsWith('/') && !link.t ? e => { e.preventDefault(); onNavigate(link.h); } : undefined}>
                  {link.l}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="footer-col-head">Project</p>
          <ul className="footer-links">
            <li><span>Built for FAR AWAY 2026</span></li>
            <li><span>&#169; 2026 RailSim ML Team</span></li>
            <li><span>MIT License</span></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span className="footer-bottom-txt">RAILSIM ML &middot; FAR AWAY 2026 &middot; Phase 1 Complete</span>
        <span className="footer-bottom-txt" style={{ color: '#F59E0B' }}>28 rules &middot; Real-time &middot; Conflict-aware</span>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────
//  MAIN LANDING PAGE
// ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const { setStation, enqueueTrains, startSimulation } = useSimStore();
  const [isLoading, setIsLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [sampleLabel, setSampleLabel] = useState('Click Load Sample Station to test random layouts');

  useEffect(() => {
    const id = 'railsim-styles';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id; tag.textContent = STYLES;
      document.head.appendChild(tag);
    }
  }, []);

  useEffect(() => { const t = setTimeout(() => setIsLoading(false), 3200); return () => clearTimeout(t); }, []);

  useEffect(() => {
    let ticking = false;
    const handle = () => {
      if (!ticking) {
        requestAnimationFrame(() => { setScrollY(window.scrollY); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const targets = document.querySelectorAll('.scroll-reveal, .scroll-reveal-scale, .scroll-reveal-left');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    targets.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [isLoading]);

  const loadSampleStation = useCallback(() => {
    const data = generateRandomStation();
    const st = data.station;
    const tc = Object.keys(st.tracks || {}).length;
    const pc = Object.keys(st.platforms || {}).length;
    setSampleLabel(`Sample: ${st.metadata.name} · ${tc} Tracks · ${pc} Platforms`);
    setStation(st);
    enqueueTrains(generateInitialBatch('basic', 20));
    startSimulation();
    try {
      const prev = JSON.parse(sessionStorage.getItem('railsim_session') || '{}');
      sessionStorage.setItem('railsim_session', JSON.stringify({ ...prev, stationSource: 'sample', simStarted: true, simTime: 0, rushLevel: 'basic' }));
    } catch { }
    navigate('/sim');
  }, [navigate, setStation, enqueueTrains, startSimulation]);

  const tagDeltas = [0.05, 0.08, 0.05, 0.07, 0.09, 0.06];

  return (
    <div style={{ minHeight: '100vh', width: '100vw', background: '#F8FAFC', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <LoadingScreen isLoading={isLoading} />

      {/* ── Fixed top bar ── */}
      <div className="top-bar">
        <StatTicker />
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {['Capabilities', 'How It Works', 'Engine', 'Team'].map((label, i) => (
            <a key={i} href={['#capabilities', '#how-it-works', '#engine', '#team'][i]}
              style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.8rem', color: '#64748B', textDecoration: 'none', transition: 'color 0.2s', letterSpacing: '0.01em' }}
              onMouseEnter={e => e.target.style.color = '#F59E0B'}
              onMouseLeave={e => e.target.style.color = '#64748B'}>
              {label}
            </a>
          ))}
          <LiveClock />
        </div>
      </div>

      {/* ══════ HERO ══════ */}
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 44, overflow: 'hidden' }}>
        {/* Parallax grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `linear-gradient(rgba(245,158,11,0.033) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.033) 1px,transparent 1px)`,
          backgroundSize: '60px 60px',
          transform: `translateY(${scrollY * 0.35}px)`, willChange: 'transform',
        }} />
        {/* Subtle radial glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(245,158,11,0.05) 0%, transparent 70%)',
        }} />

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 40px', maxWidth: 700, transform: `translateY(${scrollY * -0.12}px)`, willChange: 'transform' }}>
          <div style={{ marginBottom: 20 }}>
            <span className="hero-tag">Station Configuration → Simulation</span>
          </div>
          <h1 className="hero-title">
            RAILSIM <span className="hero-title-ml">ML</span>
          </h1>
          <p className="hero-subtitle">
            A professional railway station simulation tool for stress-testing ML models for optimal train routing and platform assignment.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, justifyContent: 'center', marginBottom: 48 }}>
            {['ML API Bridge', '3 Rush Levels', 'Live Track Map', 'Special Trains', 'Conflict Detection', 'Session Export'].map((tag, i) => (
              <span key={tag} className="hero-tag-pill"
                style={{ transform: `translateY(${scrollY * tagDeltas[i]}px)` }}>
                {tag}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="cta-primary" onClick={() => navigate('/builder')} id="btn-build-station">Build New Station</button>
            <button className="cta-secondary" onClick={loadSampleStation} id="btn-load-sample">Load Sample Station</button>
          </div>

          <p style={{ marginTop: 24, color: '#94A3B8', fontSize: '0.72rem', fontFamily: "'JetBrains Mono',monospace" }}>
            {sampleLabel}
          </p>
        </div>

        {/* Status badges */}
        <div style={{ position: 'absolute', bottom: 44, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 32, transform: `translateY(${scrollY * 0.18}px)`, willChange: 'transform' }}>
          {[{ label: 'ML-OPTIMIZED', color: '#3B82F6' }, { label: 'REAL-TIME', color: '#10B981' }, { label: 'CONFLICT-AWARE', color: '#F59E0B' }].map(item => (
            <span key={item.label} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.62rem', letterSpacing: '0.18em', color: item.color, opacity: 0.85 }}>
              &#x25CF; {item.label}
            </span>
          ))}
        </div>
      </div>
      {/* ══════ END HERO ══════ */}

      <StatsBand />
      <CapabilitiesSection scrollY={scrollY} />
      <HowItWorksSection scrollY={scrollY} />
      <AllocationEngineSection scrollY={scrollY} />
      <LiveDemoTeaser onLaunch={loadSampleStation} scrollY={scrollY} />
      <TeamSection scrollY={scrollY} />
      <TechStackSection scrollY={scrollY} />
      <HackathonBanner />
      <FooterSection onNavigate={navigate} />
    </div>
  );
}