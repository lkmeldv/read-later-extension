/* ============================================================
   Read Later - Settings Page Logic
   ============================================================ */

// ---- DOM refs ----
const apiKeyInput   = document.getElementById("api-key-input");
const btnToggleKey  = document.getElementById("btn-toggle-key");
const btnTestKey    = document.getElementById("btn-test-key");
const apiStatus     = document.getElementById("api-status");
const modelSelect   = document.getElementById("model-select");

const btnExport     = document.getElementById("btn-export");
const btnImport     = document.getElementById("btn-import");
const fileImport    = document.getElementById("file-import");
const dataStatus    = document.getElementById("data-status");

const themeSelect   = document.getElementById("theme-select");
const badgeToggle   = document.getElementById("badge-toggle");
const projectInput  = document.getElementById("project-input");
const btnAddProject = document.getElementById("btn-add-project");
const projectList   = document.getElementById("project-list");
const exportFreq    = document.getElementById("export-frequency");

const btnClear      = document.getElementById("btn-clear");
const btnBack       = document.getElementById("btn-back");

// ---- State ----
let clearClickCount  = 0;
let clearResetTimer  = null;

// ============================================================
// Init
// ============================================================
async function init() {
  // Back link - open dashboard
  btnBack.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
  });

  // Load saved settings
  const settings = await getSettings();

  if (settings.apiKey) {
    apiKeyInput.value = settings.apiKey;
  }

  if (settings.model) {
    modelSelect.value = settings.model;
  }

  themeSelect.value = settings.theme || "dark";
  badgeToggle.checked = settings.showBadge !== false;
  exportFreq.value = settings.autoExportFrequency || "never";
  applyTheme();
  renderProjects(settings.projects || []);

  // Bind events
  apiKeyInput.addEventListener("change", onApiKeyChange);
  modelSelect.addEventListener("change", onModelChange);
  themeSelect.addEventListener("change", onThemeChange);
  badgeToggle.addEventListener("change", onBadgeToggle);
  exportFreq.addEventListener("change", onExportFreqChange);
  btnAddProject.addEventListener("click", onAddProject);
  projectInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onAddProject();
  });
  btnToggleKey.addEventListener("click", onToggleKey);
  btnTestKey.addEventListener("click", onTestKey);
  btnExport.addEventListener("click", onExport);
  btnImport.addEventListener("click", () => fileImport.click());
  fileImport.addEventListener("change", onImport);
  btnClear.addEventListener("click", onClear);
}

// ============================================================
// API Key
// ============================================================
async function onApiKeyChange() {
  const value = apiKeyInput.value.trim();
  await saveSettings({ apiKey: value });
}

function onToggleKey() {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type = isPassword ? "text" : "password";
  btnToggleKey.textContent = isPassword ? "Masquer" : "Afficher";
}

async function onTestKey() {
  const apiKey = apiKeyInput.value.trim();
  const model  = modelSelect.value;

  if (!apiKey) {
    showStatus(apiStatus, "error", "Entrez d'abord votre clé API.");
    return;
  }

  btnTestKey.disabled = true;
  btnTestKey.textContent = "Test...";
  hideStatus(apiStatus);

  try {
    await testApiKey(apiKey, model);
    showStatus(apiStatus, "success", "Connexion réussie - la clé API fonctionne.");
  } catch (err) {
    const msg = err.message || "Erreur inconnue";
    showStatus(apiStatus, "error", `Echec : ${msg}`);
  } finally {
    btnTestKey.disabled = false;
    btnTestKey.textContent = "Tester";
  }
}

// ============================================================
// Theme
// ============================================================
async function onThemeChange() {
  await saveSettings({ theme: themeSelect.value });
  applyTheme();
}

// ============================================================
// Badge toggle
// ============================================================
async function onBadgeToggle() {
  await saveSettings({ showBadge: badgeToggle.checked });
  chrome.runtime.sendMessage({ action: "updateBadge" });
}

// ============================================================
// Projects
// ============================================================
async function onAddProject() {
  const name = projectInput.value.trim();
  if (!name) return;

  const settings = await getSettings();
  const projects = settings.projects || [];
  if (projects.includes(name)) {
    projectInput.value = "";
    return;
  }

  projects.push(name);
  await saveSettings({ projects });
  projectInput.value = "";
  renderProjects(projects);
}

async function onRemoveProject(name) {
  const settings = await getSettings();
  const projects = (settings.projects || []).filter((p) => p !== name);
  await saveSettings({ projects });
  renderProjects(projects);
}

function renderProjects(projects) {
  if (projects.length === 0) {
    projectList.innerHTML = '<li class="project-empty">Aucun projet. Ajoutez-en un ci-dessus.</li>';
    return;
  }
  projectList.innerHTML = projects.map((p) => `
    <li class="project-item">
      <span class="project-item-name">${escapeHtml(p)}</span>
      <button class="project-item-remove" data-project="${escapeHtml(p)}" title="Supprimer ce projet">Supprimer</button>
    </li>
  `).join("");

  projectList.querySelectorAll(".project-item-remove").forEach((btn) => {
    btn.addEventListener("click", () => onRemoveProject(btn.dataset.project));
  });
}

// ============================================================
// Auto-export frequency
// ============================================================
async function onExportFreqChange() {
  await saveSettings({ autoExportFrequency: exportFreq.value });
  chrome.runtime.sendMessage({ action: "setupAutoExport" });
}

// ============================================================
// Model
// ============================================================
async function onModelChange() {
  await saveSettings({ model: modelSelect.value });
}

// ============================================================
// Export
// ============================================================
async function onExport() {
  try {
    const json = await exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url  = URL.createObjectURL(blob);

    const ts       = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `read-later-export-${ts}.json`;

    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
    showStatus(dataStatus, "success", `Export téléchargé : ${filename}`);
  } catch (err) {
    showStatus(dataStatus, "error", `Erreur export : ${err.message}`);
  }
}

// ============================================================
// Import
// ============================================================
function onImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const count = await importData(ev.target.result);
      showStatus(dataStatus, "success", `Import réussi - ${count} article${count !== 1 ? "s" : ""} importé${count !== 1 ? "s" : ""}.`);
    } catch (err) {
      showStatus(dataStatus, "error", `Erreur import : ${err.message}`);
    }
  };
  reader.onerror = () => {
    showStatus(dataStatus, "error", "Impossible de lire le fichier.");
  };
  reader.readAsText(file);

  // Reset input so the same file can be reimported if needed
  fileImport.value = "";
}

// ============================================================
// Clear all data - double-click confirmation
// ============================================================
async function onClear() {
  clearClickCount++;

  if (clearClickCount === 1) {
    // First click - show confirmation request
    btnClear.textContent = "";
    btnClear.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      Cliquez encore pour confirmer
    `;
    btnClear.classList.add("confirm");

    // Auto-reset after 3s
    clearResetTimer = setTimeout(resetClearBtn, 3000);
    return;
  }

  // Second click - confirm and clear
  clearTimeout(clearResetTimer);
  resetClearBtn();

  await chrome.storage.local.clear();
  try {
    chrome.runtime.sendMessage({ action: "updateBadge" });
  } catch (_) {
    // Background may not be listening
  }
  showStatus(dataStatus, "success", "Toutes les données ont été supprimées.");
  apiKeyInput.value = "";
  modelSelect.value = "deepseek/deepseek-chat";
}

function resetClearBtn() {
  clearClickCount = 0;
  clearTimeout(clearResetTimer);
  btnClear.classList.remove("confirm");
  btnClear.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
    Tout supprimer
  `;
}

// ============================================================
// Status helpers
// ============================================================
function showStatus(el, type, message) {
  el.textContent = message;
  el.className   = `status-msg ${type}`;
  el.hidden      = false;
}

function hideStatus(el) {
  el.hidden    = true;
  el.textContent = "";
  el.className   = "status-msg";
}

// ============================================================
// Boot
// ============================================================
document.addEventListener("DOMContentLoaded", init);
