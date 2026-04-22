/* ============================================================
   Read Later - Popup Script
   ============================================================ */

const RECENT_LIMIT = 5;

// Category -> badge CSS class mapping
const BADGE_CLASS = {
  SEO: "badge-seo",
  Tech: "badge-tech",
  Marketing: "badge-marketing",
  Business: "badge-business",
  Dev: "badge-dev",
  Design: "badge-design",
  Autre: "badge-autre",
};

// ---- DOM refs ----
const elCurrentTitle   = document.getElementById("current-title");
const elCurrentFavicon = document.getElementById("current-favicon");
const elBtnSave        = document.getElementById("btn-save");
const elBtnSaveLabel   = document.getElementById("btn-save-label");
const elBtnSettings    = document.getElementById("btn-settings");
const elBtnDashboard   = document.getElementById("btn-dashboard");
const elBannerNoApi    = document.getElementById("banner-no-api");
const elBannerSettings = document.getElementById("banner-settings-link");
const elArticleList    = document.getElementById("article-list");
const elArticleEmpty   = document.getElementById("article-empty");
const elFooterCount    = document.getElementById("footer-count");
const elToast          = document.getElementById("toast");

let currentTab = null;

// ============================================================
// Init
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  applyTheme();

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  // Render current page info
  renderCurrentPage(tab);

  // Check settings (API key)
  const settings = await getSettings();
  if (!settings.apiKey) {
    elBannerNoApi.hidden = false;
  }

  // Check if already saved
  const existing = await findArticleByUrl(tab.url);
  if (existing) {
    setSavedState();
  }

  // Load recent articles
  await renderRecentArticles();

  // Update footer count
  const total = (await getArticles()).length;
  elFooterCount.textContent = total > 0 ? `Voir tout (${total} articles)` : "Voir tout";
});

// ============================================================
// Current page
// ============================================================

function renderCurrentPage(tab) {
  const title = tab.title || tab.url || "Page sans titre";
  elCurrentTitle.textContent = truncate(title, 60);
  elCurrentTitle.title = title;

  const faviconUrl = getFaviconUrl(tab.url);
  if (faviconUrl) {
    elCurrentFavicon.src = faviconUrl;
    elCurrentFavicon.style.display = "block";
    elCurrentFavicon.onerror = () => {
      elCurrentFavicon.style.display = "none";
    };
  } else {
    elCurrentFavicon.style.display = "none";
  }
}

// ============================================================
// Save button
// ============================================================

elBtnSave.addEventListener("click", async () => {
  if (elBtnSave.disabled || !currentTab) return;

  elBtnSave.disabled = true;
  elBtnSaveLabel.textContent = "Sauvegarde...";

  try {
    const response = await chrome.runtime.sendMessage({
      action: "saveArticle",
      title: currentTab.title || currentTab.url,
      url: currentTab.url,
    });

    if (response && response.success === false && response.reason !== "duplicate") {
      elBtnSave.disabled = false;
      elBtnSaveLabel.textContent = "Sauvegarder cette page";
      return;
    }

    setSavedState();
    showToast();

    // Refresh article list + count
    await renderRecentArticles();
    const total = (await getArticles()).length;
    elFooterCount.textContent = `Voir tout (${total} articles)`;
  } catch (err) {
    // If no service worker listening yet, fallback: save directly
    try {
      const article = {
        id: generateId(),
        title: currentTab.title || currentTab.url,
        url: currentTab.url,
        favicon: getFaviconUrl(currentTab.url),
        savedAt: new Date().toISOString(),
        readAt: null,
        summary: null,
        category: "Autre",
        priority: 3,
        status: "pending",
      };
      await saveArticle(article);

      setSavedState();
      showToast();

      await renderRecentArticles();
      const total = (await getArticles()).length;
      elFooterCount.textContent = `Voir tout (${total} articles)`;
    } catch (fallbackErr) {
      elBtnSave.disabled = false;
      elBtnSaveLabel.textContent = "Sauvegarder cette page";
    }
  }
});

function setSavedState() {
  elBtnSave.disabled = true;
  elBtnSave.classList.add("saved");

  // Replace save icon with check icon
  elBtnSave.querySelector("svg").innerHTML =
    '<polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" fill="none"/>';
  elBtnSaveLabel.textContent = "Déjà sauvegardé";
}

function showToast() {
  elToast.hidden = false;
  setTimeout(() => {
    elToast.hidden = true;
  }, 2500);
}

// ============================================================
// Recent articles
// ============================================================

async function renderRecentArticles() {
  const articles = await getArticles();
  const recent = articles.slice(0, RECENT_LIMIT);

  // Clear existing items (keep the empty placeholder)
  const existing = elArticleList.querySelectorAll(".article-item");
  existing.forEach((el) => el.remove());

  if (recent.length === 0) {
    elArticleEmpty.style.display = "block";
    return;
  }

  elArticleEmpty.style.display = "none";

  for (const article of recent) {
    const li = buildArticleItem(article);
    elArticleList.appendChild(li);
  }
}

function buildArticleItem(article) {
  const li = document.createElement("li");
  li.className = "article-item";
  li.setAttribute("role", "button");
  li.setAttribute("tabindex", "0");
  li.title = article.title;

  // Favicon
  const faviconUrl = getFaviconUrl(article.url);
  let faviconEl;
  if (faviconUrl) {
    faviconEl = document.createElement("img");
    faviconEl.className = "article-favicon";
    faviconEl.src = faviconUrl;
    faviconEl.alt = "";
    faviconEl.width = 16;
    faviconEl.height = 16;
    faviconEl.onerror = () => {
      const fallback = buildFaviconFallback(article.title);
      faviconEl.replaceWith(fallback);
    };
  } else {
    faviconEl = buildFaviconFallback(article.title);
  }

  // Body
  const body = document.createElement("div");
  body.className = "article-body";

  const titleEl = document.createElement("span");
  titleEl.className = "article-title";
  titleEl.textContent = truncate(article.title, 80);

  const meta = document.createElement("div");
  meta.className = "article-meta";

  const dateEl = document.createElement("span");
  dateEl.className = "article-date";
  dateEl.textContent = formatRelativeDate(article.savedAt);

  meta.appendChild(dateEl);

  if (article.category) {
    const badge = buildBadge(article.category);
    meta.appendChild(badge);
  }

  body.appendChild(titleEl);
  body.appendChild(meta);

  li.appendChild(faviconEl);
  li.appendChild(body);

  // Click - open in new tab
  li.addEventListener("click", () => {
    chrome.tabs.create({ url: article.url });
  });

  li.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      chrome.tabs.create({ url: article.url });
    }
  });

  return li;
}

function buildFaviconFallback(title) {
  const div = document.createElement("div");
  div.className = "article-favicon-fallback";
  div.textContent = (title || "?").charAt(0).toUpperCase();
  return div;
}

function buildBadge(category) {
  const span = document.createElement("span");
  const cls = BADGE_CLASS[category] || BADGE_CLASS["Autre"];
  span.className = `badge ${cls}`;
  span.textContent = category;
  return span;
}

// ============================================================
// Navigation buttons
// ============================================================

elBtnSettings.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("settings/settings.html") });
  window.close();
});

elBannerSettings.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("settings/settings.html") });
  window.close();
});

elBtnDashboard.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
  window.close();
});
