document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
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

  // State
  let currentSpeed = 1.5;
  let playlistData = null;
  let playlistId = '';

  // Speed controls
  const speedButtons = document.querySelectorAll('#speedButtons button');
  const customSpeedInput = document.getElementById('customSpeed');
  const speedPresets = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

  // Initialize
  init();

  function init() {
    // Set default speed
    updateSpeed(1.5);
    
    // Event Listeners
    calcBtn.addEventListener('click', calculatePlaylistTime);
    demoBtn.addEventListener('click', loadDemoPlaylist);
    customSpeedInput.addEventListener('change', handleCustomSpeedChange);
    
    speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        updateSpeed(speed);
      });
    });
    
    playlistUrlInput.addEventListener('input', handlePlaylistUrlChange);
    toggleDetailsBtn.addEventListener('click', toggleDetails);
    hpdi.addEventListener('input', updateCompletionEstimateFromState);
    
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const playlistIdParam = urlParams.get('list');
    if (playlistIdParam) {
      playlistUrlInput.value = `https://www.youtube.com/playlist?list=${playlistIdParam}`;
      extractPlaylistId();
    }
  }
  // Comparison and planning elements
  const compareBody = document.getElementById('compareBody');
  const plannerMetric = document.getElementById('plannerMetric');
  const plannerDays = document.getElementById('plannerDays');
  const barLabel = document.getElementById('barLabel');

  // Titles and counts
  const titleEl = document.getElementById('title');
  const countEl = document.getElementById('count');
  const primaryEl = document.getElementById('primaryDuration');
  const secondaryEl = document.getElementById('secondaryDuration');
  
  // State for playlist data
  const state = {
    totalSeconds: 0,
    count: 0,
    title: '',
    speed: 1.5
  };

  // Primary and secondary durations
  const total = state.totalSeconds;
  const adjusted = secondsAtSpeed(total, state.speed);
  primaryEl.textContent = secondsToHuman(total);
  secondaryEl.textContent = `${secondsToHuman(adjusted)} at ${state.speed}x`;

  // Visual bars: 1x is baseline 100%. Selected speed width scales by 1/speed
  const oneXWidth = 100; // baseline
  const selectedWidth = Math.max(6, Math.min(100, Math.round(100 / state.speed)));
  const bar1x = document.querySelector('.bar-1x');
  const barSel = document.querySelector('.bar-selected');
  bar1x.style.width = oneXWidth + '%';
  barSel.style.width = selectedWidth + '%';
  barLabel.textContent = `${state.speed}x`;

  // Insights
  if (state.insights) {
    const { averageSeconds = 0, longestSeconds = 0, shortestSeconds = 0 } = state.insights;
    avgEl.textContent = secondsToHuman(averageSeconds);
    longEl.textContent = secondsToHuman(longestSeconds);
    shortEl.textContent = secondsToHuman(shortestSeconds);
  } else {
    avgEl.textContent = secondsToHuman(0);
    longEl.textContent = secondsToHuman(0);
    shortEl.textContent = secondsToHuman(0);
  }

  // Comparison table
  const speeds = [1, 1.25, 1.5, 2];
  compareBody.innerHTML = '';
  for (const s of speeds) {
    const secs = secondsAtSpeed(total, s);
    const tr = document.createElement('tr');
    const tdS = document.createElement('td');
    const tdV = document.createElement('td');
    tdS.textContent = `${s}x`;
    tdV.textContent = secondsToHuman(secs);
    tr.appendChild(tdS);
    tr.appendChild(tdV);
    compareBody.appendChild(tr);
  }

  // Technical details
  const d = state.details || {};
  detailsEl.textContent = `Days: ${d.days ?? '-'}, Hours: ${d.hours ?? '-'}, Minutes: ${d.minutes ?? '-'}, Seconds: ${d.seconds ?? '-'}, Total Hours: ${d.totalHours ? d.totalHours.toFixed(2) : '-'}`;
  techSeconds.textContent = `Total seconds: ${total} • HH:MM:SS: ${secondsToHhmmss(total)}`;

  // Study planner
  const hoursPerDay = parseFloat(hpdi.value);
  const hint = document.getElementById('hoursHint');
  if (!isNaN(hoursPerDay) && hoursPerDay > 0) {
    const secondsPerDay = hoursPerDay * 3600;
    const days = Math.ceil(adjusted / secondsPerDay);
    plannerMetric.hidden = false;
    plannerDays.textContent = `${days} day${days === 1 ? '' : 's'}`;
    if (hint) hint.hidden = true;
  } else {
    plannerMetric.hidden = true;
    if (hint) hint.hidden = false;
  }

  document.getElementById('result').hidden = false;
});

   async function calculate() {
    const urlInput = document.getElementById('playlistUrl');
    const statusEl = document.getElementById('status');
    const resultEl = document.getElementById('result');
    const calcBtn = document.getElementById('calcBtn');

    const url = urlInput.value.trim();
    const playlistId = getPlaylistIdFromUrl(url);

    if (!playlistId) {
      statusEl.hidden = false;
      statusEl.className = 'status error';
      statusEl.textContent = 'Please enter a valid YouTube playlist URL (must contain list=...)';
      resultEl.hidden = true;
      return;
    }

    statusEl.hidden = false;
    statusEl.className = 'status info';
    statusEl.textContent = 'Calculating...';
    resultEl.hidden = true;
    if (calcBtn) {
      calcBtn.disabled = true;
    }

    try {
      const resp = await fetch(`/api/playlist-time?playlistId=${encodeURIComponent(playlistId)}&speed=${encodeURIComponent(state.speed)}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Unknown error');

      state.title = data.playlistTitle;
      state.count = data.videoCount;
      state.totalSeconds = data.totalSeconds;
      state.details = data.details;
      state.insights = data.insights || null;

      statusEl.hidden = true;
      renderAll();
    } catch (err) {
      statusEl.hidden = false;
      statusEl.className = 'status error';
      statusEl.textContent = err.message || 'Failed to calculate playlist time.';
      resultEl.hidden = true;
  }
}

// -------- Speed controls --------
function setActiveSpeed(speed) {
  state.speed = Math.max(0.25, Math.min(4, parseFloat(speed) || 1));
  const btns = document.querySelectorAll('#speedButtons button');
  btns.forEach(b => b.classList.toggle('active', parseFloat(b.dataset.speed) === state.speed));
  const statusEl = document.getElementById('status');
  if (state.totalSeconds) {
    // Re-render without refetch
    statusEl.hidden = true;
    renderAll();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Initialize the application
  init();

  // Set up speed control event listeners
  const speedButtons = document.getElementById('speedButtons');
  const customSpeedInput = document.getElementById('customSpeed');
  const hoursPerDayInput = document.getElementById('hoursPerDay');

  if (speedButtons) {
    speedButtons.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-speed]');
      if (!btn) return;
      setActiveSpeed(parseFloat(btn.dataset.speed));
    });
  }

  if (customSpeedInput) {
    customSpeedInput.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) {
        setActiveSpeed(v);
      }
    });
  }

  if (hoursPerDayInput) {
    hoursPerDayInput.addEventListener('input', () => {
      if (state.totalSeconds) renderAll();
    });
  }
});
