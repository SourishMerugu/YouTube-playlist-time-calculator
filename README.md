# YouTube Playlist Time Calculator (Local Web)

A local web app that calculates the total watch time of a YouTube playlist.

- Backend: Node.js + Express
- Frontend: HTML + Vanilla JS
- API: YouTube Data API v3

## Features
- Accepts a YouTube playlist URL
- Extracts the playlist ID in the browser
- Calls backend API: `/api/playlist-time?playlistId=...&speed=...`
- Handles pagination (>50 videos)
- Parses ISO 8601 durations
- Returns title, video count, total time (HH:MM:SS) and details
- Optional playback speed (0.25x–4x)

## Setup
1. Clone this folder or copy it to your machine.
2. Create `.env` from `.env.example`:
   
   ```bash
   cp .env.example .env
   # Edit .env and set your real API key
   ```
3. Install dependencies:
   
   ```bash
   npm install
   ```
4. Start the server:
   
   ```bash
   npm start
   # or: node server.js
   ```

Open http://localhost:3000 in your browser.

## Security
- The YouTube API key is only read on the server via `dotenv`.
- The key is never sent to the browser.

## Development Notes
- Primary logic lives in `index.js` and is reused by the Express API.
- `fetchVideoDurations` batches up to 50 IDs per request to support large playlists.
