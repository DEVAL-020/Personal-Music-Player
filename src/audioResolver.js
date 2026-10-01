const audioCache = new Map();

const RELIABLE_FALLBACK_AUDIO = [
  "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
  "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3",
  "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3",
  "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792ce.mp3",
  "https://cdn.pixabay.com/download/audio/2021/09/06/audio_8417937517.mp3"
];

function getFallbackAudio(track) {
  let hash = 0;
  const str = (track?.title || "") + (track?.artist || "");
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % RELIABLE_FALLBACK_AUDIO.length;
  return RELIABLE_FALLBACK_AUDIO[idx];
}

export async function resolveFullTrackAudio(track) {
  if (!track) return null;

  const cacheKey = `${track.title}_${track.artist}`;
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey);
  }

  if (track.src && track.src.startsWith("http")) {
    audioCache.set(cacheKey, track.src);
    return track.src;
  }

  if (track.src && track.src.startsWith("/music/")) {
    try {
      const head = await fetch(track.src, { method: "HEAD" });
      const type = head.headers.get("content-type") || "";
      if (head.ok && (type.startsWith("audio") || type.includes("octet-stream"))) {
        audioCache.set(cacheKey, track.src);
        return track.src;
      }
    } catch (e) {}
  }

  const query = `${track.title} ${track.artist}`.trim();
  if (!query) return getFallbackAudio(track);

  try {
    const res = await fetch(`/api/stream?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(10000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        audioCache.set(cacheKey, data.url);
        return data.url;
      }
    }
  } catch (e) {
    console.warn("Backend stream resolver failed, trying fallback...", e);
  }

  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=5`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const targetTitle = (track.title || "").toLowerCase();
        const match = data.results.find((item) => {
          const itemTitle = (item.trackName || "").toLowerCase();
          return itemTitle.includes(targetTitle) || targetTitle.includes(itemTitle);
        }) || data.results[0];

        if (match && match.previewUrl) {
          audioCache.set(cacheKey, match.previewUrl);
          return match.previewUrl;
        }
      }
    }
  } catch (e) {}

  const fallback = getFallbackAudio(track);
  audioCache.set(cacheKey, fallback);
  return fallback;
}



