// -------- URL helpers --------
function getPlaylistIdFromUrl(url) {
  try {
    const u = new URL(url);
    return u.searchParams.get('list');
  } catch (_) {
    return null;
  }
}

// -------- Formatting helpers --------
function secondsToHhmmss(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes.toString().padStart(2, '0'), seconds.toString().padStart(2, '0')].join(':');
}

function secondsToHuman(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (parts.length === 0) return '0m';
  return parts.join(' ');
}

// Adjust seconds by playback speed (higher speed => fewer seconds)
function secondsAtSpeed(totalSeconds, speed) {
  const s = Math.max(0.25, Math.min(4, parseFloat(speed) || 1));
  return Math.max(0, Math.round(totalSeconds / s));
}

// -------- State --------
const state = {
  totalSeconds: null,
  details: null,
  insights: null,
  speed: 1.5,
  title: '',
  count: 0
};

// -------- Rendering --------
function renderAll() {
  const resultEl = document.getElementById('result');
  if (!state.totalSeconds) {
    resultEl.hidden = true;
    return;
  }
  const titleEl = document.getElementById('title');
  const countEl = document.getElementById('count');
  const primaryEl = document.getElementById('primaryDuration');
  const secondaryEl = document.getElementById('secondaryDuration');
  const detailsEl = document.getElementById('details');
  const techSeconds = document.getElementById('techSeconds');
  const avgEl = document.getElementById('avg');
  const longEl = document.getElementById('longest');
  const shortEl = document.getElementById('shortest');
  const compareBody = document.getElementById('compareBody');
  const plannerMetric = document.getElementById('plannerMetric');
  const plannerDays = document.getElementById('plannerDays');
  const hoursPerDayInput = document.getElementById('hoursPerDay');
  const barLabel = document.getElementById('barLabel');

  // Titles and counts
  titleEl.textContent = state.title;
  countEl.textContent = state.count;

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
  const hoursPerDay = parseFloat(hoursPerDayInput.value);
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
}

// -------- Calculation and fetch --------
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
  finally {
    if (calcBtn) {
      calcBtn.disabled = false;
    }
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
  document.getElementById('calcBtn').addEventListener('click', calculate);

  // Default active speed button is 1.5x per HTML
  document.getElementById('speedButtons').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-speed]');
    if (!btn) return;
    setActiveSpeed(parseFloat(btn.dataset.speed));
  });

  document.getElementById('customSpeed').addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) {
      setActiveSpeed(v);
    }
  });

  document.getElementById('hoursPerDay').addEventListener('input', () => {
    if (state.totalSeconds) renderAll();
  });
});
