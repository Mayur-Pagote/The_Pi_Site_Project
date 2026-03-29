/* ============================================================
   PAGES/SIMULATION.JS — Monte Carlo π Simulator
   ============================================================ */

let simRunning = false;
let simInterval = null;
let simCanvas = null;
let simCtx = null;
let totalPoints = 0;
let insidePoints = 0;
let batchSize = 1000;
let convergenceData = [];
let simCanvasSize = 400;

function renderSimulation() {
  const section = document.getElementById('page-simulation');
  section.innerHTML = `
  <div class="content-wrap">

    <div class="page-header">
      <span class="pill pill-orange">Simulation</span>
      <h1 class="page-title">Monte Carlo π Simulator</h1>
      <p class="page-subtitle">Estimate π by randomly placing points in a unit square and checking how many fall inside the quarter circle.</p>
      <div class="divider-line"><span></span><span></span></div>
    </div>

    <div class="two-col" style="align-items:start;grid-template-columns:1.1fr 0.9fr;margin-bottom:24px;">

      <!-- Canvas -->
      <div>
        <div class="simulation-canvas-wrap" id="sim-canvas-wrap">
          <canvas id="simulation-canvas"></canvas>
        </div>
      </div>

      <!-- Controls -->
      <div>
        <div class="card" style="padding:22px;">
          <div class="section-heading" style="margin-bottom:16px;"><i class="fa-solid fa-sliders" style="color:var(--orange);margin-right:8px;"></i>Controls</div>

          <div style="display:flex;gap:12px;margin-bottom:18px;">
            <button class="btn btn-primary" id="sim-start-btn" style="flex:1;">
              <i class="fa-solid fa-play"></i> Start
            </button>
            <button class="btn btn-secondary" id="sim-reset-btn" style="flex:1;">
              <i class="fa-solid fa-rotate"></i> Reset
            </button>
          </div>

          <div class="control-group">
            <label class="control-label">
              Points per batch: <strong style="color:var(--orange);" id="batch-label">1,000</strong>
            </label>
            <input type="range" id="batch-slider" min="100" max="10000" value="1000" step="100" />
            <div class="range-markers"><span>100</span><span>5,000</span><span>10,000</span></div>
          </div>

          <div class="sim-readouts">
            <div class="readout-box readout-light">
              <div class="readout-value" id="total-points-display">0</div>
              <div class="readout-label">Total Points</div>
            </div>
            <div class="readout-box readout-dark">
              <div class="readout-value" id="est-pi-display">—</div>
              <div class="readout-label" style="color:rgba(255,255,255,0.4);">Est. π</div>
            </div>
          </div>

          <div class="how-it-works">
            <h4>How it works</h4>
            <p>Random points are placed in a unit square. The ratio of points inside the quarter circle (x²+y²≤1) to total points, multiplied by 4, estimates π.</p>
            <div class="formula-box">π ≈ 4 × (inside / total)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Convergence Panel -->
    <div class="convergence-panel">
      <div class="convergence-title"><i class="fa-solid fa-chart-line" style="color:var(--orange);margin-right:8px;"></i>π Estimate Convergence</div>
      <div id="convergence-empty" class="convergence-empty">Start the simulation to see convergence</div>
      <canvas id="convergence-canvas" style="display:none;"></canvas>
    </div>

  </div>
  ${getFooterHTML()}`;

  initSimulation();
}

function initSimulation() {
  simCanvas = document.getElementById('simulation-canvas');
  if (!simCanvas) return;

  const wrap = document.getElementById('sim-canvas-wrap');
  simCanvasSize = wrap ? Math.min(wrap.clientWidth, 460) : 400;
  simCanvas.width = simCanvasSize;
  simCanvas.height = simCanvasSize;
  simCtx = simCanvas.getContext('2d');
  drawSimBase();

  document.getElementById('sim-start-btn')?.addEventListener('click', toggleSimulation);
  document.getElementById('sim-reset-btn')?.addEventListener('click', resetSimulation);
  document.getElementById('batch-slider')?.addEventListener('input', function() {
    batchSize = parseInt(this.value);
    document.getElementById('batch-label').textContent = batchSize.toLocaleString();
  });
}

function drawSimBase() {
  if (!simCtx) return;
  const S = simCanvasSize;
  simCtx.fillStyle = '#070B24';
  simCtx.fillRect(0, 0, S, S);

  // Quarter circle (dashed orange)
  simCtx.beginPath();
  simCtx.arc(0, S, S, -Math.PI / 2, 0);
  simCtx.strokeStyle = '#EC6F00';
  simCtx.lineWidth = 2;
  simCtx.setLineDash([8, 5]);
  simCtx.stroke();
  simCtx.setLineDash([]);
}

function toggleSimulation() {
  if (simRunning) {
    stopSimulation();
  } else {
    startSimulation();
  }
}

function startSimulation() {
  simRunning = true;
  document.getElementById('sim-start-btn').innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
  simInterval = setInterval(runBatch, 60);
}

function stopSimulation() {
  simRunning = false;
  clearInterval(simInterval);
  document.getElementById('sim-start-btn').innerHTML = '<i class="fa-solid fa-play"></i> Start';
}

function resetSimulation() {
  stopSimulation();
  totalPoints = 0;
  insidePoints = 0;
  convergenceData = [];
  document.getElementById('total-points-display').textContent = '0';
  document.getElementById('est-pi-display').textContent = '—';
  document.getElementById('sim-start-btn').innerHTML = '<i class="fa-solid fa-play"></i> Start';
  document.getElementById('convergence-empty').style.display = '';
  const cc = document.getElementById('convergence-canvas');
  if (cc) cc.style.display = 'none';
  if (simCanvas) { simCtx.clearRect(0, 0, simCanvasSize, simCanvasSize); drawSimBase(); }
}

function runBatch() {
  const S = simCanvasSize;
  for (let i = 0; i < batchSize; i++) {
    const x = Math.random();
    const y = Math.random();
    const inside = x * x + y * y <= 1;
    if (inside) insidePoints++;
    totalPoints++;

    // Draw point
    const px = x * S;
    const py = (1 - y) * S;
    simCtx.fillStyle = inside ? 'rgba(236,111,0,0.65)' : 'rgba(100,130,220,0.4)';
    simCtx.fillRect(px, py, 1.5, 1.5);
  }

  const estPi = (4 * insidePoints / totalPoints).toFixed(6);
  document.getElementById('total-points-display').textContent = totalPoints.toLocaleString();
  document.getElementById('est-pi-display').textContent = estPi;

  convergenceData.push(parseFloat(estPi));
  if (convergenceData.length > 200) convergenceData.shift();
  drawConvergence();

  // Cap at 2 million points
  if (totalPoints >= 2000000) stopSimulation();
}

function drawConvergence() {
  const cc = document.getElementById('convergence-canvas');
  const empty = document.getElementById('convergence-empty');
  if (!cc) return;
  cc.style.display = 'block';
  if (empty) empty.style.display = 'none';

  const W = cc.parentElement.clientWidth - 40 || 600;
  const H = 120;
  cc.width = W;
  cc.height = H;
  const ctx = cc.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#F5F7FA';
  ctx.fillRect(0, 0, W, H);

  // True π line
  ctx.strokeStyle = 'rgba(236,111,0,0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  const piY = H - ((Math.PI - 2.5) / (4 - 2.5)) * H;
  ctx.beginPath();
  ctx.moveTo(0, piY);
  ctx.lineTo(W, piY);
  ctx.stroke();
  ctx.setLineDash([]);

  // π label
  ctx.fillStyle = 'rgba(236,111,0,0.5)';
  ctx.font = '10px Inter';
  ctx.fillText('π = 3.14159…', W - 90, piY - 4);

  // Convergence line
  if (convergenceData.length < 2) return;
  ctx.strokeStyle = '#EC6F00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  convergenceData.forEach((v, i) => {
    const x = (i / (convergenceData.length - 1)) * W;
    const y = H - ((v - 2.5) / (4 - 2.5)) * H;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}
