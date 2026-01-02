const express = require('express');
const path = require('path');
require('dotenv').config();

const { calculatePlaylistDuration } = require('./index');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API: GET /api/playlist-time?playlistId=XXXX[&speed=1.5]
app.get('/api/playlist-time', async (req, res) => {
  try {
    const { playlistId, speed } = req.query;
    if (!process.env.YOUTUBE_API_KEY) {
      return res.status(500).json({ error: 'Server is not configured with a YouTube API key.' });
    }
    if (!playlistId || typeof playlistId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid playlistId query parameter.' });
    }

    const playbackSpeed = speed ? Math.max(0.25, Math.min(4, parseFloat(speed))) : 1.0;
    const playlistUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;

    const result = await calculatePlaylistDuration(playlistUrl, playbackSpeed);

    return res.json({
      playlistTitle: result.playlistTitle,
      videoCount: result.videoCount,
      totalDuration: result.duration.formatted,
      totalSeconds: result.duration.totalSeconds,
      adjustedDuration: result.duration.adjustedFormatted,
      adjustedSeconds: result.duration.adjustedSeconds,
      playbackSpeed: result.playbackSpeed || 1.0,
      details: result.duration.detailed,
      insights: result.insights
    });
  } catch (err) {
    const message = err?.response?.data?.error?.message || err.message || 'Unknown error';
    const status = err?.response?.status || 500;
    res.status(status).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
