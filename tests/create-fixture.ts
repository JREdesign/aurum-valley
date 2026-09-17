// Manual browser QA fixture. Uses the same real actions as a normal game.
// This writes a separate file and never touches a browser's saved game.
import { writeFileSync } from "node:fs";
import { initialState } from "../src/core/state";
import { Simulation } from "../src/systems/Simulation";
import { validateSave } from "../src/systems/SaveSystem";
import assert from "node:assert/strict";
const state = initialState();
const sim = new Simulation(state);
sim.collect("scrap-home");
sim.repair("truck");
sim.collect("scrap-outpost");
for (const n of state.nodes.filter((n) => n.type === "tree").slice(0, 18)) {
  sim.collect(n.id);
  sim.collect(n.id);
  sim.collect(n.id);
  for (const d of [...state.drops]) sim.pickup(d.id);
  sim.sell("wood");
}
for (let i = 0; i < 6; i++) sim.buy("wood");
sim.repair("enclosure");
for (let i = 0; i < 8; i++) sim.buy("wood");
sim.repair("house");
sim.repair("incubator");
sim.collect("egg-fern");
sim.collect("egg-moss");
sim.incubate(state.eggs[0].id);
for (let i = 0; i < 60; i++) sim.tick(1);
sim.incubate(state.eggs[0].id);
for (let i = 0; i < 60; i++) sim.tick(1);
for (const d of state.dinosaurs) {
  sim.rename(d.id, d.sex === "F" ? "Helecho" : "Musgo");
}
sim.provision();
sim.provision(true);
sim.sleep();
sim.breed();
state.player = { x: 17, z: -6, angle: 0 };
state.property.gate = true;
state.started = true;
assert.equal(state.dinosaurs.length, 2);
assert.equal(state.eggs.length, 1);
assert.equal(state.eggs[0].generation, 2);
validateSave(state);
writeFileSync(
  new URL("./rancho-qa.json", import.meta.url),
  JSON.stringify(state, null, 2),
);
console.log(
  "Partida de QA creada con dos adultos y un huevo de segunda generación.",
);
