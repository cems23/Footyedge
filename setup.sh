#!/bin/bash
# ════════════════════════════════════════════════════════════
# FootyEdge 2.0 — Setup Script
# Corre este script UNA SOLA VEZ después de clonar/copiar el proyecto
# ════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ⚽  FootyEdge 2.0 — Setup"
echo "════════════════════════════"
echo -e "${NC}"

# 1. Check Node version
NODE_VER=$(node -v | cut -d'.' -f1 | tr -d 'v')
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js 18+ requerido. Actual: $(node -v)"
  exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v)"

# 2. Install dependencies
echo -e "\n${YELLOW}📦 Instalando dependencias...${NC}"
npm install

echo -e "${GREEN}✓${NC} Dependencias instaladas"

# 3. Verify .env.local
if [ ! -f ".env.local" ]; then
  echo "❌ .env.local no encontrado"
  exit 1
fi
echo -e "${GREEN}✓${NC} .env.local encontrado"

# 4. Verify keys are set
if grep -q "API_FOOTBALL_KEY=5e40693" .env.local; then
  echo -e "${GREEN}✓${NC} API Football key configurada"
fi
if grep -q "ODDS_API_KEY=51c1bd" .env.local; then
  echo -e "${GREEN}✓${NC} Odds API key configurada"
fi
if grep -q "supabase.co" .env.local; then
  echo -e "${GREEN}✓${NC} Supabase URL configurada"
fi

echo -e "\n${CYAN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup completo!${NC}"
echo ""
echo -e "  ${YELLOW}SIGUIENTE PASO OBLIGATORIO:${NC}"
echo -e "  1. Ve a ${CYAN}https://supabase.com/dashboard${NC}"
echo -e "  2. Abre tu proyecto → ${CYAN}SQL Editor → New query${NC}"
echo -e "  3. Copia y pega el contenido de:"
echo -e "     ${CYAN}supabase/migrations/001_schema.sql${NC}"
echo -e "  4. Click en ${CYAN}RUN${NC}"
echo ""
echo -e "  Luego ejecuta:"
echo -e "  ${GREEN}npm run dev${NC}"
echo ""
echo -e "  Dashboard en: ${CYAN}http://localhost:3000/dashboard${NC}"
echo ""
echo -e "  Para ejecutar el análisis manual:"
echo -e "  ${GREEN}curl -H 'Authorization: Bearer footyedge-cron-2024-secret-key' http://localhost:3000/api/matches/analyze${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
