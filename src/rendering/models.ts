import * as T from "three";
import type { Genes, PieceId } from "../core/types";
const materials = new Map<string, T.MeshStandardMaterial>();
export function mat(color: T.ColorRepresentation, roughness = 1) {
  const key = color instanceof T.Color ? color.getHexString() : String(color);
  if (!materials.has(key))
    materials.set(
      key,
      new T.MeshStandardMaterial({ color, roughness, flatShading: true }),
    );
  return materials.get(key)!;
}
export function mesh(
  geometry: T.BufferGeometry,
  color: T.ColorRepresentation,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new T.Mesh(geometry, mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
export function box(
  g: T.Group,
  w: number,
  h: number,
  d: number,
  color: T.ColorRepresentation,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = mesh(new T.BoxGeometry(w, h, d), color, x, y, z);
  g.add(m);
  return m;
}
export function ball(
  g: T.Group,
  r: number,
  color: T.ColorRepresentation,
  x = 0,
  y = 0,
  z = 0,
  scale = [1, 1, 1],
  detail = 1,
) {
  const m = mesh(new T.IcosahedronGeometry(r, detail), color, x, y, z);
  m.scale.set(...(scale as [number, number, number]));
  g.add(m);
  return m;
}
export function cylinder(
  g: T.Group,
  rt: number,
  rb: number,
  h: number,
  color: T.ColorRepresentation,
  x = 0,
  y = 0,
  z = 0,
  segments = 8,
) {
  const m = mesh(new T.CylinderGeometry(rt, rb, h, segments), color, x, y, z);
  g.add(m);
  return m;
}
export function beam(
  g: T.Group,
  a: T.Vector3,
  b: T.Vector3,
  r: number,
  color: T.ColorRepresentation,
  r2 = r,
) {
  const m = mesh(new T.CylinderGeometry(r2, r, a.distanceTo(b), 7), color);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  );
  g.add(m);
  return m;
}
export function label(
  text: string,
  width = 4,
  color = "#faf3dc",
  background = "#355442",
) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = background;
  ctx.roundRect(0, 0, 512, 128, 16);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = "600 43px Georgia";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 66, 470);
  const texture = new T.CanvasTexture(c);
  texture.colorSpace = T.SRGBColorSpace;
  const sprite = new T.Sprite(
    new T.SpriteMaterial({ map: texture, depthWrite: false }),
  );
  sprite.scale.set(width, width / 4, 1);
  return sprite;
}
export function roof(
  g: T.Group,
  w: number,
  d: number,
  y: number,
  color = "#a36043",
) {
  const shape = new T.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(0, w * 0.3);
  shape.lineTo(w / 2, 0);
  shape.closePath();
  const geo = new T.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  const r = mesh(geo, color, 0, y, -d / 2);
  g.add(r);
  return r;
}
export function house(
  width = 10,
  depth = 8,
  color = "#ddcda7",
  fixed = false,
  sign?: string,
) {
  const g = new T.Group();
  box(g, width + 0.5, 0.35, depth + 0.5, "#9a9480", 0, 0.17);
  box(g, width, 4.5, depth, color, 0, 2.45);
  for (let y = 0.8; y < 4.7; y += 0.55)
    box(g, width + 0.02, 0.035, depth + 0.02, "#c3b68f", 0, y);
  roof(g, width + 1.5, depth + 1.4, 4.7, fixed ? "#ac6549" : "#776b55");
  box(
    g,
    1.8,
    2.9,
    0.12,
    fixed ? "#5c7a6a" : "#646f5c",
    0,
    1.75,
    depth / 2 + 0.1,
  );
  ball(g, 0.07, "#e6c678", 0.6, 1.7, depth / 2 + 0.2);
  for (const x of [-width * 0.31, width * 0.31]) {
    box(g, 2.25, 2.1, 0.2, "#f0e6cf", x, 2.85, depth / 2 + 0.12);
    box(g, 1.95, 1.8, 0.25, "#648c8b", x, 2.85, depth / 2 + 0.13);
    box(g, 0.09, 1.85, 0.28, "#ebdec3", x, 2.85, depth / 2 + 0.18);
    box(g, 2, 0.08, 0.28, "#ebdec3", x, 2.85, depth / 2 + 0.18);
    box(g, 2.6, 0.2, 0.7, "#715540", x, 1.7, depth / 2 + 0.3);
    if (fixed) {
      for (let i = 0; i < 5; i++) {
        ball(g, 0.22, "#809356", x - 1 + i * 0.5, 2, depth / 2 + 0.35);
        ball(
          g,
          0.14,
          i % 2 ? "#e5b75b" : "#d8856c",
          x - 0.9 + i * 0.45,
          2.2,
          depth / 2 + 0.35,
        );
      }
    } else {
      const plank = box(g, 2.8, 0.24, 0.25, "#887456", x, 2.9, depth / 2 + 0.4);
      plank.rotation.z = 0.32;
    }
  }
  box(g, width * 0.6, 0.28, 2.7, "#b4a27d", 0, 0.36, depth / 2 + 1.3);
  box(g, 3, 0.18, 1.1, "#aea38a", 0, 0.15, depth / 2 + 3);
  box(g, 1, 3, 1, "#bdb6a4", width * 0.3, 5, 0);
  if (sign) {
    const s = label(sign, width * 0.85);
    s.position.set(0, 5.9, depth / 2 + 0.5);
    g.add(s);
  }
  return g;
}
export function fence(length = 4, broken = false) {
  const g = new T.Group();
  for (const x of [-length / 2, length / 2]) {
    box(g, 0.23, 1.75, 0.25, "#8b6d48", x, 0.86);
    const cap = mesh(new T.ConeGeometry(0.2, 0.2, 4), "#a18458", x, 1.81);
    cap.rotation.y = Math.PI / 4;
    g.add(cap);
  }
  for (const y of [0.65, 1.3]) {
    const b = box(g, length, 0.19, 0.14, "#b29868", 0, y);
    if (broken) {
      b.scale.x = 0.64;
      b.rotation.z = y < 1 ? -0.3 : 0.27;
    }
  }
  return g;
}
export function incubator(fixed = false) {
  const g = new T.Group();
  box(g, 2.2, 0.3, 1.7, "#6d776d", 0, 0.4);
  for (const x of [-0.85, 0.85])
    for (const z of [-0.6, 0.6]) box(g, 0.15, 0.8, 0.15, "#445951", x, 0.45, z);
  box(g, 2.2, 0.65, 1.7, "#b2c5ad", 0, 0.9);
  box(g, 1.75, 0.1, 1.3, "#3c5149", 0, 1.3);
  const dome = mesh(
    new T.SphereGeometry(0.83, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    "#a1c5b4",
    0,
    1.33,
  );
  dome.material = new T.MeshStandardMaterial({
    color: "#b7e5d1",
    transparent: true,
    opacity: 0.3,
    roughness: 0.2,
  });
  g.add(dome);
  box(g, 0.6, 0.25, 0.1, "#293e34", 0.4, 0.98, 0.89);
  ball(g, 0.065, fixed ? "#b9e98b" : "#d29362", 0.4, 0.99, 0.96);
  return g;
}
export function truck() {
  const g = new T.Group();
  const green = "#78917b",
    rust = "#986c47";
  box(g, 2.6, 0.5, 5.4, "#3c463f", 0, 0.73);
  box(g, 2.65, 0.75, 2.15, green, 0, 1.16, 1.5);
  box(g, 2.6, 0.3, 1.9, green, 0, 1.8, 0.05);
  box(g, 2.55, 0.22, 2, green, 0, 2.7, 0.05);
  box(g, 2.22, 0.72, 0.09, "#819f9d", 0, 2.24, 1.04);
  box(g, 2.24, 0.75, 0.08, "#849e98", 0, 2.21, -0.94);
  for (const x of [-1.25, 1.25]) {
    for (const z of [-0.95, 1]) box(g, 0.14, 1.2, 0.13, green, x, 2.18, z);
    box(g, 0.12, 0.65, 1.9, green, x, 1.55, 0.05);
    box(g, 0.16, 0.14, 0.5, "#d5cdaf", x, 1.7, -0.15);
    box(g, 0.15, 0.72, 2.55, green, x, 1.3, -2.03);
    box(g, 0.22, 0.16, 2.7, "#b8b396", x, 1.72, -2.02);
    box(g, 0.4, 0.26, 0.5, "#333f37", x * 1.14, 2.08, 0.75);
  }
  box(g, 2.45, 0.15, 2.6, "#67583f", 0, 0.98, -2);
  box(g, 2.6, 0.7, 0.16, green, 0, 1.28, -3.3);
  box(g, 2.75, 0.2, 0.2, "#b5b8aa", 0, 0.88, 2.67);
  box(g, 1.25, 0.35, 0.12, "#47544b", 0, 1.18, 2.66);
  for (const x of [-0.95, 0.95]) {
    box(g, 0.5, 0.4, 0.15, "#fae4a0", x, 1.35, 2.63);
    box(g, 0.3, 0.3, 0.12, "#b05642", x, 1.35, -3.41);
  }
  const wheels: T.Mesh[] = [];
  for (const x of [-1.38, 1.38])
    for (const z of [-2.18, 1.7]) {
      const wheel = cylinder(g, 0.61, 0.61, 0.38, "#343b35", x, 0.65, z, 12);
      wheel.rotation.z = Math.PI / 2;
      wheels.push(wheel);
      const hub = cylinder(g, 0.29, 0.29, 0.41, "#bdba9f", x, 0.65, z);
      hub.rotation.z = Math.PI / 2;
    }
  for (const [x, y, z] of [
    [1.34, 1.26, 1.8],
    [-1.34, 1.23, -1.6],
    [0.7, 1.56, 2.59],
  ])
    box(g, 0.12, 0.24, 0.52, rust, x, y, z);
  g.userData.wheels = wheels;
  return g;
}
export function person(color = "#d2995e") {
  const g = new T.Group();
  box(g, 0.65, 0.85, 0.4, color, 0, 1.18);
  ball(g, 0.29, "#edcba5", 0, 1.89, 0, [0.9, 1.15, 0.85]);
  cylinder(g, 0.43, 0.43, 0.08, "#bc8552", 0, 2.16, 0, 10);
  cylinder(g, 0.25, 0.29, 0.25, "#d5a56c", 0, 2.27, 0, 9);
  box(g, 0.5, 0.65, 0.25, "#66766b", 0, 1.28, -0.3);
  const limbs: T.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * 0.2, 0.83, 0);
    box(leg, 0.26, 0.65, 0.29, "#4d655d", 0, -0.3);
    box(leg, 0.29, 0.19, 0.46, "#584b3c", 0, -0.65, 0.06);
    g.add(leg);
    limbs.push(leg);
    const arm = new T.Group();
    arm.position.set(side * 0.43, 1.53, 0);
    box(arm, 0.23, 0.48, 0.28, color, 0, -0.19);
    ball(arm, 0.12, "#edcba5", 0, -0.53);
    g.add(arm);
    limbs.push(arm);
  }
  g.userData.limbs = limbs;
  return g;
}
export function dinosaur(genes: Genes) {
  const g = new T.Group();
  const color = new T.Color().setHSL(0.2 + genes.hue * 0.1, 0.26, 0.42),
    dark = color.clone().multiplyScalar(0.77),
    cream = "#d3cb91";
  ball(g, 0.72, color, 0, 1.15, 0, [0.74, 0.9, 1.25]);
  ball(g, 0.53, cream, 0, 1, 0.36, [0.8, 0.9, 1]);
  const head = new T.Group();
  head.position.set(0, 1.63, 0.7);
  ball(head, 0.5, color, 0, 0.22, 0.28, [1, 1, 1.15]);
  ball(head, 0.32, cream, 0, 0.02, 0.63, [0.82, 0.8, 0.65]);
  const beak = mesh(new T.ConeGeometry(0.23, 0.38, 5), "#bea56c", 0, 0.1, 0.91);
  beak.rotation.x = Math.PI / 2;
  head.add(beak);
  for (const side of [-1, 1]) {
    ball(head, 0.135, "#f7efcf", side * 0.405, 0.3, 0.46, [0.45, 1, 0.9]);
    ball(head, 0.087, "#25352a", side * 0.455, 0.31, 0.49, [0.4, 1, 0.8]);
    ball(head, 0.027, "#ffffff", side * 0.48, 0.34, 0.52);
    ball(head, 0.18, dark, side * 0.47, 0.04, 0.06, [1, 0.55, 1]);
  }
  g.add(head);
  const tail = new T.Group();
  tail.position.set(0, 1.05, -0.67);
  beam(
    tail,
    new T.Vector3(0, 0, 0),
    new T.Vector3(0, -0.15, -1.6),
    0.3,
    color,
    0.015,
  );
  for (let i = 0; i < 10; i++) {
    const q = mesh(
      new T.ConeGeometry(0.025, 0.25, 3),
      dark,
      0,
      0.17 - i * 0.02,
      -i * 0.13,
    );
    q.rotation.x = -0.5;
    tail.add(q);
  }
  g.add(tail);
  const legs: T.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * 0.46, 1.02, -0.2);
    ball(leg, 0.3, color, 0, -0.1, 0, [0.8, 1.25, 1]);
    beam(
      leg,
      new T.Vector3(0, -0.28, 0),
      new T.Vector3(0, -0.77, 0.15),
      0.12,
      dark,
    );
    box(leg, 0.27, 0.15, 0.48, "#b8b080", 0, -0.85, 0.3);
    g.add(leg);
    legs.push(leg);
    const arm = new T.Group();
    arm.position.set(side * 0.46, 1.45, 0.48);
    beam(
      arm,
      new T.Vector3(0, 0, 0),
      new T.Vector3(0, -0.42, 0.15),
      0.08,
      color,
    );
    ball(arm, 0.1, cream, 0, -0.47, 0.19);
    g.add(arm);
  }
  for (let i = 0; i < 5; i++)
    ball(g, 0.12, dark, 0, 1.72 - i * 0.04, 0.15 - i * 0.19, [1, 0.3, 1]);
  g.userData = { head, tail, legs };
  return g;
}
export function egg() {
  const g = new T.Group();
  ball(g, 0.46, "#efe5bd", 0, 0.45, 0, [0.8, 1.23, 0.8], 2);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4;
    ball(
      g,
      0.05,
      "#bfa47d",
      Math.sin(a) * 0.34,
      0.35 + (i % 3) * 0.15,
      Math.cos(a) * 0.32,
      [1, 1, 0.45],
    );
  }
  return g;
}
export function building(type: PieceId) {
  const g = new T.Group();
  if (type === "fence") return fence();
  if (type === "floor") {
    box(g, 4, 0.18, 4, "#a48a5f", 0, 0.17);
    for (let x = -1.8; x < 2; x += 0.4)
      box(g, 0.025, 0.02, 3.95, "#6c614c", x, 0.27);
  }
  if (type === "wall") {
    box(g, 4, 2.8, 0.22, "#b4a57c", 0, 1.6);
    for (const x of [-1.85, 1.85]) box(g, 0.18, 3, 0.3, "#735c40", x, 1.6);
  }
  if (type === "roof") roof(g, 4.4, 4.4, 3.1);
  if (type === "trough") {
    box(g, 2, 0.55, 1, "#a29571", 0, 0.35);
    box(g, 1.65, 0.05, 0.66, "#879852", 0, 0.66);
    for (const x of [-0.9, 0.9]) box(g, 0.15, 0.4, 0.9, "#766747", x, 0.7);
  }
  if (type === "planter") {
    box(g, 3, 0.4, 2, "#9a7750", 0, 0.2);
    box(g, 2.7, 0.08, 1.7, "#65523c", 0, 0.43);
    for (const z of [-0.5, 0, 0.5])
      box(g, 2.5, 0.04, 0.08, "#473e2f", 0, 0.48, z);
  }
  if (type === "storage") {
    box(g, 2, 1.1, 1, "#997149", 0, 0.55);
    box(g, 2.1, 0.15, 1.1, "#b28b5b", 0, 1.15);
    for (const x of [-0.7, 0.7]) box(g, 0.12, 1.2, 1.12, "#576353", x, 0.6);
    box(g, 0.23, 0.22, 0.1, "#e2c987", 0, 0.9, 0.58);
  }
  if (type === "shelter") {
    for (const x of [-1.8, 1.8])
      for (const z of [-1.8, 1.8])
        box(g, 0.22, 3.1, 0.22, "#9a7f56", x, 1.55, z);
    roof(g, 4.5, 4.6, 3.1, "#8e7554");
    box(g, 4, 2.3, 0.2, "#b09b6f", 0, 1.15, -1.85);
    box(g, 3.2, 0.2, 3, "#c3b66d", 0, 0.15);
  }
  return g;
}
export function disposeGroup(group: T.Object3D) {
  group.traverse((o) => {
    if (o instanceof T.Mesh) o.geometry.dispose();
    if (o instanceof T.Sprite) {
      o.material.map?.dispose();
      o.material.dispose();
    }
  });
  group.removeFromParent();
}
