/* ============================================================
   Read Later - Dashboard Controller (Kanban + List)
   ============================================================ */

"use strict";

// ---- State ----
var allArticles = [];
var projectsList = [];
var activeView = "board"; // "board" | "list"
var activeStatus = "all"; // "all" | "unread" | "read"
var activeSort = "date";  // "date" | "priority"
var searchQuery = "";
var searchDebounceTimer = null;

// ---- DOM refs ----
var dom = {};

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", async function () {
  applyTheme();

  dom = {
    searchInput: document.getElementById("search-input"),
    btnExport: document.getElementById("btn-export"),
    btnSettings: document.getElementById("btn-settings"),
    btnViewBoard: document.getElementById("btn-view-board"),
    btnViewList: document.getElementById("btn-view-list"),
    statusButtons: document.querySelectorAll(".btn-filter-status"),
    sortSelect: document.getElementById("sort-select"),
    boardContainer: document.getElementById("board-container"),
    listContainer: document.getElementById("list-container"),
    emptyState: document.getElementById("empty-state"),
    emptySubtitle: document.getElementById("empty-subtitle"),
    statsInline: document.getElementById("stats-inline"),
  };

  // Load saved view preference
  var savedView = localStorage.getItem("readlater-view");
  if (savedView === "list" || savedView === "board") {
    activeView = savedView;
  }

  var settings = await getSettings();
  projectsList = settings.projects || [];

  bindEvents();
  await loadAndRender();

  // Live updates from storage (AI finishes processing, etc.)
  chrome.storage.onChanged.addListener(function (changes, area) {
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
  // Search - debounced 200ms
  dom.searchInput.addEventListener("input", function (e) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(function () {
      searchQuery = e.target.value.trim().toLowerCase();
      renderAll();
    }, 200);
  });

  // Export
  dom.btnExport.addEventListener("click", handleExport);

  // Settings
  dom.btnSettings.addEventListener("click", function () {
    chrome.tabs.create({ url: chrome.runtime.getURL("settings/settings.html") });
  });

  // View toggle
  dom.btnViewBoard.addEventListener("click", function () {
    setView("board");
  });
  dom.btnViewList.addEventListener("click", function () {
    setView("list");
  });

  // Status filter
  dom.statusButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      dom.statusButtons.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      activeStatus = btn.dataset.status;
      renderAll();
    });
  });

  // Sort
  dom.sortSelect.addEventListener("change", function (e) {
    activeSort = e.target.value;
    renderAll();
  });
}

function setView(view) {
  activeView = view;
  localStorage.setItem("readlater-view", view);

  dom.btnViewBoard.classList.toggle("active", view === "board");
  dom.btnViewList.classList.toggle("active", view === "list");

  renderAll();
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
  var filtered = applyFilters(allArticles);

  // Update view toggle state
  dom.btnViewBoard.classList.toggle("active", activeView === "board");
  dom.btnViewList.classList.toggle("active", activeView === "list");

  if (filtered.length === 0) {
    dom.boardContainer.hidden = true;
    dom.listContainer.hidden = true;
    dom.emptyState.hidden = false;
    dom.emptySubtitle.textContent = (searchQuery || activeStatus !== "all")
      ? "Aucun article ne correspond aux filtres actifs."
      : "Sauvegardez des pages en cliquant sur l'extension.";
  } else {
    dom.emptyState.hidden = true;

    if (activeView === "board") {
      dom.boardContainer.hidden = false;
      dom.listContainer.hidden = true;
      renderBoard(filtered);
    } else {
      dom.boardContainer.hidden = true;
      dom.listContainer.hidden = false;
      renderList(filtered);
    }
  }

  renderStats(filtered);
}

// ---- Filter + sort ----

function applyFilters(articles) {
  var result = articles.slice();

  // Status
  if (activeStatus === "unread") {
    result = result.filter(function (a) { return !a.readAt; });
  } else if (activeStatus === "read") {
    result = result.filter(function (a) { return !!a.readAt; });
  }

  // Search
  if (searchQuery) {
    result = result.filter(function (a) {
      var title = (a.title || "").toLowerCase();
      var summary = (a.summary || "").toLowerCase();
      var url = (a.url || "").toLowerCase();
      return title.includes(searchQuery) || summary.includes(searchQuery) || url.includes(searchQuery);
    });
  }

  // Sort
  if (activeSort === "priority") {
    result.sort(function (a, b) { return (b.priority || 0) - (a.priority || 0); });
  } else {
    result.sort(function (a, b) { return new Date(b.savedAt) - new Date(a.savedAt); });
  }

  return result;
}

// ---- Stats ----

function renderStats(filtered) {
  var total = filtered.length;
  var unread = filtered.filter(function (a) { return !a.readAt; }).length;
  dom.statsInline.textContent = total + " article" + (total !== 1 ? "s" : "") + " - " + unread + " non lu" + (unread !== 1 ? "s" : "");
}

// ============================================================
// BOARD VIEW (Kanban)
// ============================================================

function renderBoard(articles) {
  // Build column map: Inbox + each project
  var columnMap = {};
  columnMap["__inbox__"] = [];

  projectsList.forEach(function (p) {
    columnMap[p] = [];
  });

  // Distribute articles into columns
  articles.forEach(function (a) {
    var proj = a.project || null;
    if (!proj) {
      columnMap["__inbox__"].push(a);
    } else if (columnMap[proj] !== undefined) {
      columnMap[proj].push(a);
    } else {
      // Project not in settings - put in inbox
      columnMap["__inbox__"].push(a);
    }
  });

  // Build columns HTML
  var columnsHTML = "";

  // Inbox first
  columnsHTML += buildColumnHTML("__inbox__", "Inbox", columnMap["__inbox__"]);

  // Then each project
  projectsList.forEach(function (p) {
    columnsHTML += buildColumnHTML(p, p, columnMap[p]);
  });

  dom.boardContainer.innerHTML = columnsHTML;

  // Bind events on all board cards
  bindBoardCardEvents();

  // Setup drag and drop on columns
  setupColumnDragDrop();
}

function buildColumnHTML(projectKey, displayName, articles) {
  var cardsHTML = "";
  articles.forEach(function (article) {
    cardsHTML += buildBoardCardHTML(article);
  });

  return '<div class="kanban-column" data-project="' + escapeHtml(projectKey) + '">' +
    '<div class="kanban-column-header">' +
      '<span class="kanban-column-title">' + escapeHtml(displayName) + '</span>' +
      '<span class="kanban-column-count">' + articles.length + '</span>' +
    '</div>' +
    '<div class="kanban-column-cards">' +
      cardsHTML +
    '</div>' +
  '</div>';
}

function buildBoardCardHTML(article) {
  var id = article.id;
  var url = article.url || "#";
  var title = article.title || "Sans titre";
  var summary = article.summary || "";
  var summaryStatus = article.status;
  var category = article.category || "Autre";
  var priority = article.priority || 0;
  var savedAt = article.savedAt;
  var readAt = article.readAt;

  var isRead = !!readAt;
  var catSlug = category.toLowerCase();
  var faviconUrl = getFaviconUrl(url);
  var relDate = formatRelativeDate(savedAt);
  var safeUrl = (url.startsWith("http://") || url.startsWith("https://")) ? escapeHtml(url) : "#";

  // Classes
  var classes = "board-card";
  if (isRead) classes += " is-read";
  if (summaryStatus === "processing") classes += " is-processing";

  // Favicon
  var faviconHTML = faviconUrl
    ? '<img class="board-card-favicon" src="' + escapeHtml(faviconUrl) + '" alt="" loading="lazy" />'
    : '<svg class="board-card-favicon-fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>';

  // Summary
  var summaryHTML = "";
  if (summaryStatus === "processing" || (!summary && summaryStatus !== "error")) {
    summaryHTML = '<div class="board-card-summary" style="font-style:italic;opacity:0.7">Analyse IA en cours...</div>';
  } else if (summaryStatus === "error") {
    summaryHTML = '<div class="board-card-summary" style="color:var(--danger)">Erreur IA</div>';
  } else if (summary) {
    summaryHTML = '<div class="board-card-summary">' + escapeHtml(truncate(summary, 100)) + '</div>';
  }

  // Stars
  var stars = buildStarsHTML(priority);

  // Error dot
  var errorDot = summaryStatus === "error" ? '<div class="board-card-error-dot"></div>' : "";

  // Read toggle icon: eye (mark read) or eye-off (mark unread)
  var readIcon = isRead
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

  var readTitle = isRead ? "Marquer non lu" : "Marquer lu";

  return '<div class="' + classes + '" data-id="' + escapeHtml(id) + '" draggable="true">' +
    errorDot +
    '<div class="board-card-top">' +
      faviconHTML +
      '<span class="board-card-title" title="' + escapeHtml(title) + '">' + escapeHtml(truncate(title, 60)) + '</span>' +
    '</div>' +
    summaryHTML +
    '<div class="board-card-bottom">' +
      '<span class="badge badge-' + escapeHtml(catSlug) + '">' + escapeHtml(category) + '</span>' +
      '<span class="card-stars" aria-label="Priorite ' + priority + ' sur 5">' + stars + '</span>' +
      '<span class="card-date">' + escapeHtml(relDate) + '</span>' +
    '</div>' +
    '<div class="board-card-overlay">' +
      '<button class="btn-overlay btn-overlay-open" data-url="' + safeUrl + '" data-id="' + escapeHtml(id) + '" title="Ouvrir">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
      '</button>' +
      '<button class="btn-overlay btn-overlay-read" data-id="' + escapeHtml(id) + '" title="' + escapeHtml(readTitle) + '">' +
        readIcon +
      '</button>' +
      '<button class="btn-overlay btn-overlay-delete" data-id="' + escapeHtml(id) + '" title="Supprimer">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
      '</button>' +
    '</div>' +
  '</div>';
}

function bindBoardCardEvents() {
  // Open buttons
  dom.boardContainer.querySelectorAll(".btn-overlay-open").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      handleOpenArticle(btn.dataset.id, btn.dataset.url);
    });
  });

  // Read toggle buttons
  dom.boardContainer.querySelectorAll(".btn-overlay-read").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      handleToggleRead(btn.dataset.id);
    });
  });

  // Delete buttons
  dom.boardContainer.querySelectorAll(".btn-overlay-delete").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      handleDelete(btn.dataset.id);
    });
  });

  // Drag start/end on cards
  dom.boardContainer.querySelectorAll(".board-card").forEach(function (card) {
    card.addEventListener("dragstart", function (e) {
      e.dataTransfer.setData("text/plain", card.dataset.id);
      e.dataTransfer.effectAllowed = "move";
      card.classList.add("is-dragging");
    });
    card.addEventListener("dragend", function () {
      card.classList.remove("is-dragging");
      // Remove all drag-over highlights
      dom.boardContainer.querySelectorAll(".kanban-column").forEach(function (col) {
        col.classList.remove("drag-over");
      });
    });
  });

  // Favicon error fallback
  dom.boardContainer.querySelectorAll(".board-card-favicon").forEach(function (img) {
    img.addEventListener("error", function () {
      var fallback = document.createElement("span");
      fallback.innerHTML = '<svg class="board-card-favicon-fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>';
      img.parentNode.replaceChild(fallback.firstChild, img);
    });
  });
}

function setupColumnDragDrop() {
  dom.boardContainer.querySelectorAll(".kanban-column").forEach(function (col) {
    col.addEventListener("dragover", function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      col.classList.add("drag-over");
    });

    col.addEventListener("dragleave", function (e) {
      // Only remove if leaving the column entirely
      if (!col.contains(e.relatedTarget)) {
        col.classList.remove("drag-over");
      }
    });

    col.addEventListener("drop", function (e) {
      e.preventDefault();
      col.classList.remove("drag-over");
      var articleId = e.dataTransfer.getData("text/plain");
      if (!articleId) return;

      var projectKey = col.dataset.project;
      var newProject = (projectKey === "__inbox__") ? null : projectKey;
      handleProjectChange(articleId, newProject);
    });
  });
}

// ============================================================
// LIST VIEW (Grid)
// ============================================================

function renderList(articles) {
  var cardsHTML = articles.map(buildListCardHTML).join("");
  dom.listContainer.innerHTML = '<div class="list-grid">' + cardsHTML + '</div>';

  // Bind list card events
  bindListCardEvents();
}

function buildListCardHTML(article) {
  var id = article.id;
  var url = article.url || "#";
  var title = article.title || "Sans titre";
  var summary = article.summary;
  var summaryStatus = article.status;
  var category = article.category || "Autre";
  var priority = article.priority || 0;
  var savedAt = article.savedAt;
  var readAt = article.readAt;
  var project = article.project;

  var isRead = !!readAt;
  var catSlug = category.toLowerCase();
  var faviconUrl = getFaviconUrl(url);
  var relDate = formatRelativeDate(savedAt);
  var safeUrl = (url.startsWith("http://") || url.startsWith("https://")) ? escapeHtml(url) : "#";

  // Summary rendering
  var summaryHTML = "";
  if (summaryStatus === "processing" || (!summary && summaryStatus !== "error")) {
    summaryHTML = '<p class="list-card-summary is-processing">Analyse IA en cours...</p>';
  } else if (summaryStatus === "error") {
    summaryHTML = '<p class="list-card-summary is-error">Erreur IA - analyse indisponible</p>';
  } else if (summary) {
    summaryHTML = '<p class="list-card-summary">' + escapeHtml(truncate(summary, 160)) + '</p>';
  }

  // Stars
  var stars = buildStarsHTML(priority);

  // Read toggle button
  var readBtnHTML = isRead
    ? '<button class="btn-card btn-unread" title="Marquer non lu">Non lu</button>'
    : '<button class="btn-card btn-read" title="Marquer comme lu">Marquer lu</button>';

  // Retry AI
  var retryBtnHTML = summaryStatus === "error"
    ? '<button class="btn-card btn-retry" title="Relancer l\'analyse IA">Reessayer IA</button>'
    : "";

  // Favicon
  var faviconHTML = faviconUrl
    ? '<img class="list-card-favicon" src="' + escapeHtml(faviconUrl) + '" alt="" loading="lazy" />'
    : '<svg class="list-card-favicon-fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>';

  // Project select
  var projectSelectHTML = "";
  if (projectsList.length > 0) {
    var options = '<option value=""' + (!project ? " selected" : "") + '>Aucun</option>';
    projectsList.forEach(function (p) {
      options += '<option value="' + escapeHtml(p) + '"' + (project === p ? " selected" : "") + '>' + escapeHtml(p) + '</option>';
    });
    projectSelectHTML = '<div class="list-card-project-row">' +
      '<span class="list-card-project-label">Projet :</span>' +
      '<select class="list-card-project-select" data-id="' + escapeHtml(id) + '">' + options + '</select>' +
    '</div>';
  }

  return '<article class="list-card' + (isRead ? " is-read" : "") + '" data-id="' + escapeHtml(id) + '">' +
    '<div class="list-card-header">' +
      '<div class="list-card-favicon-wrap">' + faviconHTML + '</div>' +
      '<div class="list-card-title-wrap">' +
        '<a class="list-card-title" href="' + safeUrl + '" title="' + escapeHtml(title) + '">' + escapeHtml(title) + '</a>' +
      '</div>' +
    '</div>' +
    '<div class="list-card-body">' +
      summaryHTML +
      '<div class="list-card-meta">' +
        '<div class="list-card-meta-left">' +
          '<span class="badge badge-' + escapeHtml(catSlug) + '">' + escapeHtml(category) + '</span>' +
          '<span class="card-date">' + escapeHtml(relDate) + '</span>' +
        '</div>' +
        '<div class="card-stars" aria-label="Priorite ' + priority + ' sur 5">' + stars + '</div>' +
      '</div>' +
    '</div>' +
    projectSelectHTML +
    '<div class="list-card-actions">' +
      readBtnHTML +
      retryBtnHTML +
      '<button class="btn-card btn-delete" title="Supprimer l\'article">Supprimer</button>' +
    '</div>' +
  '</article>';
}

function bindListCardEvents() {
  dom.listContainer.querySelectorAll(".list-card").forEach(function (cardEl) {
    var id = cardEl.dataset.id;

    // Title link
    var titleLink = cardEl.querySelector(".list-card-title");
    if (titleLink) {
      titleLink.addEventListener("click", function (e) {
        e.preventDefault();
        handleOpenArticle(id, titleLink.href);
      });
    }

    // Toggle read
    var btnRead = cardEl.querySelector(".btn-read, .btn-unread");
    if (btnRead) {
      btnRead.addEventListener("click", function () { handleToggleRead(id); });
    }

    // Delete
    var btnDelete = cardEl.querySelector(".btn-delete");
    if (btnDelete) {
      btnDelete.addEventListener("click", function () { handleDelete(id); });
    }

    // Retry AI
    var btnRetry = cardEl.querySelector(".btn-retry");
    if (btnRetry) {
      btnRetry.addEventListener("click", function () { handleRetryAI(id); });
    }

    // Project change
    var projectSelect = cardEl.querySelector(".list-card-project-select");
    if (projectSelect) {
      projectSelect.addEventListener("change", function () {
        handleProjectChange(id, projectSelect.value);
      });
    }
  });

  // Favicon error fallback
  dom.listContainer.querySelectorAll(".list-card-favicon").forEach(function (img) {
    img.addEventListener("error", function () {
      var wrap = img.closest(".list-card-favicon-wrap");
      if (wrap) {
        wrap.innerHTML = '<svg class="list-card-favicon-fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>';
      }
    });
  });
}

// ============================================================
// SHARED HELPERS
// ============================================================

function buildStarsHTML(priority) {
  var total = 5;
  var filled = Math.max(0, Math.min(total, Math.round(priority)));
  var html = "";
  for (var i = 1; i <= total; i++) {
    if (i <= filled) {
      html += '<span class="star-filled" aria-hidden="true">&#9733;</span>';
    } else {
      html += '<span class="star-empty" aria-hidden="true">&#9734;</span>';
    }
  }
  return html;
}

// ============================================================
// ACTIONS
// ============================================================

async function handleOpenArticle(id, url) {
  chrome.tabs.create({ url: url, active: true });

  var article = allArticles.find(function (a) { return a.id === id; });
  if (!article || article.readAt) return;

  var updated = await updateArticle(id, { readAt: new Date().toISOString() });
  if (updated) {
    allArticles = allArticles.map(function (a) { return a.id === id ? updated : a; });
    renderAll();
    notifyBadgeUpdate();
  }
}

async function handleToggleRead(id) {
  var article = allArticles.find(function (a) { return a.id === id; });
  if (!article) return;

  var updates = article.readAt
    ? { readAt: null }
    : { readAt: new Date().toISOString() };

  var updated = await updateArticle(id, updates);
  if (updated) {
    allArticles = allArticles.map(function (a) { return a.id === id ? updated : a; });
    renderAll();
    notifyBadgeUpdate();
  }
}

async function handleDelete(id) {
  var article = allArticles.find(function (a) { return a.id === id; });
  var title = article ? truncate(article.title || "cet article", 50) : "cet article";

  if (!confirm('Supprimer "' + title + '" ?')) return;

  await deleteArticle(id);
  allArticles = allArticles.filter(function (a) { return a.id !== id; });
  renderAll();
  notifyBadgeUpdate();
}

function handleRetryAI(id) {
  chrome.runtime.sendMessage({ action: "retryAI", articleId: id });
  // Optimistically show "processing"
  allArticles = allArticles.map(function (a) {
    if (a.id !== id) return a;
    return Object.assign({}, a, { status: "processing", summary: "" });
  });
  renderAll();
}

async function handleProjectChange(id, projectName) {
  var updated = await updateArticle(id, { project: projectName || null });
  if (updated) {
    allArticles = allArticles.map(function (a) { return a.id === id ? updated : a; });
    renderAll();
  }
}

async function handleExport() {
  try {
    var json = await exportAllData();
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "read-later-export-" + new Date().toISOString().slice(0, 10) + ".json";
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
