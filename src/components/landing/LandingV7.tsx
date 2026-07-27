'use client';

/**
 * FootyEdge — Public landing (EN) · v7
 * Hero con campo estilo estadio + mini-cards de producto flotando,
 * scrub compacto 180vh, tiers reales, logo 112px.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { animate, stagger } from 'animejs';

const C = {
  ink: '#070d1a',
  navy: '#0a1626',
  card: 'rgba(13,30,53,0.6)',
  cardSolid: '#0d1e35',
  line: '#1a2e4a',
  green: '#00c878',
  greenDim: 'rgba(0,200,120,0.14)',
  gold: '#f6b93b',
  white: '#f2f6ff',
  mute: '#8ba2c0',
};

const bebas: CSSProperties = { fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.02em' };
const mono: CSSProperties = { fontFamily: '"DM Mono", ui-monospace, monospace' };
const slant: CSSProperties = { ...bebas, transform: 'skewX(-8deg)', display: 'inline-block' };

const SCENES_EN = [
  { tag: '01 · THE MODEL', title: 'Dixon-Coles under the hood', body: 'A Poisson goal model with dynamic home advantage, temporal decay and per-league calibration — tuned independently across 30+ leagues.' },
  { tag: '02 · SIGNALS', title: 'Signal, not opinions', body: 'Every market is priced by the model and compared against live market prices. Only signals with positive expected value make the board.' },
  { tag: '03 · RANKINGS', title: 'Team markets, ranked', body: 'Over 0.5–3.5 and BTTS hit-rates for every team, with Total / Home / Away splits built from 12,000+ historical matches.' },
  { tag: '04 · AI ANALYSIS', title: 'A scout in the loop', body: 'On-demand AI match reports with live web context — injuries, news, form — layered on top of the numbers.' },
];
const SCENES_ES = [
  { tag: '01 · EL MODELO', title: 'Dixon-Coles por dentro', body: 'Un modelo Poisson de goles con ventaja local dinámica, decaimiento temporal y calibración por liga — ajustado de forma independiente en más de 30 ligas.' },
  { tag: '02 · SEÑALES', title: 'Señal, no opiniones', body: 'Cada mercado se calcula con el modelo y se compara contra los precios reales de las casas. Solo las señales con valor esperado positivo llegan al tablero.' },
  { tag: '03 · RANKINGS', title: 'Mercados por equipo, ordenados', body: 'Tasas de acierto de Over 0.5–3.5 y BTTS para cada equipo, con splits Total / Casa / Fuera construidos con más de 12,000 partidos históricos.' },
  { tag: '04 · ANÁLISIS IA', title: 'Un ojeador en el proceso', body: 'Informes de partido generados por IA bajo demanda, con contexto web en vivo — lesiones, noticias, forma — sobre los números del modelo.' },
];

const FEATURES_EN = [
  { k: 'MODEL', t: 'A pricing engine, not a tipster', d: 'FootyEdge prices every match itself. Dixon-Coles Poisson with per-league rho, decayed form and dynamic home advantage produce true probabilities for 1X2, Over/Under and BTTS.', stat: 30, statSuffix: '', statText: '', statLabel: 'leagues calibrated' },
  { k: 'SIGNAL', t: 'Signals surfaced daily', d: 'Model prices meet market prices every morning. Anything trading above its fair probability is flagged with its statistical edge — filtered by per-market thresholds so noise stays out.', stat: null, statSuffix: '', statText: 'EV+', statLabel: 'only positive-signal picks' },
  { k: 'DATA', t: 'Rankings & filters', d: 'Per-team market stats across three seasons of history. Sort any league by Over 2.5 rate, BTTS, home splits — then filter fixtures that match your pattern.', stat: 12, statSuffix: 'k', statText: '', statLabel: 'matches of history' },
  { k: 'AI', t: 'AI match analysis', d: 'One tap unlocks a narrative report for any fixture: current injuries, tactical context and news pulled from the live web, reconciled with the model’s numbers.', stat: null, statSuffix: '', statText: '$1.39', statLabel: 'per report, cached forever', note: 'Optional — Pro and Elite plans include a few free reports each month.' },
];
const FEATURES_ES = [
  { k: 'MODELO', t: 'Un motor de precios, no un pronosticador', d: 'FootyEdge calcula cada partido por sí mismo. Poisson Dixon-Coles con rho por liga, forma con decaimiento y ventaja local dinámica generan probabilidades reales para 1X2, Over/Under y BTTS.', stat: 30, statSuffix: '', statText: '', statLabel: 'ligas calibradas' },
  { k: 'SEÑAL', t: 'Señales detectadas cada día', d: 'Los precios del modelo se comparan cada mañana contra los precios del mercado. Todo lo que cotiza por encima de su probabilidad justa se marca con su ventaja estadística — filtrado por umbrales de cada mercado para que no entre ruido.', stat: null, statSuffix: '', statText: 'EV+', statLabel: 'solo señales positivas' },
  { k: 'DATOS', t: 'Rankings y filtros', d: 'Estadísticas de mercado por equipo en tres temporadas de historial. Ordena cualquier liga por tasa de Over 2.5, BTTS, splits en casa — y filtra los partidos que calzan con tu patrón.', stat: 12, statSuffix: 'k', statText: '', statLabel: 'partidos de historial' },
  { k: 'IA', t: 'Análisis de partido con IA', d: 'Un clic desbloquea un informe narrativo para cualquier partido: lesiones actuales, contexto táctico y noticias sacadas de la web en vivo, cruzadas con los números del modelo.', stat: null, statSuffix: '', statText: '$1.39', statLabel: 'por informe, guardado para siempre', note: 'Opcional — los planes Pro y Elite incluyen algunos informes gratis cada mes.' },
];

type TierItem = { t: string; on: boolean };
type Tier = { name: string; price: string; per: string; badge: string | null; gold: boolean; hot: boolean; items: TierItem[]; cta: string };

const TIERS_EN: Tier[] = [
  {
    name: 'FREE', price: '$0', per: 'forever', badge: null, gold: false, hot: false, cta: 'Start for free',
    items: [
      { t: '3 daily signals (Over 1.5)', on: true },
      { t: 'Full match analysis', on: true },
      { t: 'League standings', on: true },
      { t: 'Confirmed lineups', on: true },
      { t: 'Match table with probabilities', on: true },
      { t: 'H2H and team form', on: false },
      { t: 'Over 2.5 / BTTS / 1X2 signals', on: false },
      { t: 'Bankroll Advisor', on: false },
      { t: 'AI match analyses', on: false },
    ],
  },
  {
    name: 'PRO', price: '$9.99', per: '/mo', badge: '⚡ MOST POPULAR', gold: false, hot: true, cta: 'Start with Pro',
    items: [
      { t: 'Top 8 signals (all markets)', on: true },
      { t: 'Full BTTS + Overs', on: true },
      { t: 'Complete table with all %', on: true },
      { t: 'H2H, Form, Injuries, Lineups', on: true },
      { t: 'Team comparator', on: true },
      { t: 'Bankroll Advisor', on: true },
      { t: 'Most likely scorelines', on: true },
      { t: 'Full live matches', on: true },
      { t: '3 AI match analyses / month', on: true },
      { t: 'Value Radar', on: false },
      { t: 'Early Line Hunter', on: false },
    ],
  },
  {
    name: 'ELITE', price: '$16.99', per: '/mo', badge: '👑 MAXIMUM POWER', gold: true, hot: false, cta: 'Start with Elite',
    items: [
      { t: 'Everything in Pro', on: true },
      { t: 'Top 20 daily signals', on: true },
      { t: '🎯 Value Radar — market inefficiency scanner', on: true },
      { t: '⚡ Early Line Hunter — detect value early', on: true },
      { t: '10 AI match analyses / month', on: true },
      { t: 'Custom favorite leagues', on: true },
      { t: 'Advanced match stats (xG, shots, corners)', on: true },
      { t: 'Priority support', on: true },
    ],
  },
];

const TIERS_ES: Tier[] = [
  {
    name: 'FREE', price: '$0', per: 'siempre', badge: null, gold: false, hot: false, cta: 'Empezar gratis',
    items: [
      { t: '3 señales diarias (Over 1.5)', on: true },
      { t: 'Análisis completo de partido', on: true },
      { t: 'Tabla de posiciones', on: true },
      { t: 'Alineaciones confirmadas', on: true },
      { t: 'Tabla de partidos con probabilidades', on: true },
      { t: 'H2H y forma del equipo', on: false },
      { t: 'Señales de Over 2.5 / BTTS / 1X2', on: false },
      { t: 'Asesor de Bankroll', on: false },
      { t: 'Análisis de partido con IA', on: false },
    ],
  },
  {
    name: 'PRO', price: '$9.99', per: '/mes', badge: '⚡ MÁS POPULAR', gold: false, hot: true, cta: 'Empezar con Pro',
    items: [
      { t: 'Top 8 señales (todos los mercados)', on: true },
      { t: 'BTTS + Overs completos', on: true },
      { t: 'Tabla completa con todos los %', on: true },
      { t: 'H2H, Forma, Bajas, Alineaciones', on: true },
      { t: 'Comparador de equipos', on: true },
      { t: 'Asesor de Bankroll', on: true },
      { t: 'Marcadores más probables', on: true },
      { t: 'Partidos en vivo completos', on: true },
      { t: '3 análisis de partido con IA / mes', on: true },
      { t: 'Value Radar', on: false },
      { t: 'Early Line Hunter', on: false },
    ],
  },
  {
    name: 'ELITE', price: '$16.99', per: '/mes', badge: '👑 MÁXIMO PODER', gold: true, hot: false, cta: 'Empezar con Elite',
    items: [
      { t: 'Todo lo de Pro', on: true },
      { t: 'Top 20 señales diarias', on: true },
      { t: '🎯 Value Radar — escáner de ineficiencias del mercado', on: true },
      { t: '⚡ Early Line Hunter — detecta valor antes que nadie', on: true },
      { t: '10 análisis de partido con IA / mes', on: true },
      { t: 'Ligas favoritas personalizadas', on: true },
      { t: 'Estadísticas avanzadas (xG, tiros, córners)', on: true },
      { t: 'Soporte prioritario', on: true },
    ],
  },
];

function Logo({ size = 34 }: { size?: number }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return <span style={{ ...bebas, fontStyle: 'italic', fontSize: size * 0.85, color: C.white }}>FOOTY<span style={{ color: C.green }}>EDGE</span></span>;
  }
  return <img src="/logo.png" alt="FootyEdge" style={{ height: size, width: 'auto', display: 'block' }} onError={() => setBroken(true)} />;
}

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const dur = 1400;
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return <span ref={ref}>{v.toLocaleString('en-US')}{suffix}</span>;
}

const FAQS_EN = [
  { q: 'What is FootyEdge?', a: "FootyEdge is a statistical pricing engine for football matches. It runs a Dixon-Coles Poisson model across 30+ leagues and compares its own probabilities against live market odds, surfacing only the matches where a real statistical edge exists." },
  { q: 'Which leagues are covered?', a: 'Over 30 leagues across Europe, the Americas and Asia, including Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Brasileirão, MLS, Liga MX, Saudi Pro League and more.' },
  { q: 'How is the edge / EV calculated?', a: 'The model prices every match independently using per-league calibration, decayed team form and dynamic home advantage, then compares that probability to the market-implied probability from live odds. Only markets trading above their fair price are flagged.' },
  { q: 'How often is the data updated?', a: 'The full pipeline runs automatically several times a day, and results are settled continuously as matches finish — no manual refresh needed.' },
  { q: "What's included in each plan?", a: 'Free gives you a limited daily view of signals. Pro and Elite unlock the full board, rankings history, and a set of free AI match reports each month. See the pricing above for the full breakdown.' },
  { q: 'Is this gambling advice?', a: "No. FootyEdge surfaces statistical signals, not guaranteed outcomes — no model can predict individual match results with certainty. It's a decision-support tool, not a promise of profit. You must be 18+ and should always gamble responsibly." },
];
const FAQS_ES = [
  { q: '¿Qué es FootyEdge?', a: 'FootyEdge es un motor estadístico de precios para partidos de fútbol. Corre un modelo Poisson Dixon-Coles en más de 30 ligas y compara sus propias probabilidades contra las cuotas reales del mercado, mostrando solo los partidos donde existe una ventaja estadística real.' },
  { q: '¿Qué ligas cubre?', a: 'Más de 30 ligas de Europa, América y Asia, incluyendo Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Brasileirão, MLS, Liga MX, Saudi Pro League y más.' },
  { q: '¿Cómo se calcula el edge / EV?', a: 'El modelo calcula cada partido de forma independiente usando calibración por liga, forma de equipo con decaimiento y ventaja local dinámica, y compara esa probabilidad contra la probabilidad implícita del mercado en las cuotas reales. Solo se marcan los mercados que cotizan por encima de su precio justo.' },
  { q: '¿Cada cuánto se actualizan los datos?', a: 'El pipeline completo corre automáticamente varias veces al día, y los resultados se liquidan de forma continua conforme terminan los partidos — no necesitas actualizar manualmente.' },
  { q: '¿Qué incluye cada plan?', a: 'Free te da una vista diaria limitada de señales. Pro y Elite desbloquean el tablero completo, historial de rankings, y algunos informes de IA gratis cada mes. Mira los precios arriba para el detalle completo.' },
  { q: '¿Esto es una recomendación de apuesta?', a: 'No. FootyEdge muestra señales estadísticas, no resultados garantizados — ningún modelo puede predecir con certeza el resultado de un partido individual. Es una herramienta de apoyo a la decisión, no una promesa de ganancia. Debes ser mayor de 18 años y apostar siempre con responsabilidad.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, background: C.card, overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: C.white, padding: '18px 22px', fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span>{q}</span>
        <span style={{ ...mono, color: C.green, fontSize: 18, flexShrink: 0, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>+</span>
      </button>
      {open && (
        <div style={{ padding: '0 22px 20px', color: C.mute, fontSize: 14.5, lineHeight: 1.65 }}>{a}</div>
      )}
    </div>
  );
}

function Particles() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const COUNT = 34;
    const dots: HTMLDivElement[] = [];
    for (let i = 0; i < COUNT; i++) {
      const d = document.createElement('div');
      const size = 2 + Math.random() * 3;
      d.style.position = 'absolute';
      d.style.left = `${Math.random() * 100}%`;
      d.style.top = `${Math.random() * 100}%`;
      d.style.width = `${size}px`;
      d.style.height = `${size}px`;
      d.style.borderRadius = '50%';
      d.style.background = Math.random() > 0.6 ? 'rgba(0,200,120,0.55)' : 'rgba(0,200,120,0.22)';
      d.style.pointerEvents = 'none';
      wrap.appendChild(d);
      dots.push(d);
    }

    animate(dots, {
      translateY: () => [0, -18 - Math.random() * 40],
      translateX: () => [0, (Math.random() - 0.5) * 30],
      opacity: [
        { to: 0.9, duration: 1200 },
        { to: 0.1, duration: 1800 },
      ],
      scale: [
        { to: 1.2, duration: 1200 },
        { to: 0.6, duration: 1800 },
      ],
      duration: 3000,
      delay: stagger(90, { start: 0 }),
      loop: true,
      ease: 'inOutSine',
    });

    return () => { dots.forEach((d) => d.remove()); };
  }, []);

  return (
    <div ref={wrapRef} aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }} />
  );
}

const BIG_LEAGUES = [
  { flag: '🇪🇸', name: 'LaLiga', date: new Date('2026-08-15T00:00:00Z') },
  { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', name: 'Premier League', date: new Date('2026-08-21T00:00:00Z') },
  { flag: '🇮🇹🇫🇷', name: 'Serie A / Ligue 1', date: new Date('2026-08-21T00:00:00Z') },
  { flag: '🇩🇪', name: 'Bundesliga', date: new Date('2026-08-28T00:00:00Z') },
];

function daysUntil(date: Date) {
  const now = new Date();
  const diff = date.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function KickoffCard({ flag, name, date, lang }: { flag: string; name: string; date: Date; lang: string }) {
  const [days, setDays] = useState(() => daysUntil(date));

  useEffect(() => {
    const id = setInterval(() => setDays(daysUntil(date)), 1000 * 60 * 60);
    return () => clearInterval(id);
  }, [date]);

  const started = days === 0 && new Date() >= date;

  return (
    <div data-reveal style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: '24px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 30, marginBottom: 10 }}>{flag}</div>
      <div style={{ ...bebas, fontSize: 20, color: C.white, textTransform: 'uppercase', marginBottom: 10 }}>{name}</div>
      {started ? (
        <div style={{ ...mono, fontSize: 13, color: C.green, fontWeight: 700 }}>{lang === 'es' ? '¡EN JUEGO!' : 'LIVE NOW!'}</div>
      ) : (
        <>
          <div style={{ ...bebas, fontSize: 44, color: C.green, lineHeight: 1 }}>{days}</div>
          <div style={{ ...mono, fontSize: 11, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{lang === 'es' ? (days === 1 ? 'día restante' : 'días restantes') : (days === 1 ? 'day left' : 'days left')}</div>
        </>
      )}
      <div style={{ ...mono, fontSize: 11, color: C.mute, marginTop: 10 }}>
        {date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { day: '2-digit', month: 'long', timeZone: 'UTC' })}
      </div>
    </div>
  );
}

export default function LandingV7({ lang = 'en' }: { lang?: string }) {
  const SCENES = lang === 'es' ? SCENES_ES : SCENES_EN;
  const FEATURES = lang === 'es' ? FEATURES_ES : FEATURES_EN;
  const TIERS = lang === 'es' ? TIERS_ES : TIERS_EN;
  const FAQS = lang === 'es' ? FAQS_ES : FAQS_EN;
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);
  const [teasers, setTeasers] = useState<any[]>([]);
  const rigRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 40);
        const rig = rigRef.current;
        if (rig) {
          const rect = rig.getBoundingClientRect();
          const total = rig.offsetHeight - window.innerHeight;
          const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
          setProgress(p);
          const v = videoRef.current;
          if (v && v.duration && !isNaN(v.duration)) v.currentTime = p * v.duration;
        }
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = '/demo.mp4';
    v.onloadedmetadata = () => setHasVideo(true);
  }, []);

  useEffect(() => {
    fetch('/api/public/teaser-picks').then(r => r.json()).then(d => setTeasers(d.teasers ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('fe-in'); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cards = document.querySelectorAll('.fe-card');
    if (!cards.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const i = Array.from(cards).indexOf(entry.target as Element);
        animate(entry.target, {
          scale: [0.86, 1],
          rotate: [i % 2 === 0 ? -2.5 : 2.5, 0],
          duration: 800,
          delay: i * 90,
          ease: 'outExpo',
        });
        io.unobserve(entry.target);
      });
    }, { threshold: 0.25 });

    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  const scene = Math.min(SCENES.length - 1, Math.floor(progress * SCENES.length));
  const sceneP = progress * SCENES.length - scene;
  const tilt = (progress - 0.5) * 6;

  return (
    <main style={{ background: C.ink, color: C.white, overflowX: 'clip' }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* header */}
      <header
        style={{
          position: 'fixed', inset: '0 0 auto 0', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 clamp(16px, 4vw, 48px)', height: scrolled ? 96 : 132,
          background: scrolled ? 'rgba(7,13,26,0.88)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? `1px solid ${C.line}` : '1px solid transparent',
          transition: 'height .3s ease, background .3s ease, border-color .3s ease',
        }}
      >
        <a href={`/${lang}`} style={{ textDecoration: 'none' }}><Logo size={scrolled ? 90 : 132} /></a>

        <nav className="fe-nav" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {(lang === 'es'
            ? [['#engine', 'Motor'], ['#features', 'Producto'], ['#pricing', 'Precios']]
            : [['#engine', 'Engine'], ['#features', 'Product'], ['#pricing', 'Pricing']]
          ).map(([h, l]) => (
            <a key={h} className="fe-navlink" href={h} style={{ ...mono, fontSize: 13, color: C.mute, textDecoration: 'none' }}>{l}</a>
          ))}
          <a className="fe-navlink" href={`/${lang}/auth/login`} style={{ ...mono, fontSize: 13, color: C.white, textDecoration: 'none' }}>{lang === 'es' ? 'Entrar' : 'Log in'}</a>
          <a className="fe-btn" href={`/${lang}/auth/register`} style={btnStyle(true, 'sm')}>{lang === 'es' ? 'Empezar gratis' : 'Start free'}</a>
        </nav>

        <button className="fe-burger" aria-label="Menu" onClick={() => setMenu(!menu)}
          style={{ display: 'none', background: 'none', border: `2px solid ${C.line}`, borderRadius: 10, color: C.white, padding: '8px 12px', ...mono, fontSize: 13 }}>
          {menu ? 'CLOSE' : 'MENU'}
        </button>
      </header>

      {menu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(7,13,26,0.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 34 }}>
          {(lang === 'es'
            ? [['#engine', 'MOTOR'], ['#features', 'PRODUCTO'], ['#pricing', 'PRECIOS'], [`/${lang}/auth/login`, 'ENTRAR']]
            : [['#engine', 'ENGINE'], ['#features', 'PRODUCT'], ['#pricing', 'PRICING'], [`/${lang}/auth/login`, 'LOG IN']]
          ).map(([h, l], i) => (
            <a key={h} href={h} onClick={() => setMenu(false)} className="fe-menu-item" style={{ ...slant, fontSize: 46, color: C.white, textDecoration: 'none', animationDelay: `${i * 0.07}s` }}>{l}</a>
          ))}
          <a href={`/${lang}/auth/register`} onClick={() => setMenu(false)} style={btnStyle(true, 'lg')}>{lang === 'es' ? 'Empezar gratis' : 'Start free'}</a>
        </div>
      )}

      {/* hero */}
      <section style={{ position: 'relative', minHeight: '100svh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(130px,17vh,190px) clamp(16px,5vw,64px) 80px' }}>
        {/* campo estilo estadio, anclado abajo */}
        <div className="fe-pitchwrap" aria-hidden>
          <svg className="fe-pitch" viewBox="0 0 1600 900" fill="none" preserveAspectRatio="xMidYMax slice">
            <defs>
              <filter id="pitchGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <g stroke="rgba(0,200,120,0.3)" strokeWidth="3" fill="none">
              <rect x="120" y="60" width="1360" height="780" rx="4" />
              <line x1="800" y1="60" x2="800" y2="840" />
              <circle cx="800" cy="450" r="130" filter="url(#pitchGlow)" stroke="rgba(0,200,120,0.45)" />
              <circle cx="800" cy="450" r="7" fill="rgba(0,200,120,0.5)" stroke="none" />
              <rect x="120" y="235" width="240" height="430" />
              <rect x="120" y="340" width="90" height="220" />
              <path d="M360 355 A 130 130 0 0 1 360 545" />
              <rect x="1240" y="235" width="240" height="430" />
              <rect x="1390" y="340" width="90" height="220" />
              <path d="M1240 355 A 130 130 0 0 0 1240 545" />
              <path d="M120 90 A 30 30 0 0 0 150 60" />
              <path d="M1450 60 A 30 30 0 0 0 1480 90" />
              <path d="M150 840 A 30 30 0 0 0 120 810" />
              <path d="M1480 810 A 30 30 0 0 0 1450 840" />
            </g>
            <circle cx="330" cy="450" r="6" fill="rgba(0,200,120,0.4)" />
            <circle cx="1270" cy="450" r="6" fill="rgba(0,200,120,0.4)" />
            {/* franjas de cesped */}
            <g fill="rgba(0,200,120,0.03)">
              {[0, 2, 4, 6].map((i) => <rect key={i} x={120 + i * 170} y="60" width="170" height="780" />)}
            </g>
          </svg>
        </div>

        <Particles />

        <div className="fe-halftone" aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

        {/* elementos de producto flotando */}
        <div className="fe-floaties" aria-hidden>
          {/* mini card: value bet */}
          <div className="fe-mini fe-mini-bet" style={{ ...mono }}>
            <div className="fe-mini-head">{lang === 'es' ? 'HOY · SEÑAL' : 'TODAY · SIGNAL'}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline' }}>
              <span style={{ color: C.white, fontSize: 13 }}>Girona — Betis</span>
              <span style={{ color: C.mute, fontSize: 11 }}>Over 2.5</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 6 }}>
              <span style={{ color: C.mute, fontSize: 11 }}>price 2.10</span>
              <span style={{ color: C.green, fontSize: 13, fontWeight: 700 }}>+14.2% edge</span>
            </div>
          </div>

          {/* mini card: ranking */}
          <div className="fe-mini fe-mini-rank" style={{ ...mono }}>
            <div className="fe-mini-head">{lang === 'es' ? 'OVER 2.5 · TOP EQUIPOS' : 'OVER 2.5 · TOP TEAMS'}</div>
            {[['Bayern', 86], ['Girona', 79], ['Toulouse', 71]].map(([t, v]) => (
              <div key={t as string} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 30px', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <span style={{ color: C.white, fontSize: 11 }}>{t}</span>
                <span style={{ height: 5, background: C.line, borderRadius: 3, overflow: 'hidden', display: 'block' }}>
                  <span style={{ display: 'block', height: '100%', width: `${v}%`, background: C.green, borderRadius: 3 }} />
                </span>
                <span style={{ color: C.green, fontSize: 11, textAlign: 'right' }}>{v}%</span>
              </div>
            ))}
          </div>

          {/* mini card: kelly */}
          <div className="fe-mini fe-mini-kelly" style={{ ...mono }}>
            <div className="fe-mini-head">{lang === 'es' ? 'STAKE KELLY' : 'KELLY STAKE'}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ ...bebas, fontSize: 30, color: C.green, letterSpacing: '0.02em' }}>1.8u</span>
              <span style={{ color: C.mute, fontSize: 11 }}>{lang === 'es' ? 'del bankroll' : 'of bankroll'}</span>
            </div>
          </div>



          {/* chips */}
          <span className="fe-chip fe-chip-a" style={{ ...mono }}>BTTS 67% HR</span>
          <span className="fe-chip fe-chip-b" style={{ ...mono }}>ρ −0.08</span>
          <span className="fe-chip fe-chip-c" style={{ ...mono }}>30+ LEAGUES</span>
        </div>

        <p className="fe-up" style={{ ...mono, fontSize: 13, color: C.green, marginBottom: 18, animationDelay: '0.05s', position: 'relative' }}>{lang === 'es' ? '▮ ANALÍTICA DE FÚTBOL' : '▮ FOOTBALL ANALYTICS'}</p>

        <h1 style={{ margin: 0, textTransform: 'uppercase', lineHeight: 0.88, position: 'relative' }}>
          <span className="fe-up" style={{ ...slant, fontSize: 'clamp(64px, 12vw, 170px)', animationDelay: '0.15s' }}>{lang === 'es' ? 'Fútbol, impulsado' : 'Football, powered'}</span>
          <br />
          <span className="fe-up fe-outline" style={{ ...slant, fontSize: 'clamp(64px, 12vw, 170px)', animationDelay: '0.3s' }}>{lang === 'es' ? 'por datos.' : 'by data.'}</span>
        </h1>

        <p className="fe-up" style={{ maxWidth: 560, fontSize: 'clamp(16px,1.4vw,19px)', color: C.mute, lineHeight: 1.6, margin: '30px 0 38px', animationDelay: '0.45s', position: 'relative' }}>
          {lang === 'es'
            ? 'FootyEdge calcula cada partido con su propio motor estadístico y detecta señales estadísticas relevantes — todos los días, en más de 30 ligas.'
            : 'FootyEdge prices every match with its own statistical engine and surfaces the signals that matter — every day, across 30+ leagues.'}
        </p>

        <div className="fe-up" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', animationDelay: '0.6s', position: 'relative' }}>
          <a className="fe-btn fe-pulse" href={`/${lang}/auth/register`} style={btnStyle(true, 'lg')}>{lang === 'es' ? 'Ver las señales de hoy →' : "See today's signals →"}</a>
          <a className="fe-btn" href="#engine" style={btnStyle(false, 'lg')}>{lang === 'es' ? 'Cómo funciona el motor' : 'How the engine works'}</a>
        </div>

        <div className="fe-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 20, padding: '10px 18px', borderRadius: 12, background: 'rgba(13,30,53,0.75)', border: '2px solid rgba(255,200,60,0.7)', boxShadow: '0 0 30px rgba(255,200,60,0.25)', animationDelay: '0.75s', position: 'relative', ...mono }}>
          <span style={{ fontSize: 18 }}>🤖</span>
          <span style={{ color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>{lang === 'es' ? 'ANÁLISIS IA' : 'AI ANALYSIS'}</span>
          <span style={{ color: C.mute, fontSize: 12 }}>{lang === 'es' ? 'Lesiones, forma y contexto real de cada equipo' : 'Real injuries, form and team context'}</span>
        </div>

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderTop: `1px solid ${C.line}`, background: 'rgba(10,22,38,0.7)', overflow: 'hidden', zIndex: 2 }}>
          <div className="fe-ticker" style={{ ...mono, fontSize: 12, color: C.mute, whiteSpace: 'nowrap', padding: '10px 0', display: 'inline-block' }}>
            {ticker(lang)}{ticker(lang)}
          </div>
        </div>
      </section>

      {/* como funciona en 3 pasos */}
      <section style={{ padding: 'clamp(48px,6vw,80px) clamp(16px,5vw,64px)', borderTop: `1px solid ${C.line}` }}>
        <p data-reveal style={{ ...mono, fontSize: 13, color: C.green, marginBottom: 14, textAlign: 'center' }}>
          {lang === 'es' ? '▮ CÓMO FUNCIONA' : '▮ HOW IT WORKS'}
        </p>
        <h2 data-reveal style={{ textAlign: 'center', margin: '0 0 44px', textTransform: 'uppercase', lineHeight: 0.95 }}>
          <span style={{ ...slant, fontSize: 'clamp(32px,5vw,60px)' }}>{lang === 'es' ? 'Tres modelos, ' : 'Three models, '}</span>
          <span className="fe-outline" style={{ ...slant, fontSize: 'clamp(32px,5vw,60px)' }}>{lang === 'es' ? 'una señal' : 'one signal'}</span>
        </h2>
        <div className="fe-grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 20, maxWidth: 1000, margin: '0 auto' }}>
          {(lang === 'es' ? [
            { n: '01', t: 'Precio base con Dixon-Coles', d: 'Un modelo Poisson bivariado calcula la probabilidad de cada marcador posible, calibrado de forma independiente por liga y con decaimiento temporal de la forma reciente.' },
            { n: '02', t: 'Ajuste con rating Elo', d: 'La fuerza relativa de cada equipo, actualizada tras cada partido liquidado según resultado y margen de gol, refina la probabilidad base del modelo.' },
            { n: '03', t: 'Mezcla con el mercado', d: 'El resultado se combina con las cuotas reales de las casas de apuestas para reducir ruido — solo se muestran los partidos donde queda una ventaja estadística real.' },
          ] : [
            { n: '01', t: 'Base pricing with Dixon-Coles', d: 'A bivariate Poisson model prices every possible scoreline, calibrated independently per league with temporal decay on recent form.' },
            { n: '02', t: 'Elo rating adjustment', d: "Each team's relative strength, updated after every settled match based on result and goal margin, refines the model's base probability." },
            { n: '03', t: 'Blended with the market', d: 'The result is combined with live bookmaker odds to reduce noise — only matches with a real statistical edge left over make the board.' },
          ]).map((s) => (
            <div key={s.n} data-reveal style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 'clamp(22px,3vw,32px)' }}>
              <div style={{ ...bebas, fontSize: 40, color: C.green, opacity: 0.5, lineHeight: 1, marginBottom: 14 }}>{s.n}</div>
              <h3 style={{ ...bebas, fontSize: 22, margin: '0 0 10px', textTransform: 'uppercase' }}>{s.t}</h3>
              <p style={{ color: C.mute, lineHeight: 1.6, fontSize: 14, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* teasers reales de hoy — sin necesitar cuenta */}
      {teasers.length > 0 && (
        <section style={{ padding: 'clamp(48px,6vw,80px) clamp(16px,5vw,64px)', borderTop: `1px solid ${C.line}` }}>
          <p style={{ ...mono, fontSize: 13, color: C.green, marginBottom: 14, textAlign: 'center' }}>
            {lang === 'es' ? `▮ SEÑALES DE HOY · ${new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { day: '2-digit', month: 'long' })}` : `▮ TODAY'S SIGNALS · ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long' })}`}
          </p>
          <h2 style={{ textAlign: 'center', margin: '0 0 36px', textTransform: 'uppercase', lineHeight: 0.95 }}>
            <span style={{ ...slant, fontSize: 'clamp(32px,5vw,60px)' }}>{lang === 'es' ? 'Esto es real, ' : 'This is real, '}</span>
            <span className="fe-outline" style={{ ...slant, fontSize: 'clamp(32px,5vw,60px)' }}>{lang === 'es' ? 'hoy mismo' : 'right now'}</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
            {teasers.map((t, i) => (
              <div key={i} style={{ background: C.card, border: '1px solid rgba(246,185,59,0.35)', borderRadius: 16, padding: 20 }}>
                <div style={{ ...mono, fontSize: 11, color: C.mute, marginBottom: 14 }}>
                  {t.league_name ?? '—'} · {t.kickoff_at ? new Date(t.kickoff_at).toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
                <div style={{ filter: 'blur(6px)', opacity: 0.5, userSelect: 'none', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.line }} />
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{lang === 'es' ? 'Equipo A vs Equipo B' : 'Team A vs Team B'}</span>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.line }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ ...bebas, fontSize: 30, color: C.gold }}>{t.rating}<span style={{ fontSize: 13, color: C.mute }}>/10</span></div>
                    <div style={{ ...mono, fontSize: 9, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rating</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ ...bebas, fontSize: 24, color: C.green }}>+{Math.round((t.ev ?? 0) * 100)}%</div>
                    <div style={{ ...mono, fontSize: 9, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.06em' }}>EV</div>
                  </div>
                  <span style={{ fontSize: 24 }}>🔒</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <a className="fe-btn" href={`/${lang}/auth/register`} style={btnStyle(true, 'md')}>
              {lang === 'es' ? 'Ver todas las señales gratis →' : 'See all signals free →'}
            </a>
          </div>
        </section>
      )}

      {/* cuenta regresiva — arranque de las grandes ligas */}
      <section style={{ padding: 'clamp(48px,6vw,80px) clamp(16px,5vw,64px)', borderTop: `1px solid ${C.line}`, position: 'relative', overflow: 'hidden' }}>
        <div className="fe-glow" aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(80vw,900px)', aspectRatio: '2', background: `radial-gradient(ellipse, ${C.greenDim}, transparent 70%)`, pointerEvents: 'none' }} />
        <p data-reveal style={{ ...mono, fontSize: 13, color: C.green, marginBottom: 14, textAlign: 'center', position: 'relative' }}>
          {lang === 'es' ? '▮ TEMPORADA 2026/27' : '▮ 2026/27 SEASON'}
        </p>
        <h2 data-reveal style={{ textAlign: 'center', margin: '0 0 16px', textTransform: 'uppercase', lineHeight: 0.95, position: 'relative' }}>
          <span style={{ ...slant, fontSize: 'clamp(32px,5vw,60px)' }}>{lang === 'es' ? 'Las grandes ligas ' : 'The big leagues '}</span>
          <span className="fe-outline" style={{ ...slant, fontSize: 'clamp(32px,5vw,60px)' }}>{lang === 'es' ? 'están por arrancar' : 'are about to kick off'}</span>
        </h2>
        <p data-reveal style={{ textAlign: 'center', color: C.mute, fontSize: 15, maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.6, position: 'relative' }}>
          {lang === 'es'
            ? 'El modelo se vuelve más fuerte con cada partido acumulado. Crea tu cuenta ahora y llega listo para el arranque de LaLiga, Premier League, Serie A, Ligue 1 y Bundesliga.'
            : 'The model gets sharper with every match it sees. Create your account now and be ready when LaLiga, Premier League, Serie A, Ligue 1 and Bundesliga kick off.'}
        </p>
        <div className="fe-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, maxWidth: 900, margin: '0 auto', position: 'relative' }}>
          {BIG_LEAGUES.map((l) => (
            <KickoffCard key={l.name} flag={l.flag} name={l.name} date={l.date} lang={lang} />
          ))}
        </div>
        <div data-reveal style={{ textAlign: 'center', marginTop: 36, position: 'relative' }}>
          <a className="fe-btn fe-pulse" href={`/${lang}/auth/register`} style={btnStyle(true, 'md')}>
            {lang === 'es' ? 'Crear mi cuenta gratis →' : 'Create my free account →'}
          </a>
        </div>
      </section>

      {/* scroll-scrub rig (compacto 180vh) */}
      <section id="engine" ref={rigRef} style={{ position: 'relative', height: '180vh' }}>
        <div style={{ position: 'sticky', top: 0, height: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(72px,10vh,110px) clamp(12px,4vw,56px) 32px', overflow: 'hidden' }}>
          <span key={`g${scene}`} className="fe-ghostnum" aria-hidden style={{ ...slant, position: 'absolute', left: '-2%', bottom: '-8%', fontSize: 'clamp(220px,34vw,520px)', lineHeight: 1, color: 'transparent', WebkitTextStroke: '2px rgba(0,200,120,0.13)', pointerEvents: 'none' }}>0{scene + 1}</span>

          <div className="fe-rig" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,420px) minmax(0,1fr)', gap: 'clamp(20px,4vw,56px)', width: '100%', maxWidth: 1240, alignItems: 'center', position: 'relative' }}>
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 26 }}>
                {SCENES.map((_, i) => (
                  <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: C.line, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: C.green, width: i < scene ? '100%' : i === scene ? `${sceneP * 100}%` : '0%', transition: 'width .1s linear' }} />
                  </div>
                ))}
              </div>
              <p style={{ ...mono, fontSize: 12, color: C.green, marginBottom: 12 }}>{SCENES[scene].tag}</p>
              <h2 key={scene} className="fe-scene-title" style={{ ...slant, fontSize: 'clamp(40px,5vw,72px)', lineHeight: 0.95, margin: '0 0 16px', textTransform: 'uppercase' }}>{SCENES[scene].title}</h2>
              <p key={`b${scene}`} className="fe-scene-body" style={{ color: C.mute, lineHeight: 1.65, fontSize: 16, maxWidth: 420 }}>{SCENES[scene].body}</p>
            </div>

            <div style={{ position: 'relative', border: `2px solid ${C.line}`, borderRadius: 20, background: C.navy, boxShadow: `0 0 0 6px rgba(0,200,120,0.05), 0 40px 80px rgba(0,0,0,0.5)`, overflow: 'hidden', aspectRatio: '16/10', transform: `perspective(1200px) rotateY(${tilt}deg) rotateX(${-tilt / 2}deg)`, transition: 'transform .15s ease-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${C.line}`, background: 'rgba(7,13,26,0.6)' }}>
                <span style={dot('#ff5f57')} /><span style={dot('#febc2e')} /><span style={dot(C.green)} />
                <span style={{ ...mono, fontSize: 11, color: C.mute, marginLeft: 8 }}>footyedge.app — live board</span>
              </div>
              {hasVideo ? (
                <video ref={videoRef} src="/demo.mp4" muted playsInline preload="auto" style={{ width: '100%', height: 'calc(100% - 37px)', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ position: 'relative', height: 'calc(100% - 37px)' }}>
                  <Scene0 active={scene === 0} p={sceneP} lang={lang} />
                  <Scene1 active={scene === 1} p={sceneP} lang={lang} />
                  <Scene2 active={scene === 2} p={sceneP} lang={lang} />
                  <Scene3 active={scene === 3} p={sceneP} lang={lang} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* marquee */}
      <div aria-hidden style={{ borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, overflow: 'hidden', padding: '14px 0', background: 'rgba(10,22,38,0.4)' }}>
        <div className="fe-marquee" style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
          {marquee()}{marquee()}
        </div>
      </div>

      {/* product */}
      <section id="features" style={{ padding: 'clamp(64px,8vw,110px) clamp(16px,5vw,64px)' }}>
        <p data-reveal style={{ ...mono, fontSize: 13, color: C.green, marginBottom: 14 }}>{lang === 'es' ? '▮ EL PRODUCTO' : '▮ THE PRODUCT'}</p>
        <h2 data-reveal style={{ margin: '0 0 48px', textTransform: 'uppercase', lineHeight: 0.9 }}>
          <span style={{ ...slant, fontSize: 'clamp(48px,7vw,104px)' }}>{lang === 'es' ? 'Encuentra la señal.' : 'Find the signal.'}</span><br />
          <span className="fe-outline" style={{ ...slant, fontSize: 'clamp(48px,7vw,104px)' }}>{lang === 'es' ? 'Antes que el mercado.' : 'Before the market does.'}</span>
        </h2>

        <div className="fe-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 20 }}>
          {FEATURES.map((f, i) => (
            <article key={f.k} data-reveal className="fe-card" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 'clamp(22px,3vw,36px)', position: 'relative', overflow: 'hidden', transitionDelay: `${i * 0.08}s` }}>
              <span style={{ ...mono, position: 'absolute', top: 18, right: 20, fontSize: 11, color: C.green, border: `2px solid ${C.green}`, borderRadius: 999, padding: '4px 12px', background: 'rgba(0,200,120,0.08)' }}>{f.k}</span>
              <div style={{ ...bebas, fontSize: 54, color: C.green, lineHeight: 1 }}>
                {f.stat !== null ? <>+<CountUp to={f.stat} suffix={f.statSuffix} /></> : f.statText}
              </div>
              <div style={{ ...mono, fontSize: 11, color: C.mute, marginBottom: 18 }}>{f.statLabel}</div>
              <h3 style={{ ...bebas, fontSize: 30, margin: '0 0 10px', textTransform: 'uppercase' }}>{f.t}</h3>
              <p style={{ color: C.mute, lineHeight: 1.65, fontSize: 15, margin: 0 }}>{f.d}</p>
              {(f as any).note && (
                <p style={{ ...mono, color: C.green, fontSize: 12, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>{(f as any).note}</p>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" style={{ padding: 'clamp(64px,8vw,110px) clamp(16px,5vw,64px)', borderTop: `1px solid ${C.line}`, position: 'relative' }}>
        <div className="fe-halftone" aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5 }} />
        <p data-reveal style={{ ...mono, fontSize: 13, color: C.green, marginBottom: 14 }}>{lang === 'es' ? '▮ PRECIOS' : '▮ PRICING'}</p>
        <h2 data-reveal style={{ ...slant, fontSize: 'clamp(48px,7vw,104px)', lineHeight: 0.92, margin: '0 0 48px', textTransform: 'uppercase' }}>{lang === 'es' ? 'Elige tu plan' : 'Choose your plan'}</h2>

        <div className="fe-grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 20, position: 'relative', alignItems: 'stretch' }}>
          {TIERS.map((t, i) => (
            <article key={t.name} data-reveal className={t.hot ? 'fe-tier fe-tier-hot' : t.gold ? 'fe-tier fe-tier-gold' : 'fe-tier'} style={{ borderRadius: 20, padding: 'clamp(26px,2.6vw,38px)', display: 'flex', flexDirection: 'column', gap: 18, position: 'relative', overflow: 'hidden', transitionDelay: `${i * 0.08}s` }}>
              {t.badge && (
                <span style={{ ...mono, alignSelf: 'flex-start', fontSize: 11, color: C.ink, background: t.gold ? `linear-gradient(90deg, ${C.gold}, #ffd66b)` : C.green, borderRadius: 999, padding: '5px 14px', fontWeight: 700, boxShadow: t.gold ? '0 0 24px rgba(246,185,59,0.55)' : '0 0 24px rgba(0,200,120,0.6)', position: 'relative' }}>{t.badge}</span>
              )}
              <h3 style={{ ...slant, fontSize: 44, margin: 0, color: t.gold ? C.gold : t.hot ? C.green : C.white, position: 'relative' }}>{t.name}</h3>
              <div style={{ position: 'relative' }}>
                <span style={{ ...slant, fontSize: 'clamp(58px,5vw,80px)', lineHeight: 1, color: t.gold ? C.gold : t.hot ? C.green : C.white, textShadow: t.gold ? '0 0 32px rgba(246,185,59,0.4)' : t.hot ? '0 0 32px rgba(0,200,120,0.45)' : 'none' }}>{t.price}</span>
                <span style={{ ...mono, fontSize: 12, color: C.mute, marginLeft: 8 }}>{t.per}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10, position: 'relative' }}>
                {t.items.map((it) => (
                  <li key={it.t} style={{ color: it.on ? C.white : 'rgba(139,162,192,0.45)', fontSize: 14, display: 'flex', gap: 11, alignItems: 'baseline' }}>
                    <span style={{ ...mono, color: it.on ? (t.gold ? C.gold : C.green) : 'rgba(139,162,192,0.4)', fontWeight: 700 }}>{it.on ? '✓' : '✗'}</span>
                    <span>{it.t}</span>
                  </li>
                ))}
              </ul>
              <a className="fe-btn" href={`/${lang}/auth/register`} style={{ ...btnStyle(t.hot || t.gold, 'md'), marginTop: 'auto', textAlign: 'center', fontSize: 16, padding: '15px 22px', position: 'relative', ...(t.gold ? { background: `linear-gradient(90deg, ${C.gold}, #ffd66b)`, border: `2px solid ${C.gold}`, boxShadow: '0 8px 30px rgba(246,185,59,0.35)', color: C.ink } : {}) }}>{t.cta}</a>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: 'clamp(64px,8vw,110px) clamp(16px,5vw,64px)', borderTop: `1px solid ${C.line}` }}>
        <p data-reveal style={{ ...mono, fontSize: 13, color: C.green, marginBottom: 14 }}>{lang === 'es' ? '▮ PREGUNTAS FRECUENTES' : '▮ FAQ'}</p>
        <h2 data-reveal style={{ ...slant, fontSize: 'clamp(40px,6vw,80px)', lineHeight: 0.95, margin: '0 0 40px', textTransform: 'uppercase' }}>{lang === 'es' ? 'Preguntas frecuentes' : 'Frequently asked'}</h2>
        <div style={{ display: 'grid', gap: 12, maxWidth: 820 }}>
          {FAQS.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* final CTA */}
      <section style={{ padding: 'clamp(80px,10vw,140px) clamp(16px,5vw,64px)', borderTop: `1px solid ${C.line}`, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div className="fe-glow" aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(80vw,900px)', aspectRatio: '2', background: `radial-gradient(ellipse, ${C.greenDim}, transparent 70%)` }} />
        <h2 data-reveal style={{ margin: '0 0 28px', textTransform: 'uppercase', lineHeight: 0.88, position: 'relative' }}>
          <span style={{ ...slant, fontSize: 'clamp(56px,9vw,136px)' }}>{lang === 'es' ? 'El tablero se actualiza' : 'The board updates'}</span><br />
          <span className="fe-outline" style={{ ...slant, fontSize: 'clamp(56px,9vw,136px)' }}>{lang === 'es' ? 'a toda hora.' : 'around the clock.'}</span>
        </h2>
        <p data-reveal style={{ color: C.mute, fontSize: 17, maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.6, position: 'relative' }}>
          {lang === 'es'
            ? 'Señales nuevas en más de 30 ligas, calculadas antes de tu café. Gratis para empezar.'
            : "Fresh signals across 30+ leagues, priced before you've had coffee. Free to start."}
        </p>
        <a data-reveal className="fe-btn fe-pulse" href={`/${lang}/auth/register`} style={{ ...btnStyle(true, 'lg'), position: 'relative' }}>{lang === 'es' ? 'Empezar gratis — sin tarjeta' : 'Start free — no card needed'}</a>
      </section>

      <footer style={{ borderTop: `1px solid ${C.line}`, padding: '32px clamp(16px,5vw,64px)', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo size={80} />
        <span style={{ ...mono, fontSize: 12, color: C.mute }}>© {new Date().getFullYear()} FootyEdge · 18+ · {lang === 'es' ? 'Apuesta con responsabilidad' : 'Bet responsibly'}</span>
      </footer>
    </main>
  );
}

function SceneShell({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, padding: 'clamp(14px,2vw,26px)', opacity: active ? 1 : 0, transform: active ? 'scale(1)' : 'scale(0.97)', transition: 'opacity .35s ease, transform .35s ease', pointerEvents: 'none' }}>
      {children}
    </div>
  );
}

function Scene0({ active, p, lang }: { active: boolean; p: number; lang: string }) {
  const bars = [0.05, 0.16, 0.27, 0.24, 0.15, 0.08, 0.05];
  return (
    <SceneShell active={active}>
      <p style={{ ...mono, fontSize: 11, color: C.mute, margin: '0 0 12px' }}>{lang === 'es' ? 'P(goles)' : 'P(goals)'} · λ_home 1.62 · λ_away 1.14 · ρ −0.08</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: '70%' }}>
        {bars.map((b, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 160 * b * Math.min(1, p * 2 + 0.2) * 3.2, background: i === 1 || i === 2 ? C.green : C.line, borderRadius: 6, transition: 'height .2s ease', boxShadow: i === 1 || i === 2 ? '0 0 18px rgba(0,200,120,0.35)' : 'none' }} />
            <span style={{ ...mono, fontSize: 10, color: C.mute, textAlign: 'center' }}>{i}</span>
          </div>
        ))}
      </div>
    </SceneShell>
  );
}

function Scene1({ active, p, lang }: { active: boolean; p: number; lang: string }) {
  const rows = [
    ['Girona vs Betis', 'Over 2.5', '+14.2%'],
    ['Twente vs AZ', 'BTTS', '+11.8%'],
    ['Mainz vs Köln', lang === 'es' ? 'Empate' : 'Draw', '+10.4%'],
  ];
  return (
    <SceneShell active={active}>
      <p style={{ ...mono, fontSize: 11, color: C.mute, margin: '0 0 12px' }}>{lang === 'es' ? 'HOY · TABLERO DE VALOR' : 'TODAY · VALUE BOARD'}</p>
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map(([m, mk, e], i) => (
          <div key={m} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.cardSolid, border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 16px', opacity: p * 3 > i ? 1 : 0.15, transform: p * 3 > i ? 'translateX(0)' : 'translateX(24px)', transition: 'all .25s ease' }}>
            <span style={{ fontSize: 13 }}>{m}</span>
            <span style={{ ...mono, fontSize: 12, color: C.mute }}>{mk}</span>
            <span style={{ ...mono, fontSize: 13, color: C.green, fontWeight: 700 }}>{e} edge</span>
          </div>
        ))}
      </div>
    </SceneShell>
  );
}

function Scene2({ active, p, lang }: { active: boolean; p: number; lang: string }) {
  const rows = [['Bayern', 0.86], ['Girona', 0.79], ['Toulouse', 0.71], ['Como', 0.66]] as const;
  return (
    <SceneShell active={active}>
      <p style={{ ...mono, fontSize: 11, color: C.mute, margin: '0 0 12px' }}>RANKINGS · OVER 2.5 % · TOTAL</p>
      <div style={{ display: 'grid', gap: 12 }}>
        {rows.map(([team, v], i) => (
          <div key={team}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13 }}>{i + 1}. {team}</span>
              <span style={{ ...mono, fontSize: 12, color: C.green }}>{Math.round(v * 100)}%</span>
            </div>
            <div style={{ height: 8, background: C.line, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${v * 100 * Math.min(1, p * 1.6 + 0.1)}%`, background: `linear-gradient(90deg, ${C.green}, #4dffb0)`, borderRadius: 4, transition: 'width .2s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </SceneShell>
  );
}

function Scene3({ active, p, lang }: { active: boolean; p: number; lang: string }) {
  const lines = lang === 'es' ? [
    '→ Revisando reportes de lesiones…',
    '→ Local sin su pareja de centrales titular',
    '→ xG del visitante sube 0.4 en los últimos 5',
    '✓ Ventaja del modelo confirmada: Over 2.5 (+12%)',
  ] : [
    '→ Scanning injury reports…',
    '→ Home side missing first-choice CB pairing',
    '→ Away xG trend up 0.4 over last 5',
    '✓ Model edge confirmed: Over 2.5 (+12%)',
  ];
  return (
    <SceneShell active={active}>
      <p style={{ ...mono, fontSize: 11, color: C.mute, margin: '0 0 12px' }}>{lang === 'es' ? '🤖 ANÁLISIS IA · CONTEXTO WEB EN VIVO' : '🤖 AI ANALYSIS · LIVE WEB CONTEXT'}</p>
      <div style={{ ...mono, fontSize: 13, display: 'grid', gap: 12 }}>
        {lines.map((l, i) => (
          <div key={l} style={{ color: i === lines.length - 1 ? C.green : C.mute, opacity: p * 4 > i ? 1 : 0.12, transition: 'opacity .25s ease' }}>{l}</div>
        ))}
      </div>
    </SceneShell>
  );
}

function btnStyle(primary: boolean, size: 'sm' | 'md' | 'lg'): CSSProperties {
  const pad = size === 'lg' ? '16px 30px' : size === 'md' ? '13px 22px' : '9px 18px';
  const fs = size === 'lg' ? 16 : size === 'md' ? 14 : 13;
  return {
    ...mono,
    display: 'inline-block', padding: pad, fontSize: fs, fontWeight: 700,
    borderRadius: 12, textDecoration: 'none', cursor: 'pointer',
    color: primary ? C.ink : C.white,
    background: primary ? C.green : 'transparent',
    border: primary ? `2px solid ${C.green}` : `2px solid ${C.line}`,
    boxShadow: primary ? '0 8px 30px rgba(0,200,120,0.3)' : 'none',
  };
}

const dot = (c: string): CSSProperties => ({ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' });

function ticker(lang: string) {
  const items = lang === 'es'
    ? ['LALIGA · 6 SEÑALES', 'BUNDESLIGA · EDGE +11.8%', 'SERIE A · OVER 2.5 ALTO', 'EREDIVISIE · BTTS 67% HR', 'PREMIER · 4 SEÑALES', 'LIGUE 1 · SEÑAL DE EMPATE', 'ÚRVALSDEILD · LIGA NUEVA']
    : ['LALIGA · 6 SIGNALS', 'BUNDESLIGA · EDGE +11.8%', 'SERIE A · OVER 2.5 HOT', 'EREDIVISIE · BTTS 67% HR', 'PREMIER · 4 SIGNALS', 'LIGUE 1 · DRAW SIGNAL', 'ÚRVALSDEILD · NEW LEAGUE'];
  return items.map((t) => `  ▮ ${t}  `).join('·');
}

function marquee() {
  return 'EDGE+ · SIGNAL · DATA · 29 LEAGUES · DIXON-COLES · BTTS · OVER 2.5 · '.repeat(3);
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&display=swap');

html { scroll-behavior: smooth; }

.fe-halftone {
  background-image: radial-gradient(rgba(0,200,120,0.16) 1.5px, transparent 1.5px);
  background-size: 22px 22px;
  mask-image: radial-gradient(ellipse at 20% 30%, black, transparent 60%);
  -webkit-mask-image: radial-gradient(ellipse at 20% 30%, black, transparent 60%);
  animation: fe-drift 24s ease-in-out infinite alternate;
}
@keyframes fe-drift { from { background-position: 0 0; } to { background-position: 44px 22px; } }

.fe-pitchwrap {
  position: absolute; left: 0; right: 0; bottom: 0;
  height: 64%;
  pointer-events: none;
  perspective: 900px;
  perspective-origin: 50% 0%;
  overflow: hidden;
  mask-image: linear-gradient(to top, black 55%, transparent 96%);
  -webkit-mask-image: linear-gradient(to top, black 55%, transparent 96%);
}
.fe-pitch {
  position: absolute; left: 50%; bottom: -34%;
  width: 150%; height: 130%;
  transform: translateX(-50%) rotateX(48deg);
  transform-origin: center top;
  opacity: 0;
  animation: fe-pitchin 2s ease .3s forwards;
}
@keyframes fe-pitchin { to { opacity: 1; } }

.fe-outline {
  color: transparent;
  -webkit-text-stroke: 2.5px #00c878;
  text-shadow: 0 0 40px rgba(0,200,120,0.25);
}

.fe-up { opacity: 0; animation: fe-rise .8s cubic-bezier(.2,.8,.2,1) forwards; }
@keyframes fe-rise { from { opacity: 0; transform: translateY(44px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fe-fade { from { opacity: 0; } to { opacity: 1; } }

[data-reveal] { opacity: 0; transform: translateY(36px); transition: opacity .7s cubic-bezier(.2,.8,.2,1), transform .7s cubic-bezier(.2,.8,.2,1); }
[data-reveal].fe-in { opacity: 1; transform: translateY(0); }

.fe-scene-title { animation: fe-slam .4s cubic-bezier(.2,.9,.3,1.2); }
@keyframes fe-slam { from { opacity: 0; transform: skewX(-8deg) translateY(20px) scale(.96); } to { opacity: 1; transform: skewX(-8deg) translateY(0) scale(1); } }
.fe-scene-body { animation: fe-fade .5s ease .1s backwards; }
.fe-ghostnum { animation: fe-fade .5s ease; }

.fe-floaties { position: absolute; inset: 0; pointer-events: none; z-index: 1; }

.fe-mini {
  position: absolute;
  background: rgba(13,30,53,0.82);
  border: 1px solid rgba(0,200,120,0.4);
  border-radius: 14px;
  padding: 14px 16px;
  backdrop-filter: blur(6px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.45), 0 0 24px rgba(0,200,120,0.08);
  animation: fe-float 7s ease-in-out infinite, fe-fade 1s ease backwards;
  min-width: 210px;
}
.fe-mini-head { font-size: 10px; color: #8ba2c0; letter-spacing: 0.08em; margin-bottom: 8px; }
.fe-mini-bet   { right: 2%;  top: 26%; animation-delay: 0.2s, 0.9s; }
.fe-mini-rank  { right: 16%; top: 54%; animation-delay: 1.4s, 1.2s; }
.fe-mini-kelly { right: 6%;  top: 74%; animation-delay: 0.8s, 1.5s; min-width: 160px; }

.fe-chip {
  position: absolute; font-size: 12px; color: #00c878;
  border: 2px solid rgba(0,200,120,0.5); border-radius: 999px;
  padding: 6px 14px; background: rgba(13,30,53,0.8); backdrop-filter: blur(4px);
  animation: fe-float 6s ease-in-out infinite, fe-fade 1s ease backwards;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.fe-chip-a { right: 42%; top: 45%; animation-delay: 0.6s, 1.1s; }
.fe-chip-b { right: 10%; top: 40%; animation-delay: 2.2s, 1.3s; }
.fe-chip-c { right: 38%; top: 76%; animation-delay: 1.1s, 1.6s; }

@keyframes fe-float { 0%,100% { transform: translateY(0) rotate(-1.5deg); } 50% { transform: translateY(-16px) rotate(1.5deg); } }

.fe-pulse { animation: fe-glowpulse 2.6s ease-in-out infinite; }
@keyframes fe-glowpulse {
  0%,100% { box-shadow: 0 8px 30px rgba(0,200,120,0.3); }
  50% { box-shadow: 0 8px 44px rgba(0,200,120,0.55); }
}

.fe-btn { transition: transform .15s ease, box-shadow .15s ease, background .15s ease; }
.fe-btn:hover { transform: translateY(-2px) scale(1.02); }
.fe-navlink { transition: color .15s ease; }
.fe-navlink:hover { color: #00c878 !important; }

.fe-menu-item { opacity: 0; animation: fe-rise .5s cubic-bezier(.2,.8,.2,1) forwards; }

.fe-ticker { animation: fe-scroll 30s linear infinite; }
@keyframes fe-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

.fe-marquee {
  font-family: "Bebas Neue", sans-serif;
  font-size: clamp(30px, 4.5vw, 56px);
  color: transparent; -webkit-text-stroke: 1.5px rgba(0,200,120,0.45);
  letter-spacing: 0.04em;
  animation: fe-scroll 40s linear infinite;
}

.fe-glow { animation: fe-breathe 7s ease-in-out infinite; }
@keyframes fe-breathe { 0%,100% { opacity: .8; } 50% { opacity: 1.0; } }

.fe-card:hover { transform: translateY(-4px); border-color: rgba(0,200,120,0.5); }
.fe-card { transition: transform .2s ease, border-color .2s ease, opacity .7s, translate .7s; }

.fe-tier {
  background: rgba(13,30,53,0.6);
  border: 1px solid #1a2e4a;
}
.fe-tier:hover { transform: translateY(-10px) !important; border-color: rgba(0,200,120,0.6); box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
.fe-tier-hot {
  border: 2px solid transparent;
  background: linear-gradient(rgba(10,26,42,0.96), rgba(10,26,42,0.96)) padding-box,
              linear-gradient(120deg, #00c878, #4dffb0, #006b40, #00c878) border-box;
  background-size: 100% 100%, 320% 320%;
  animation: fe-border 5s linear infinite;
  box-shadow: 0 24px 70px rgba(0,200,120,0.22);
}
.fe-tier-hot:hover { box-shadow: 0 32px 90px rgba(0,200,120,0.38); }
@keyframes fe-border { to { background-position: 0 0, 320% 0; } }
.fe-tier-gold {
  border: 2px solid transparent;
  background: linear-gradient(rgba(16,24,16,0.5), rgba(10,26,42,0.96)) padding-box,
              linear-gradient(120deg, #f6b93b, #ffd66b, #9a6b0f, #f6b93b) border-box;
  background-size: 100% 100%, 320% 320%;
  animation: fe-border 6s linear infinite;
  box-shadow: 0 24px 70px rgba(246,185,59,0.18);
}
.fe-tier-gold:hover { border-color: transparent; box-shadow: 0 32px 90px rgba(246,185,59,0.32); }

@media (max-width: 900px) {
  .fe-nav { display: none !important; }
  .fe-burger { display: inline-block !important; }
  .fe-rig { grid-template-columns: 1fr !important; }
  .fe-grid, .fe-grid3 { grid-template-columns: 1fr !important; }
  .fe-floaties { display: none; }
  .fe-pitch { width: 260%; }
  .fe-ghostnum { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .fe-ticker, .fe-marquee, .fe-chip, .fe-mini, .fe-pulse, .fe-glow, .fe-halftone, .fe-tier-hot, .fe-tier-gold { animation: none !important; }
  .fe-up, .fe-menu-item { animation: none !important; opacity: 1 !important; }
  .fe-pitch { animation: none !important; opacity: 1 !important; }
  [data-reveal] { opacity: 1 !important; transform: none !important; transition: none !important; }
  html { scroll-behavior: auto; }
}
`;
