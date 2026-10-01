export default function Cover({ track, className = "", priority = false }) {
  if (track?.cover) {
    return (
      <img
        className={className}
        src={track.cover}
        alt={track?.title ? `${track.title} - ${track.artist || "Song cover"}` : "Album cover"}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchpriority={priority ? "high" : "low"}
      />
    );
  }
  const h = track?.hue ?? 20;
  return (
    <div
      className={`cover-fallback ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${h} 80% 62%), hsl(${(h + 40) % 360} 75% 45%))` }}
    >
      <span>{track?.title?.[0] ?? "♪"}</span>
    </div>
  );
}
