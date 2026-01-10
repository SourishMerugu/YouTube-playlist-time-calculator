const { calculatePlaylistDuration } = require('../index');
require('dotenv').config();
console.log('YOUTUBE_API_KEY present?', !!process.env.YOUTUBE_API_KEY);
module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { playlistId, speed } = req.query || {};

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
};
