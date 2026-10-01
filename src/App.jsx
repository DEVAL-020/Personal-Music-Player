import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { Shuffle, SkipBack, SkipForward, Repeat, Play, Pause, ListMusic, Loader2, Sun, Moon } from "lucide-react";
import Queue from "./Queue.jsx";
import Cover from "./Cover.jsx";
import { resolveFullTrackAudio } from "./audioResolver.js";
import { PLAYLISTS, ALL_TRACKS, tracksFor, playlistOf } from "./playlists.js";
import { fetchHdCover } from "./hdCover.js";

const fmt = (s) =>
  !s || !isFinite(s) ? "0:00" : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("deto_theme");
    if (saved) return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const [playlistId, setPlaylistId] = useState(() => localStorage.getItem("deto_playlist") || "all");
  const [hdCover, setHdCover] = useState(null);
  const [queue, setQueue] = useState(() => {
    try {
      const saved = localStorage.getItem("deto_queue_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return tracksFor(localStorage.getItem("deto_playlist") || "all");
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("deto_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const [i, setI] = useState(() => {
    try {
      const savedTrackId = localStorage.getItem("deto_current_track_id");
      const savedQueue = localStorage.getItem("deto_queue_v2");
      const qList = savedQueue ? JSON.parse(savedQueue) : tracksFor(localStorage.getItem("deto_playlist") || "all");
      if (savedTrackId && Array.isArray(qList)) {
        const idx = qList.findIndex((t) => t.id === savedTrackId);
        if (idx !== -1) return idx;
      }
      const savedIndex = localStorage.getItem("deto_current_i");
      if (savedIndex !== null) {
        const parsed = parseInt(savedIndex, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < (qList?.length || 1)) return parsed;
      }
    } catch (e) {}
    return 0;
  });
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [openQueue, setOpenQueue] = useState(false);
  const [notification, setNotification] = useState("");

  const audio = useRef(null);
  const coverRef = useRef(null);
  const titleRef = useRef(null);
  const blobA = useRef(null);
  const blobB = useRef(null);

  const restoredTimeRef = useRef(() => {
    try {
      const savedTime = localStorage.getItem("deto_audio_time");
      return savedTime ? parseFloat(savedTime) || 0 : 0;
    } catch (e) {
      return 0;
    }
  });

  const shouldPlayRef = useRef(true);
  const live = useRef({});
  live.current = { queue, i, shuffle, repeat };

  const track = queue[i];

  useEffect(() => {
    if (queue && queue.length > 0) {
      try {
        localStorage.setItem("deto_queue_v2", JSON.stringify(queue));
      } catch (e) {}
    }
  }, [queue]);

  useEffect(() => {
    if (track?.id) {
      try {
        localStorage.setItem("deto_current_track_id", track.id);
        localStorage.setItem("deto_current_i", String(i));
      } catch (e) {}
    }
  }, [track?.id, i]);

  useEffect(() => {
    const a = (audio.current = new Audio());
    a.preload = "metadata";
    const on = (e, f) => a.addEventListener(e, f);
    on("timeupdate", () => {
      setTime(a.currentTime);
      if (a.currentTime > 0) {
        try {
          localStorage.setItem("deto_audio_time", String(a.currentTime));
        } catch (e) {}
      }
    });
    on("loadedmetadata", () => setDur(a.duration));
    on("waiting", () => setLoading(true));
    on("canplay", () => setLoading(false));
    on("play", () => setPlaying(true));
    on("pause", () => setPlaying(false));
    on("error", (e) => {
      console.warn("Audio load error, skipping to next track...", e);
      setLoading(false);
      setPlaying(false);
      setTimeout(() => {
        go(1, true);
      }, 1200);
    });
    on("ended", () => {
      try { localStorage.removeItem("deto_audio_time"); } catch (e) {}
      if (live.current.repeat) {
        a.currentTime = 0;
        a.play().catch(() => {});
      } else {
        go(1, true);
      }
    });
    return () => {
      a.pause();
      a.src = "";
    };
  }, []);

  useEffect(() => {
    if (!track || !audio.current) return;
    const a = audio.current;
    let isCancelled = false;

    setTime(0);
    setDur(0);
    setLoading(true);

    setHdCover(null);
    fetchHdCover(track).then((u) => { if (!isCancelled && u) setHdCover(u); });

    a.pause();
    a.removeAttribute("src");
    a.load();

    resolveFullTrackAudio(track).then((streamUrl) => {
      if (isCancelled || !streamUrl || !audio.current) {
        if (!isCancelled && !streamUrl) { setLoading(false); setPlaying(false); }
        return;
      }
      a.src = streamUrl;
      const targetTime = typeof restoredTimeRef.current === "function" ? restoredTimeRef.current() : restoredTimeRef.current;
      if (targetTime > 0) {
        try {
          a.currentTime = targetTime;
        } catch (e) {}
        restoredTimeRef.current = 0;
      }
      if (shouldPlayRef.current) {
        a.play().catch(() => {
          setPlaying(false);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error("Failed to resolve audio:", err);
      if (!isCancelled) {
        setLoading(false);
        setPlaying(false);
      }
    });

    if (coverRef.current) {
      gsap.fromTo(coverRef.current, { y: 14, opacity: 0.3 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
    }
    if (titleRef.current) {
      gsap.fromTo(titleRef.current, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power2.out" });
    }

    return () => {
      isCancelled = true;
    };
  }, [track?.id]);

  useEffect(() => {
    if (coverRef.current) {
      gsap.to(coverRef.current, {
        rotate: playing ? 0 : -2.5,
        scale: playing ? 1.02 : 0.97,
        duration: 0.7,
        ease: "elastic.out(1, 0.6)",
      });
    }
  }, [playing]);

  useEffect(() => {
    let animA, animB;
    if (blobA.current) {
      animA = gsap.to(blobA.current, { x: 60, y: 40, duration: 9, repeat: -1, yoyo: true, ease: "sine.inOut" });
    }
    if (blobB.current) {
      animB = gsap.to(blobB.current, { x: -70, y: -50, duration: 11, repeat: -1, yoyo: true, ease: "sine.inOut" });
    }
    return () => {
      animA?.kill();
      animB?.kill();
    };
  }, []);

  function resetSavedTime() {
    restoredTimeRef.current = 0;
    try { localStorage.removeItem("deto_audio_time"); } catch (e) {}
  }

  function go(dir, autoPlay = true) {
    const { queue: q, i: cur, shuffle: sh } = live.current;
    if (!q.length) return;
    let n;
    if (sh && q.length > 1) {
      do {
        n = Math.floor(Math.random() * q.length);
      } while (n === cur);
    } else {
      n = (cur + dir + q.length) % q.length;
    }
    resetSavedTime();
    shouldPlayRef.current = autoPlay;
    setI(n);
  }

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      shouldPlayRef.current = true;
      a.play().catch(() => {
        setPlaying(false);
      });
    } else {
      shouldPlayRef.current = false;
      a.pause();
    }
  };

  const seek = (v) => {
    if (!audio.current) return;
    audio.current.currentTime = v;
    setTime(v);
  };

  const pick = (t) => {
    resetSavedTime();
    const index = queue.findIndex((x) => x.id === t.id);
    if (index !== -1) {
      shouldPlayRef.current = true;
      setI(index);
    } else {
      const newQueue = [...queue];
      newQueue.splice(i + 1, 0, t);
      setQueue(newQueue);
      setI(i + 1);
      shouldPlayRef.current = true;
    }
  };

  const reorder = (upNext) => {
    if (!track) return;
    setQueue([track, ...upNext]);
    setI(0);
  };

  const shuffleAll = () => {
    if (!track || queue.length <= 1) return;
    const rest = queue.filter((_, k) => k !== i).sort(() => Math.random() - 0.5);
    setQueue([track, ...rest]);
    setI(0);
  };

  const selectPlaylist = (id) => {
    resetSavedTime();
    const list = tracksFor(id);
    setPlaylistId(id);
    localStorage.setItem("deto_playlist", id);
    setQueue(list);
    setI(0);
    shouldPlayRef.current = true;
    setOpenQueue(false);
    const name = id === "all" ? "All songs" : PLAYLISTS.find((p) => p.id === id)?.name;
    setNotification(`${name} · ${list.length} songs`);
    setTimeout(() => setNotification(""), 3000);
  };

  const pct = dur > 0 ? (time / dur) * 100 : 0;

  return (
    <main>
      <div className="blob a" ref={blobA} />
      <div className="blob b" ref={blobB} />

      {notification && (
        <motion.div 
          className="toast-notification"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
        >
          <span>{notification}</span>
        </motion.div>
      )}

      <div className={`player-wrapper ${openQueue ? "has-queue" : ""}`}>
        <section className="card player-card">
          <header className="top">
            <motion.button 
              whileTap={{ scale: 0.85 }}
              whileHover={{ scale: 1.1 }}
              className="icon-btn theme-btn" 
              onClick={toggleTheme} 
              aria-label="Toggle theme"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </motion.button>
            <div className="spinning-title-badge">
              <span>Now playing</span>
            </div>
            <button className={`icon-btn ${openQueue ? "active" : ""}`} onClick={() => setOpenQueue(!openQueue)} aria-label="Queue" title={openQueue ? "Close queue" : "Open queue"}>
              <ListMusic size={18} />
            </button>
          </header>

          <div className="art" ref={coverRef}>
            <Cover track={hdCover ? { ...track, cover: hdCover } : track} className="art-img" priority />
          </div>

          <div className="track-title-wrapper">
            <h1 ref={titleRef}>{track?.title ?? "Loading…"}</h1>
          </div>
          <p className="artist">{track?.artist}</p>
          {playlistOf(track) && (
            <button className="playlist-chip" onClick={() => setOpenQueue(!openQueue)} title="Browse playlists" aria-label={`Playlist: ${playlistOf(track).name}`}>
              <img src={playlistOf(track).cover} alt={`${playlistOf(track).name} cover`} decoding="async" />
              <span>{playlistOf(track).name}</span>
            </button>
          )}

          <div className="bar">
            <small>{fmt(time)}</small>
            <input
              type="range"
              min="0"
              max={dur || 0}
              step="0.1"
              value={time}
              aria-label="Track progress slider"
              aria-valuemin="0"
              aria-valuemax={dur || 0}
              aria-valuenow={time}
              style={{ "--p": `${pct}%` }}
              onChange={(e) => seek(+e.target.value)}
            />
            <small>{fmt(dur)}</small>
          </div>

          <div className="controls">
            <motion.button
              whileTap={{ scale: 0.85 }}
              className={`ctl ${shuffle ? "on" : ""}`}
              onClick={() => setShuffle(!shuffle)}
              aria-label="Shuffle"
            >
              <Shuffle size={18} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.85 }}
              className="ctl"
              onClick={() => go(-1, playing)}
              aria-label="Previous"
            >
              <SkipBack size={22} fill="currentColor" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.05 }}
              className="play"
              onClick={toggle}
              aria-label="Play or pause"
            >
              {loading && playing ? (
                <Loader2 className="spin" size={26} />
              ) : playing ? (
                <Pause size={26} fill="currentColor" />
              ) : (
                <Play size={26} fill="currentColor" style={{ marginLeft: 3 }} />
              )}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.85 }}
              className="ctl"
              onClick={() => go(1, playing)}
              aria-label="Next"
            >
              <SkipForward size={22} fill="currentColor" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.85 }}
              className={`ctl ${repeat ? "on" : ""}`}
              onClick={() => setRepeat(!repeat)}
              aria-label="Repeat"
            >
              <Repeat size={18} />
            </motion.button>
          </div>
        </section>

        <AnimatePresence>
          {openQueue && queue.length > 0 && (
            <Queue
              queue={queue}
              current={i}
              onClose={() => setOpenQueue(false)}
              onPick={pick}
              onReorder={reorder}
              playlists={PLAYLISTS}
              activePlaylist={playlistId}
              totalCount={ALL_TRACKS.length}
              onSelectPlaylist={selectPlaylist}
              onShuffleAll={shuffleAll}
            />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}


