importScripts("../lib/utils.js", "../lib/storage.js", "../lib/openrouter.js");

const ALARM_NAME = "auto-export";

const FREQUENCY_MINUTES = {
  daily: 1440,
  weekly: 10080,
  biweekly: 20160,
  monthly: 43200,
};

async function updateBadge() {
  const settings = await getSettings();
  if (!settings.showBadge) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }
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

  if (message.action === "setupAutoExport") {
    (async () => {
      await setupAutoExportAlarm();
      sendResponse({ success: true });
    })();
    return true;
  }
});

async function setupAutoExportAlarm() {
  await chrome.alarms.clear(ALARM_NAME);
  const settings = await getSettings();
  const freq = settings.autoExportFrequency || "never";
  const minutes = FREQUENCY_MINUTES[freq];
  if (minutes) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: minutes });
  }
}

async function performAutoExport() {
  const json = await exportAllData();
  const blob = new Blob([json], { type: "application/json" });
  const reader = new FileReader();
  reader.onload = () => {
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    chrome.downloads.download({
      url: reader.result,
      filename: `read-later-export-${ts}.json`,
      saveAs: false,
    });
  };
  reader.readAsDataURL(blob);
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    performAutoExport();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  updateBadge();
  setupAutoExportAlarm();
});

updateBadge();
