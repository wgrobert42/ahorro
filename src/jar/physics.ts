import * as CANNON from 'cannon-es';

export const CR = 0.22, CT = 0.07, FLOOR = 0.12, R_IN = 0.94, R_NECK = 0.76;

export function createWorld() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -18, 0) });
  world.allowSleep = true;
  (world.solver as unknown as { iterations: number }).iterations = 12;
  world.broadphase = new CANNON.NaiveBroadphase();
  const coinPM = new CANNON.Material('coin'), glassPM = new CANNON.Material('glass');
  world.addContactMaterial(new CANNON.ContactMaterial(coinPM, coinPM, { friction: 0.22, restitution: 0.3 }));
  world.addContactMaterial(new CANNON.ContactMaterial(coinPM, glassPM, { friction: 0.2, restitution: 0.22 }));

  const floorBody = new CANNON.Body({ mass: 0, material: glassPM });
  floorBody.addShape(new CANNON.Plane());
  floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  floorBody.position.set(0, FLOOR, 0);
  world.addBody(floorBody);

  const NSEG = 24, HT = 0.4;
  const wallRing = (radius: number, y0: number, y1: number) => {
    const hy = (y1 - y0) / 2;
    for (let i = 0; i < NSEG; i++) {
      const a = (i / NSEG) * Math.PI * 2;
      const seg = radius * Math.tan(Math.PI / NSEG) + 0.03;
      const b = new CANNON.Body({ mass: 0, material: glassPM });
      b.addShape(new CANNON.Box(new CANNON.Vec3(HT, hy, seg)));
      b.position.set((radius + HT) * Math.cos(a), (y0 + y1) / 2, (radius + HT) * Math.sin(a));
      b.quaternion.setFromEuler(0, -a, 0);
      world.addBody(b);
    }
  };
  wallRing(R_IN, 0, 1.5);
  wallRing(R_NECK, 1.5, 2.4);
  for (let i = 0; i < NSEG; i++) {
    const a = (i / NSEG) * Math.PI * 2;
    const mid = (R_NECK + R_IN + HT) / 2, half = (R_IN + HT - R_NECK) / 2;
    const b = new CANNON.Body({ mass: 0, material: glassPM });
    b.addShape(new CANNON.Box(new CANNON.Vec3(half, 0.06, R_IN * Math.tan(Math.PI / NSEG) + 0.03)));
    b.position.set(mid * Math.cos(a), 1.56, mid * Math.sin(a));
    b.quaternion.setFromEuler(0, -a, 0);
    world.addBody(b);
  }

  // Forma de la moneda: el cilindro de cannon se orienta según su eje fino.
  const proto = new CANNON.Cylinder(CR, CR, CT, 10);
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  proto.vertices.forEach((v) => [v.x, v.y, v.z].forEach((c, i) => { mn[i] = Math.min(mn[i], c); mx[i] = Math.max(mx[i], c); }));
  const ext = mx.map((m, i) => m - mn[i]);
  const thin = ext.indexOf(Math.min(...ext));
  let shapeQ: CANNON.Quaternion | undefined;
  if (thin === 2) { shapeQ = new CANNON.Quaternion(); shapeQ.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); }
  if (thin === 0) { shapeQ = new CANNON.Quaternion(); shapeQ.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2); }

  return { world, coinPM, proto, shapeQ };
}
