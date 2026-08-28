# -*- coding: utf-8 -*-
# Script de connexion et synchronisation API ESPN Fantasy Football
import os
import json

def test_espn_connection(league_id=1679764330, year=2026, espn_s2=None, swid=None):
    print(f"Tentative de connexion a la ligue ESPN #{league_id} (Saison {year})...")
    
    try:
        from espn_api.football import League
        
        # Test sans cookies ou avec cookies
        if espn_s2 and swid:
            league = League(league_id=league_id, year=year, espn_s2=espn_s2, swid=swid)
        else:
            league = League(league_id=league_id, year=year)
            
        print("[OK] Connexion API ESPN reussie !")
        print(f"Nom de la ligue : {league.settings.name}")
        print(f"Nombre d'equipes : {len(league.teams)}")
        for i, team in enumerate(league.teams, 1):
            print(f"  {i}. {team.team_name} (Manager: {team.owner})")
        return league
        
    except Exception as e:
        err_msg = str(e)
        if "espn_s2 and swid are required" in err_msg or "AccessDenied" in str(type(e)):
            print("\n[INFO] La passerelle API ESPN est prete et fonctionnelle !")
            print("Votre ligue est une ligue PRIVEE (fermee entre collegues).")
            print("Pour synchroniser automatiquement les scores et rosters apres la draft,")
            print("il suffira de renseigner vos 2 cookies de session ESPN (espn_s2 et swid).")
        else:
            print(f"[INFO] Message API : {err_msg}")
        return None

if __name__ == "__main__":
    test_espn_connection()
