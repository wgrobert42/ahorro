import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createLabel } from './label';
import { createWorld, CR, CT, FLOOR } from './physics';

const CAP = 100, LID_Y = 2.04;
const rr = (a: number, b: number) => a + Math.random() * (b - a);
const ease = (p: number) => p * p * (3 - 2 * p);

interface Coin { body: CANNON.Body; mesh: THREE.Mesh }

export interface Jar {
  setCount(n: number): void;
  setLabel(name: string): void;
  vanishAll(): Promise<void>;
  count(): number;
  settled(): boolean;
  stats(): { out: number; awake: number };
  resize(): void;
}

export function createJar(stage: HTMLElement, onChange: (n: number) => void): Jar {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const PR_MAX = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3);
  let pr = PR_MAX;
  renderer.setPixelRatio(pr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf1f8f4);
  const camera = new THREE.PerspectiveCamera(28, 3 / 4, 0.1, 60);
  camera.position.set(0, 3.1, 7.4);
  camera.lookAt(0, 1.05, 0); // cámara fija: el frasco no gira, así no interfiere con el scroll

  scene.add(new THREE.AmbientLight(0xffffff, 1.7));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(-2.5, 5, 4);
  scene.add(key);

  const toonSteps = new THREE.DataTexture(new Uint8Array([170, 215, 255]), 3, 1, THREE.RedFormat);
  toonSteps.minFilter = toonSteps.magFilter = THREE.NearestFilter;
  toonSteps.needsUpdate = true;
  const toon = (opts: THREE.MeshToonMaterialParameters) => new THREE.MeshToonMaterial({ gradientMap: toonSteps, ...opts });

  /* ---- Monedas ---- */
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d')!;
  const disc = (r: number, col: string) => { g.fillStyle = col; g.beginPath(); g.arc(256, 256, r, 0, Math.PI * 2); g.fill(); };
  disc(256, '#F29A12'); disc(228, '#FFBE1F');
  g.strokeStyle = '#F4AE22'; g.lineWidth = 12; g.beginPath(); g.arc(256, 256, 192, 0, Math.PI * 2); g.stroke();
  disc(178, '#FFCB3A');
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(255,243,176,.95)'; g.lineWidth = 24;
  g.beginPath(); g.arc(256, 256, 146, Math.PI * 1.07, Math.PI * 1.46); g.stroke();
  g.strokeStyle = 'rgba(226,138,18,.55)'; g.lineWidth = 20;
  g.beginPath(); g.arc(256, 256, 146, Math.PI * 0.06, Math.PI * 0.4); g.stroke();
  const face = new THREE.CanvasTexture(c);
  face.colorSpace = THREE.SRGBColorSpace;
  const aniso = renderer.capabilities.getMaxAnisotropy();
  face.anisotropy = aniso;
  const e = document.createElement('canvas'); e.width = 8; e.height = 64;
  const x = e.getContext('2d')!;
  const gr = x.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, '#FFDB63'); gr.addColorStop(0.35, '#F8B52B'); gr.addColorStop(0.72, '#EC9A1B'); gr.addColorStop(1, '#D4820F');
  x.fillStyle = gr; x.fillRect(0, 0, 8, 64);
  const edge = new THREE.CanvasTexture(e);
  edge.colorSpace = THREE.SRGBColorSpace;
  const coinMats = [toon({ map: edge }), toon({ map: face }), toon({ map: face })];
  const coinGeo = new THREE.CylinderGeometry(CR, CR, CT, 96, 1);

  /* ---- Frasco de vidrio ---- */
  const P = (r: number, y: number) => new THREE.Vector2(r, y);
  const profile = [
    P(0, 0), P(0.80, 0), P(0.90, 0.012), P(0.97, 0.05), P(1.0, 0.14), P(1.0, 1.46), P(0.985, 1.56), P(0.93, 1.66), P(0.86, 1.73), P(0.82, 1.78),
    P(0.82, 1.90), P(0.84, 1.93), P(0.85, 2.0), P(0.84, 2.03), P(0.80, 2.04), P(0.77, 2.03), P(0.76, 2.0),
    P(0.76, 1.90), P(0.76, 1.78), P(0.80, 1.72), P(0.87, 1.64), P(0.91, 1.55), P(0.94, 1.46), P(0.94, 0.20), P(0.93, 0.15), P(0.88, 0.13), P(0.80, 0.125), P(0, 0.12),
  ];
  const glassMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float b1 = smoothstep(0.34, 0.37, f); float b2 = smoothstep(0.70, 0.73, f); vec3 base = vec3(0.80, 0.92, 0.98); vec3 mid = vec3(0.58, 0.82, 0.95); vec3 edge = vec3(0.36, 0.67, 0.90); vec3 col = mix(mix(base, mid, b1), edge, b2); float a = 0.07 + 0.15 * b1 + 0.30 * b2; gl_FragColor = vec4(col, a); }',
  });
  const jar = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.LatheGeometry(profile, 192), glassMat);
  shell.renderOrder = 1; jar.add(shell);
  const flat = (color: number, opacity: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
  const hl = flat(0xffffff, 0.8);
  const strip = (a0: number, a1: number, pts: number[][]) => {
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), 10, a0, a1 - a0), hl);
    m.renderOrder = 3; jar.add(m);
  };
  strip(-1.04, -0.88, [[1.006, 0.34], [1.006, 1.42], [0.99, 1.56], [0.936, 1.66]]);
  strip(-0.80, -0.74, [[1.006, 0.55], [1.006, 1.28]]);
  strip(0.84, 0.93, [[1.006, 0.45], [1.006, 1.22]]);
  const baseGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.975, 0.93, 0.13, 128, 1, true), flat(0x6db8e4, 0.55));
  baseGlass.position.y = 0.065; baseGlass.renderOrder = 2; jar.add(baseGlass);
  const floorGlass = new THREE.Mesh(new THREE.CircleGeometry(0.93, 96), flat(0x8ccbee, 0.38));
  floorGlass.rotation.x = -Math.PI / 2; floorGlass.position.y = FLOOR; floorGlass.renderOrder = 0; jar.add(floorGlass);
  [[1.84, 0.832, 0.55], [1.92, 0.842, 0.55], [2.01, 0.815, 0.95]].forEach((t) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(t[1], 0.02, 12, 160), flat(0xeaf6fd, t[2]));
    r.rotation.x = Math.PI / 2; r.position.y = t[0]; r.renderOrder = 3; jar.add(r);
  });
  const label = createLabel(aniso);
  jar.add(label.mesh);
  scene.add(jar);

  const sh = document.createElement('canvas'); sh.width = sh.height = 256;
  const sg = sh.getContext('2d')!; const sr = sg.createRadialGradient(128, 128, 30, 128, 128, 128);
  sr.addColorStop(0, 'rgba(70,120,110,.34)'); sr.addColorStop(0.6, 'rgba(70,120,110,.16)'); sr.addColorStop(1, 'rgba(70,120,110,0)');
  sg.fillStyle = sr; sg.fillRect(0, 0, 256, 256);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 3.7), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.004; scene.add(blob);

  /* ---- Tapa dorada ---- */
  const lid = new THREE.Group();
  const addLid = (geo: THREE.BufferGeometry, color: number, y: number) => { const m = new THREE.Mesh(geo, toon({ color })); m.position.y = y; lid.add(m); };
  addLid(new THREE.CylinderGeometry(0.90, 0.90, 0.12, 128), 0xe39a1c, 0.06);
  addLid(new THREE.CylinderGeometry(0.94, 0.94, 0.02, 128), 0xc9780f, 0.125);
  addLid(new THREE.CylinderGeometry(0.95, 0.95, 0.11, 128), 0xf6b930, 0.19);
  addLid(new THREE.CylinderGeometry(0.95, 0.95, 0.02, 128), 0xffd552, 0.255);
  addLid(new THREE.CylinderGeometry(0.84, 0.84, 0.01, 128), 0xfbc53a, 0.266);
  lid.position.set(0, LID_Y, 0);
  scene.add(lid);
  const lidClosed = { p: new THREE.Vector3(0, LID_Y, 0), q: new THREE.Quaternion() };
  const lidOpen = { p: new THREE.Vector3(1.5, 2.75, -2.6), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.55, 0.2, -0.6)) };

  /* ---- Física y monedas ---- */
  const { world, coinPM, proto, shapeQ } = createWorld();
  const coins: Coin[] = [];
  const vanishing: { c: Coin; t0: number; started: boolean }[] = [];
  let pending = 0, nextSpawn = 0, lastSpawn = 0;
  let vanishDone: (() => void)[] = [];

  function trySpawn(): boolean {
    const y = 2.5 + Math.random() * 0.2;
    let px = 0, pz = 0, ok = false;
    for (let t = 0; t < 10 && !ok; t++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.48;
      px = Math.cos(a) * r; pz = Math.sin(a) * r;
      ok = !coins.some((k) => k.body.position.y > 1.9 && Math.hypot(k.body.position.x - px, k.body.position.z - pz) < 0.58 && Math.abs(k.body.position.y - y) < 0.5);
    }
    if (!ok) return false;
    const body = new CANNON.Body({ mass: 1, material: coinPM });
    body.addShape(proto, new CANNON.Vec3(), shapeQ);
    body.position.set(px, y, pz);
    body.quaternion.setFromEuler(rr(-0.8, 0.8), rr(0, 6.28), rr(-0.8, 0.8));
    body.velocity.set(rr(-1, 1), -3, rr(-1, 1));
    body.angularVelocity.set(rr(-6, 6), rr(-6, 6), rr(-6, 6));
    body.linearDamping = 0.02; body.angularDamping = 0.35;
    body.allowSleep = true; body.sleepSpeedLimit = 0.7; body.sleepTimeLimit = 0.25;
    world.addBody(body);
    const mesh = new THREE.Mesh(coinGeo, coinMats);
    scene.add(mesh);
    coins.push({ body, mesh });
    return true;
  }

  function vanish(list: Coin[]) {
    const now = performance.now();
    [...list].sort((a, b) => b.body.position.y - a.body.position.y)
      .forEach((k, i) => { coins.splice(coins.indexOf(k), 1); vanishing.push({ c: k, t0: now + i * 16, started: false }); });
  }

  const api: Jar = {
    setCount(n) {
      n = Math.max(0, Math.min(CAP, Math.floor(n)));
      const have = coins.length + pending;
      if (n > have) pending += n - have;
      else if (n < have) {
        const drop = have - n, fromPending = Math.min(pending, drop);
        pending -= fromPending;
        if (drop > fromPending) vanish([...coins].sort((a, b) => b.body.position.y - a.body.position.y).slice(0, drop - fromPending));
      }
      onChange(coins.length);
    },
    setLabel: (name) => label.set(name),
    vanishAll() {
      pending = 0;
      if (!coins.length && !vanishing.length) return Promise.resolve();
      vanish([...coins]);
      onChange(0);
      return new Promise<void>((res) => vanishDone.push(res));
    },
    count: () => coins.length,
    settled: () => pending === 0 && vanishing.length === 0 && coins.every((k) => k.body.sleepState === CANNON.Body.SLEEPING),
    stats: () => ({
      out: coins.filter((k) => Math.hypot(k.body.position.x, k.body.position.z) > 1 || k.body.position.y < 0 || k.body.position.y > 2.05).length,
      awake: coins.filter((k) => k.body.sleepState !== CANNON.Body.SLEEPING).length,
    }),
    resize,
  };

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  /* ---- Bucle ---- */
  const MAXDT = 0.05;
  let last = performance.now(), maxSub = 4, avg = 0, frameMs = 16, frames = 0;
  function tick(now: number) {
    requestAnimationFrame(tick);
    const real = Math.min(MAXDT, (now - last) / 1000); last = now;
    if (!stage.clientWidth) return; // pantalla oculta: no gastar batería

    if (pending > 0 && now >= nextSpawn) {
      if (trySpawn()) { pending--; nextSpawn = now + 70; lastSpawn = now; onChange(coins.length); }
    }
    const lidTarget = (pending > 0 || now - lastSpawn < 900) ? lidOpen : lidClosed;
    const k = 1 - Math.exp(-6 * real);
    lid.position.lerp(lidTarget.p, k);
    lid.quaternion.slerp(lidTarget.q, k);

    const t0 = performance.now();
    world.step(1 / 120, real, maxSub);
    avg = avg * 0.95 + (performance.now() - t0) * 0.05;
    if (avg > 12 && maxSub > 2) maxSub = 2;

    for (const cn of coins) { cn.mesh.position.copy(cn.body.position); cn.mesh.quaternion.copy(cn.body.quaternion); }
    for (let i = vanishing.length - 1; i >= 0; i--) {
      const v = vanishing[i];
      if (now < v.t0) { v.c.mesh.position.copy(v.c.body.position); v.c.mesh.quaternion.copy(v.c.body.quaternion); continue; }
      if (!v.started) { world.removeBody(v.c.body); v.started = true; }
      const p = Math.min(1, (now - v.t0) / 280);
      v.c.mesh.scale.setScalar(Math.max(0.001, 1 - ease(p)));
      if (p >= 1) { scene.remove(v.c.mesh); vanishing.splice(i, 1); }
    }
    if (!vanishing.length && vanishDone.length) { const d = vanishDone; vanishDone = []; d.forEach((f) => f()); }

    frameMs = frameMs * 0.94 + real * 1000 * 0.06;
    if (++frames % 90 === 0 && frameMs > 36 && pr > 1.25) { pr = Math.max(1.25, pr * 0.8); resize(); }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);
  return api;
}
