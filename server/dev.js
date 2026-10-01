import app from "./app.js";

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`Port ${PORT} is already in use. Retrying on fallback port ${Number(PORT) + 1}...`);
    const fallbackServer = app.listen(Number(PORT) + 1, () => {
      console.log(`API server running on http://localhost:${Number(PORT) + 1}`);
    });
    fallbackServer.on("error", (e) => {
      console.error("Failed to start API server:", e);
    });
  } else {
    console.error("Server error:", err);
  }
});

