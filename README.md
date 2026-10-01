# Deto Player

React + Framer Motion + GSAP front end, Express API, ready for Vercel.

## Run locally
    npm install
    npm run dev      # web on :5173, API on :3001

## Your Spotify playlists
All songs from D.J English (68), D.J Hindi (268) and D.J. RAP (56) are in `src/data/playlists.json`,
with song covers in `public/covers/` and playlist banners in `public/covers/playlists/`.
Open the queue (top right) to switch playlists.

## Audio
For each song the player first looks for `public/music/<slug>.mp3` (the `slug` field in the JSON,
e.g. `kun-faya-kun.mp3`). If the file isn't there it tries the stream resolver in `src/audioResolver.js`.

## Covers
The covers were cropped from a screen recording, so they are small. On the main player the app
swaps in a sharp cover from the iTunes Search API when it finds a match.

## Deploy
Push to GitHub, import in Vercel (Vite preset). `api/index.js` + `vercel.json` route `/api/*` to Express.
