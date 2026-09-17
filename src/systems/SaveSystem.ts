import type { State } from "../core/types";
import { ITEMS, BUILDINGS } from "../data/content";
const DATABASE_NAME = "aurum-rancho";

function database(name = DATABASE_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("saves");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export function validateSave(data: unknown): State {
  const s = data as State;
  if (
    !s ||
    s.version !== 1 ||
    !s.player ||
    !s.property ||
    !s.vehicle ||
    !s.inventory ||
    !s.storage ||
    !s.settings ||
    !s.stats ||
    !Array.isArray(s.nodes) ||
    !Array.isArray(s.dinosaurs) ||
    !Array.isArray(s.eggs) ||
    !Array.isArray(s.buildings) ||
    !Array.isArray(s.drops) ||
    !Array.isArray(s.journal) ||
    !Number.isFinite(s.money) ||
    !Number.isFinite(s.minutes) ||
    !Number.isFinite(s.player.x) ||
    !Number.isFinite(s.player.z)
  )
    throw new Error("El archivo no es una partida compatible de Aurum.");
  const invalid = () => {
    throw new Error("La partida contiene datos incompletos o incompatibles.");
  };
  const finite = (v: unknown, min = -Infinity, max = Infinity) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  const point = (v: { x: number; z: number }) =>
    v && finite(v.x, -250, 250) && finite(v.z, -250, 250);
  const bag = (b: unknown) =>
    b &&
    typeof b === "object" &&
    !Array.isArray(b) &&
    Object.entries(b).every(
      ([id, q]) =>
        Object.hasOwn(ITEMS, id) && finite(q, 0, 100000) && Number.isInteger(q),
    );
  const genes = (g: State["eggs"][number]["genes"]) =>
    g &&
    ["size", "speed", "growth", "efficiency", "hue"].every((key) =>
      finite(g[key as keyof typeof g], key === "hue" ? 0 : 0.1, 3),
    );
  if (
    !finite(s.money, 0) ||
    !finite(s.minutes, 0) ||
    !Number.isInteger(s.nextId) ||
    s.nextId < 1 ||
    !Number.isInteger(s.rng) ||
    !finite(s.player.angle) ||
    !point(s.vehicle) ||
    !finite(s.vehicle.angle) ||
    !finite(s.vehicle.fuel, 0, 100) ||
    !finite(s.vehicle.condition, 0, 100) ||
    !s.vehicle.parts ||
    !bag(s.vehicle.cargo) ||
    !bag(s.inventory) ||
    !bag(s.storage)
  )
    invalid();
  if (
    !["house", "enclosure", "incubator", "gate"].every(
      (key) => typeof s.property[key as keyof typeof s.property] === "boolean",
    ) ||
    !finite(s.property.food, 0, 100) ||
    !finite(s.property.water, 0, 100)
  )
    invalid();
  if (
    !s.nodes.every(
      (n) =>
        point(n) &&
        typeof n.id === "string" &&
        ["tree", "stone", "scrap", "egg", "fossil"].includes(n.type) &&
        finite(n.health, 0, 3) &&
        finite(n.size, 0.1, 10) &&
        typeof n.depleted === "boolean",
    )
  )
    invalid();
  if (
    !s.drops.every(
      (d) =>
        point(d) &&
        typeof d.id === "string" &&
        Object.hasOwn(ITEMS, d.item) &&
        Number.isInteger(d.quantity) &&
        d.quantity > 0,
    )
  )
    invalid();
  if (
    !s.buildings.every(
      (b) =>
        point(b) &&
        typeof b.id === "string" &&
        Object.hasOwn(BUILDINGS, b.type) &&
        finite(b.rotation) &&
        (b.plantedAt === undefined || finite(b.plantedAt, 0)),
    )
  )
    invalid();
  if (
    !s.eggs.every(
      (e) =>
        typeof e.id === "string" &&
        e.species === "psittacosaurus" &&
        ["F", "M"].includes(e.sex) &&
        genes(e.genes) &&
        finite(e.progress, 0, 60) &&
        typeof e.incubating === "boolean" &&
        Number.isInteger(e.generation),
    )
  )
    invalid();
  if (
    !s.dinosaurs.every(
      (d) =>
        point(d) &&
        point(d.target) &&
        typeof d.id === "string" &&
        typeof d.name === "string" &&
        d.species === "psittacosaurus" &&
        ["F", "M"].includes(d.sex) &&
        genes(d.genes) &&
        finite(d.age, 0) &&
        [d.food, d.water, d.health, d.happiness, d.bond].every((v) =>
          finite(v, 0, 100),
        ) &&
        Array.isArray(d.offspring) &&
        d.offspring.every((id) => typeof id === "string") &&
        finite(d.decisionAt) &&
        finite(d.breedAt) &&
        finite(d.lastPet) &&
        typeof d.following === "boolean",
    )
  )
    invalid();
  const ids = [
    ...s.nodes,
    ...s.drops,
    ...s.buildings,
    ...s.eggs,
    ...s.dinosaurs,
  ].map((o) => o.id);
  if (new Set(ids).size !== ids.length) invalid();
  if (
    !s.journal.every(
      (entry) => finite(entry.time, 0) && typeof entry.text === "string",
    )
  )
    invalid();
  const previousName = ["As", "tra"].join("");
  for (const entry of s.journal)
    entry.text = entry.text.replaceAll(previousName, "Aurum");
  // Early version-1 saves predate the driver's seat field.
  s.vehicle.occupied ??=
    s.vehicle.repaired &&
    Math.hypot(s.player.x - s.vehicle.x, s.player.z - s.vehicle.z) < 0.5;
  if (
    typeof s.vehicle.occupied !== "boolean" ||
    !["trees", "sold", "discovered", "hatched", "bred", "planted"].every(
      (key) => finite(s.stats[key as keyof typeof s.stats], 0),
    )
  )
    invalid();
  return s;
}
export async function save(state: State): Promise<void> {
  const db = await database();
  const snapshot = structuredClone(state);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("saves", "readwrite");
    tx.objectStore("saves").put(snapshot, "main");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}
export async function load(): Promise<State | null> {
  const db = await database();
  let value = await readMainSave(db);
  db.close();
  if (!value) {
    const previousDatabase = ["as", "tra-rancho"].join("");
    const knownDatabases = await indexedDB.databases?.();
    if (knownDatabases?.some(({ name }) => name === previousDatabase)) {
      const legacyDb = await database(previousDatabase);
      value = await readMainSave(legacyDb);
      legacyDb.close();
      if (value) {
        const migrated = validateSave(value);
        await save(migrated);
        return migrated;
      }
    }
  }
  return value ? validateSave(value) : null;
}

function readMainSave(db: IDBDatabase): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = db.transaction("saves").objectStore("saves").get("main");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
