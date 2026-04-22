# Changelog

Toutes les modifications notables de Read Later sont documentees ici.
Format base sur [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.2.1] - 2026-04-22

### Added
- Bouton "+ Nouveau projet" directement dans le board (bordure pointillee, clic pour creer)
- Plus besoin d'aller dans les settings pour ajouter un projet

## [1.2.0] - 2026-04-22

### Added
- **Dashboard Kanban** : articles organises en colonnes par projet
- Colonne "Inbox" pour les articles sans projet assigne
- **Drag and drop** entre colonnes pour reassigner les articles a un projet
- **Toggle Board / Liste** : switch entre vue Kanban et grille classique
- Cartes compactes en mode board avec overlay au hover (ouvrir, lu, supprimer)
- Preference de vue sauvegardee dans localStorage
- Animation pulsante sur les cartes en cours de traitement IA
- Indicateur rouge sur les cartes en erreur IA

### Changed
- Stats integrees dans la barre de filtres (plus de footer separe)
- Filtres simplifies : statut + tri (categories visibles sur les badges des cartes)

## [1.1.1] - 2026-04-22

### Added
- Drag and drop des cartes vers les boutons projet dans la barre de filtres

## [1.1.0] - 2026-04-22

### Added
- Theme light/dark dans les parametres
- Systeme de projets : creer des projets dans les settings, assigner un projet par article via dropdown sur chaque carte, filtrer par projet dans le dashboard
- Auto-export JSON programme (frequence : jamais, quotidien, hebdo, quinzaine, mensuel)
- Toggle badge : afficher ou masquer le nombre d'articles non lus sur l'icone
- Modeles IA : DeepSeek V3.2, Claude Sonnet 4.6, Claude Opus 4.6

### Fixed
- Champ `status` vs `summaryStatus` : les resumes IA s'affichent correctement dans le dashboard
- `host_permissions` ajoute pour OpenRouter (requetes cross-origin en MV3)
- Service worker : handler setupAutoExport replace dans le onMessage listener
- Bouton settings du dashboard fonctionnel
- Protection XSS sur les URLs importees
- Article fallback (popup) inclut tous les champs requis
- Badge SEO dans le popup affiche la bonne couleur
- Null guard sur formatRelativeDate
- Export settings : anchor ajoute au DOM avant click

### Removed
- Modeles gratuits (Llama 3.1 8B, Mistral 7B)

## [1.0.0] - 2026-04-22

### Added
- Extension Chrome Manifest V3
- Sauvegarde d'articles en un clic via le popup
- Detection de doublons (meme URL)
- Resume et categorisation IA automatiques via OpenRouter
- 7 categories : SEO, Tech, Marketing, Business, Dev, Design, Autre
- Score de priorite IA (1-5 etoiles)
- Dashboard avec grille de cartes responsive
- Filtres par categorie et statut (lu/non lu)
- Tri par date ou priorite
- Recherche full-text (titre + resume + URL)
- Badge sur l'icone (nombre d'articles non lus)
- Page settings : cle API, choix du modele, export/import JSON
- Suppression avec double confirmation
- Stockage 100% local (chrome.storage.local)
