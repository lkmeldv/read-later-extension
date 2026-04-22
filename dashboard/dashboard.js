/* ============================================================
   Read Later - Dashboard Controller
   ============================================================ */

"use strict";

// ---- State ----
let allArticles = [];
let activeCategory = "all";
let activeProject = "all";
let activeStatus = "all";    // "all" | "unread" | "read"
let activeSort = "date";     // "date" | "priority"
let searchQuery = "";
let searchDebounceTimer = null;
let projectsList = [];

// ---- DOM refs (set after DOMContentLoaded) ----
let dom = {};

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  applyTheme();

  dom = {
    searchInput:       document.getElementById("search-input"),
    btnExport:         document.getElementById("btn-export"),
    btnSettings:       document.getElementById("btn-settings"),
    categoryFilters:   document.getElementById("category-filters"),
    statusButtons:     document.querySelectorAll(".btn-filter-status"),
    sortSelect:        document.getElementById("sort-select"),
    cardsGrid:         document.getElementById("cards-grid"),
    emptyState:        document.getElementById("empty-state"),
    emptySubtitle:     document.getElementById("empty-subtitle"),
    statTotal:         document.getElementById("stat-total"),
    statUnread:        document.getElementById("stat-unread"),
    statTop:           document.getElementById("stat-top"),
    projectFilters:    document.getElementById("project-filters"),
  };

  const settings = await getSettings();
  projectsList = settings.projects || [];

  bindEvents();
  await loadAndRender();

  // Live updates from storage (e.g. AI finishes processing)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.articles) {
      allArticles = changes.articles.newValue || [];
      renderAll();
    }
  });
});

// ============================================================
// EVENTS
// ============================================================

function bindEvents() {
  // Search - debounced
  dom.searchInput.addEventListener("input", (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderAll();
    }, 200);
  });

  // Export
  dom.btnExport.addEventListener("click", handleExport);

  // Settings
  dom.btnSettings.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("settings/settings.html") });
  });

  // Status filter
  dom.statusButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      dom.statusButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeStatus = btn.dataset.status;
      renderAll();
    });
  });

  // Sort
  dom.sortSelect.addEventListener("change", (e) => {
    activeSort = e.target.value;
    renderAll();
  });
}

// ============================================================
// DATA
// ============================================================

async function loadAndRender() {
  allArticles = await getArticles();
  renderAll();
}

// ============================================================
// RENDER PIPELINE
// ============================================================

function renderAll() {
  const filtered = applyFilters(allArticles);
  renderCategoryTabs(allArticles);
  renderProjectTabs(allArticles);
  renderCards(filtered);
  renderStats(allArticles, filtered);
}

// ---- Filter + sort ----

function applyFilters(articles) {
  let result = articles.slice();

  // Category
  if (activeCategory !== "all") {
    const cat = activeCategory.toLowerCase();
    result = result.filter((a) => (a.category || "Autre").toLowerCase() === cat);
  }

  // Project
  if (activeProject !== "all") {
    if (activeProject === "__none__") {
      result = result.filter((a) => !a.project);
    } else {
      result = result.filter((a) => a.project === activeProject);
    }
  }

  // Status
  if (activeStatus === "unread") {
    result = result.filter((a) => !a.readAt);
  } else if (activeStatus === "read") {
    result = result.filter((a) => !!a.readAt);
  }

  // Search
  if (searchQuery) {
    result = result.filter((a) => {
      const title   = (a.title || "").toLowerCase();
      const summary = (a.summary || "").toLowerCase();
      const url     = (a.url || "").toLowerCase();
      return title.includes(searchQuery) || summary.includes(searchQuery) || url.includes(searchQuery);
    });
  }

  // Sort
  if (activeSort === "priority") {
    result.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  } else {
    result.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  }

  return result;
}

// ---- Category tabs ----

function renderCategoryTabs(articles) {
  // Count per category
  const counts = {};
  articles.forEach((a) => {
    const cat = a.category || "Autre";
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const categories = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  // Build buttons
  const totalCount = articles.length;
  let html = `<button class="btn-filter-cat${activeCategory === "all" ? " active" : ""}" data-cat="all">
    Tous <span class="cat-count">(${totalCount})</span>
  </button>`;

  categories.forEach((cat) => {
    const isActive = activeCategory === cat.toLowerCase();
    html += `<button class="btn-filter-cat${isActive ? " active" : ""}" data-cat="${escapeHtml(cat.toLowerCase())}">
      ${escapeHtml(cat)} <span class="cat-count">(${counts[cat]})</span>
    </button>`;
  });

  dom.categoryFilters.innerHTML = html;

  // Bind click on newly created buttons
  dom.categoryFilters.querySelectorAll(".btn-filter-cat").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      dom.categoryFilters.querySelectorAll(".btn-filter-cat").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderAll();
    });
  });
}

// ---- Project tabs ----

function renderProjectTabs(articles) {
  if (projectsList.length === 0) {
    dom.projectFilters.innerHTML = "";
    return;
  }

  const counts = {};
  let noProject = 0;
  articles.forEach((a) => {
    if (a.project) {
      counts[a.project] = (counts[a.project] || 0) + 1;
    } else {
      noProject++;
    }
  });

  let html = `<button class="btn-filter-project${activeProject === "all" ? " active" : ""}" data-project="all">
    Tous projets
  </button>`;

  if (noProject > 0) {
    html += `<button class="btn-filter-project${activeProject === "__none__" ? " active" : ""}" data-project="__none__">
      Sans projet (${noProject})
    </button>`;
  }

  projectsList.forEach((p) => {
    const isActive = activeProject === p;
    const count = counts[p] || 0;
    html += `<button class="btn-filter-project${isActive ? " active" : ""}" data-project="${escapeHtml(p)}">
      ${escapeHtml(p)} ${count > 0 ? "(" + count + ")" : ""}
    </button>`;
  });

  dom.projectFilters.innerHTML = html;

  dom.projectFilters.querySelectorAll(".btn-filter-project").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeProject = btn.dataset.project;
      dom.projectFilters.querySelectorAll(".btn-filter-project").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderAll();
    });
  });
}

// ---- Cards ----

function renderCards(articles) {
  if (articles.length === 0) {
    dom.cardsGrid.innerHTML = "";
    dom.emptyState.hidden = false;
    dom.emptySubtitle.textContent = searchQuery || activeCategory !== "all" || activeStatus !== "all"
      ? "Aucun article ne correspond aux filtres actifs."
      : "Sauvegardez des pages en cliquant sur l’extension.";
    return;
  }

  dom.emptyState.hidden = true;
  dom.cardsGrid.innerHTML = articles.map(buildCardHTML).join("");

  // Bind card actions
  dom.cardsGrid.querySelectorAll(".card").forEach((cardEl) => {
    const id = cardEl.dataset.id;

    // Title link - open + mark read
    const titleLink = cardEl.querySelector(".card-title");
    if (titleLink) {
      titleLink.addEventListener("click", (e) => {
        e.preventDefault();
        handleOpenArticle(id, titleLink.href);
      });
    }

    // Toggle read
    const btnRead = cardEl.querySelector(".btn-read, .btn-unread");
    if (btnRead) {
      btnRead.addEventListener("click", () => handleToggleRead(id));
    }

    // Delete
    const btnDelete = cardEl.querySelector(".btn-delete");
    if (btnDelete) {
      btnDelete.addEventListener("click", () => handleDelete(id));
    }

    // Retry AI
    const btnRetry = cardEl.querySelector(".btn-retry");
    if (btnRetry) {
      btnRetry.addEventListener("click", () => handleRetryAI(id));
    }

    // Project change
    const projectSelect = cardEl.querySelector(".card-project-select");
    if (projectSelect) {
      projectSelect.addEventListener("change", () => handleProjectChange(id, projectSelect.value));
    }
  });

  // Favicon error fallback
  dom.cardsGrid.querySelectorAll(".card-favicon").forEach((img) => {
    img.addEventListener("error", () => {
      const wrap = img.closest(".card-favicon-wrap");
      if (wrap) {
        wrap.innerHTML = `<svg class="card-favicon-fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`;
      }
    });
  });
}

function buildCardHTML(article) {
  const {
    id,
    url = "#",
    title = "Sans titre",
    summary,
    status: summaryStatus,
    category = "Autre",
    priority = 0,
    savedAt,
    readAt,
    project,
  } = article;

  const isRead    = !!readAt;
  const catSlug   = category.toLowerCase();
  const faviconUrl = getFaviconUrl(url);
  const relDate   = formatRelativeDate(savedAt);

  // Summary rendering
  let summaryHTML = "";
  if (summaryStatus === "processing" || (!summary && summaryStatus !== "error")) {
    summaryHTML = `<p class="card-summary is-processing">Analyse IA en cours...</p>`;
  } else if (summaryStatus === "error") {
    summaryHTML = `<p class="card-summary is-error">Erreur IA - analyse indisponible</p>`;
  } else if (summary) {
    summaryHTML = `<p class="card-summary">${escapeHtml(truncate(summary, 160))}</p>`;
  }

  // Priority stars
  const stars = buildStarsHTML(priority);

  // Read toggle button
  const readBtnHTML = isRead
    ? `<button class="btn-card btn-unread" title="Marquer non lu">Non lu</button>`
    : `<button class="btn-card btn-read" title="Marquer comme lu">Marquer lu</button>`;

  // Retry AI button (only on error)
  const retryBtnHTML = summaryStatus === "error"
    ? `<button class="btn-card btn-retry" title="Relancer l'analyse IA">Reessayer IA</button>`
    : "";

  // Favicon img or fallback icon
  const faviconHTML = faviconUrl
    ? `<img class="card-favicon" src="${escapeHtml(faviconUrl)}" alt="" loading="lazy" />`
    : `<svg class="card-favicon-fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`;

  return `
    <article class="card${isRead ? " is-read" : ""}" data-id="${escapeHtml(id)}">
      <div class="card-header">
        <div class="card-favicon-wrap">${faviconHTML}</div>
        <div class="card-title-wrap">
          <a class="card-title" href="${url.startsWith("http://") || url.startsWith("https://") ? escapeHtml(url) : "#"}" title="${escapeHtml(title)}">${escapeHtml(title)}</a>
        </div>
      </div>
      <div class="card-body">
        ${summaryHTML}
        <div class="card-meta">
          <div class="card-meta-left">
            <span class="badge badge-${escapeHtml(catSlug)}">${escapeHtml(category)}</span>
            <span class="card-date">${escapeHtml(relDate)}</span>
          </div>
          <div class="card-stars" aria-label="Priorite ${priority} sur 5">${stars}</div>
        </div>
      </div>
      ${projectsList.length > 0 ? `
      <div class="card-project-row">
        <span class="card-project-label">Projet :</span>
        <select class="card-project-select" data-id="${escapeHtml(id)}">
          <option value=""${!project ? " selected" : ""}>Aucun</option>
          ${projectsList.map((p) => `<option value="${escapeHtml(p)}"${project === p ? " selected" : ""}>${escapeHtml(p)}</option>`).join("")}
        </select>
      </div>` : ""}
      <div class="card-actions">
        ${readBtnHTML}
        ${retryBtnHTML}
        <button class="btn-card btn-delete" title="Supprimer l'article">Supprimer</button>
      </div>
    </article>
  `;
}

function buildStarsHTML(priority) {
  const total = 5;
  const filled = Math.max(0, Math.min(total, Math.round(priority)));
  let html = "";
  for (let i = 1; i <= total; i++) {
    html += i <= filled
      ? `<span class="star-filled" aria-hidden="true">&#9733;</span>`
      : `<span class="star-empty" aria-hidden="true">&#9734;</span>`;
  }
  return html;
}

// ---- Stats bar ----

function renderStats(all, filtered) {
  const total  = filtered.length;
  const unread = filtered.filter((a) => !a.readAt).length;

  // Top category (from all articles, not filtered, for context)
  const catCounts = {};
  all.forEach((a) => {
    const cat = a.category || "Autre";
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];

  dom.statTotal.textContent  = total === 1 ? "1 article" : `${total} articles`;
  dom.statUnread.textContent = unread === 1 ? "1 non lu" : `${unread} non lus`;
  dom.statTop.textContent    = topCat ? `Top: ${topCat[0]} (${topCat[1]})` : "Top: -";
}

// ============================================================
// ACTIONS
// ============================================================

async function handleOpenArticle(id, url) {
  chrome.tabs.create({ url, active: true });

  const article = allArticles.find((a) => a.id === id);
  if (!article || article.readAt) return;

  const updated = await updateArticle(id, { readAt: new Date().toISOString() });
  if (updated) {
    allArticles = allArticles.map((a) => (a.id === id ? updated : a));
    renderAll();
    notifyBadgeUpdate();
  }
}

async function handleToggleRead(id) {
  const article = allArticles.find((a) => a.id === id);
  if (!article) return;

  const updates = article.readAt
    ? { readAt: null }
    : { readAt: new Date().toISOString() };

  const updated = await updateArticle(id, updates);
  if (updated) {
    allArticles = allArticles.map((a) => (a.id === id ? updated : a));
    renderAll();
    notifyBadgeUpdate();
  }
}

async function handleDelete(id) {
  const article = allArticles.find((a) => a.id === id);
  const title = article ? truncate(article.title || "cet article", 50) : "cet article";

  if (!confirm(`Supprimer "${title}" ?`)) return;

  await deleteArticle(id);
  allArticles = allArticles.filter((a) => a.id !== id);
  renderAll();
  notifyBadgeUpdate();
}

function handleRetryAI(id) {
  chrome.runtime.sendMessage({ action: "retryAI", articleId: id });
  // Optimistically show "processing"
  allArticles = allArticles.map((a) => {
    if (a.id !== id) return a;
    return { ...a, status: "processing", summary: "" };
  });
  renderAll();
}

async function handleProjectChange(id, projectName) {
  const updated = await updateArticle(id, { project: projectName || null });
  if (updated) {
    allArticles = allArticles.map((a) => (a.id === id ? updated : a));
    renderAll();
  }
}

async function handleExport() {
  try {
    const json = await exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `read-later-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("[Read Later] Export failed:", err);
    alert("L'export a echoue. Verifiez la console pour plus d'informations.");
  }
}

// ============================================================
// HELPERS
// ============================================================

function notifyBadgeUpdate() {
  chrome.runtime.sendMessage({ action: "updateBadge" });
}
