import { useState } from "react";
import { motion, Reorder } from "framer-motion";
import { X, Search, GripVertical } from "lucide-react";
import Cover from "./Cover.jsx";
import { ALL_TRACKS, PLAYLISTS } from "./playlists.js";

export default function Queue({
  queue = [],
  current = 0,
  onClose,
  onPick,
  onReorder,
  onShuffleAll,
  playlists = PLAYLISTS,
  activePlaylist = "all",
  totalCount = ALL_TRACKS.length,
  onSelectPlaylist
}) {
  const [q, setQ] = useState("");
  const now = queue[current];
  const upNext = queue.filter((_, i) => i !== current);

  const searching = q.trim().length > 0;
  const searchQuery = q.trim().toLowerCase();

  const universalSearchResults = searching
    ? ALL_TRACKS.filter((t) => {
        const titleMatch = (t?.title || "").toLowerCase().includes(searchQuery);
        const artistMatch = (t?.artist || "").toLowerCase().includes(searchQuery);
        const playlistMatch = (t?.playlist || "").toLowerCase().includes(searchQuery);
        return titleMatch || artistMatch || playlistMatch;
      })
    : [];

  const getPlaylistName = (playlistId) => {
    if (!playlistId) return null;
    const pl = playlists.find((p) => p.id === playlistId);
    return pl ? pl.name : playlistId;
  };

  const row = (t, drag, isSearchResult = false) => (
    <>
      {drag && <GripVertical size={16} className="grip" />}
      <div className="row-content" onClick={() => onPick(t)}>
        <Cover track={t} className="thumb" />
        <div className="meta">
          <div className="title-row">
            <b>{t?.title ?? "Unknown Track"}</b>
            {isSearchResult && t?.playlist && (
              <span className="search-playlist-badge">
                {getPlaylistName(t.playlist)}
              </span>
            )}
          </div>
          <small>{t?.artist ?? "Unknown Artist"}</small>
        </div>
      </div>
    </>
  );

  const isDesktop = typeof window !== "undefined" && window.innerWidth > 768;

  return (
    <motion.div
      className="sheet queue-card"
      initial={{ opacity: 0, y: isDesktop ? 0 : "100%", x: isDesktop ? 30 : 0, scale: isDesktop ? 0.96 : 1 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      exit={{ opacity: 0, y: isDesktop ? 0 : "100%", x: isDesktop ? 30 : 0, scale: isDesktop ? 0.96 : 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
    >
      <header>
        <h3>Your queue</h3>
        <div className="header-actions">
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
      </header>

      <label className="search">
        <Search size={15} />
        <input 
          value={q} 
          onChange={(e) => setQ(e.target.value)} 
          placeholder="Search all songs across project…" 
        />
        {q && (
          <button className="search-clear-btn" onClick={() => setQ("")} aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </label>

      {!searching && playlists.length > 0 && (
        <div className="pl-strip">
          <button className={`pl-card ${activePlaylist === "all" ? "on" : ""}`} onClick={() => onSelectPlaylist("all")}>
            <div className="pl-all">♪</div>
            <b>All songs</b>
            <small>{totalCount}</small>
          </button>
          {playlists.map((p) => (
            <button key={p.id} className={`pl-card ${activePlaylist === p.id ? "on" : ""}`} onClick={() => onSelectPlaylist(p.id)}>
              <img src={p.cover} alt={`${p.name} playlist cover`} decoding="async" />
              <b>{p.name}</b>
              <small>{p.tracks.length} songs</small>
            </button>
          ))}
        </div>
      )}

      <div className="scroll">
        {searching ? (
          <>
            <p className="label">
              Universal Search Results ({universalSearchResults.length} song{universalSearchResults.length === 1 ? "" : "s"} found)
            </p>
            {universalSearchResults.length ? (
              universalSearchResults.map((t) => (
                <div key={t.id} className="row">{row(t, false, true)}</div>
              ))
            ) : (
              <p className="empty">No songs found matching “{q}”.</p>
            )}
          </>
        ) : (
          <>
            {now && (
              <>
                <p className="label">Playing now</p>
                <div className="row now">{row(now)}</div>
              </>
            )}

            <p className="label">Coming up</p>
            <Reorder.Group axis="y" values={upNext} onReorder={onReorder} className="list">
              {upNext.map((t) => (
                <Reorder.Item key={t.id} value={t} className="row" whileDrag={{ scale: 1.03, boxShadow: "0 10px 24px rgba(0,0,0,.12)" }}>
                  {row(t, true)}
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </>
        )}
      </div>

      {!searching && (
        <div className="queue-footer-actions">
          <button className="pill" onClick={onShuffleAll}>Mix it all up</button>
        </div>
      )}
    </motion.div>
  );
}


