# Read Later Extension - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension (Manifest V3) that saves articles for later reading, with AI-powered summaries and categorization via OpenRouter, all stored locally in chrome.storage.local.

**Architecture:** Vanilla HTML/CSS/JS extension with 4 pages (popup, dashboard, settings, service worker). The popup captures articles, the service worker handles AI calls and storage, the dashboard displays everything with filters, and the settings page manages API configuration.

**Tech Stack:** Chrome Extension Manifest V3, vanilla JS (ES modules in service worker, classic scripts in pages), CSS custom properties for theming, OpenRouter API (DeepSeek model).

**Spec:** `docs/superpowers/specs/2026-04-22-read-later-extension-design.md`

---

## File Map

| File | Responsibility |
|------|----------------|
| `manifest.json` | Extension config, permissions, entry points |
| `lib/utils.js` | UUID generation, date formatting, favicon URL helper |
| `lib/storage.js` | CRUD abstraction over chrome.storage.local |
| `lib/openrouter.js` | OpenRouter API client (summarize + categorize) |
| `background/service-worker.js` | Message listener, AI processing pipeline, badge updates |
| `popup/popup.html` | Popup structure |
| `popup/popup.css` | Popup styles |
| `popup/popup.js` | Save logic, recent articles list, duplicate detection |
| `dashboard/dashboard.html` | Dashboard structure |
| `dashboard/dashboard.css` | Dashboard styles (grid, cards, filters) |
| `dashboard/dashboard.js` | Filtering, sorting, search, CRUD actions, stats |
| `settings/settings.html` | Settings structure |
| `settings/settings.css` | Settings styles |
| `settings/settings.js` | API key management, model selection, export/import |
| `icons/icon-16.png` | Toolbar icon 16x16 |
| `icons/icon-32.png` | Toolbar icon 32x32 |
| `icons/icon-48.png` | Extension page icon 48x48 |
| `icons/icon-128.png` | Chrome Web Store icon 128x128 |

---

### Task 1: Project Scaffolding + Manifest

**Files:**
- Create: `manifest.json`
- Create: `icons/icon-16.png`, `icons/icon-32.png`, `icons/icon-48.png`, `icons/icon-128.png`

- [ ] **Step 1: Create directory structure**

```bash
cd /Users/Mohamed/Documents/code-brouillon/extension-later
mkdir -p popup dashboard settings background lib icons
```

- [ ] **Step 2: Create manifest.json**

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

- [ ] **Step 3: Generate placeholder icons**

Generate simple SVG-based PNG icons (a bookmark shape on indigo background `#6366f1`) at 16, 32, 48, 128px sizes. Use a canvas script or any available tool. The icons should be clean and recognizable at small sizes.

- [ ] **Step 4: Create minimal popup.html for loading test**

```html
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Read Later</title></head>
<body><p>Read Later - Loading...</p></body>
</html>
```

Save to `popup/popup.html`.

- [ ] **Step 5: Create minimal service-worker.js for loading test**

```js
console.log("[Read Later] Service worker loaded");
```

Save to `background/service-worker.js`.

- [ ] **Step 6: Load extension in Chrome and verify**

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension-later/` directory
4. Verify: extension appears with name "Read Later", icon shows, clicking icon opens popup with "Loading..." text, no errors in service worker console.

- [ ] **Step 7: Commit**

```bash
git add manifest.json popup/popup.html background/service-worker.js icons/
git commit -m "feat: scaffold extension with manifest v3 and placeholder files"
```

---

### Task 2: Utility Library (lib/utils.js)

**Files:**
- Create: `lib/utils.js`

- [ ] **Step 1: Write lib/utils.js**

```js
function generateId() {
  return crypto.randomUUID();
}

function formatRelativeDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "a l'instant";
  if (diffMin < 60) return `il y a ${diffMin}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays < 7) return `il y a ${diffDays}j`;

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function formatFullDate(isoString) {
  if (!isoString) return "-";
  return new Date(isoString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFaviconUrl(pageUrl) {
  try {
    const url = new URL(pageUrl);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
  } catch {
    return null;
  }
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str || "";
  return str.slice(0, maxLen - 1) + "…";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
```

- [ ] **Step 2: Verify in browser console**

Open the extension popup, open DevTools (right-click popup > Inspect), paste in console:

```js
// Quick verification
const script = document.createElement('script');
script.src = '../lib/utils.js';
document.head.appendChild(script);
// Then test:
console.log(generateId()); // should print a UUID
console.log(formatRelativeDate(new Date().toISOString())); // "a l'instant"
console.log(getFaviconUrl("https://moz.com/blog")); // google favicon URL
```

- [ ] **Step 3: Commit**

```bash
git add lib/utils.js
git commit -m "feat: add utility library (uuid, dates, favicon, escaping)"
```

---

### Task 3: Storage Abstraction (lib/storage.js)

**Files:**
- Create: `lib/storage.js`

- [ ] **Step 1: Write lib/storage.js**

```js
const STORAGE_KEY_ARTICLES = "articles";
const STORAGE_KEY_SETTINGS = "settings";

const DEFAULT_SETTINGS = {
  apiKey: "",
  model: "deepseek/deepseek-chat",
  categories: ["SEO", "Tech", "Marketing", "Business", "Dev", "Design", "Autre"],
  theme: "dark",
};

async function getArticles() {
  const data = await chrome.storage.local.get(STORAGE_KEY_ARTICLES);
  return data[STORAGE_KEY_ARTICLES] || [];
}

async function saveArticle(article) {
  const articles = await getArticles();
  articles.unshift(article);
  await chrome.storage.local.set({ [STORAGE_KEY_ARTICLES]: articles });
  return article;
}

async function updateArticle(id, updates) {
  const articles = await getArticles();
  const index = articles.findIndex((a) => a.id === id);
  if (index === -1) return null;
  articles[index] = { ...articles[index], ...updates };
  await chrome.storage.local.set({ [STORAGE_KEY_ARTICLES]: articles });
  return articles[index];
}

async function deleteArticle(id) {
  const articles = await getArticles();
  const filtered = articles.filter((a) => a.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY_ARTICLES]: filtered });
}

async function findArticleByUrl(url) {
  const articles = await getArticles();
  return articles.find((a) => a.url === url) || null;
}

async function getUnreadCount() {
  const articles = await getArticles();
  return articles.filter((a) => !a.readAt).length;
}

async function getSettings() {
  const data = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(data[STORAGE_KEY_SETTINGS] || {}) };
}

async function saveSettings(settings) {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: merged });
  return merged;
}

async function exportAllData() {
  const articles = await getArticles();
  const settings = await getSettings();
  return JSON.stringify({ articles, settings, exportedAt: new Date().toISOString() }, null, 2);
}

async function importData(jsonString) {
  const data = JSON.parse(jsonString);
  if (!Array.isArray(data.articles)) throw new Error("Format invalide: articles manquants");
  await chrome.storage.local.set({
    [STORAGE_KEY_ARTICLES]: data.articles,
    [STORAGE_KEY_SETTINGS]: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
  });
  return data.articles.length;
}
```

- [ ] **Step 2: Verify in extension DevTools console**

Open popup DevTools, test storage operations:

```js
// Paste storage.js content, then:
await saveArticle({ id: "test-1", url: "https://example.com", title: "Test", savedAt: new Date().toISOString(), readAt: null, summary: null, category: "Autre", priority: 3, status: "pending" });
console.log(await getArticles()); // should show 1 article
await deleteArticle("test-1");
console.log(await getArticles()); // should show empty array
```

- [ ] **Step 3: Commit**

```bash
git add lib/storage.js
git commit -m "feat: add storage abstraction (articles CRUD + settings)"
```

---

### Task 4: OpenRouter API Client (lib/openrouter.js)

**Files:**
- Create: `lib/openrouter.js`

- [ ] **Step 1: Write lib/openrouter.js**

```js
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `Tu es un assistant qui catégorise des articles web. Retourne UNIQUEMENT un JSON valide avec 3 champs :
- summary (string, résumé en 2-3 phrases en français)
- category (string, une parmi : {{categories}})
- priority (number 1-5, 5 = très important pour un professionnel du web/SEO)

Pas de markdown, pas de backticks, juste le JSON brut.`;

async function analyzeArticle(title, url, apiKey, model, categories) {
  const systemPrompt = SYSTEM_PROMPT.replace("{{categories}}", categories.join(", "));

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "chrome-extension://read-later",
      "X-Title": "Read Later Extension",
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Titre: ${title}\nURL: ${url}` },
      ],
      temperature: 0.3,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Réponse vide de l'API");

  const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const result = JSON.parse(cleaned);

  if (!result.summary || !result.category || result.priority === undefined) {
    throw new Error("Champs manquants dans la réponse IA");
  }

  const validPriority = Math.max(1, Math.min(5, Math.round(result.priority)));
  const validCategory = categories.includes(result.category) ? result.category : "Autre";

  return {
    summary: result.summary,
    category: validCategory,
    priority: validPriority,
  };
}

async function testApiKey(apiKey, model) {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "chrome-extension://read-later",
      "X-Title": "Read Later Extension",
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: "Réponds juste OK." }],
      max_tokens: 10,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errorBody}`);
  }

  return true;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/openrouter.js
git commit -m "feat: add OpenRouter API client (analyze + test key)"
```

---

### Task 5: Service Worker (background/service-worker.js)

**Files:**
- Modify: `background/service-worker.js` (replace placeholder)

- [ ] **Step 1: Write the complete service worker**

```js
import { getArticles, saveArticle, updateArticle, findArticleByUrl, getUnreadCount, getSettings } from "../lib/storage.js";
import { generateId, getFaviconUrl } from "../lib/utils.js";
import { analyzeArticle } from "../lib/openrouter.js";

async function updateBadge() {
  const count = await getUnreadCount();
  const text = count > 0 ? String(count) : "";
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
}

async function processWithAI(articleId) {
  const settings = await getSettings();
  if (!settings.apiKey) {
    await updateArticle(articleId, { status: "error" });
    return;
  }

  await updateArticle(articleId, { status: "processing" });

  const articles = await getArticles();
  const article = articles.find((a) => a.id === articleId);
  if (!article) return;

  try {
    const result = await analyzeArticle(
      article.title,
      article.url,
      settings.apiKey,
      settings.model,
      settings.categories
    );
    await updateArticle(articleId, {
      summary: result.summary,
      category: result.category,
      priority: result.priority,
      status: "done",
    });
  } catch (err) {
    console.error("[Read Later] AI error:", err.message);
    await updateArticle(articleId, { status: "error" });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveArticle") {
    (async () => {
      const existing = await findArticleByUrl(message.url);
      if (existing) {
        sendResponse({ success: false, reason: "duplicate", article: existing });
        return;
      }

      const article = {
        id: generateId(),
        url: message.url,
        title: message.title,
        favicon: getFaviconUrl(message.url),
        savedAt: new Date().toISOString(),
        readAt: null,
        summary: null,
        category: "Autre",
        priority: 3,
        status: "pending",
      };

      await saveArticle(article);
      await updateBadge();
      sendResponse({ success: true, article });

      processWithAI(article.id);
    })();
    return true;
  }

  if (message.action === "retryAI") {
    (async () => {
      await processWithAI(message.articleId);
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.action === "updateBadge") {
    updateBadge().then(() => sendResponse({ success: true }));
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  updateBadge();
});

updateBadge();
```

- [ ] **Step 2: Add ES module exports to lib files**

The service worker uses `import`. The lib files need `export` statements. BUT since the popup/dashboard pages will load these as classic scripts (not modules), we need a dual approach.

Add to the END of `lib/storage.js`:

```js
if (typeof globalThis.__IS_MODULE !== "undefined") {
  // noop - functions are already in scope
}
```

**Actually, simpler approach:** Since the service worker uses `"type": "module"` in manifest, but popup pages use `<script>` tags (not `type="module"`), the lib files should just define functions globally. The service worker will use `importScripts()` instead of `import`.

**Revise: change service worker to NOT use ES modules.** Update `manifest.json`:

Change `"type": "module"` to remove it:

```json
"background": {
  "service_worker": "background/service-worker.js"
}
```

Rewrite service-worker.js to use `importScripts()`:

```js
importScripts("../lib/utils.js", "../lib/storage.js", "../lib/openrouter.js");

async function updateBadge() {
  const count = await getUnreadCount();
  const text = count > 0 ? String(count) : "";
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
}

async function processWithAI(articleId) {
  const settings = await getSettings();
  if (!settings.apiKey) {
    await updateArticle(articleId, { status: "error" });
    return;
  }

  await updateArticle(articleId, { status: "processing" });

  const articles = await getArticles();
  const article = articles.find((a) => a.id === articleId);
  if (!article) return;

  try {
    const result = await analyzeArticle(
      article.title,
      article.url,
      settings.apiKey,
      settings.model,
      settings.categories
    );
    await updateArticle(articleId, {
      summary: result.summary,
      category: result.category,
      priority: result.priority,
      status: "done",
    });
  } catch (err) {
    console.error("[Read Later] AI error:", err.message);
    await updateArticle(articleId, { status: "error" });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveArticle") {
    (async () => {
      const existing = await findArticleByUrl(message.url);
      if (existing) {
        sendResponse({ success: false, reason: "duplicate", article: existing });
        return;
      }

      const article = {
        id: generateId(),
        url: message.url,
        title: message.title,
        favicon: getFaviconUrl(message.url),
        savedAt: new Date().toISOString(),
        readAt: null,
        summary: null,
        category: "Autre",
        priority: 3,
        status: "pending",
      };

      await saveArticle(article);
      await updateBadge();
      sendResponse({ success: true, article });

      processWithAI(article.id);
    })();
    return true;
  }

  if (message.action === "retryAI") {
    (async () => {
      await processWithAI(message.articleId);
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.action === "updateBadge") {
    updateBadge().then(() => sendResponse({ success: true }));
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  updateBadge();
});

updateBadge();
```

- [ ] **Step 3: Reload extension and verify no errors**

1. Go to `chrome://extensions/`
2. Click reload on Read Later
3. Click "Service Worker" link to open its DevTools
4. Console should show no errors
5. Verify `[Read Later] Service worker loaded` is gone (we removed the placeholder)

- [ ] **Step 4: Commit**

```bash
git add background/service-worker.js manifest.json
git commit -m "feat: add service worker with AI processing pipeline and badge"
```

---

### Task 6: Popup UI (popup.html + popup.css + popup.js)

**Files:**
- Modify: `popup/popup.html` (replace placeholder)
- Create: `popup/popup.css`
- Create: `popup/popup.js`

- [ ] **Step 1: Write popup/popup.html**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=380">
  <title>Read Later</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup">
    <header class="popup-header">
      <h1>Read Later</h1>
      <button id="btn-settings" class="icon-btn" title="Paramètres">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
      </button>
    </header>

    <div id="api-banner" class="api-banner hidden">
      <span>Configurez votre clé API pour les résumés IA</span>
      <a href="#" id="banner-settings-link">Configurer</a>
    </div>

    <div id="save-section" class="save-section">
      <p id="current-title" class="current-title">Chargement...</p>
      <button id="btn-save" class="btn-primary">Sauvegarder cette page</button>
      <div id="save-feedback" class="save-feedback hidden"></div>
    </div>

    <div class="divider"></div>

    <section class="recent-section">
      <h2>Récents</h2>
      <ul id="recent-list" class="recent-list"></ul>
    </section>

    <footer class="popup-footer">
      <a href="#" id="btn-dashboard" class="footer-link">
        Voir tout (<span id="total-count">0</span> articles)
      </a>
    </footer>
  </div>

  <script src="../lib/utils.js"></script>
  <script src="../lib/storage.js"></script>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write popup/popup.css**

```css
:root {
  --bg: #0f0f23;
  --surface: #1a1a3e;
  --surface-hover: #252550;
  --border: #2a2a5a;
  --accent: #6366f1;
  --accent-hover: #818cf8;
  --danger: #ef4444;
  --success: #22c55e;
  --text: #e2e8f0;
  --text-secondary: #94a3b8;
  --radius: 8px;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  width: 380px;
  min-height: 200px;
  max-height: 500px;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 14px;
  overflow-y: auto;
}

.popup { padding: 16px; }

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.popup-header h1 {
  font-size: 18px;
  font-weight: 600;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.icon-btn:hover { color: var(--text); background: var(--surface); }

.api-banner {
  background: #1e1b4b;
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  padding: 10px 12px;
  margin-bottom: 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.api-banner a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
  white-space: nowrap;
}

.api-banner a:hover { color: var(--accent-hover); }

.save-section { margin-bottom: 12px; }

.current-title {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-primary {
  width: 100%;
  padding: 10px 16px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover { background: var(--accent-hover); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary.saved {
  background: var(--success);
  cursor: default;
}

.save-feedback {
  margin-top: 8px;
  font-size: 12px;
  text-align: center;
}

.save-feedback.success { color: var(--success); }
.save-feedback.error { color: var(--danger); }

.divider {
  height: 1px;
  background: var(--border);
  margin: 12px 0;
}

.recent-section h2 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.recent-list {
  list-style: none;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s;
}

.recent-item:hover { background: var(--surface); }

.recent-item img {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  flex-shrink: 0;
}

.recent-item-content {
  flex: 1;
  min-width: 0;
}

.recent-item-title {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.recent-item-date {
  font-size: 11px;
  color: var(--text-secondary);
}

.category-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.category-badge[data-cat="SEO"] { background: #1e3a5f; color: #60a5fa; }
.category-badge[data-cat="Tech"] { background: #1e3b2f; color: #4ade80; }
.category-badge[data-cat="Marketing"] { background: #3b1e3f; color: #c084fc; }
.category-badge[data-cat="Business"] { background: #3b2e1e; color: #fbbf24; }
.category-badge[data-cat="Dev"] { background: #1e2f3b; color: #22d3ee; }
.category-badge[data-cat="Design"] { background: #3b1e2e; color: #fb7185; }
.category-badge[data-cat="Autre"] { background: #2a2a3a; color: #94a3b8; }

.popup-footer {
  margin-top: 12px;
  text-align: center;
}

.footer-link {
  color: var(--accent);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
}

.footer-link:hover { color: var(--accent-hover); }

.hidden { display: none !important; }

.empty-state {
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
  padding: 16px 0;
}
```

- [ ] **Step 3: Write popup/popup.js**

```js
document.addEventListener("DOMContentLoaded", async () => {
  const btnSave = document.getElementById("btn-save");
  const btnSettings = document.getElementById("btn-settings");
  const btnDashboard = document.getElementById("btn-dashboard");
  const bannerSettingsLink = document.getElementById("banner-settings-link");
  const currentTitle = document.getElementById("current-title");
  const saveFeedback = document.getElementById("save-feedback");
  const apiBanner = document.getElementById("api-banner");
  const recentList = document.getElementById("recent-list");
  const totalCount = document.getElementById("total-count");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageTitle = tab?.title || "Page sans titre";
  const pageUrl = tab?.url || "";

  currentTitle.textContent = pageTitle;

  const settings = await getSettings();
  if (!settings.apiKey) {
    apiBanner.classList.remove("hidden");
  }

  const existing = await findArticleByUrl(pageUrl);
  if (existing) {
    btnSave.textContent = "Déjà sauvegardé";
    btnSave.disabled = true;
    btnSave.classList.add("saved");
  }

  btnSave.addEventListener("click", async () => {
    btnSave.disabled = true;
    btnSave.textContent = "Sauvegarde...";

    try {
      const response = await chrome.runtime.sendMessage({
        action: "saveArticle",
        title: pageTitle,
        url: pageUrl,
      });

      if (response.success) {
        btnSave.textContent = "Sauvegardé !";
        btnSave.classList.add("saved");
        saveFeedback.textContent = "Article ajouté";
        saveFeedback.className = "save-feedback success";
        saveFeedback.classList.remove("hidden");
        await loadRecentArticles();
      } else if (response.reason === "duplicate") {
        btnSave.textContent = "Déjà sauvegardé";
        btnSave.classList.add("saved");
      }
    } catch (err) {
      btnSave.textContent = "Sauvegarder cette page";
      btnSave.disabled = false;
      saveFeedback.textContent = "Erreur: " + err.message;
      saveFeedback.className = "save-feedback error";
      saveFeedback.classList.remove("hidden");
    }
  });

  function openSettings() {
    chrome.tabs.create({ url: chrome.runtime.getURL("settings/settings.html") });
    window.close();
  }

  btnSettings.addEventListener("click", openSettings);
  bannerSettingsLink.addEventListener("click", (e) => {
    e.preventDefault();
    openSettings();
  });

  btnDashboard.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
    window.close();
  });

  async function loadRecentArticles() {
    const articles = await getArticles();
    totalCount.textContent = articles.length;
    const recent = articles.slice(0, 5);

    if (recent.length === 0) {
      recentList.innerHTML = '<li class="empty-state">Aucun article sauvegardé</li>';
      return;
    }

    recentList.innerHTML = recent
      .map(
        (a) => `
      <li class="recent-item" data-url="${escapeHtml(a.url)}">
        <img src="${escapeHtml(a.favicon || "")}" alt="" onerror="this.style.display='none'">
        <div class="recent-item-content">
          <div class="recent-item-title">${escapeHtml(truncate(a.title, 50))}</div>
          <div class="recent-item-meta">
            <span class="category-badge" data-cat="${escapeHtml(a.category)}">${escapeHtml(a.category)}</span>
            <span class="recent-item-date">${formatRelativeDate(a.savedAt)}</span>
          </div>
        </div>
      </li>
    `
      )
      .join("");

    recentList.querySelectorAll(".recent-item").forEach((item) => {
      item.addEventListener("click", () => {
        chrome.tabs.create({ url: item.dataset.url });
        window.close();
      });
    });
  }

  await loadRecentArticles();
});
```

- [ ] **Step 4: Reload extension and test the popup**

1. Reload extension at `chrome://extensions/`
2. Navigate to any web page
3. Click the extension icon
4. Verify: page title shown, save button works, "Déjà sauvegardé" on second click, recent list shows the saved article
5. Check badge shows "1" on the extension icon

- [ ] **Step 5: Commit**

```bash
git add popup/
git commit -m "feat: add popup with save button, recent list, and settings link"
```

---

### Task 7: Dashboard UI (dashboard.html + dashboard.css + dashboard.js)

**Files:**
- Create: `dashboard/dashboard.html`
- Create: `dashboard/dashboard.css`
- Create: `dashboard/dashboard.js`

- [ ] **Step 1: Write dashboard/dashboard.html**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Read Later - Dashboard</title>
  <link rel="stylesheet" href="dashboard.css">
</head>
<body>
  <div class="app">
    <header class="header">
      <h1>Read Later</h1>
      <div class="header-actions">
        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="search-input" placeholder="Rechercher...">
        </div>
        <button id="btn-export" class="header-btn" title="Exporter JSON">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button id="btn-settings" class="header-btn" title="Paramètres">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        </button>
      </div>
    </header>

    <nav class="filters">
      <div class="filter-categories" id="filter-categories">
        <button class="filter-btn active" data-category="all">Tous</button>
      </div>
      <div class="filter-status">
        <button class="filter-btn active" data-status="all">Tous</button>
        <button class="filter-btn" data-status="unread">Non lus</button>
        <button class="filter-btn" data-status="read">Lus</button>
      </div>
      <div class="filter-sort">
        <label>Trier :
          <select id="sort-select">
            <option value="date">Date (récent)</option>
            <option value="priority">Priorité (haute)</option>
          </select>
        </label>
      </div>
    </nav>

    <main id="articles-grid" class="articles-grid"></main>

    <footer class="stats-bar" id="stats-bar"></footer>
  </div>

  <script src="../lib/utils.js"></script>
  <script src="../lib/storage.js"></script>
  <script src="dashboard.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write dashboard/dashboard.css**

```css
:root {
  --bg: #0f0f23;
  --surface: #1a1a3e;
  --surface-hover: #252550;
  --border: #2a2a5a;
  --accent: #6366f1;
  --accent-hover: #818cf8;
  --danger: #ef4444;
  --success: #22c55e;
  --text: #e2e8f0;
  --text-secondary: #94a3b8;
  --radius: 8px;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 14px;
  min-height: 100vh;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header h1 { font-size: 24px; font-weight: 700; }

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
  width: 260px;
}

.search-box svg { color: var(--text-secondary); flex-shrink: 0; }

.search-box input {
  background: none;
  border: none;
  color: var(--text);
  font-size: 14px;
  outline: none;
  width: 100%;
  font-family: var(--font);
}

.search-box input::placeholder { color: var(--text-secondary); }

.header-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  transition: all 0.15s;
}

.header-btn:hover { color: var(--text); border-color: var(--accent); }

.filters {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-categories {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
}

.filter-status {
  display: flex;
  gap: 6px;
}

.filter-sort {
  color: var(--text-secondary);
  font-size: 13px;
}

.filter-sort select {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 13px;
  font-family: var(--font);
  cursor: pointer;
}

.filter-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.filter-btn:hover { border-color: var(--accent); color: var(--text); }
.filter-btn.active { background: var(--accent); border-color: var(--accent); color: white; }

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.article-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.article-card:hover { border-color: var(--accent); transform: translateY(-1px); }
.article-card.read { opacity: 0.6; }

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.card-header img {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  margin-top: 2px;
  flex-shrink: 0;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  cursor: pointer;
  flex: 1;
}

.card-title:hover { color: var(--accent); }

.card-summary {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.card-summary.processing {
  font-style: italic;
  color: var(--accent);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.category-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.category-badge[data-cat="SEO"] { background: #1e3a5f; color: #60a5fa; }
.category-badge[data-cat="Tech"] { background: #1e3b2f; color: #4ade80; }
.category-badge[data-cat="Marketing"] { background: #3b1e3f; color: #c084fc; }
.category-badge[data-cat="Business"] { background: #3b2e1e; color: #fbbf24; }
.category-badge[data-cat="Dev"] { background: #1e2f3b; color: #22d3ee; }
.category-badge[data-cat="Design"] { background: #3b1e2e; color: #fb7185; }
.category-badge[data-cat="Autre"] { background: #2a2a3a; color: #94a3b8; }

.priority-stars {
  font-size: 12px;
  color: #fbbf24;
  letter-spacing: 1px;
}

.card-date {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: auto;
}

.card-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.card-btn {
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.card-btn:hover { color: var(--text); border-color: var(--text-secondary); }

.card-btn.btn-read { }
.card-btn.btn-read:hover { border-color: var(--success); color: var(--success); }
.card-btn.btn-delete:hover { border-color: var(--danger); color: var(--danger); }
.card-btn.btn-retry { color: var(--accent); border-color: var(--accent); }
.card-btn.btn-retry:hover { background: var(--accent); color: white; }

.stats-bar {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-state h2 {
  font-size: 18px;
  margin-bottom: 8px;
  color: var(--text);
}
```

- [ ] **Step 3: Write dashboard/dashboard.js**

```js
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("articles-grid");
  const searchInput = document.getElementById("search-input");
  const filterCategoriesEl = document.getElementById("filter-categories");
  const statsBar = document.getElementById("stats-bar");
  const sortSelect = document.getElementById("sort-select");
  const btnExport = document.getElementById("btn-export");
  const btnSettings = document.getElementById("btn-settings");

  let allArticles = [];
  let activeCategory = "all";
  let activeStatus = "all";
  let searchQuery = "";

  async function loadArticles() {
    allArticles = await getArticles();
    buildCategoryFilters();
    renderArticles();
    renderStats();
  }

  function buildCategoryFilters() {
    const settings = { categories: ["SEO", "Tech", "Marketing", "Business", "Dev", "Design", "Autre"] };
    const counts = {};
    allArticles.forEach((a) => {
      counts[a.category] = (counts[a.category] || 0) + 1;
    });

    let html = '<button class="filter-btn active" data-category="all">Tous (' + allArticles.length + ")</button>";
    settings.categories.forEach((cat) => {
      if (counts[cat]) {
        html += '<button class="filter-btn" data-category="' + escapeHtml(cat) + '">' + escapeHtml(cat) + " (" + counts[cat] + ")</button>";
      }
    });
    filterCategoriesEl.innerHTML = html;

    filterCategoriesEl.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        filterCategoriesEl.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeCategory = btn.dataset.category;
        renderArticles();
      });
    });
  }

  function getFilteredArticles() {
    let filtered = [...allArticles];

    if (activeCategory !== "all") {
      filtered = filtered.filter((a) => a.category === activeCategory);
    }

    if (activeStatus === "unread") {
      filtered = filtered.filter((a) => !a.readAt);
    } else if (activeStatus === "read") {
      filtered = filtered.filter((a) => a.readAt);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          (a.title && a.title.toLowerCase().includes(q)) ||
          (a.summary && a.summary.toLowerCase().includes(q)) ||
          (a.url && a.url.toLowerCase().includes(q))
      );
    }

    const sortBy = sortSelect.value;
    if (sortBy === "priority") {
      filtered.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    } else {
      filtered.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    }

    return filtered;
  }

  function renderArticles() {
    const filtered = getFilteredArticles();

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="empty-state"><h2>Aucun article</h2><p>Sauvegardez des articles en cliquant sur l\'icône de l\'extension.</p></div>';
      return;
    }

    grid.innerHTML = filtered.map((a) => {
      const isRead = !!a.readAt;
      const stars = a.priority ? "★".repeat(a.priority) + "☆".repeat(5 - a.priority) : "";
      let summaryHtml;
      if (a.status === "processing") {
        summaryHtml = '<p class="card-summary processing">Analyse IA en cours...</p>';
      } else if (a.status === "error") {
        summaryHtml = '<p class="card-summary" style="color:var(--danger)">Erreur IA</p>';
      } else if (a.summary) {
        summaryHtml = '<p class="card-summary">' + escapeHtml(a.summary) + "</p>";
      } else {
        summaryHtml = '<p class="card-summary">Pas de résumé</p>';
      }

      return `
        <div class="article-card ${isRead ? "read" : ""}" data-id="${a.id}">
          <div class="card-header">
            <img src="${escapeHtml(a.favicon || "")}" alt="" onerror="this.style.display='none'">
            <span class="card-title" data-url="${escapeHtml(a.url)}">${escapeHtml(a.title)}</span>
          </div>
          ${summaryHtml}
          <div class="card-meta">
            <span class="category-badge" data-cat="${escapeHtml(a.category)}">${escapeHtml(a.category)}</span>
            ${stars ? '<span class="priority-stars">' + stars + "</span>" : ""}
            <span class="card-date">${formatRelativeDate(a.savedAt)}</span>
          </div>
          <div class="card-actions">
            ${!isRead ? '<button class="card-btn btn-read" data-action="read" data-id="' + a.id + '">Marquer lu</button>' : '<button class="card-btn btn-read" data-action="unread" data-id="' + a.id + '">Marquer non lu</button>'}
            ${a.status === "error" ? '<button class="card-btn btn-retry" data-action="retry" data-id="' + a.id + '">Réessayer IA</button>' : ""}
            <button class="card-btn btn-delete" data-action="delete" data-id="${a.id}">Supprimer</button>
          </div>
        </div>
      `;
    }).join("");

    grid.querySelectorAll(".card-title").forEach((el) => {
      el.addEventListener("click", async () => {
        const url = el.dataset.url;
        const card = el.closest(".article-card");
        const id = card.dataset.id;
        await updateArticle(id, { readAt: new Date().toISOString() });
        chrome.tabs.create({ url });
        chrome.runtime.sendMessage({ action: "updateBadge" });
        await loadArticles();
      });
    });

    grid.querySelectorAll(".card-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === "read") {
          await updateArticle(id, { readAt: new Date().toISOString() });
          chrome.runtime.sendMessage({ action: "updateBadge" });
        } else if (action === "unread") {
          await updateArticle(id, { readAt: null });
          chrome.runtime.sendMessage({ action: "updateBadge" });
        } else if (action === "delete") {
          if (confirm("Supprimer cet article ?")) {
            await deleteArticle(id);
            chrome.runtime.sendMessage({ action: "updateBadge" });
          }
        } else if (action === "retry") {
          chrome.runtime.sendMessage({ action: "retryAI", articleId: id });
          await updateArticle(id, { status: "processing" });
        }

        await loadArticles();
      });
    });
  }

  function renderStats() {
    const total = allArticles.length;
    const unread = allArticles.filter((a) => !a.readAt).length;
    const catCounts = {};
    allArticles.forEach((a) => {
      catCounts[a.category] = (catCounts[a.category] || 0) + 1;
    });
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
    const topStr = topCat ? `Top : ${topCat[0]} (${topCat[1]})` : "";

    statsBar.textContent = `${total} article${total > 1 ? "s" : ""} - ${unread} non lu${unread > 1 ? "s" : ""} ${topStr ? "- " + topStr : ""}`;
  }

  document.querySelectorAll(".filter-status .filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-status .filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeStatus = btn.dataset.status;
      renderArticles();
    });
  });

  sortSelect.addEventListener("change", renderArticles);

  let searchTimeout;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      renderArticles();
    }, 200);
  });

  btnExport.addEventListener("click", async () => {
    const json = await exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "read-later-export-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  });

  btnSettings.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("settings/settings.html") });
  });

  await loadArticles();

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.articles) {
      loadArticles();
    }
  });
});
```

- [ ] **Step 4: Reload extension and test the dashboard**

1. Reload extension
2. Save 2-3 articles from different pages via the popup
3. Click "Voir tout" in the popup
4. Verify: dashboard opens, cards display correctly, filters work, search works, "Marquer lu" works, "Supprimer" works, stats bar updates
5. Test export button (downloads JSON file)

- [ ] **Step 5: Commit**

```bash
git add dashboard/
git commit -m "feat: add dashboard with card grid, filters, search, and export"
```

---

### Task 8: Settings Page (settings.html + settings.css + settings.js)

**Files:**
- Create: `settings/settings.html`
- Create: `settings/settings.css`
- Create: `settings/settings.js`

- [ ] **Step 1: Write settings/settings.html**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Read Later - Paramètres</title>
  <link rel="stylesheet" href="settings.css">
</head>
<body>
  <div class="app">
    <header class="header">
      <a href="#" id="btn-back" class="back-link">&larr; Dashboard</a>
      <h1>Paramètres</h1>
    </header>

    <section class="settings-section">
      <h2>API OpenRouter</h2>
      <div class="field">
        <label for="api-key">Clé API</label>
        <div class="input-row">
          <input type="password" id="api-key" placeholder="sk-or-v1-...">
          <button id="btn-toggle-key" class="btn-small">Afficher</button>
          <button id="btn-test-key" class="btn-small btn-accent">Tester</button>
        </div>
        <p id="key-status" class="field-status"></p>
      </div>
      <div class="field">
        <label for="model-select">Modèle IA</label>
        <select id="model-select">
          <option value="deepseek/deepseek-chat">DeepSeek Chat (~0.14$/M tokens)</option>
          <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B (gratuit)</option>
          <option value="mistralai/mistral-7b-instruct:free">Mistral 7B (gratuit)</option>
        </select>
      </div>
    </section>

    <section class="settings-section">
      <h2>Données</h2>
      <div class="field">
        <label>Export / Import</label>
        <div class="input-row">
          <button id="btn-export" class="btn-small btn-accent">Exporter JSON</button>
          <button id="btn-import" class="btn-small">Importer JSON</button>
          <input type="file" id="import-file" accept=".json" style="display:none">
        </div>
        <p id="data-status" class="field-status"></p>
      </div>
      <div class="field danger-zone">
        <label>Zone de danger</label>
        <button id="btn-clear" class="btn-small btn-danger">Tout supprimer</button>
        <p id="clear-status" class="field-status"></p>
      </div>
    </section>

    <footer class="settings-footer">
      <p>Read Later v1.0.0</p>
    </footer>
  </div>

  <script src="../lib/utils.js"></script>
  <script src="../lib/storage.js"></script>
  <script src="../lib/openrouter.js"></script>
  <script src="settings.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write settings/settings.css**

```css
:root {
  --bg: #0f0f23;
  --surface: #1a1a3e;
  --surface-hover: #252550;
  --border: #2a2a5a;
  --accent: #6366f1;
  --accent-hover: #818cf8;
  --danger: #ef4444;
  --success: #22c55e;
  --text: #e2e8f0;
  --text-secondary: #94a3b8;
  --radius: 8px;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 14px;
  min-height: 100vh;
}

.app {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
}

.header { margin-bottom: 24px; }

.back-link {
  color: var(--accent);
  text-decoration: none;
  font-size: 13px;
  display: inline-block;
  margin-bottom: 8px;
}

.back-link:hover { color: var(--accent-hover); }

.header h1 { font-size: 24px; font-weight: 700; }

.settings-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 16px;
}

.settings-section h2 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.field { margin-bottom: 16px; }
.field:last-child { margin-bottom: 0; }

.field label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.field input[type="password"],
.field input[type="text"] {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 14px;
  font-family: var(--font);
  outline: none;
}

.field input:focus { border-color: var(--accent); }

.field select {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 14px;
  font-family: var(--font);
  cursor: pointer;
}

.btn-small {
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--surface-hover);
  color: var(--text-secondary);
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-small:hover { color: var(--text); border-color: var(--text-secondary); }
.btn-accent { background: var(--accent); border-color: var(--accent); color: white; }
.btn-accent:hover { background: var(--accent-hover); }
.btn-danger { background: transparent; border-color: var(--danger); color: var(--danger); }
.btn-danger:hover { background: var(--danger); color: white; }

.field-status {
  margin-top: 6px;
  font-size: 12px;
}

.field-status.success { color: var(--success); }
.field-status.error { color: var(--danger); }

.danger-zone {
  border-top: 1px solid var(--danger);
  padding-top: 16px;
  margin-top: 16px;
}

.settings-footer {
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
  margin-top: 24px;
}
```

- [ ] **Step 3: Write settings/settings.js**

```js
document.addEventListener("DOMContentLoaded", async () => {
  const apiKeyInput = document.getElementById("api-key");
  const btnToggleKey = document.getElementById("btn-toggle-key");
  const btnTestKey = document.getElementById("btn-test-key");
  const keyStatus = document.getElementById("key-status");
  const modelSelect = document.getElementById("model-select");
  const btnExport = document.getElementById("btn-export");
  const btnImport = document.getElementById("btn-import");
  const importFile = document.getElementById("import-file");
  const dataStatus = document.getElementById("data-status");
  const btnClear = document.getElementById("btn-clear");
  const clearStatus = document.getElementById("clear-status");
  const btnBack = document.getElementById("btn-back");

  const settings = await getSettings();
  apiKeyInput.value = settings.apiKey || "";
  modelSelect.value = settings.model || "deepseek/deepseek-chat";

  btnToggleKey.addEventListener("click", () => {
    const isPassword = apiKeyInput.type === "password";
    apiKeyInput.type = isPassword ? "text" : "password";
    btnToggleKey.textContent = isPassword ? "Masquer" : "Afficher";
  });

  apiKeyInput.addEventListener("change", async () => {
    await saveSettings({ apiKey: apiKeyInput.value.trim() });
    keyStatus.textContent = "Clé sauvegardée";
    keyStatus.className = "field-status success";
  });

  modelSelect.addEventListener("change", async () => {
    await saveSettings({ model: modelSelect.value });
  });

  btnTestKey.addEventListener("click", async () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      keyStatus.textContent = "Entrez une clé API d'abord";
      keyStatus.className = "field-status error";
      return;
    }

    btnTestKey.disabled = true;
    btnTestKey.textContent = "Test...";
    keyStatus.textContent = "";

    try {
      await testApiKey(key, modelSelect.value);
      keyStatus.textContent = "Connexion réussie !";
      keyStatus.className = "field-status success";
    } catch (err) {
      keyStatus.textContent = "Erreur : " + err.message;
      keyStatus.className = "field-status error";
    } finally {
      btnTestKey.disabled = false;
      btnTestKey.textContent = "Tester";
    }
  });

  btnExport.addEventListener("click", async () => {
    const json = await exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "read-later-export-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
    dataStatus.textContent = "Export terminé";
    dataStatus.className = "field-status success";
  });

  btnImport.addEventListener("click", () => importFile.click());

  importFile.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const count = await importData(text);
      dataStatus.textContent = `${count} articles importés`;
      dataStatus.className = "field-status success";
    } catch (err) {
      dataStatus.textContent = "Erreur : " + err.message;
      dataStatus.className = "field-status error";
    }

    importFile.value = "";
  });

  let clearClickCount = 0;
  btnClear.addEventListener("click", async () => {
    clearClickCount++;
    if (clearClickCount === 1) {
      clearStatus.textContent = "Cliquez encore pour confirmer la suppression";
      clearStatus.className = "field-status error";
      setTimeout(() => {
        clearClickCount = 0;
        clearStatus.textContent = "";
      }, 3000);
    } else if (clearClickCount >= 2) {
      await chrome.storage.local.clear();
      clearStatus.textContent = "Toutes les données ont été supprimées";
      clearStatus.className = "field-status success";
      clearClickCount = 0;
      apiKeyInput.value = "";
      chrome.runtime.sendMessage({ action: "updateBadge" });
    }
  });

  btnBack.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
  });
});
```

- [ ] **Step 4: Reload extension and test settings**

1. Reload extension
2. Open settings from popup (gear icon)
3. Paste an OpenRouter API key, click "Tester"
4. Verify: test passes (or fails with clear error message)
5. Change model, reload settings page, verify model persisted
6. Test export/import cycle
7. Test "Tout supprimer" (double click confirm)

- [ ] **Step 5: Commit**

```bash
git add settings/
git commit -m "feat: add settings page with API key, model, export/import, and clear"
```

---

### Task 9: Icons Generation

**Files:**
- Create: `icons/icon-16.png`, `icons/icon-32.png`, `icons/icon-48.png`, `icons/icon-128.png`

- [ ] **Step 1: Generate SVG icon**

Create a simple bookmark icon as SVG, then convert to PNGs at all 4 sizes. The icon should be a bookmark shape (filled) in `#6366f1` on a rounded `#1a1a3e` background.

Use a script or tool to generate the PNGs. If no image tool is available, create a minimal canvas-based HTML file that generates and downloads the icons:

```html
<!-- save as generate-icons.html, open in browser -->
<!DOCTYPE html>
<html>
<body>
<script>
[16, 32, 48, 128].forEach(size => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const r = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.fillStyle = '#1a1a3e';
  ctx.fill();

  const m = size * 0.2;
  const bw = size * 0.5;
  const bh = size * 0.65;
  const bx = (size - bw) / 2;
  const by = m;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + bw, by);
  ctx.lineTo(bx + bw, by + bh);
  ctx.lineTo(bx + bw / 2, by + bh * 0.75);
  ctx.lineTo(bx, by + bh);
  ctx.closePath();
  ctx.fillStyle = '#6366f1';
  ctx.fill();

  const a = document.createElement('a');
  a.download = 'icon-' + size + '.png';
  a.href = c.toDataURL();
  a.click();
});
</script>
</body>
</html>
```

Open in browser, save the 4 downloaded PNGs to `icons/`.

- [ ] **Step 2: Commit**

```bash
git add icons/
git commit -m "feat: add extension icons (16, 32, 48, 128px)"
```

---

### Task 10: Integration Testing and Polish

**Files:**
- Possibly modify any file for bug fixes

- [ ] **Step 1: Full user flow test**

Test the complete flow end-to-end:

1. Load extension in Chrome (`chrome://extensions/` > Load unpacked)
2. Open settings, enter OpenRouter API key, test it
3. Navigate to 3 different articles (e.g., a blog post, a news article, a docs page)
4. Save each via the popup
5. Verify badge increments (shows 3)
6. Open dashboard
7. Wait for AI summaries to appear (cards should update from "Analyse IA en cours..." to actual summaries)
8. Test each filter: click "SEO", "Tech", etc.
9. Test search: type part of an article title
10. Test "Marquer lu" on one article
11. Test "Supprimer" on one article
12. Test sort by priority
13. Test export, then import the exported file
14. Verify no console errors in popup, dashboard, settings, and service worker DevTools

- [ ] **Step 2: Fix any bugs found during testing**

Address any issues discovered. Common things to check:
- favicon images loading correctly
- Relative dates showing properly
- Badge count accuracy
- AI retry working after failure
- Settings persisting across page reloads

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: polish and bug fixes from integration testing"
```

---

## Verification Checklist

| Feature | How to verify |
|---------|---------------|
| Save article | Click icon > Save > check badge updates |
| Duplicate detection | Save same URL twice > shows "Déjà sauvegardé" |
| AI summary | Save article with API key configured > wait 5s > check dashboard card |
| AI fallback | Remove API key > save article > article saved with "Autre" category, no summary |
| AI retry | Dashboard > article with error > "Réessayer IA" button works |
| Filter by category | Dashboard > click category badge > only matching articles shown |
| Filter by status | Dashboard > click "Non lus" / "Lus" |
| Search | Dashboard > type in search box > results filtered live |
| Sort | Dashboard > change sort dropdown > order changes |
| Mark as read | Dashboard > click "Marquer lu" > card grayed, badge updates |
| Delete article | Dashboard > click "Supprimer" > confirm > card removed |
| Open article | Dashboard > click title > new tab opens, marked as read |
| Export | Dashboard or settings > export > JSON file downloads |
| Import | Settings > import > articles restored |
| Clear all | Settings > double-click "Tout supprimer" > all data gone |
| API key test | Settings > paste key > click "Tester" > success/error shown |
| Badge count | Matches unread article count at all times |
