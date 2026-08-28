import urllib.request
import json
import os

print("Téléchargement de la base NFL officielle...")
url = 'https://api.sleeper.app/v1/players/nfl'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response:
    raw = json.loads(response.read().decode('utf-8'))

pos_map = {
    'QB': 'QB',
    'RB': 'RB',
    'WR': 'WR',
    'TE': 'TE',
    'K': 'K',
    'DEF': 'D/ST',
    'LB': 'LB', 'ILB': 'LB', 'OLB': 'LB',
    'DL': 'DL', 'DE': 'DL', 'DT': 'DL',
    'DB': 'DB', 'CB': 'DB', 'SS': 'DB', 'FS': 'DB'
}

# Charger les notes qualitatives existantes pour les top players
curated_notes = {
    "Christian McCaffrey": ("SF", "RB", 1, 310, "Le monstre absolu du fantasy football si en forme."),
    "CeeDee Lamb": ("DAL", "WR", 1, 295, "Machine à cibles à Dallas, volume monstrueux."),
    "Tyreek Hill": ("MIA", "WR", 1, 285, "Vitesse pure, capable de marquer 30 pts sur un match."),
    "Ja'Marr Chase": ("CIN", "WR", 1, 280, "Connexion légendaire avec Burrow."),
    "Bijan Robinson": ("ATL", "RB", 1, 275, "Rôle central à Atlanta, course et réceptions."),
    "Breece Hall": ("NYJ", "RB", 1, 270, "Double menace sol/air chez les Jets."),
    "Justin Jefferson": ("MIN", "WR", 1, 275, "Le meilleur receveur de la NFL."),
    "Amon-Ra St. Brown": ("DET", "WR", 1, 270, "Le 'Sun God', régularité démoniaque en Half-PPR."),
    "Saquon Barkley": ("PHI", "RB", 1, 265, "Derrière la ligne offensive des Eagles, potentiel énorme."),
    "A.J. Brown": ("PHI", "WR", 1, 260, "Physique et explosif à Philadelphie."),
    "Garrett Wilson": ("NYJ", "WR", 1, 255, "Prêt pour une saison record."),
    "Jahmyr Gibbs": ("DET", "RB", 1, 255, "Explosion garantie sur chaque touche de balle."),
    "Jonathan Taylor": ("IND", "RB", 1, 250, "Le bulldozer des Colts."),
    "Derrick Henry": ("BAL", "RB", 1, 250, "👑 CIBLE MAJEURE PICK 14/15 : Machine à Touchdowns à Baltimore !"),
    "Puka Nacua": ("LAR", "WR", 1, 250, "👑 CIBLE MAJEURE PICK 14/15 : Volume de passes colossal chez les Rams."),
    "Marvin Harrison Jr.": ("ARI", "WR", 1, 245, "👑 CIBLE MAJEURE PICK 14/15 : Le phénomène rookie WR1 immédiat."),
    "Kyren Williams": ("LAR", "RB", 2, 240, "Monopole de courses chez McVay aux Rams."),
    "Travis Etienne Jr.": ("JAX", "RB", 2, 235, "RB trois tentatives très actif à la passe."),
    "Drake London": ("ATL", "WR", 2, 235, "Explosion attendue dans l'attaque aérienne d'Atlanta."),
    "De'Von Achane": ("MIA", "RB", 2, 230, "Vitesse stratosphérique à Miami."),
    "Chris Olave": ("NO", "WR", 2, 225, "Cible n°1 incontestée des Saints."),
    "Nico Collins": ("HOU", "WR", 2, 230, "Gros receveur d'élite de C.J. Stroud."),
    "Mike Evans": ("TB", "WR", 2, 225, "10+ saisons à 1000 yards consécutives, machine à TD."),
    "Isiah Pacheco": ("KC", "RB", 2, 225, "Le guerrier titulaire des Chiefs."),
    "Josh Jacobs": ("GB", "RB", 2, 220, "Nouveau RB bellcow des Packers de Green Bay."),
    "Davante Adams": ("LV", "WR", 2, 220, "Toujours parmi les meilleurs traceurs de la ligue."),
    "Sam LaPorta": ("DET", "TE", 1, 215, "TE1 absolu, arme rouge de Detroit."),
    "Travis Kelce": ("KC", "TE", 1, 210, "La légende des Chiefs et cible favorite de Mahomes."),
    "Trey McBride": ("ARI", "TE", 1, 205, "Volume énorme de cibles avec Kyler Murray."),
    "Josh Allen": ("BUF", "QB", 1, 360, "QB1 Fantasy : passes + 10 à 15 TD à la course !"),
    "Jalen Hurts": ("PHI", "QB", 1, 350, "Le 'Tush Push' garantit 10+ TD à la course."),
    "Lamar Jackson": ("BAL", "QB", 1, 345, "Double MVP NFL, potentiel 1000 yards au sol."),
    "Jayden Daniels": ("WAS", "QB", 1, 330, "⚡ CIBLE MAJEURE PICKS 42/43 : QB phénomène mobile (style RG3/Lamar)."),
    "Roquan Smith": ("BAL", "LB", 1, 165, "🛡️ TACKLE MACHINE N°1 : 150+ plaquages garantis chaque année !"),
    "Foyesade Oluokun": ("JAX", "LB", 1, 165, "🛡️ ROI DES PLAQUAGES NFL : Leader statistique constant."),
    "Fred Warner": ("SF", "LB", 1, 155, "Le meilleur Linebacker polyvalent de la NFL."),
    "Bobby Okereke": ("NYG", "LB", 1, 155, "Joue 100% des snaps défensifs des Giants."),
    "Maxx Crosby": ("LV", "DL", 1, 145, "⚔️ DL1 SUPRÊME : Joue 98% des snaps, sacks + plaquages !"),
    "Myles Garrett": ("CLE", "DL", 1, 140, "⚔️ MONSTRE DU SACK : Défenseur de l'année en titre."),
    "T.J. Watt": ("PIT", "DL", 1, 140, "⚔️ ROI DES BIG PLAYS : Sacks, fumbles provoqués, TD."),
    "Micah Parsons": ("DAL", "DL", 1, 135, "Terreur absolue pour les quarterbacks."),
    "Derwin James Jr.": ("LAC", "DB", 1, 135, "🛡️ DB1 PARFAIT : Joue comme un Linebacker, 100+ plaquages !"),
    "Antoine Winfield Jr.": ("TB", "DB", 1, 135, "🛡️ ALL-PRO : Plaquages, interceptions, fumbles et sacks."),
    "Kyle Hamilton": ("BAL", "DB", 1, 130, "Le couteau suisse ultra dominant des Ravens.")
}

processed = []

for pid, p in raw.items():
    if not p.get('active'):
        continue
    team = p.get('team')
    if not team:
        continue
    raw_pos = p.get('position')
    if raw_pos not in pos_map:
        continue
    pos = pos_map[raw_pos]
    
    search_rank = p.get('search_rank')
    depth = p.get('depth_chart_order')
    
    # Garder les joueurs pertinents pour la Fantasy
    if search_rank is None or search_rank > 1200:
        if depth is None or depth > 3:
            continue
            
    full_name = f"{p.get('first_name', '')} {p.get('last_name', '')}".strip()
    if not full_name:
        full_name = f"{team} D/ST"
        
    s_rank = search_rank if search_rank is not None else (900 + (depth or 5) * 50)
    
    tier = 5
    if s_rank < 35: tier = 1
    elif s_rank < 85: tier = 2
    elif s_rank < 160: tier = 3
    elif s_rank < 280: tier = 4
    
    if pos == 'QB':
        proj = max(50, round(340 - (s_rank * 0.3)))
    elif pos in ['RB', 'WR']:
        proj = max(40, round(280 - (s_rank * 0.22)))
    elif pos == 'TE':
        proj = max(30, round(210 - (s_rank * 0.18)))
    elif pos in ['LB', 'DL', 'DB']:
        proj = max(35, round(165 - (s_rank * 0.12)))
    elif pos == 'K':
        proj = max(80, round(135 - (s_rank * 0.04)))
    elif pos == 'D/ST':
        proj = max(70, round(125 - (s_rank * 0.04)))
    else:
        proj = 50

    notes = f"Profondeur d'équipe : #{depth} ({team})" if depth else "Joueur NFL actif"
    
    # Remplacer par note personnalisée si disponible
    if full_name in curated_notes:
        c_team, c_pos, c_tier, c_proj, c_note = curated_notes[full_name]
        tier = c_tier
        proj = c_proj
        notes = c_note
        s_rank = s_rank * 0.5 # boost

    processed.append({
        'id': pid,
        'name': full_name,
        'pos': pos,
        'team': team,
        'bye': p.get('bye_week') or 0,
        's_rank': s_rank,
        'tier': tier,
        'proj': proj,
        'notes': notes
    })

# Éliminer doublons
seen = set()
unique_players = []
for p in processed:
    key = (p['name'], p['team'], p['pos'])
    if key not in seen:
        seen.add(key)
        unique_players.append(p)

# Trier par s_rank
unique_players.sort(key=lambda x: x['s_rank'])

# Recalibrer les ADP
for i, p in enumerate(unique_players):
    p['adp'] = round(i + 1.0, 1)
    del p['s_rank']

# Limiter aux ~800 meilleurs joueurs NFL
final_players = unique_players[:850]
print(f"Nombre total de joueurs intégrés : {len(final_players)}")

# Générer players_data.js
js_content = f"""// Base de données complète des joueurs Fantasy NFL 2026 ({len(final_players)} joueurs)
const PLAYERS_DATA = {json.dumps(final_players, ensure_ascii=False, indent=2)};

// Dictionnaire explicatif des postes NFL pour infobulles (Tooltips)
const POSITION_DESCRIPTIONS = {{
  QB: {{
    fullName: "Quarterback",
    role: "Le Meneur de jeu",
    desc: "Il lance toutes les passes et peut courir. Marque beaucoup de points (20 à 30 pts par match)."
  }},
  RB: {{
    fullName: "Running Back",
    role: "Le Sprinteur / Bulldozer",
    desc: "Prend le ballon au sol et fonce dans la défense. Poste le plus rare et précieux en fantasy football !"
  }},
  WR: {{
    fullName: "Wide Receiver",
    role: "Le Receveur d'élite",
    desc: "Ailier ultra rapide qui capte les passes du QB. En Half-PPR, chaque réception rapporte 0.5 point !"
  }},
  TE: {{
    fullName: "Tight End",
    role: "Le Géant Polyvalent",
    desc: "Mi-bloqueur mi-receveur. Très peu de TE d'élite existent, en avoir un fort donne un avantage majeur."
  }},
  LB: {{
    fullName: "Linebacker (Défense IDP)",
    role: "Le Plaqueur en chef",
    desc: "Le patron au milieu du terrain. Réalise 8 à 12 plaquages par match (points très fiables et réguliers)."
  }},
  DL: {{
    fullName: "Defensive Lineman (Défense IDP)",
    role: "Le Chasseur de QB",
    desc: "Colosse sur la ligne qui détruit l'attaque adverse et chasse le QB pour des Sacks et fumbles."
  }},
  DB: {{
    fullName: "Defensive Back (Défense IDP)",
    role: "Le Gardien du ciel",
    desc: "Arrières défensifs (Safeties) qui arrêtent les longues passes et réalisent des plaquages décisifs."
  }},
  "D/ST": {{
    fullName: "Team Defense / Special Teams",
    role: "Défense Collective",
    desc: "Toute l'escouade défensive d'une franchise entière (ex: 49ers). Marque sur turnovers et touchdowns."
  }},
  K: {{
    fullName: "Kicker",
    role: "Le Buteur",
    desc: "Tape les tirs au but (Field Goals). À sélectionner impérativement au tout dernier tour (Round 17)."
  }}
}};

// Roster slots definition for 14-man IDP League
const ROSTER_SLOTS = [
  {{ key: "QB", label: "Quarterback (QB)", pos: "QB", count: 1 }},
  {{ key: "RB1", label: "Running Back 1 (RB)", pos: "RB", count: 1 }},
  {{ key: "RB2", label: "Running Back 2 (RB)", pos: "RB", count: 1 }},
  {{ key: "WR1", label: "Wide Receiver 1 (WR)", pos: "WR", count: 1 }},
  {{ key: "WR2", label: "Wide Receiver 2 (WR)", pos: "WR", count: 1 }},
  {{ key: "TE", label: "Tight End (TE)", pos: "TE", count: 1 }},
  {{ key: "LB1", label: "Linebacker 1 (LB)", pos: "LB", count: 1 }},
  {{ key: "LB2", label: "Linebacker 2 (LB)", pos: "LB", count: 1 }},
  {{ key: "DL", label: "Defensive Lineman (DL)", pos: "DL", count: 1 }},
  {{ key: "DB1", label: "Defensive Back 1 (DB)", pos: "DB", count: 1 }},
  {{ key: "DB2", label: "Defensive Back 2 (DB)", pos: "DB", count: 1 }},
  {{ key: "DST", label: "Team Defense (D/ST)", pos: "D/ST", count: 1 }},
  {{ key: "K", label: "Kicker (K)", pos: "K", count: 1 }},
  {{ key: "BN1", label: "Banc 1 (Bench)", pos: "ANY", count: 1 }},
  {{ key: "BN2", label: "Banc 2 (Bench)", pos: "ANY", count: 1 }},
  {{ key: "BN3", label: "Banc 3 (Bench)", pos: "ANY", count: 1 }},
  {{ key: "BN4", label: "Banc 4 (Bench)", pos: "ANY", count: 1 }},
  {{ key: "BN5", label: "Banc 5 (Bench)", pos: "ANY", count: 1 }},
  {{ key: "BN6", label: "Banc 6 (Bench)", pos: "ANY", count: 1 }}
];

// Snake Draft Pick Schedule for Pick #14 in 14-team League (Total 17 rounds)
const THE_FARMER_BEER_PICKS = [
  {{ round: 1, pick: 14, overall: 14 }},
  {{ round: 2, pick: 1, overall: 15 }},
  {{ round: 3, pick: 14, overall: 42 }},
  {{ round: 4, pick: 1, overall: 43 }},
  {{ round: 5, pick: 14, overall: 70 }},
  {{ round: 6, pick: 1, overall: 71 }},
  {{ round: 7, pick: 14, overall: 98 }},
  {{ round: 8, pick: 1, overall: 99 }},
  {{ round: 9, pick: 14, overall: 126 }},
  {{ round: 10, pick: 1, overall: 127 }},
  {{ round: 11, pick: 14, overall: 154 }},
  {{ round: 12, pick: 1, overall: 155 }},
  {{ round: 13, pick: 14, overall: 182 }},
  {{ round: 14, pick: 1, overall: 183 }},
  {{ round: 15, pick: 14, overall: 210 }},
  {{ round: 16, pick: 1, overall: 211 }},
  {{ round: 17, pick: 14, overall: 238 }}
];
"""

with open("players_data.js", "w", encoding="utf-8") as f:
    f.write(js_content)

print("players_data.js mis à jour avec succès !")
