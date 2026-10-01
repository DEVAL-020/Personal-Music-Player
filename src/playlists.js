import data from "./data/playlists.json";

export const PLAYLISTS = data.map((p) => ({
  ...p,
  tracks: p.tracks.map((t) => ({ ...t, src: `/music/${t.slug}.mp3`, local: true })),
}));

export const ALL_TRACKS = PLAYLISTS.flatMap((p) => p.tracks);

export const tracksFor = (id) =>
  id === "all" ? ALL_TRACKS : PLAYLISTS.find((p) => p.id === id)?.tracks ?? ALL_TRACKS;

export const playlistOf = (track) => PLAYLISTS.find((p) => p.id === track?.playlist);
