import express from "express";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";

const app = express();
app.use(express.static("public"));

const file = fileURLToPath(new URL("../src/data/playlists.json", import.meta.url));
const load = () => JSON.parse(readFileSync(file, "utf8"));

const streamCache = new Map();

app.get("/api/playlists", (_req, res) => {
  try {
    res.json(load().map(({ tracks, ...p }) => ({ ...p, count: tracks.length })));
  } catch {
    res.status(500).json({ error: "playlists unavailable" });
  }
});

app.get("/api/playlists/:id", (req, res) => {
  try {
    const p = load().find((x) => x.id === req.params.id);
    return p ? res.json(p) : res.status(404).json({ error: "not found" });
  } catch {
    return res.status(500).json({ error: "playlists unavailable" });
  }
});

app.get("/api/tracks", (_req, res) => {
  try { res.json(load().flatMap((p) => p.tracks)); } catch { res.status(500).json([]); }
});

app.get("/api/stream", (req, res) => {
  const query = req.query.q;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  const cacheKey = query.trim().toLowerCase();
  if (streamCache.has(cacheKey)) {
    const cached = streamCache.get(cacheKey);
    if (Date.now() - cached.time < 3600000) {
      return res.json({ url: cached.url, full: true });
    }
  }

  const safeQuery = query.replace(/"/g, "");
  const cmd = `yt-dlp -g -f "bestaudio/best" "ytsearch1:${safeQuery}"`;

  exec(cmd, { timeout: 12000 }, (error, stdout) => {
    if (!error && stdout) {
      const url = stdout.trim().split(/\r?\n/)[0];
      if (url && url.startsWith("http")) {
        streamCache.set(cacheKey, { url, time: Date.now() });
        return res.json({ url, full: true });
      }
    }

    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`)
      .then((r) => r.json())
      .then((d) => {
        const previewUrl = d.results?.[0]?.previewUrl;
        if (previewUrl) {
          return res.json({ url: previewUrl, full: false });
        }
        res.status(404).json({ error: "Stream not found" });
      })
      .catch(() => {
        res.status(500).json({ error: "Failed to resolve stream" });
      });
  });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

export default app;

