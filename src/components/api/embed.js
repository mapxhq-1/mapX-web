import axios from "axios";

// Simple in-memory cache for resolved embeds (per-session)
const EMBED_CACHE = new Map(); // key: normalized URL, value: HTML string

const LS_KEY = "mapx_embed_cache_v1";
const LS_TTL_MS = 1000 * 60 * 60 * 24 * 3; // 3 days
const MAX_ENTRIES = 100;
const WRITE_DEBOUNCE_MS = 300;

function nowMs() { return Date.now(); }

function readPersistedCache() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") return obj;
  } catch (_) {}
  return {};
}

let writeTimer = null;
function schedulePersist(obj) {
  try { if (writeTimer) clearTimeout(writeTimer); } catch(_) {}
  writeTimer = setTimeout(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch(_) {}
  }, WRITE_DEBOUNCE_MS);
}

const PERSISTED = readPersistedCache();

export function normalizeUrl(rawUrl) {
  if (!rawUrl) return "";
  const trimmed = String(rawUrl).trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1);
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2];
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/");
      const idx = parts.indexOf("embed");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
  } catch (_) {}
  return null;
}

function buildYouTubeEmbedHtml(url) {
  const id = extractYouTubeId(url);
  if (!id) return null;
  const src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
  return `<iframe src="${src}" style="width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
}

const ENABLE_EMBED_PROXY = typeof import.meta !== "undefined" && import.meta.env && String(import.meta.env.VITE_ENABLE_EMBED_PROXY) === "true";

async function tryOEmbed(url) {
  try {
    if (!ENABLE_EMBED_PROXY) return null;
    const res = await axios.get(`/embed/oembed`, {
      params: { url },
      timeout: 4000,
    });
    if (res?.data && typeof res.data.html === "string" && res.data.html) {
      return res.data.html;
    }
  } catch (_) {}
  return null;
}

function buildHtmlFromLinks(data) {
  try {
    const links = Array.isArray(data?.links) ? data.links : [];
    const pick = links.find((l) => {
      const rel = Array.isArray(l?.rel) ? l.rel : [];
      const hasRel = rel.some((r) => ["player", "app", "reader", "iframe", "embed"].includes(r));
      const typeOk = typeof l?.type === "string" && /^text\/html/i.test(l.type);
      return hasRel && typeOk && typeof l?.href === "string" && l.href;
    });
    if (pick && pick.href) {
      const src = pick.href;
      return `<iframe src="${src}" style="width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    }
  } catch (_) {}
  return null;
}

async function tryIframely(url) {
  try {
    if (!ENABLE_EMBED_PROXY) return null;
    const res = await axios.get(`/embed/iframely`, {
      params: { url, omit_script: 1 },
      timeout: 5000,
    });
    if (res?.data) {
      if (typeof res.data.html === "string" && res.data.html) {
        return res.data.html;
      }
      const composed = buildHtmlFromLinks(res.data);
      if (composed) return composed;
    }
  } catch (_) {}
  return null;
}

export async function resolveEmbedHtml(rawUrl) {
  const url = normalizeUrl(rawUrl);
  if (!url) return null;
  const cached = EMBED_CACHE.get(url);
  if (typeof cached === "string") return cached;
  const persisted = PERSISTED[url];
  if (persisted && typeof persisted.html === "string" && (nowMs() - (persisted.ts || 0) < LS_TTL_MS)) {
    EMBED_CACHE.set(url, persisted.html);
    return persisted.html;
  }
  // Fast path: handle common providers locally
  const youtubeHtml = buildYouTubeEmbedHtml(url);
  if (youtubeHtml) {
    EMBED_CACHE.set(url, youtubeHtml);
    return youtubeHtml;
  }

  // Provider-agnostic: race Iframely and oEmbed, take the first non-null
  const toNonNull = (p) => p.then((v) => (v ? v : Promise.reject()));
  let winner = null;
  try {
    winner = await Promise.any([
      toNonNull(tryIframely(url)),
      toNonNull(tryOEmbed(url)),
    ]);
  } catch (_) {
    winner = null;
  }
  if (winner) {
    EMBED_CACHE.set(url, winner);
    PERSISTED[url] = { html: winner, ts: nowMs() };
    // Enforce LRU cap: keep most recent MAX_ENTRIES by ts
    try {
      const entries = Object.entries(PERSISTED);
      if (entries.length > MAX_ENTRIES) {
        entries.sort((a,b) => (b[1]?.ts || 0) - (a[1]?.ts || 0));
        const trimmed = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
        Object.keys(PERSISTED).forEach(k => { if (!trimmed[k]) delete PERSISTED[k]; });
      }
    } catch(_) {}
    schedulePersist(PERSISTED);
    return winner;
  }
  return null;
}

export async function prefetchEmbed(rawUrl) {
  try { await resolveEmbedHtml(rawUrl); } catch(_) {}
}


