const cache = new Map();

export async function fetchHdCover(track) {
  if (!track) return null;
  if (cache.has(track.id)) return cache.get(track.id);
  const clean = (s) => s.replace(/\(.*?\)/g, "").replace(/ - .*/, "").trim();
  const term = `${clean(track.title)} ${track.artist.split(",")[0]}`;
  try {
    const r = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=3`,
      { signal: AbortSignal.timeout(4000) }
    );
    const j = await r.json();
    const first = clean(track.title).toLowerCase().split(" ")[0];
    const hit = (j.results || []).find((x) => (x.trackName || "").toLowerCase().includes(first));
    const url = hit?.artworkUrl100?.replace("100x100bb", "600x600bb") || null;
    cache.set(track.id, url);
    return url;
  } catch (e) {
    cache.set(track.id, null);
    return null;
  }
}
