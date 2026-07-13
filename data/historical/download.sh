#!/bin/bash
LEAGUES="E0 E1 SP1 SP2 I1 I2 D1 D2 F1 F2 N1"
SEASONS="2324 2425 2526"

total=0
fail=0
for season in $SEASONS; do
  for league in $LEAGUES; do
    url="https://www.football-data.co.uk/mmz4281/${season}/${league}.csv"
    out="${league}_${season}.csv"
    curl -s -o "$out" "$url"
    size=$(wc -c < "$out" 2>/dev/null || echo 0)
    if [ "$size" -lt 100 ]; then
      echo "FALLO: $out"
      fail=$((fail+1))
      rm -f "$out"
    else
      echo "OK: $out ($size bytes)"
      total=$((total+1))
    fi
  done
done

echo ""
echo "Descargados: $total | Fallidos: $fail"
