import type { State, ResourceNode } from "./types";
export function random(state: { rng: number }) {
  let t = (state.rng += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  state.rng >>>= 0;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function initialState(): State {
  const rng = { rng: 48321 };
  const nodes: ResourceNode[] = [];
  for (let i = 0; i < 250; i++) {
    const x = (random(rng) - 0.5) * 420,
      z = (random(rng) - 0.5) * 420;
    if (
      (Math.abs(x) < 36 && z > -34 && z < 27) ||
      Math.abs(z - 30) < 10 ||
      Math.hypot(x + 59, z + 49) < 29 ||
      Math.hypot(x - 63, z + 52) < 15 ||
      Math.hypot(x - 44, z - 40) < 15 ||
      Math.hypot(x + 50, z - 40) < 15
    )
      continue;
    nodes.push({
      id: `tree-${i}`,
      type: "tree",
      x,
      z,
      size: 0.85 + random(rng) * 0.65,
      health: 3,
      variant: i % 3,
      depleted: false,
    });
  }
  for (let i = 0; i < 10; i++)
    nodes.push({
      id: `near-tree-${i}`,
      type: "tree",
      x: -27 - (i % 3) * 7,
      z: 6 - Math.floor(i / 3) * 8,
      size: 0.95 + (i % 3) * 0.15,
      health: 3,
      variant: i % 3,
      depleted: false,
    });
  for (let i = 0; i < 16; i++)
    nodes.push({
      id: `stone-${i}`,
      type: "stone",
      x: -32 + random(rng) * 95,
      z: -30 - random(rng) * 60,
      size: 0.8 + random(rng),
      health: 1,
      variant: 0,
      depleted: false,
    });
  nodes.push(
    {
      id: "scrap-home",
      type: "scrap",
      x: -5,
      z: 5,
      size: 1,
      health: 1,
      variant: 0,
      depleted: false,
    },
    {
      id: "scrap-outpost",
      type: "scrap",
      x: 57,
      z: -46,
      size: 1,
      health: 1,
      variant: 0,
      depleted: false,
    },
    {
      id: "egg-fern",
      type: "egg",
      x: 61,
      z: -50,
      size: 1,
      health: 1,
      variant: 0,
      depleted: false,
    },
    {
      id: "egg-moss",
      type: "egg",
      x: -72,
      z: -72,
      size: 1,
      health: 1,
      variant: 1,
      depleted: false,
    },
    {
      id: "fossil-1",
      type: "fossil",
      x: 67,
      z: -40,
      size: 1,
      health: 1,
      variant: 0,
      depleted: false,
    },
  );
  return {
    version: 1,
    seed: 48321,
    rng: 72941,
    nextId: 1,
    minutes: 480,
    money: 85,
    player: { x: 0, z: 14, angle: Math.PI },
    inventory: { feed: 3, seed: 4 },
    storage: {},
    vehicle: {
      x: 10,
      z: 13,
      angle: -0.2,
      fuel: 50,
      condition: 15,
      repaired: false,
      occupied: false,
      cargo: {},
      parts: { engine: 15, battery: 20, wheels: 55 },
    },
    property: {
      house: false,
      enclosure: false,
      incubator: false,
      gate: false,
      food: 0,
      water: 80,
    },
    nodes,
    drops: [],
    buildings: [],
    dinosaurs: [],
    eggs: [],
    stats: {
      trees: 0,
      sold: 0,
      discovered: 0,
      hatched: 0,
      bred: 0,
      planted: 0,
    },
    journal: [
      {
        time: 480,
        text: "He llegado a la finca Aurum. Necesita algo de trabajo, pero ya se siente como casa.",
      },
    ],
    settings: { sound: true, shadows: true },
    started: false,
  };
}
export function uid(state: State, prefix: string) {
  return `${prefix}-${state.nextId++}`;
}
