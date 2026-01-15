console.log('script.js loaded');
const state = {
  totalSeconds: 0,
  count: 0,
  title: '',
  speed: 1.5,
  insights: null,
  details: null
};

document.addEventListener('DOMContentLoaded', function() {
  const playlistUrlInput = document.getElementById('playlistUrl');
  const calcBtn = document.getElementById('calcBtn');
  const demoBtn = document.getElementById('demoBtn');
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');
  const loadingEl = document.getElementById('loading');
  const playlistPreview = document.getElementById('playlistPreview');
  const playlistThumbnail = document.getElementById('playlistThumbnail');
  const playlistTitle = document.getElementById('playlistTitle');
  const playlistChannel = document.getElementById('playlistChannel');
  const videoCountEl = document.getElementById('videoCount');
  const playlistDurationEl = document.getElementById('playlistDuration');
  const primaryDurationEl = document.getElementById('primaryDuration');
  const secondaryDurationEl = document.getElementById('secondaryDuration');
  const currentSpeedEl = document.getElementById('currentSpeed');
  const timeSavedEl = document.getElementById('timeSaved');
  const barFillEl = document.querySelector('.bar-fill');
  const barLabelEl = document.getElementById('barLabel');
  const videoCountResultEl = document.getElementById('videoCountResult');
  const avgEl = document.getElementById('avg');
  const longestEl = document.getElementById('longest');
  const completionEstimate = document.getElementById('completionEstimate');
  const daysToCompleteEl = document.getElementById('daysToComplete');
  const completionDateEl = document.getElementById('completionDate');
  const hoursPerWeekEl = document.getElementById('hoursPerWeek');
  const comparisonTable = document.getElementById('comparisonTable');
  const toggleDetailsBtn = document.getElementById('toggleDetails');
  const detailsContent = document.getElementById('detailsContent');
  const playlistIdDisplay = document.getElementById('playlistIdDisplay');
  const apiResponseTimeEl = document.getElementById('apiResponseTime');
  const lastUpdatedEl = document.getElementById('lastUpdated');
  const hpdi = document.getElementById('hoursPerDay');

  let playlistData = null;

  const speedButtons = document.querySelectorAll('#speedButtons button');
  const speedPresets = [1, 1.25, 1.5, 1.75, 2];

  init();

  function init() {
    setActiveSpeed(1.5);
    
    // Event Listeners
    calcBtn.addEventListener('click', calculate);
    speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        setActiveSpeed(speed);
      });
    });
    
    if (toggleDetailsBtn) {
      toggleDetailsBtn.addEventListener('click', toggleDetails);
    }
    if (hpdi) {
      hpdi.addEventListener('input', updateCompletionEstimateFromState);
    }
  }
});

/**
 * Extracts playlist ID from a YouTube URL
 * @param {string} url - YouTube playlist URL
 * @returns {string|null} - Playlist ID or null if not found
 */
function getPlaylistIdFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('list');
  } catch (e) {
    return null;
  }
}

/**
 * Formats seconds into a human-readable format
 * @param {number} totalSeconds - Total seconds
 * @returns {string} Formatted time string (e.g., "2h 30m")
 */
function formatDuration(totalSeconds) {
  if (!totalSeconds) return '0s';
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && hours === 0) parts.push(`${seconds}s`);
  
  return parts.join(' ') || '0s';
}

/**
 * Calculates and displays the total duration of the playlist
 */
async function calculate() {
  console.log('calculate() called');
  const urlInput = document.getElementById('playlistUrl');
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');
  const calcBtn = document.getElementById('calcBtn');
  const loadingEl = document.getElementById('loading');

  const url = urlInput.value.trim();
  const playlistId = getPlaylistIdFromUrl(url);

  if (!playlistId) {
    statusEl.hidden = false;
    statusEl.className = 'status error';
    statusEl.textContent = 'Please enter a valid YouTube playlist URL (must contain list=...)';
    resultEl.hidden = true;
    return;
  }

  // Show loading state and hide results
  statusEl.hidden = false;
  statusEl.className = 'status info';
  statusEl.textContent = 'Fetching playlist data...';
  resultEl.style.display = 'none';
  resultEl.style.opacity = '0';
  resultEl.style.pointerEvents = 'none';
  loadingEl.hidden = false;
  if (calcBtn) {
    calcBtn.disabled = true;
  }

  try {
    // Call the backend API to get playlist duration
    const response = await fetch(`/api/playlist-time?playlistId=${encodeURIComponent(playlistId)}&speed=${state.speed || 1.0}`);
    console.log('response status', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('error response JSON', errorData);
      throw new Error(errorData.error || 'Failed to fetch playlist data');
    }

    const data = await response.json();
    console.log('playlist API data', data);
    
    // Update the UI with the playlist data
    updatePlaylistUI(data);
    
  } catch (err) {
    console.error('Error calculating playlist duration:', err);
    statusEl.hidden = false;
    statusEl.className = 'status error';
    statusEl.textContent = err.message || 'Failed to calculate playlist time. Please try again.';
    resultEl.hidden = true;
  } finally {
    loadingEl.hidden = true;
    if (calcBtn) {
      calcBtn.disabled = false;
    }
  }
}

/**
 * Updates the UI with the playlist data
 * @param {Object} data - Playlist data from the API
 */
function updatePlaylistUI(data) {
  console.log('updatePlaylistUI called with', data);
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');
  // In HTML the main title element has id="title"; use that, and fall back to playlistTitle if present
  const playlistTitleEl = document.getElementById('title') || document.getElementById('playlistTitle');
  const videoCountEl = document.getElementById('videoCountResult');
  const durationEl = document.getElementById('primaryDuration');
  const adjustedDurationEl = document.getElementById('secondaryDuration');
  const timeSavedEl = document.getElementById('timeSaved');
  const avgEl = document.getElementById('avg');
  const longestEl = document.getElementById('longest');
  
  // Update state
  state.totalSeconds = data.totalSeconds || 0;
  state.count = data.videoCount || 0;
  state.title = data.playlistTitle || 'Untitled Playlist';
  state.insights = data.insights || null;
  state.details = data.details || null;
  
  // Update basic info
  if (playlistTitleEl) {
    playlistTitleEl.textContent = state.title;
  }
  if (videoCountEl) {
    videoCountEl.textContent = `${state.count} videos`;
  }
  
  // Calculate durations
  const totalSeconds = state.totalSeconds;
  const adjustedSeconds = data.adjustedSeconds || Math.round(totalSeconds / state.speed);
  
  // Calculate time spent (actual time user will spend watching)
  const timeSpentSeconds = adjustedSeconds;
  const timeSpentEl = document.getElementById('timeSpent');
  if (timeSpentEl) {
    timeSpentEl.textContent = formatDuration(timeSpentSeconds);
  }
  
  // Update UI
  if (durationEl) {
    durationEl.textContent = data.totalDuration || formatDuration(totalSeconds);
  }
  
  // Update speed and adjusted time display
  const currentSpeedEl = document.getElementById('currentSpeed');
  const adjustedTimeEl = document.getElementById('adjustedTime');
  
  if (currentSpeedEl) {
    currentSpeedEl.textContent = `${state.speed}x`;
  }
  
  if (adjustedTimeEl) {
    adjustedTimeEl.textContent = data.adjustedDuration || formatDuration(adjustedSeconds);
  }
  
  // Calculate time saved
  if (timeSavedEl) {
    if ((data.playbackSpeed || state.speed) > 1) {
      const timeSaved = totalSeconds - adjustedSeconds;
      timeSavedEl.textContent = `(Save ${formatDuration(timeSaved)})`;
      timeSavedEl.style.display = 'inline';
    } else {
      timeSavedEl.style.display = 'none';
    }
  }
  
  // Update insights if available
  if (state.insights) {
    if (avgEl) {
      avgEl.textContent = formatDuration(state.insights.averageSeconds || 0);
    }
    if (longestEl) {
      longestEl.textContent = formatDuration(state.insights.longestSeconds || 0);
    }
  }
  
  // Update visual elements
  const bar1x = document.querySelector('.bar-1x');
  const barSel = document.querySelector('.bar-selected');
  const barLabel = document.getElementById('barLabel');
  
  if (bar1x && barSel && barLabel) {
    const oneXWidth = 100;
    const selectedWidth = Math.max(6, Math.min(100, Math.round(100 / (data.playbackSpeed || state.speed))));
    bar1x.style.width = oneXWidth + '%';
    barSel.style.width = selectedWidth + '%';
    barLabel.textContent = `${data.playbackSpeed || state.speed}x`;
  }
  
  // Hide status and show results with smooth transition
  if (statusEl) {
    statusEl.hidden = true;
    statusEl.textContent = ''; // Clear any status text
  }
  // Show result with smooth transition
  resultEl.style.display = 'block';
  resultEl.style.opacity = '1';
  resultEl.style.pointerEvents = 'auto';
  resultEl.style.transition = 'opacity 0.3s ease-in-out';
  
  // Update completion estimate
  updateCompletionEstimateFromState();
}

/**
 * Updates the completion estimate based on the current state
 */
function updateCompletionEstimateFromState() {
  const hoursPerDayInput = document.getElementById('hoursPerDay');
  const plannerMetric = document.getElementById('plannerMetric');
  const plannerDays = document.getElementById('plannerDays');
  const hint = document.getElementById('hoursHint');
  
  if (hoursPerDayInput && plannerMetric && plannerDays) {
    const hoursPerDay = parseFloat(hoursPerDayInput.value);
    if (!isNaN(hoursPerDay) && hoursPerDay > 0 && state.totalSeconds > 0) {
      const secondsPerDay = hoursPerDay * 3600;
      const adjustedSeconds = Math.round(state.totalSeconds / state.speed);
      const days = Math.ceil(adjustedSeconds / secondsPerDay);
      
      plannerMetric.hidden = false;
      plannerDays.textContent = `${days} day${days === 1 ? '' : 's'}`;
      if (hint) hint.hidden = true;
      
      // Set completion date
      const completionDate = new Date();
      completionDate.setDate(completionDate.getDate() + days);
      const completionDateEl = document.getElementById('completionDate');
      if (completionDateEl) {
        completionDateEl.textContent = completionDate.toLocaleDateString();
      }
    } else {
      plannerMetric.hidden = true;
      if (hint) hint.hidden = false;
    }
  }
}

/**
 * Sets the playback speed and updates the UI
 * @param {number} speed - The playback speed (e.g., 1.5 for 1.5x)
 */
function setActiveSpeed(speed) {
  // Update the state with the new speed
  state.speed = Math.max(0.25, Math.min(4, parseFloat(speed) || 1));
  
  // Update active state of speed buttons
  const btns = document.querySelectorAll('#speedButtons button');
  btns.forEach(btn => {
    const btnSpeed = parseFloat(btn.dataset.speed);
    btn.classList.toggle('active', Math.abs(btnSpeed - state.speed) < 0.01);
  });
  
  // If we have data, update the UI with the new speed
  if (state.totalSeconds > 0) {
    // Recalculate the adjusted time with the new speed
    const adjustedSeconds = Math.round(state.totalSeconds / state.speed);
    
    // Update the current speed display
    const currentSpeedEl = document.getElementById('currentSpeed');
    if (currentSpeedEl) {
      currentSpeedEl.textContent = `${state.speed}x`;
    }
    
    // Update the adjusted time display
    const adjustedTimeEl = document.getElementById('adjustedTime');
    if (adjustedTimeEl) {
      adjustedTimeEl.textContent = formatDuration(adjustedSeconds);
    }
    
    // Update the time spent display
    const timeSpentEl = document.getElementById('timeSpent');
    if (timeSpentEl) {
      timeSpentEl.textContent = formatDuration(adjustedSeconds);
    }
    
    // Update completion estimate
    updateCompletionEstimateFromState();
  }
}

/**
 * Renders all UI components based on current state
 */
function renderAll() {
  const primaryEl = document.getElementById('primaryDuration');
  const currentSpeedEl = document.getElementById('currentSpeed');
  const adjustedTimeEl = document.getElementById('adjustedTime');
  const timeSpentEl = document.getElementById('timeSpent');
  const hoursPerDayInput = document.getElementById('hoursPerDay');
  const plannerMetric = document.getElementById('plannerMetric');
  const plannerDays = document.getElementById('plannerDays');
  const hint = document.getElementById('hoursHint');
  
  // Update durations
  const total = state.totalSeconds;
  const adjusted = Math.round(total / state.speed);
  
  // Update primary duration (total time)
  if (primaryEl) {
    primaryEl.textContent = formatDuration(total);
  }
  
  // Update speed display
  if (currentSpeedEl) {
    currentSpeedEl.textContent = `${state.speed}x`;
  }
  
  // Update adjusted time display
  if (adjustedTimeEl) {
    adjustedTimeEl.textContent = formatDuration(adjusted);
  }
  
  // Update time spent display
  if (timeSpentEl) {
    timeSpentEl.textContent = formatDuration(adjusted);
  }
  
  // Update completion estimate
  if (hoursPerDayInput && plannerMetric && plannerDays) {
    const hoursPerDay = parseFloat(hoursPerDayInput.value);
    if (!isNaN(hoursPerDay) && hoursPerDay > 0) {
      const secondsPerDay = hoursPerDay * 3600;
      const days = Math.ceil(adjusted / secondsPerDay);
      plannerMetric.hidden = false;
      plannerDays.textContent = `${days} day${days === 1 ? '' : 's'}`;
      if (hint) hint.hidden = true;
      
      // Set completion date
      const completionDate = new Date();
      completionDate.setDate(completionDate.getDate() + days);
      const completionDateEl = document.getElementById('completionDate');
      if (completionDateEl) {
        completionDateEl.textContent = completionDate.toLocaleDateString();
      }
    } else {
      plannerMetric.hidden = true;
      if (hint) hint.hidden = false;
    }
  }
  
  // No need to update insights UI as it's been removed
}
