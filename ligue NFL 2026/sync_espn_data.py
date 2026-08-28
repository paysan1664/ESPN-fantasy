# -*- coding: utf-8 -*-
import json
import os
from espn_api.football import League

def sync_espn_league():
    if not os.path.exists('config_espn.json'):
        print("[ERREUR] config_espn.json introuvable.")
        return

    with open('config_espn.json', 'r', encoding='utf-8') as f:
        conf = json.load(f)

    print(f"Synchronisation de la ligue '{conf.get('league_id')}' (Saison {conf.get('season_year')})...")
    
    try:
        league = League(
            league_id=conf['league_id'],
            year=conf['season_year'],
            espn_s2=conf['espn_s2'],
            swid=conf['swid']
        )
        
        teams_data = []
        for team in league.teams:
            roster_players = []
            if hasattr(team, 'roster'):
                for p in team.roster:
                    roster_players.append({
                        'name': p.name,
                        'position': p.position,
                        'proTeam': p.proTeam,
                        'projected_total_points': getattr(p, 'projected_total_points', 0),
                        'injured': getattr(p, 'injured', False),
                        'injuryStatus': getattr(p, 'injuryStatus', 'ACTIVE')
                    })
                    
            teams_data.append({
                'id': team.team_id,
                'name': team.team_name,
                'abbrev': team.team_abbrev,
                'wins': team.wins,
                'losses': team.losses,
                'points_for': team.points_for,
                'roster': roster_players
            })
            
        league_payload = {
            'league_name': league.settings.name,
            'teams_count': len(league.teams),
            'current_week': league.current_week,
            'teams': teams_data
        }
        
        with open('espn_league_data.json', 'w', encoding='utf-8') as f:
            json.dump(league_payload, f, ensure_ascii=False, indent=2)
            
        print(f"[SUCCES] Synchronisation terminee avec succes ! ({len(teams_data)} equipes enregistrees dans espn_league_data.json)")
        
    except Exception as e:
        print(f"[ERREUR] Echec de synchronisation : {e}")

if __name__ == "__main__":
    sync_espn_league()
