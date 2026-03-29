/* ============================================================
   PAGES/SYMPHONY.JS — Pi Symphony (Web Audio API)
   ============================================================ */

let symphonyAudioCtx = null;
let symphonyPlaying = false;
let symphonyInterval = null;
let currentDigitIndex = 0;
let symphonyTempo = 120;
let symphonyOctave = 0;
let analyser = null;
let waveformRAF = null;

const NOTE_FREQUENCIES = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  349.23, // F4
  392.00, // G4
  440.00, // A4
  493.88, // B4
  523.25, // C5
  587.33, // D5
  659.25, // E5
];

function renderSymphony() {
  const section = document.getElementById('page-symphony');
  section.innerHTML = `
  <div class="content-wrap">

    <div class="page-header">
      <span class="pill pill-orange">Music</span>
      <h1 class="page-title">Pi Symphony</h1>
      <p class="page-subtitle">Each digit of π becomes a musical note. Listen as π sings its infinite, non-repeating melody.</p>
      <div class="divider-line"><span></span><span></span></div>
    </div>

    <div class="symphony-panel">
      <div class="symphony-header">
        <div class="symphony-title">
          <i class="fa-solid fa-music"></i>
          Pi Symphony
          <span class="pill pill-orange" style="font-size:11px;margin:0;">Music</span>
        </div>
      </div>

      <!-- Fixed-height controls row: nothing inside can reflow -->
      <div style="display:flex;gap:24px;align-items:center;min-height:130px;">

        <!-- Col 1: Play button — fixed width, no shrink -->
        <div style="flex:0 0 72px;display:flex;flex-direction:column;align-items:center;gap:8px;">
          <button class="play-btn" id="symphony-play-btn">
            <i class="fa-solid fa-play" id="play-icon"></i>
          </button>
          <div style="color:rgba(255,255,255,0.55);font-size:11px;text-align:center;white-space:nowrap;line-height:1.4;">
            Digit: <span id="current-digit-label" style="color:var(--orange);font-weight:700;">3</span><br>
            <span id="current-note-label" style="color:rgba(255,255,255,0.3);">#0</span>
          </div>
        </div>

        <!-- Col 2: Sliders — fixed width, no shrink -->
        <div style="flex:0 0 220px;">
          <div class="symphony-label">Tempo: <span id="tempo-label">120</span> BPM</div>
          <input type="range" id="tempo-slider" min="40" max="200" value="120" style="margin-bottom:4px;" />
          <div class="range-markers" style="color:rgba(255,255,255,0.35);">
            <span>40</span><span>120</span><span>200</span>
          </div>
          <div class="symphony-label" style="margin-top:12px;">Octave Shift: <span id="octave-label" style="color:var(--orange);">0</span></div>
          <div class="octave-control">
            <button class="octave-btn" id="octave-down">−</button>
            <div class="octave-num" id="octave-val">0</div>
            <button class="octave-btn" id="octave-up">+</button>
          </div>
        </div>

        <!-- Col 3: Waveform — position:relative container, canvas is position:absolute = zero reflow impact -->
        <div style="flex:1;position:relative;height:110px;border-radius:8px;overflow:hidden;background:#070B24;min-width:0;">
          <canvas id="waveform-canvas" style="position:absolute;top:0;left:0;width:100%;height:100%;"></canvas>
          <div class="waveform-label" style="position:absolute;top:8px;right:10px;pointer-events:none;">Waveform Visualization</div>
        </div>
      </div>

      <!-- Status Bar -->
      <div class="symphony-status" style="border-top:1px solid rgba(255,255,255,0.07);margin-top:16px;padding-top:14px;">
        <div class="status-box">
          <div class="status-value" id="digit-seq-display">314159</div>
          <div class="status-label">Digit sequence</div>
        </div>
        <div class="status-box">
          <div class="status-value" id="bpm-display">120 BPM</div>
          <div class="status-label">Current tempo</div>
        </div>
      </div>
    </div>

    <!-- How it works -->
    <div class="two-col" style="margin-bottom:0;">
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-circle-info"></i> How It Works</div>
        <div class="card-text">
          Each digit of π (0–9) is mapped to a note in the <strong>C major scale</strong> (C4 through E5). 
          The digits play in sequence at the set tempo. Octave shift moves all notes up or down by one octave. 
          The waveform visualizes the audio output in real-time using the Web Audio API's AnalyserNode.
        </div>
      </div>
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-music"></i> Note Mapping</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:4px;">
          ${['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5'].map((n,i) => `
            <div style="background:var(--orange-light);border-radius:6px;padding:6px;text-align:center;">
              <div style="font-size:16px;font-weight:800;color:var(--orange);">${i}</div>
              <div style="font-size:10px;color:var(--text-mid);margin-top:2px;">${n}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

  </div>
  ${getFooterHTML()}`;

  initSymphony();
}

function initSymphony() {
  const playBtn = document.getElementById('symphony-play-btn');
  const tempoSlider = document.getElementById('tempo-slider');
  const octaveDown = document.getElementById('octave-down');
  const octaveUp = document.getElementById('octave-up');

  if (!playBtn) return;

  playBtn.addEventListener('click', toggleSymphony);
  tempoSlider.addEventListener('input', function() {
    symphonyTempo = parseInt(this.value);
    document.getElementById('tempo-label').textContent = symphonyTempo;
    document.getElementById('bpm-display').textContent = symphonyTempo + ' BPM';
    if (symphonyPlaying) {
      clearInterval(symphonyInterval);
      startSymphonyLoop();
    }
  });

  octaveDown.addEventListener('click', () => adjustOctave(-1));
  octaveUp.addEventListener('click', () => adjustOctave(1));

  // Canvas: set buffer size to match the fixed-height container pixels
  const wc = document.getElementById('waveform-canvas');
  if (wc) {
    const container = wc.parentElement;
    wc.width = container.offsetWidth || 400;
    wc.height = container.offsetHeight || 110;
  }
}

function adjustOctave(delta) {
  symphonyOctave = Math.max(-2, Math.min(2, symphonyOctave + delta));
  document.getElementById('octave-val').textContent = symphonyOctave;
  document.getElementById('octave-label').textContent = symphonyOctave;
}

function toggleSymphony() {
  if (symphonyPlaying) {
    stopSymphony();
  } else {
    startSymphony();
  }
}

function startSymphony() {
  if (!symphonyAudioCtx) {
    symphonyAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = symphonyAudioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.connect(symphonyAudioCtx.destination);
  }

  symphonyPlaying = true;
  document.getElementById('play-icon').className = 'fa-solid fa-pause';
  startSymphonyLoop();
  drawWaveform();
}

function stopSymphony() {
  symphonyPlaying = false;
  clearInterval(symphonyInterval);
  cancelAnimationFrame(waveformRAF);
  document.getElementById('play-icon').className = 'fa-solid fa-play';
  // Clear waveform
  const wc = document.getElementById('waveform-canvas');
  if (wc) {
    const ctx = wc.getContext('2d');
    ctx.clearRect(0, 0, wc.width, wc.height);
  }
}

function startSymphonyLoop() {
  const msPerBeat = (60 / symphonyTempo) * 600;
  symphonyInterval = setInterval(() => {
    if (!symphonyPlaying) return;
    const digit = parseInt(PI_DIGITS[currentDigitIndex]);
    playNote(digit);
    updateSymphonyUI(digit, currentDigitIndex);
    currentDigitIndex = (currentDigitIndex + 1) % 100;
  }, msPerBeat);
}

function playNote(digit) {
  if (!symphonyAudioCtx || !analyser) return;
  const osc = symphonyAudioCtx.createOscillator();
  const gain = symphonyAudioCtx.createGain();
  const octaveMultiplier = Math.pow(2, symphonyOctave);
  osc.frequency.value = NOTE_FREQUENCIES[digit] * octaveMultiplier;
  osc.type = 'sine';
  osc.connect(gain);
  gain.connect(analyser);
  gain.gain.setValueAtTime(0, symphonyAudioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, symphonyAudioCtx.currentTime + 0.02);
  gain.gain.linearRampToValueAtTime(0, symphonyAudioCtx.currentTime + 0.35);
  osc.start(symphonyAudioCtx.currentTime);
  osc.stop(symphonyAudioCtx.currentTime + 0.38);
}

function updateSymphonyUI(digit, idx) {
  const dl = document.getElementById('current-digit-label');
  const nl = document.getElementById('current-note-label');
  const ds = document.getElementById('digit-seq-display');
  if (dl) dl.textContent = digit;
  if (nl) nl.textContent = ` #${idx}`;
  if (ds) ds.textContent = PI_DIGITS.slice(idx, idx + 6);
}

function drawWaveform() {
  if (!symphonyPlaying || !analyser) return;
  const wc = document.getElementById('waveform-canvas');
  if (!wc) return;
  const ctx = wc.getContext('2d');
  const W = wc.width, H = wc.height;
  const bufLen = analyser.frequencyBinCount;
  const data = new Uint8Array(bufLen);
  analyser.getByteTimeDomainData(data);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(7,11,36,0)';
  ctx.fillRect(0, 0, W, H);

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#EC6F00';
  ctx.beginPath();
  const sliceW = W / bufLen;
  let x = 0;
  for (let i = 0; i < bufLen; i++) {
    const v = data[i] / 128.0;
    const y = (v * H) / 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceW;
  }
  ctx.stroke();
  waveformRAF = requestAnimationFrame(drawWaveform);
}
