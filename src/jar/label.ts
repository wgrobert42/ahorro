import * as THREE from 'three';

const LW = 1536, LH = 528;
const FAM = '"Inter Variable", -apple-system, system-ui, sans-serif';

function notched(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, n: number) {
  g.beginPath();
  g.moveTo(x + n, y); g.lineTo(x + w - n, y);
  g.arc(x + w, y, n, Math.PI, Math.PI / 2, true);
  g.lineTo(x + w, y + h - n);
  g.arc(x + w, y + h, n, -Math.PI / 2, -Math.PI, true);
  g.lineTo(x + n, y + h);
  g.arc(x, y + h, n, 0, -Math.PI / 2, true);
  g.lineTo(x, y + n);
  g.arc(x, y, n, Math.PI / 2, 0, true);
  g.closePath();
}

/** Etiqueta curva pegada al vidrio: crema, borde dorado y esquinas con muesca. */
export function createLabel(maxAniso: number) {
  const canvas = document.createElement('canvas'); canvas.width = LW; canvas.height = LH;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAniso;
  let current = 'Mi meta';

  function draw(text: string) {
    current = text;
    const g = canvas.getContext('2d')!;
    g.clearRect(0, 0, LW, LH);
    const m = 28;
    notched(g, m, m, LW - 2 * m, LH - 2 * m, 56);
    const fill = g.createLinearGradient(0, 0, 0, LH);
    fill.addColorStop(0, '#FFF8E8'); fill.addColorStop(1, '#F6E8C8');
    g.fillStyle = fill; g.fill();
    g.lineJoin = 'round'; g.strokeStyle = '#D9A04E'; g.lineWidth = 12; g.stroke();
    notched(g, m + 26, m + 26, LW - 2 * (m + 26), LH - 2 * (m + 26), 34);
    g.strokeStyle = '#E8C384'; g.lineWidth = 4; g.stroke();
    const name = (text || '').trim() || 'Mi meta';
    let size = 190;
    g.font = '700 ' + size + 'px ' + FAM;
    while (g.measureText(name).width > LW - 330 && size > 70) { size -= 6; g.font = '700 ' + size + 'px ' + FAM; }
    g.fillStyle = '#6B3F0E'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name, LW / 2, LH / 2 - 34);
    g.font = '600 74px ' + FAM; g.fillStyle = '#A8742F';
    g.fillText('Bloque de $100', LW / 2, LH / 2 + 118);
    texture.needsUpdate = true;
  }
  draw(current);

  const geo = new THREE.LatheGeometry([new THREE.Vector2(1.014, 0.56), new THREE.Vector2(1.014, 1.24)], 48, -0.97, 1.94);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.02, side: THREE.FrontSide }));
  mesh.renderOrder = 4;

  if (document.fonts?.load) {
    document.fonts.load('700 80px "Inter Variable"')
      .then(() => document.fonts.load('600 40px "Inter Variable"'))
      .then(() => draw(current)).catch(() => {});
  }
  return { mesh, set: (t: string) => { if (t !== current) draw(t); } };
}
