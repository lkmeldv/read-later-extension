function generateId() {
  return crypto.randomUUID();
}

function formatRelativeDate(isoString) {
  if (!isoString) return "-";
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

async function applyTheme() {
  const data = await chrome.storage.local.get("settings");
  const theme = data.settings?.theme || "dark";
  document.documentElement.setAttribute("data-theme", theme);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
