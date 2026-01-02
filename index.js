const axios = require('axios');
require('dotenv').config();

// YouTube Data API configuration
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

/**
 * Extracts the playlist ID from a YouTube playlist URL
 * @param {string} url - The YouTube playlist URL
 * @returns {string|null} The playlist ID or null if not found
 */
function extractPlaylistId(url) {
  try {
    const urlObj = new URL(url);
    const playlistId = urlObj.searchParams.get('list');
    return playlistId || null;
  } catch (error) {
    return null;
  }
}

/**
 * Fetches all video IDs from a playlist, handling pagination
 * @param {string} playlistId - The YouTube playlist ID
 * @returns {Promise<Array>} Array of video IDs
 */
async function fetchPlaylistVideos(playlistId) {
  let videoIds = [];
  let nextPageToken = '';
  
  try {
    do {
      const response = await axios.get(`${YOUTUBE_API_BASE_URL}/playlistItems`, {
        params: {
          part: 'contentDetails',
          maxResults: 50,
          playlistId,
          key: YOUTUBE_API_KEY,
          pageToken: nextPageToken || undefined
        }
      });

      const items = response.data.items || [];
      const pageVideoIds = items.map(item => item.contentDetails.videoId);
      videoIds = [...videoIds, ...pageVideoIds];
      
      nextPageToken = response.data.nextPageToken || '';
    } while (nextPageToken);
    
    return videoIds;
  } catch (error) {
    console.error('Error fetching playlist videos:', error.response?.data?.error?.message || error.message);
    throw new Error('Failed to fetch playlist videos. Please check the playlist URL and try again.');
  }
}

/**
 * Fetches video durations for the given video IDs
 * @param {Array} videoIds - Array of YouTube video IDs
 * @returns {Promise<Array>} Array of video durations in seconds
 */
async function fetchVideoDurations(videoIds) {
  try {
    const chunkSize = 50;
    const results = [];
    for (let i = 0; i < videoIds.length; i += chunkSize) {
      const chunk = videoIds.slice(i, i + chunkSize);
      const response = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
        params: {
          part: 'contentDetails',
          id: chunk.join(','),
          key: YOUTUBE_API_KEY
        }
      });
      const items = response.data.items || [];
      for (const item of items) {
        if (!item?.contentDetails?.duration) continue;
        results.push({
          videoId: item.id,
          duration: parseISODuration(item.contentDetails.duration)
        });
      }
    }
    return results;
  } catch (error) {
    console.error('Error fetching video durations:', error.response?.data?.error?.message || error.message);
    throw new Error('Failed to fetch video durations');
  }
}

/**
 * Parses ISO 8601 duration format to seconds
 * @param {string} duration - ISO 8601 duration string (e.g., PT1H3M45S)
 * @returns {number} Duration in seconds
 */
function parseISODuration(duration) {
  // Support patterns like PnDTnHnMnS, PTnHnMnS, PTnM, PTnS, PnD
  // YouTube typically returns with a T section, but be defensive.
  if (typeof duration !== 'string' || !duration.startsWith('P')) return 0;
  const re = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
  const match = duration.match(re);
  if (!match) return 0;
  const days = parseInt(match[1] || '0', 10) || 0;
  const hours = parseInt(match[2] || '0', 10) || 0;
  const minutes = parseInt(match[3] || '0', 10) || 0;
  const seconds = parseInt(match[4] || '0', 10) || 0;
  const total = days * 86400 + hours * 3600 + minutes * 60 + seconds;
  return total >= 0 ? total : 0;
}

/**
 * Formats seconds into HH:MM:SS format
 * @param {number} totalSeconds - Total seconds
 * @returns {string} Formatted time string
 */
function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].join(':');
}

/**
 * Calculates total duration from an array of video durations
 * @param {Array} videos - Array of video objects with duration in seconds
 * @returns {Object} Object containing total duration in different formats
 */
function calculateTotalDuration(videos) {
  const totalSeconds = videos.reduce((sum, video) => sum + video.duration, 0);
  
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return {
    totalSeconds,
    formatted: formatDuration(totalSeconds),
    detailed: {
      days,
      hours: hours % 24,
      minutes: minutes % 60,
      seconds: seconds % 60,
      totalHours: totalSeconds / 3600
    }
  };
}

/**
 * Computes average, longest, and shortest durations (in seconds) from video list
 * @param {Array<{videoId:string,duration:number}>} videos
 */
function computeDurationInsights(videos) {
  if (!videos || videos.length === 0) {
    return { averageSeconds: 0, longestSeconds: 0, shortestSeconds: 0 };
  }
  let longest = 0;
  let shortest = Number.POSITIVE_INFINITY;
  let sum = 0;
  for (const v of videos) {
    const d = typeof v.duration === 'number' ? v.duration : 0;
    if (d <= 0) continue;
    sum += d;
    if (d > longest) longest = d;
    if (d < shortest) shortest = d;
  }
  const count = videos.filter(v => v.duration > 0).length || 1;
  return {
    averageSeconds: Math.round(sum / count),
    longestSeconds: longest === 0 ? 0 : longest,
    shortestSeconds: shortest === Number.POSITIVE_INFINITY ? 0 : shortest
  };
}

/**
 * Fetches playlist title
 * @param {string} playlistId - The YouTube playlist ID
 * @returns {Promise<string>} Playlist title
 */
async function fetchPlaylistTitle(playlistId) {
  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/playlists`, {
      params: {
        part: 'snippet',
        id: playlistId,
        key: YOUTUBE_API_KEY
      }
    });
    
    return response.data.items[0]?.snippet?.title || 'Untitled Playlist';
  } catch (error) {
    console.error('Error fetching playlist title:', error.response?.data?.error?.message || error.message);
    return 'Untitled Playlist';
  }
}

/**
 * Main function to calculate playlist duration
 * @param {string} playlistUrl - YouTube playlist URL
 * @param {number} playbackSpeed - Optional playback speed multiplier (e.g., 1.5 for 1.5x speed)
 */
async function calculatePlaylistDuration(playlistUrl, playbackSpeed = 1.0) {
  try {
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') {
      throw new Error('Please set your YouTube API key in the .env file');
    }
    
    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      throw new Error('Invalid YouTube playlist URL');
    }
    
    console.log('Fetching playlist information...');
    const [title, videoIds] = await Promise.all([
      fetchPlaylistTitle(playlistId),
      fetchPlaylistVideos(playlistId)
    ]);
    
    if (videoIds.length === 0) {
      throw new Error('No videos found in the playlist or the playlist is private');
    }
    
    console.log(`Found ${videoIds.length} videos in the playlist: "${title}"`);
    console.log('Fetching video durations...');
    
    const videos = await fetchVideoDurations(videoIds);
    const durationInfo = calculateTotalDuration(videos);
    const insights = computeDurationInsights(videos);
    
    // Adjust for playback speed if not 1.0
    if (playbackSpeed !== 1.0) {
      const adjustedSeconds = Math.round(durationInfo.totalSeconds / playbackSpeed);
      durationInfo.adjustedSeconds = adjustedSeconds;
      durationInfo.adjustedFormatted = formatDuration(adjustedSeconds);
    }
    
    return {
      playlistTitle: title,
      videoCount: videos.length,
      duration: durationInfo,
      playbackSpeed: playbackSpeed !== 1.0 ? playbackSpeed : undefined,
      insights
    };
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Export functions for testing
module.exports = {
  extractPlaylistId,
  fetchPlaylistVideos,
  fetchVideoDurations,
  parseISODuration,
  calculateTotalDuration,
  formatDuration,
  calculatePlaylistDuration
};

// If this file is run directly, use the command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node index.js <youtube-playlist-url> [playback-speed]');
    console.log('Example: node index.js "https://www.youtube.com/playlist?list=PLbpi6ZahtOH6Blw3RGYpWkSByi_T7Rygb" 1.5');
    process.exit(1);
  }
  
  const playlistUrl = args[0];
  const playbackSpeed = parseFloat(args[1]) || 1.0;
  
  calculatePlaylistDuration(playlistUrl, playbackSpeed)
    .then(result => {
      console.log('\n=== Playlist Duration Calculator ===');
      console.log(`Playlist: ${result.playlistTitle}`);
      console.log(`Videos: ${result.videoCount}`);
      console.log(`Total Duration: ${result.duration.formatted} (${result.duration.totalSeconds} seconds)`);
      
      if (result.playbackSpeed) {
        console.log(`\nWith ${result.playbackSpeed}x playback speed:`);
        console.log(`Adjusted Duration: ${result.duration.adjustedFormatted} (${result.duration.adjustedSeconds} seconds)`);
      }
      
      console.log('\nDetailed Breakdown:');
      console.log(`- Days: ${result.duration.detailed.days}`);
      console.log(`- Hours: ${result.duration.detailed.hours}`);
      console.log(`- Minutes: ${result.duration.detailed.minutes}`);
      console.log(`- Seconds: ${result.duration.detailed.seconds}`);
      console.log(`- Total Hours: ${result.duration.detailed.totalHours.toFixed(2)}`);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}
