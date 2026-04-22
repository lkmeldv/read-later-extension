# Spec - Extension Chrome "Read Later"

> Date : 2026-04-22
> Auteur : Mohamed
> Statut : Draft

## Objectif

Extension Chrome permettant de sauvegarder des articles en un clic pour les lire plus tard. Un dashboard intégré affiche les articles sauvegardés avec résumé IA, catégorisation automatique, filtres et recherche. Outil individuel, distribuable à l'équipe en .zip.

## Contraintes

- Zéro serveur : tout est local dans l'extension
- Zéro framework JS : HTML/CSS/JS vanilla
- Zéro build step : pas de node_modules, pas de bundler
- Manifest V3 (standard Chrome actuel)
- Fonctionne offline (sauvegarde immédiate, IA en async quand la clé est configurée)
- Distribuable en .zip ou via Chrome Web Store

## Architecture

```
extension-later/
├── manifest.json          # Manifest V3, permissions
├── popup/
│   ├── popup.html         # UI du popup (sauvegarde + quick list)
│   ├── popup.css          # Styles popup
│   └── popup.js           # Logique popup
├── dashboard/
│   ├── dashboard.html     # Page complète (nouvel onglet)
│   ├── dashboard.css      # Styles dashboard
│   └── dashboard.js       # Logique dashboard (filtres, recherche, CRUD)
├── settings/
│   ├── settings.html      # Page configuration (clé API)
│   ├── settings.css       # Styles settings
│   └── settings.js        # Logique settings
├── background/
│   └── service-worker.js  # Appels IA, gestion storage, badge
├── lib/
│   ├── storage.js         # CRUD chrome.storage.local (abstraction)
│   ├── openrouter.js      # Client API OpenRouter
│   └── utils.js           # Helpers (UUID, dates, formatage)
├── icons/
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-04-22-read-later-extension-design.md
```

## Data Model

Chaque article sauvegardé est un objet stocké dans `chrome.storage.local` sous la clé `articles` (tableau JSON).

```js
{
  id: "uuid-v4",
  url: "https://example.com/article",
  title: "Titre de l'article",
  favicon: "https://example.com/favicon.ico",
  savedAt: "2026-04-22T14:30:00Z",
  readAt: null,
  summary: "Résumé IA en 2-3 phrases.",
  category: "SEO",
  priority: 3,
  status: "pending"
}
```

### Champs

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | UUID v4 généré côté client |
| `url` | string | URL de la page sauvegardée |
| `title` | string | `document.title` de la page |
| `favicon` | string | Favicon de la page (Google Favicon API fallback) |
| `savedAt` | string ISO | Date/heure de sauvegarde |
| `readAt` | string ISO ou null | Date/heure de lecture (null = non lu) |
| `summary` | string ou null | Résumé IA (null si pas encore traité) |
| `category` | string | Catégorie IA ou "Autre" par défaut |
| `priority` | number 1-5 | Score de priorité IA (3 par défaut) |
| `status` | enum | `pending` (sauvé), `processing` (IA en cours), `done` (IA terminé), `error` (IA échoué) |

### Catégories prédéfinies

`SEO`, `Tech`, `Marketing`, `Business`, `Dev`, `Design`, `Autre`

### Limites de stockage

`chrome.storage.local` offre 10MB par défaut (extensible avec `unlimitedStorage`). Un article fait ~500 octets. On peut stocker ~20 000 articles sans problème.

## Composants détaillés

### 1. Popup (popup.html)

**Dimensions** : 380px x 500px

**Contenu** :
- Header : logo + nom "Read Later"
- Bouton principal : "Sauvegarder cette page" (pleine largeur, accent color)
- Si déjà sauvegardé : afficher "Déjà sauvegardé" (état désactivé + date)
- Liste des 5 derniers articles (titre tronqué + catégorie badge + date relative)
- Footer : lien "Voir tout (N articles)" vers le dashboard + icône settings

**Comportement au clic sur "Sauvegarder"** :
1. Récupère `document.title`, `window.location.href`, favicon via `chrome.tabs.query`
2. Crée l'objet article avec `status: "pending"`
3. Stocke immédiatement dans `chrome.storage.local`
4. Envoie un message au service worker pour le traitement IA
5. Affiche une confirmation visuelle (check animé)
6. Met à jour le badge de l'icône

### 2. Service Worker (background/service-worker.js)

**Responsabilités** :
- Écouter les messages du popup (nouvelle sauvegarde)
- Appeler l'API OpenRouter pour résumé + catégorisation
- Mettre à jour l'article avec les résultats IA
- Gérer le badge (nombre d'articles non lus)
- Gérer la détection de doublons (même URL)

**Appel OpenRouter** :

```
POST https://openrouter.ai/api/v1/chat/completions
Headers:
  Authorization: Bearer <user-api-key>
  Content-Type: application/json
  HTTP-Referer: chrome-extension://read-later

Body:
{
  "model": "deepseek/deepseek-chat",
  "messages": [
    {
      "role": "system",
      "content": "Tu es un assistant qui catégorise des articles web. Retourne UNIQUEMENT un JSON valide avec 3 champs : summary (string, résumé en 2-3 phrases en français), category (string, une parmi : SEO, Tech, Marketing, Business, Dev, Design, Autre), priority (number 1-5, 5 = très important pour un professionnel du web/SEO)."
    },
    {
      "role": "user",
      "content": "Titre: {{title}}\nURL: {{url}}"
    }
  ],
  "temperature": 0.3,
  "max_tokens": 300
}
```

**Modèle par défaut** : `deepseek/deepseek-chat` (~0.14$/M tokens input, ~0.28$/M output)

**Gestion d'erreur** : si l'appel échoue (pas de clé, rate limit, erreur réseau), l'article reste avec `status: "error"`, `category: "Autre"`, `summary: null`, `priority: 3`. Un bouton "Réessayer" sera disponible dans le dashboard.

### 3. Dashboard (dashboard.html)

**Ouverture** : `chrome.tabs.create({ url: "dashboard/dashboard.html" })`

**Layout** :
```
┌──────────────────────────────────────────────────┐
│  Read Later                    [Recherche...] ⚙  │
├──────────────────────────────────────────────────┤
│  [Tous] [SEO] [Tech] [Marketing] [Business] ... │
│  [Non lus] [Lus]        Trier: [Date v] [Prio]  │
├──────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │ 🔵 favicon  │ │ 🔵 favicon  │ │ 🔵 favicon │ │
│  │ Titre...    │ │ Titre...    │ │ Titre...   │ │
│  │ Résumé IA   │ │ Résumé IA   │ │ Résumé IA  │ │
│  │ [SEO] ★★★   │ │ [Tech] ★★   │ │ [Dev] ★★★★│ │
│  │ il y a 2h   │ │ hier        │ │ 20 avr.    │ │
│  │ [Lu] [Suppr]│ │ [Lu] [Suppr]│ │[Lu] [Suppr]│ │
│  └─────────────┘ └─────────────┘ └────────────┘ │
│                                                  │
│  Stats: 42 articles - 12 non lus - Top: SEO (18)│
└──────────────────────────────────────────────────┘
```

**Fonctionnalités** :
- Grille responsive de cartes (CSS Grid, 1 à 3 colonnes selon la largeur)
- Filtre par catégorie (badges cliquables en haut)
- Filtre par statut : tous, non lus, lus
- Tri par date (récent d'abord) ou par priorité (haute d'abord)
- Recherche full-text (titre + résumé)
- Clic sur une carte : ouvre l'article dans un nouvel onglet et marque comme lu
- Bouton "Marquer comme lu" sans ouvrir
- Bouton "Supprimer" avec confirmation
- Barre de stats en bas (total, non lus, catégorie dominante)
- Export JSON (bouton dans settings ou dashboard)
- Bouton "Réessayer IA" sur les articles en `status: "error"`

### 4. Settings (settings.html)

**Accès** : depuis le popup (icône engrenage) ou le dashboard

**Options** :
- Clé API OpenRouter (input password + bouton tester)
- Modèle IA (dropdown : `deepseek/deepseek-chat`, `meta-llama/llama-3.1-8b-instruct:free`, `mistralai/mistral-7b-instruct:free`)
- Catégories personnalisées (ajouter/supprimer, les 7 par défaut sont préremplies)
- Export/Import des données (JSON)
- Bouton "Tout supprimer" (avec double confirmation)

Stockage des settings dans `chrome.storage.local` sous la clé `settings`.

```js
{
  apiKey: "sk-or-v1-...",
  model: "deepseek/deepseek-chat",
  categories: ["SEO", "Tech", "Marketing", "Business", "Dev", "Design", "Autre"],
  theme: "dark"
}
```

## Manifest V3

```json
{
  "manifest_version": 3,
  "name": "Read Later",
  "version": "1.0.0",
  "description": "Sauvegardez des articles pour les lire plus tard. Résumé et catégorisation IA automatiques.",
  "permissions": [
    "storage",
    "activeTab",
    "tabs"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

**Pas besoin de** `unlimitedStorage` sauf si l'utilisateur dépasse ~10 000 articles.
**Pas besoin de** `host_permissions` car on n'injecte rien dans les pages, on utilise `activeTab`.

## Style visuel

### Palette

| Rôle | Couleur | Usage |
|------|---------|-------|
| Background | `#0f0f23` | Fond principal |
| Surface | `#1a1a3e` | Cartes, popup |
| Surface hover | `#252550` | Hover sur cartes |
| Border | `#2a2a5a` | Bordures subtiles |
| Accent | `#6366f1` | Boutons, liens, badges actifs |
| Accent hover | `#818cf8` | Hover sur accent |
| Danger | `#ef4444` | Supprimer, erreurs |
| Success | `#22c55e` | Confirmations, badge "lu" |
| Text primary | `#e2e8f0` | Texte principal |
| Text secondary | `#94a3b8` | Texte secondaire, dates |

### Badges catégories

| Catégorie | Couleur fond | Couleur texte |
|-----------|-------------|---------------|
| SEO | `#1e3a5f` | `#60a5fa` |
| Tech | `#1e3b2f` | `#4ade80` |
| Marketing | `#3b1e3f` | `#c084fc` |
| Business | `#3b2e1e` | `#fbbf24` |
| Dev | `#1e2f3b` | `#22d3ee` |
| Design | `#3b1e2e` | `#fb7185` |
| Autre | `#2a2a3a` | `#94a3b8` |

### Typographie

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

Tailles : 14px base, 12px secondaire, 16px titres cartes, 20px titres pages.

## Flux utilisateur

### Sauvegarder un article
1. L'utilisateur navigue sur un article
2. Clic sur l'icône de l'extension
3. Popup s'ouvre, affiche le titre de la page courante
4. Clic sur "Sauvegarder"
5. Animation de confirmation (check vert)
6. Article stocké, service worker lance le résumé IA en background
7. Badge sur l'icône se met à jour (+1 non lu)

### Consulter le dashboard
1. Clic sur l'icône, puis "Voir tout"
2. Dashboard s'ouvre dans un nouvel onglet
3. Articles affichés en grille, les plus récents en premier
4. L'utilisateur filtre par catégorie ou recherche
5. Clic sur une carte pour ouvrir l'article (marque automatiquement comme lu)

### Configurer la clé API
1. Premier lancement : popup affiche un bandeau "Configurez votre clé API pour les résumés IA"
2. Clic sur le lien ou l'engrenage
3. Page settings : coller la clé, choisir le modèle
4. Bouton "Tester" envoie un appel test
5. Confirmation ou erreur affichée

## Ce qui est hors scope

- Pas de scraping du contenu des articles (on utilise uniquement titre + URL pour l'IA)
- Pas de mode offline pour l'IA (le résumé nécessite une connexion)
- Pas de sync multi-navigateurs
- Pas de système de tags manuels (les catégories IA suffisent pour v1)
- Pas de notifications/rappels de lecture
