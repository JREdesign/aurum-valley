import { test } from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { initialState } from "../src/core/state";
import { Simulation } from "../src/systems/Simulation";
import { add, remove, transfer, weight } from "../src/systems/Inventory";
import { load, save, validateSave } from "../src/systems/SaveSystem";
import { Physics } from "../src/systems/Physics";
import type { Bag } from "../src/core/types";

test("El inventario respeta peso, pilas y transferencias atómicas", () => {
  const bag: Bag = {},
    cargo: Bag = {};
  assert.equal(add(bag, "wood", 15), true);
  assert.equal(weight(bag), 60);
  assert.equal(add(bag, "stone", 1), false);
  assert.equal(remove(bag, "wood", 16), false);
  assert.equal(bag.wood, 15);
  assert.equal(transfer(bag, cargo, "wood", 10, 240), true);
  assert.equal(bag.wood, 5);
  assert.equal(cargo.wood, 10);
  assert.equal(transfer(cargo, bag, "wood", 11, 60), false);
  assert.equal(cargo.wood, 10);
  assert.equal(add(bag, "seed", -1), false);
  assert.equal(add(bag, "seed", 100), false);
});

test("Recorrido inicial: recuperar, reparar, talar, cargar, vender y guardar", async () => {
  const state = initialState(),
    sim = new Simulation(state);
  sim.collect("scrap-home");
  assert.equal(state.inventory.scrap, 8);
  sim.repair("truck");
  assert.equal(state.money, 50);
  assert.equal(state.vehicle.repaired, true);
  assert.equal(state.inventory.scrap, 4);
  const tree = state.nodes.find((n) => n.id === "near-tree-0")!;
  sim.collect(tree.id);
  sim.collect(tree.id);
  assert.equal(tree.depleted, false);
  sim.collect(tree.id);
  assert.equal(tree.depleted, true);
  assert.equal(state.drops.length, 3);
  for (const log of [...state.drops]) sim.pickup(log.id);
  assert.equal(state.inventory.wood, 3);
  for (let i = 0; i < 3; i++) sim.transfer("wood", "cargo");
  assert.equal(state.vehicle.cargo.wood, 3);
  assert.equal(state.inventory.wood, undefined);
  state.vehicle.x = -49;
  state.vehicle.z = 32;
  sim.sell(undefined, true);
  assert.equal(state.money, 104);
  assert.equal(state.vehicle.cargo.wood, undefined);
  assert.equal(state.stats.sold, 54);
  await save(state);
  const restored = (await load())!;
  assert.equal(restored.money, 104);
  assert.equal(restored.vehicle.repaired, true);
  assert.equal(restored.vehicle.x, -49);
  assert.equal(restored.nodes.find((n) => n.id === tree.id)!.depleted, true);
  assert.deepEqual(restored.inventory, state.inventory);
});

test("No se cobra una compra que no cabe; no se duplica una venta ni una reparación", () => {
  const state = initialState(),
    sim = new Simulation(state);
  state.inventory = { wood: 15 };
  sim.buy("scrap");
  assert.equal(state.money, 85);
  sim.repair("truck");
  assert.equal(state.money, 85);
  sim.sell("wood");
  assert.equal(state.money, 355);
  sim.sell("wood");
  assert.equal(state.money, 355);
  state.inventory.scrap = 4;
  sim.repair("truck");
  const remaining = state.money;
  sim.repair("truck");
  assert.equal(state.money, remaining);
});

test("Los recursos recogidos no reaparecen y los objetos soltados se recuperan", () => {
  const state = initialState(),
    sim = new Simulation(state);
  sim.collect("scrap-home");
  sim.collect("scrap-home");
  assert.equal(state.inventory.scrap, 8);
  sim.drop("scrap");
  assert.equal(state.inventory.scrap, 7);
  const id = state.drops[0].id;
  sim.pickup(id);
  sim.pickup(id);
  assert.equal(state.inventory.scrap, 8);
  assert.equal(state.drops.length, 0);
});

test("Descubrir, incubar, nombrar, alimentar y recargar conserva el mismo dinosaurio", async () => {
  const state = initialState(),
    sim = new Simulation(state);
  sim.collect("egg-fern");
  assert.equal(state.eggs.length, 1);
  sim.incubate(state.eggs[0].id);
  assert.equal(state.eggs[0].incubating, false);
  state.money = 500;
  state.inventory = { scrap: 10, wood: 8, feed: 5 };
  sim.repair("incubator");
  sim.repair("enclosure");
  sim.incubate(state.eggs[0].id);
  sim.tick(59);
  assert.equal(state.dinosaurs.length, 0);
  sim.tick(1);
  assert.equal(state.dinosaurs.length, 1);
  const d = state.dinosaurs[0];
  sim.rename(d.id, "Helecho");
  d.food = 40;
  sim.care(d.id, "feed");
  assert.equal(d.food, 75);
  assert.equal(state.eggs.length, 0);
  sim.tick(70);
  const expected = structuredClone(d);
  await save(state);
  const restored = (await load())!;
  assert.deepEqual(restored.dinosaurs[0], expected);
  assert.equal(restored.dinosaurs[0].name, "Helecho");
  assert.equal(restored.dinosaurs[0].id, d.id);
  assert.deepEqual(restored.dinosaurs[0].genes, d.genes);
});

test("Incubación única y capacidad de estuche", () => {
  const state = initialState(),
    sim = new Simulation(state);
  state.property.incubator = true;
  state.property.enclosure = true;
  sim.collect("egg-fern");
  sim.collect("egg-moss");
  assert.equal(state.eggs.length, 2);
  sim.incubate(state.eggs[0].id);
  sim.incubate(state.eggs[1].id);
  assert.equal(state.eggs.filter((e) => e.incubating).length, 1);
});

function family() {
  const state = initialState(),
    sim = new Simulation(state);
  state.property.incubator = true;
  state.property.enclosure = true;
  sim.collect("egg-fern");
  sim.collect("egg-moss");
  sim.incubate(state.eggs[0].id);
  sim.tick(60);
  sim.incubate(state.eggs[0].id);
  sim.tick(60);
  for (const d of state.dinosaurs) {
    d.age = 400;
    d.food = d.water = d.happiness = 90;
  }
  return { state, sim };
}

test("La cría requiere adultos compatibles y guarda genes y genealogía", async () => {
  const { state, sim } = family();
  const [mother, father] = state.dinosaurs;
  sim.breed();
  assert.equal(state.eggs.length, 1);
  const e = state.eggs[0];
  assert.equal(e.mother, mother.id);
  assert.equal(e.father, father.id);
  assert.equal(e.generation, 2);
  for (const k of ["size", "speed", "growth", "efficiency", "hue"] as const)
    assert.ok(
      Math.abs(e.genes[k] - (mother.genes[k] + father.genes[k]) / 2) <= 0.051,
    );
  sim.breed();
  assert.equal(state.eggs.length, 1);
  sim.incubate(e.id);
  sim.tick(60);
  const child = state.dinosaurs[2];
  assert.equal(child.mother, mother.id);
  assert.ok(mother.offspring.includes(child.id));
  assert.ok(father.offspring.includes(child.id));
  assert.equal(sim.related(child, father), true);
  await save(state);
  const saved = (await load())!;
  assert.deepEqual(saved.dinosaurs, state.dinosaurs);
});

test("Rechaza reproducción de crías, parientes y animales con hambre", () => {
  const { state, sim } = family();
  state.dinosaurs[0].age = 0;
  sim.breed();
  assert.equal(state.eggs.length, 0);
  state.dinosaurs[0].age = 400;
  state.dinosaurs[0].food = 10;
  sim.breed();
  assert.equal(state.eggs.length, 0);
  state.dinosaurs[0].food = 90;
  state.dinosaurs[1].mother = state.dinosaurs[0].id;
  sim.breed();
  assert.equal(state.eggs.length, 0);
});

test("Los comederos y bebederos satisfacen necesidades de manera autónoma", () => {
  const { state, sim } = family();
  const d = state.dinosaurs[0];
  d.food = 50;
  d.water = 95;
  d.x = 24;
  d.z = -14;
  state.property.food = 35;
  sim.tick(1);
  assert.ok(d.food > 50);
  assert.ok(state.property.food < 35);
  d.x = 14;
  d.z = -14;
  d.water = 50;
  state.property.water = 100;
  sim.tick(1);
  assert.ok(d.water > 50);
  assert.ok(state.property.water < 100);
});

test("Construcción: solapamientos, coste, persistencia, cultivo y recuperación", async () => {
  const state = initialState(),
    sim = new Simulation(state);
  state.inventory = { wood: 10, seed: 3 };
  state.money = 500;
  state.player = { x: 0, z: 15, angle: 0 };
  assert.equal(sim.build("planter", -14, 12, 0), true);
  assert.equal(state.inventory.wood, 8);
  assert.equal(state.money, 492);
  assert.equal(sim.build("planter", -14, 12, 0), false);
  assert.equal(state.money, 492);
  assert.equal(sim.build("wall", -15, -9, 0), false);
  assert.equal(sim.build("fence", 100, 100, 0), false);
  const b = state.buildings[0];
  sim.farm(b.id);
  assert.equal(state.inventory.seed, 2);
  sim.tick(180);
  sim.farm(b.id);
  assert.equal(state.inventory.vegetable, 5);
  assert.equal(b.plantedAt, undefined);
  await save(state);
  assert.deepEqual((await load())!.buildings, state.buildings);
  sim.demolish(b.id);
  assert.equal(state.storage.wood, 2);
  assert.equal(state.buildings.length, 0);
});

test("Genética y decisiones son reproducibles con la misma semilla", () => {
  const a = family(),
    b = family();
  a.sim.breed();
  b.sim.breed();
  for (let i = 0; i < 80; i++) {
    a.sim.tick(0.1);
    b.sim.tick(0.1);
  }
  assert.deepEqual(a.state.eggs, b.state.eggs);
  assert.deepEqual(a.state.dinosaurs, b.state.dinosaurs);
  assert.equal(a.state.minutes, b.state.minutes);
});

test("Formato de guardado incompatible se rechaza", () => {
  assert.throws(() => validateSave({ version: 999 }));
  assert.throws(() => validateSave(null));
  const bad = initialState();
  bad.money = NaN;
  assert.throws(() => validateSave(bad));
});

test("Rapier: el jugador no atraviesa una pared, puede rodearla y entrar y salir del vehículo", async () => {
  const physics = new Physics();
  await physics.init();
  physics.setPositions({ x: 0, z: 5 }, { x: 10, z: 10 }, 0);
  physics.box("wall", 0, 0, 6, 0.3, 3);
  let pos = { x: 0, z: 5 };
  for (let i = 0; i < 180; i++) pos = physics.move(0, -0.08, 1 / 60, false, 0);
  assert.ok(pos.z > 0.45, `Jugador atravesó la pared: ${pos.z}`);
  assert.ok(pos.z < 1);
  for (let i = 0; i < 80; i++) pos = physics.move(0.08, 0, 1 / 60, false, 0);
  for (let i = 0; i < 80; i++) pos = physics.move(0, -0.08, 1 / 60, false, 0);
  assert.ok(pos.z < 0);
  assert.equal(physics.canStand({ x: 10, z: 10 }), false);
  assert.equal(physics.canStand({ x: 14, z: 10 }), true);
  const carBefore = physics.car.translation();
  for (let i = 0; i < 60; i++) pos = physics.move(0, 0.1, 1 / 60, true, 0);
  assert.ok(pos.z > carBefore.z + 4);
  physics.teleportPlayer({ x: 14, z: 10 });
  const after = physics.move(0.1, 0, 1 / 60, false, 0);
  assert.ok(after.x > 14);
  physics.world.free();
});
