/* ================= CONFIG ================= */
const TEXT = 'Gaurav Gaikwad';
const DURATION = 6.0;

const NOISE_SCALE = 900.0;
const FRONT_WIDTH = 0.22;
const LOCAL_FULL_THRESHOLD = 0.98;
const FINISH_THRESHOLD = 0.995;

/* ================= THREE ================= */
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
document.body.appendChild(renderer.domElement);

/* ================= TEXT CANVAS ================= */
const textCanvas = document.createElement('canvas');
const ctx = textCanvas.getContext('2d');
let textTexture;
let lastDPR = window.devicePixelRatio || 1;

/* ================= DRAW TEXT ================= */
function drawText() {
  const dpr = window.devicePixelRatio || 1;
  const w = innerWidth;
  const h = innerHeight;

  textCanvas.width = Math.max(1, Math.floor(w * dpr));
  textCanvas.height = Math.max(1, Math.floor(h * dpr));

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);

  ctx.fillStyle = '#000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.imageSmoothingEnabled = true;

  const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const fontSize = Math.min(Math.max(w * 0.07, 3 * root), 5 * root);

  ctx.font = `600 ${fontSize * dpr}px system-ui, -apple-system, BlinkMacSystemFont,
              "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

  const spacing = -0.05 * fontSize * dpr;
  const chars = [...TEXT];
  const widths = chars.map(c => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);

  let x = (textCanvas.width - total) / 2;
  const y = textCanvas.height / 2;

  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + spacing;
  });
}

/* ================= TEXTURE ================= */
function ensureTexture(recreate = false) {
  if (!textTexture || recreate) {
    if (textTexture) textTexture.dispose();
    textTexture = new THREE.CanvasTexture(textCanvas);
    textTexture.generateMipmaps = false;
    textTexture.minFilter = THREE.LinearFilter;
    textTexture.magFilter = THREE.LinearFilter;
    material.uniforms.u_texture.value = textTexture;
  } else {
    textTexture.needsUpdate = true;
  }
}

/* ================= SHADER ================= */
const material = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: {
    u_texture: { value: null },
    u_progress: { value: 0 },
    u_noiseScale: { value: NOISE_SCALE },
    u_frontWidth: { value: FRONT_WIDTH },
    u_localFull: { value: LOCAL_FULL_THRESHOLD },
    u_finish: { value: FINISH_THRESHOLD }
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position,1.0); }
  `,
  fragmentShader: `
    precision highp float;
    varying vec2 vUv;

    uniform sampler2D u_texture;
    uniform float u_progress;
    uniform float u_noiseScale;
    uniform float u_frontWidth;
    uniform float u_localFull;
    uniform float u_finish;

    float hash(vec2 p){
      return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);
    }
    float noise(vec2 p){
      return fract(hash(p) * 0.61803398875);
    }

    void main(){
      vec4 t = texture2D(u_texture, vUv);
      if (t.a < 0.01) discard;

      if (vUv.x > u_progress) discard;

      if (u_progress >= u_finish) {
        gl_FragColor = vec4(0.0,0.0,0.0,1.0);
        return;
      }

      float n = noise(vUv * u_noiseScale);
      float local = clamp((u_progress - vUv.x) / u_frontWidth, 0.0, 1.0);

      if (local >= u_localFull) {
        gl_FragColor = vec4(0.0,0.0,0.0,1.0);
        return;
      }

      if (n > local) discard;

      gl_FragColor = vec4(0.0,0.0,0.0,1.0);
    }
  `
});

scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

/* ================= RESIZE ================= */
const resizeObs = new ResizeObserver(syncLayout);
function syncLayout() {
  const dpr = window.devicePixelRatio || 1;
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight, true);
  drawText();
  ensureTexture(dpr !== lastDPR);
  lastDPR = dpr;
}
resizeObs.observe(document.documentElement);

/* ================= ANIMATION ================= */
let start = null;
const easeOut = t => 1 - Math.pow(1 - t, 3);

let animateId = null;
let threeStopped = false;

function stopThree() {
  if (threeStopped) return;
  threeStopped = true;

  // Lock final state
  material.uniforms.u_progress.value = 1.0;

  // Render ONE final frame and keep it
  renderer.render(scene, camera);

  // Stop resize observer (no more layout work)
  try { resizeObs.disconnect(); } catch (e) {}

  // Dispose GPU-heavy resources (safe)
  try {
    if (textTexture) {
      textTexture.dispose();
      textTexture = null;
    }
  } catch (e) {}

  // ❗ DO NOT dispose renderer
  // ❗ DO NOT remove canvas
  // Canvas will retain last rendered frame

  // Freeze canvas (no more GPU work)
  renderer.setAnimationLoop(null);

  // Optional: mark canvas as static
  renderer.domElement.style.willChange = 'auto';

  // Notify others if needed
  document.dispatchEvent(new CustomEvent('three:stopped'));
}

function animate(ts) {
  if (threeStopped) return;

  if (!start) start = ts;

  const progress = easeOut(
    Math.min(1, (ts - start) / 1000 / DURATION)
  );

  material.uniforms.u_progress.value = progress;
  renderer.render(scene, camera);

  if (progress >= FINISH_THRESHOLD) {
    stopThree(); // final render happens inside
    return;
  }

  animateId = requestAnimationFrame(animate);
}


/* ================= START ================= */
syncLayout();
animateId = requestAnimationFrame(animate);

/* Optional: if other scripts want to know when three finished, they can listen for 'three:stopped' */
