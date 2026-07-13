import csv, os, re, json, urllib.request, urllib.error
from datetime import datetime

env = {}
with open("../../.env.local") as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"')

SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"]
SERVICE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]

DIV_TO_LEAGUE = {
    "E0": (39, "Premier League"),
    "E1": (40, "Championship"),
    "SP1": (140, "La Liga"),
    "SP2": (141, "La Liga 2"),
    "I1": (135, "Serie A"),
    "I2": (136, "Serie B"),
    "D1": (78, "Bundesliga"),
    "D2": (79, "2. Bundesliga"),
    "F1": (61, "Ligue 1"),
    "F2": (62, "Ligue 2"),
    "N1": (88, "Eredivisie"),
}

def parse_season(fname):
    m = re.search(r"_(\d{2})(\d{2})\.csv$", fname)
    if not m: return None
    return 2000 + int(m.group(1))

def parse_kickoff(date_str, time_str):
    d = None
    for fmt in ("%d/%m/%Y", "%d/%m/%y"):
        try:
            d = datetime.strptime(date_str, fmt)
            break
        except ValueError:
            continue
    if d is None:
        return None
    t = time_str.strip() if time_str else "15:00"
    try:
        hh, mm = t.split(":")
        d = d.replace(hour=int(hh), minute=int(mm))
    except Exception:
        d = d.replace(hour=15, minute=0)
    return d.strftime("%Y-%m-%dT%H:%M:%SZ")

def insert_batch(rows):
    url = f"{SUPABASE_URL}/rest/v1/matches"
    body = json.dumps(rows).encode()
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=ignore-duplicates,return=minimal",
    })
    try:
        urllib.request.urlopen(req)
        return len(rows), 0
    except urllib.error.HTTPError as e:
        print("ERROR:", e.read().decode()[:300])
        return 0, len(rows)

files = sorted(f for f in os.listdir(".") if f.endswith(".csv"))
total_ok, total_fail = 0, 0

for fname in files:
    div = fname.split("_")[0]
    if div not in DIV_TO_LEAGUE:
        continue
    league_id, league_name = DIV_TO_LEAGUE[div]
    season = parse_season(fname)

    rows = []
    with open(fname, encoding="latin-1") as f:
        reader = csv.DictReader(f)
        for r in reader:
            home = (r.get("HomeTeam") or "").strip()
            away = (r.get("AwayTeam") or "").strip()
            date_str = (r.get("Date") or "").strip()
            time_str = (r.get("Time") or "").strip()
            fthg = (r.get("FTHG") or "").strip()
            ftag = (r.get("FTAG") or "").strip()
            ftr = (r.get("FTR") or "").strip()
            if not home or not away or not date_str or fthg == "" or ftag == "":
                continue
            kickoff = parse_kickoff(date_str, time_str)
            if not kickoff:
                continue
            hg, ag = int(fthg), int(ftag)
            result = "home" if ftr == "H" else "away" if ftr == "A" else "draw"
            over25 = (hg + ag) > 2.5
            btts = hg > 0 and ag > 0
            ext_id = f"fdcouk-{div}-{season}-{date_str.replace('/','')}-{home}-{away}".replace(" ", "")

            rows.append({
                "external_id": ext_id,
                "league_id": league_id,
                "league_name": league_name,
                "season": season,
                "home_team_name": home,
                "away_team_name": away,
                "kickoff_at": kickoff,
                "status": "FT",
                "home_goals": hg,
                "away_goals": ag,
                "result": result,
                "over25_result": over25,
                "btts_result": btts,
            })

    ok, fail = 0, 0
    for i in range(0, len(rows), 200):
        chunk = rows[i:i+200]
        o, fa = insert_batch(chunk)
        ok += o
        fail += fa
    print(f"{fname}: {len(rows)} filas, {ok} insertadas, {fail} fallidas")
    total_ok += ok
    total_fail += fail

print(f"\nTOTAL: {total_ok} insertadas, {total_fail} fallidas")
