# 📚 Read Later - Chrome Extension

> **Sauvegardez des articles en un clic. Resume et categorisation IA automatiques. Dashboard Kanban pour organiser votre veille.**

![Version](https://img.shields.io/badge/version-1.2.1-6366f1?style=flat-square)
![Chrome](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?style=flat-square&logo=googlechrome&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)
![No Dependencies](https://img.shields.io/badge/dependencies-0-94a3b8?style=flat-square)

---

## ✨ Fonctionnalites

### 🖱️ Sauvegarde en un clic
- Cliquez sur l'icone de l'extension pour sauvegarder la page courante
- **Detection de doublons** : impossible de sauvegarder deux fois la meme URL
- Badge sur l'icone affichant le nombre d'articles non lus

### 🤖 Resume et categorisation IA
- Resume automatique en 2-3 phrases via **OpenRouter** (DeepSeek, Claude, etc.)
- Categorisation intelligente : `SEO` `Tech` `Marketing` `Business` `Dev` `Design` `Autre`
- Score de priorite (1-5 etoiles)
- Fonctionne sans cle API (les articles sont sauvegardes, juste sans resume)

### 📋 Dashboard Kanban
- **Vue Board** : colonnes par projet, drag and drop pour organiser
- **Vue Liste** : grille classique avec cartes detaillees
- Colonne **Inbox** pour les articles non assignes
- Creer des projets directement depuis le board (bouton "+")
- Toggle entre les deux vues, preference sauvegardee

### 🔍 Recherche et filtres
- Recherche full-text (titre, resume, URL)
- Filtrer par statut : tous, non lus, lus
- Trier par date ou par priorite

### ⚙️ Parametres complets
- **Cle API OpenRouter** : configurer et tester en un clic
- **Modeles IA** : DeepSeek Chat, DeepSeek V3.2, Claude Sonnet 4.6, Claude Opus 4.6
- **Theme** : sombre ou clair
- **Projets** : creer et gerer vos projets
- **Badge** : afficher/masquer le compteur sur l'icone
- **Auto-export** : sauvegarde JSON automatique (quotidien, hebdo, quinzaine, mensuel)
- **Export/Import** : sauvegardez et restaurez vos donnees en JSON

---

## 🚀 Installation

### Depuis les sources (developpeur)

1. **Cloner le repo**
   ```bash
   git clone https://github.com/lkmeldv/read-later-extension.git
   ```

2. **Charger dans Chrome**
   - Ouvrir `chrome://extensions/`
   - Activer le **Mode developpeur** (en haut a droite)
   - Cliquer **Charger l'extension non empaquetee**
   - Selectionner le dossier `read-later-extension/`

3. **Configurer la cle API** (optionnel)
   - Cliquer sur l'icone de l'extension, puis l'engrenage
   - Coller votre cle OpenRouter ([obtenir une cle](https://openrouter.ai/keys))
   - Choisir un modele et cliquer "Tester"

---

## 📁 Structure du projet

```
read-later-extension/
├── manifest.json              # Manifest V3, permissions
├── popup/                     # Popup (sauvegarde rapide)
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── dashboard/                 # Dashboard Kanban + Liste
│   ├── dashboard.html
│   ├── dashboard.css
│   └── dashboard.js
├── settings/                  # Page de parametres
│   ├── settings.html
│   ├── settings.css
│   └── settings.js
├── background/                # Service worker
│   └── service-worker.js
├── lib/                       # Librairies partagees
│   ├── utils.js               # UUID, dates, favicon, theme
│   ├── storage.js             # CRUD chrome.storage.local
│   └── openrouter.js          # Client API OpenRouter
├── icons/                     # Icones extension
├── scripts/
│   └── bump-version.sh        # Script de versioning
├── CHANGELOG.md
└── README.md
```

---

## 🛠️ Stack technique

| Composant | Technologie |
|-----------|-------------|
| **Extension** | Chrome Manifest V3 |
| **Frontend** | HTML / CSS / JS vanilla |
| **Stockage** | `chrome.storage.local` (100% local) |
| **IA** | OpenRouter API (DeepSeek, Claude) |
| **Build** | Aucun (zero dependance, zero bundler) |
| **Theme** | CSS custom properties (dark/light) |

---

## 🎯 Utilisation

### Sauvegarder un article
1. Naviguez sur un article
2. Cliquez sur l'icone **Read Later**
3. Cliquez **Sauvegarder cette page**
4. L'IA genere un resume et une categorie en arriere-plan

### Organiser avec le board
1. Ouvrez le dashboard (popup > "Voir tout")
2. Creez un projet avec le bouton **+ Nouveau projet**
3. **Glissez-deposez** les cartes de l'Inbox vers vos projets
4. Filtrez par statut ou cherchez par mot-cle

### Exporter vos donnees
- **Manuel** : bouton export dans le header du dashboard ou dans les settings
- **Automatique** : configurez la frequence dans les settings (le JSON est telecharge dans votre dossier Telechargements)

---

## 🔑 API OpenRouter

L'extension utilise [OpenRouter](https://openrouter.ai/) pour les resumes IA. Modeles supportes :

| Modele | Prix approximatif |
|--------|-------------------|
| `deepseek/deepseek-chat` | ~0.14$/M tokens (recommande) |
| `deepseek/deepseek-v3.2` | Variable |
| `anthropic/claude-sonnet-4.6` | ~3$/M tokens |
| `anthropic/claude-opus-4.6` | ~15$/M tokens |

**Sans cle API**, l'extension fonctionne normalement : les articles sont sauvegardes, mais sans resume ni categorisation automatique.

---

## 📦 Versioning

Le projet suit le [Semantic Versioning](https://semver.org/) :
- **patch** (1.2.x) : corrections de bugs
- **minor** (1.x.0) : nouvelles fonctionnalites
- **major** (x.0.0) : changements incompatibles

Script de bump :
```bash
./scripts/bump-version.sh patch   # 1.2.1 -> 1.2.2
./scripts/bump-version.sh minor   # 1.2.1 -> 1.3.0
./scripts/bump-version.sh major   # 1.2.1 -> 2.0.0
```

Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique complet.

---

## 🤝 Contribuer

1. Fork le repo
2. Creez une branche (`git checkout -b feat/ma-feature`)
3. Commitez vos changements (`git commit -m "feat: ma feature"`)
4. Push (`git push origin feat/ma-feature`)
5. Ouvrez une Pull Request

---

## 📄 Licence

MIT - Utilisez, modifiez et distribuez librement.

---

**Built with** ❤️ **and** 🤖 **by [Linkuma](https://linkuma.com)**
