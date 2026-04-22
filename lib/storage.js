const STORAGE_KEY_ARTICLES = "articles";
const STORAGE_KEY_SETTINGS = "settings";

const DEFAULT_SETTINGS = {
  apiKey: "",
  model: "deepseek/deepseek-chat",
  categories: ["SEO", "Tech", "Marketing", "Business", "Dev", "Design", "Autre"],
  projects: [],
  theme: "dark",
  showBadge: true,
  autoExportFrequency: "never",
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
