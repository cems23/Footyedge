export type Lang = 'es' | 'en'

export const translations = {
  es: {
    nav: {
      features: 'Características',
      pricing: 'Precios',
      login: 'Entrar',
      register: 'Registrarse',
    },
    hero: {
      badge: 'Modelo Poisson + Dixon-Coles · 40 Ligas',
      title1: 'ANALIZA EL FÚTBOL',
      title2: 'CON ESTADÍSTICA REAL',
      subtitle: 'FootyEdge analiza matemáticamente más de 500 partidos diarios para detectar value bets con ventaja real sobre el mercado. Sin intuición, solo estadística.',
      cta1: 'Empezar gratis →',
      cta2: 'Ver planes',
    },
    stats: {
      leagues: 'Ligas analizadas',
      matches: 'Partidos al día',
      model: 'Modelo matemático',
      correction: 'Corrección aplicada',
    },
    features: {
      label: 'Por qué FootyEdge',
      title1: 'HERRAMIENTAS QUE',
      title2: 'MARCAN LA DIFERENCIA',
      items: [
        { icon: '📊', title: 'Modelo Matemático Real', desc: 'Poisson bivariado con corrección Dixon-Coles. El mismo enfoque estadístico usado por analistas profesionales.' },
        { icon: '⚡', title: 'Value Bets Diarias', desc: 'Detectamos cuando las probabilidades del modelo superan las cuotas del mercado. Edge calculado partido a partido.' },
        { icon: '🔴', title: 'Datos en Vivo', desc: 'Scores en tiempo real de todos los partidos activos. Actualización automática con un click.' },
        { icon: '🌍', title: '40 Ligas Activas', desc: 'Premier League, La Liga, Bundesliga, Serie A, MLS, J1 League y 34 ligas más analizadas cada día.' },
        { icon: '⚖️', title: 'Comparador de Equipos', desc: 'Análisis lado a lado de 12 métricas clave. PPG, xG, racha, BTTS histórico y veredicto automático.' },
        { icon: '📈', title: 'Form + xG + H2H', desc: 'Últimos 10 partidos, expected goals, historial enfrentamientos, bajas y alineaciones confirmadas.' },
      ],
    },
    pricing: {
      label: 'Planes y precios',
      title1: 'ELIGE TU',
      title2: 'NIVEL DE VENTAJA',
      subtitle: 'Empieza gratis. Actualiza cuando estés listo.',
      tiers: [
        {
          name: 'FREE', price: '$0', period: '', badge: null,
          features: ['3 value bets diarias (Over 1.5)', 'Análisis completo del partido', 'Clasificación de la liga', 'Alineaciones confirmadas', 'Tabla de partidos con probabilidades'],
          excluded: ['H2H y forma del equipo', 'Value bets Over 2.5 / BTTS / 1X2', 'Comparador de equipos', 'Kelly Stake Advisor', 'Value Radar (Elite)', 'Early Line Hunter (Elite)'],
          cta: 'Empezar gratis', plan: null,
        },
        {
          name: 'PRO', price: '$9.99', period: '/mes', badge: '⚡ MÁS POPULAR',
          features: ['Top 8 value bets (todos los mercados)', 'BTTS + Overs completos', 'Tabla completa con todos los %', 'H2H, Forma, Bajas, Alineaciones', 'Comparador de equipos', 'Kelly Stake Advisor', 'Marcadores más probables', 'Partidos en vivo completo'],
          excluded: ['Value Radar', 'Early Line Hunter'],
          cta: 'Empezar con Pro', plan: 'pro',
        },
        {
          name: 'ELITE', price: '$16.99', period: '/mes', badge: '👑 MÁXIMO PODER',
          features: ['Todo lo de Pro incluido', 'Top 20 value bets diarias', '🎯 Value Radar — escáner de ineficiencias', '⚡ Early Line Hunter — detecta valor anticipado', 'Ligas favoritas personalizadas', 'Estadísticas avanzadas (xG, tiros, córners)', 'Soporte prioritario'],
          excluded: [],
          cta: 'Empezar con Elite', plan: 'elite',
        },
      ],
    },
    disclaimer: {
      label: '⚠️ Aviso importante:',
      text: 'Las probabilidades de FootyEdge son estimaciones matemáticas. No garantizan resultados. Ningún modelo estadístico bate al mercado de forma consistente. Apuesta responsablemente. Solo mayores de 18 años.',
    },
    footer: { login: 'Login', register: 'Registro' },
    dashboard: {
      matchesToday: 'Partidos hoy',
      hot: '🔥 HOT',
      btts: 'BTTS ≥65%',
      valueBets: 'Value Bets',
      live: 'En Vivo',
      refresh: '↻ Actualizar',
      noLive: 'Sin partidos en vivo ahora mismo',
      upgradeBanner: {
        title: '⚡ Plan Free — Vista limitada',
        desc: '3 value bets (Over 1.5) · 3 BTTS · Sin análisis de partido · Sin H2H ni estadísticas',
        cta: 'Actualizar a Pro →',
      },
      filters: { all: 'Todos', btts: 'BTTS', ov15: 'Ov1.5', ov25: 'Ov2.5' },
      markets: { home: 'Local', away: 'Visita', draw: 'Empate' },
      table: { league: 'Liga', match: 'Partido', time: 'Hora', home: 'Local', away: 'Visita', homeOdds: '@Local', awayOdds: '@Visita', ov25: 'Ov2.5', ov25Odds: '@Ov2.5' },
      found: 'encontradas',
      today: 'HOY',
      loading: 'Cargando...',
      liveNow: 'En Vivo',
      allLeagues: '🌍 Todas',
      noMatches: 'Sin partidos con estos filtros',
      sortBy: 'Ordenar',
      allFilters: 'Todos',
      favLeagues: 'ligas favoritas',
      seeAll: 'Ver todas las ligas',
      seeFav: 'Ver mis',
      editBankroll: 'Click para editar bankroll',
    },
    auth: {
      login: { title: 'Bienvenido', subtitle: 'Accede a tu cuenta', email: 'Email', password: 'Contraseña', submit: 'Entrar', forgot: '¿Olvidaste tu contraseña?', noAccount: '¿No tienes cuenta?', register: 'Regístrate' },
      register: { title: 'Crear cuenta', subtitle: 'Empieza gratis hoy', email: 'Email', password: 'Contraseña', submit: 'Crear cuenta', hasAccount: '¿Ya tienes cuenta?', login: 'Inicia sesión' },
      reset: { title: 'Recuperar contraseña', subtitle: 'Te enviaremos un enlace', email: 'Email', submit: 'Enviar enlace', back: 'Volver al login' },
    },
  },
  en: {
    nav: {
      features: 'Features',
      pricing: 'Pricing',
      login: 'Login',
      register: 'Sign up',
    },
    hero: {
      badge: 'Poisson + Dixon-Coles Model · 40 Leagues',
      title1: 'ANALYZE FOOTBALL',
      title2: 'WITH REAL STATISTICS',
      subtitle: 'FootyEdge mathematically analyzes 500+ daily matches to detect value bets with a real edge over the market. No gut feeling, just data.',
      cta1: 'Start for free →',
      cta2: 'View plans',
    },
    stats: {
      leagues: 'Leagues analyzed',
      matches: 'Matches per day',
      model: 'Mathematical model',
      correction: 'Correction applied',
    },
    features: {
      label: 'Why FootyEdge',
      title1: 'TOOLS THAT',
      title2: 'MAKE THE DIFFERENCE',
      items: [
        { icon: '📊', title: 'Real Mathematical Model', desc: 'Bivariate Poisson with Dixon-Coles correction. The same statistical approach used by professional analysts.' },
        { icon: '⚡', title: 'Daily Value Bets', desc: 'We detect when model probabilities exceed market odds. Edge calculated match by match.' },
        { icon: '🔴', title: 'Live Data', desc: 'Real-time scores from all active matches. Automatic refresh with one click.' },
        { icon: '🌍', title: '40 Active Leagues', desc: 'Premier League, La Liga, Bundesliga, Serie A, MLS, J1 League and 34 more leagues analyzed daily.' },
        { icon: '⚖️', title: 'Team Comparator', desc: 'Side-by-side analysis of 12 key metrics. PPG, xG, streak, historical BTTS and automatic verdict.' },
        { icon: '📈', title: 'Form + xG + H2H', desc: 'Last 10 matches, expected goals, head-to-head history, injuries and confirmed lineups.' },
      ],
    },
    pricing: {
      label: 'Plans & pricing',
      title1: 'CHOOSE YOUR',
      title2: 'LEVEL OF EDGE',
      subtitle: 'Start free. Upgrade when ready.',
      tiers: [
        {
          name: 'FREE', price: '$0', period: '', badge: null,
          features: ['3 daily value bets (Over 1.5)', 'Full match analysis', 'League standings', 'Confirmed lineups', 'Match table with probabilities'],
          excluded: ['H2H and team form', 'Over 2.5 / BTTS / 1X2 value bets', 'Team comparator', 'Kelly Stake Advisor', 'Value Radar (Elite)', 'Early Line Hunter (Elite)'],
          cta: 'Start for free', plan: null,
        },
        {
          name: 'PRO', price: '$9.99', period: '/mo', badge: '⚡ MOST POPULAR',
          features: ['Top 8 value bets (all markets)', 'Full BTTS + Overs', 'Complete table with all %', 'H2H, Form, Injuries, Lineups', 'Team comparator', 'Kelly Stake Advisor', 'Most likely scorelines', 'Full live matches'],
          excluded: ['Value Radar', 'Early Line Hunter'],
          cta: 'Start with Pro', plan: 'pro',
        },
        {
          name: 'ELITE', price: '$16.99', period: '/mo', badge: '👑 MAXIMUM POWER',
          features: ['Everything in Pro', 'Top 20 daily value bets', '🎯 Value Radar — market inefficiency scanner', '⚡ Early Line Hunter — detect value early', 'Custom favorite leagues', 'Advanced match stats (xG, shots, corners)', 'Priority support'],
          excluded: [],
          cta: 'Start with Elite', plan: 'elite',
        },
      ],
    },
    disclaimer: {
      label: '⚠️ Important notice:',
      text: "FootyEdge probabilities are mathematical estimates. They do not guarantee results. No statistical model consistently beats the market long-term. Gamble responsibly. 18+ only.",
    },
    footer: { login: 'Login', register: 'Sign up' },
    dashboard: {
      matchesToday: 'Matches today',
      hot: '🔥 HOT',
      btts: 'BTTS ≥65%',
      valueBets: 'Value Bets',
      live: 'Live',
      loading: 'Loading...',
      refresh: '↻ Refresh',
      noMatches: 'No matches with these filters',
      noLive: 'No live matches right now',
      sortBy: 'SORT BY',
      allLeagues: 'All',
      upgradeBanner: {
        title: '⚡ Free Plan — Limited view',
        desc: '3 value bets (Over 1.5 only) · 3 BTTS · No match analysis · No H2H or statistics',
        cta: 'Upgrade to Pro →',
      },
      filters: { all: 'All', btts: 'BTTS', ov15: 'Ov1.5', ov25: 'Ov2.5' },
      markets: { home: 'Home', away: 'Away', draw: 'Draw' },
      table: { league: 'League', match: 'Match', time: 'Time', home: 'Home', away: 'Away', homeOdds: '@Home', awayOdds: '@Away', ov25: 'Ov2.5', ov25Odds: '@Ov2.5' },
      found: 'found',
      today: 'TODAY',
      liveNow: 'Live Now',
      allFilters: 'All',
      favLeagues: 'favorite leagues',
      seeAll: 'See all leagues',
      seeFav: 'See my',
      editBankroll: 'Click to edit bankroll',
    },
    auth: {
      login: { title: 'Welcome back', subtitle: 'Sign in to your account', email: 'Email', password: 'Password', submit: 'Sign in', forgot: 'Forgot your password?', noAccount: "Don't have an account?", register: 'Sign up' },
      register: { title: 'Create account', subtitle: 'Start for free today', email: 'Email', password: 'Password', submit: 'Create account', hasAccount: 'Already have an account?', login: 'Sign in' },
      reset: { title: 'Reset password', subtitle: "We'll send you a link", email: 'Email', submit: 'Send link', back: 'Back to login' },
    },
  },
}

export function getLang(lang: string): Lang {
  return lang === 'en' ? 'en' : 'es'
}

export function getT(lang: Lang) {
  return translations[lang]
}
