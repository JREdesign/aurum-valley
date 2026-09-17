import { EventBus } from "../core/EventBus";
import { random, uid } from "../core/state";
import type {
  State,
  Genes,
  Egg,
  Dinosaur,
  ItemId,
  PieceId,
  Vec,
  Bag,
} from "../core/types";
import {
  ITEMS,
  BUILDINGS,
  ECONOMY,
  REPAIR_MATERIALS,
  CARGO_LIMIT,
  CROP_MINUTES,
  SPECIES,
} from "../data/content";
import { add, remove, transfer } from "./Inventory";

export class Simulation {
  constructor(
    public state: State,
    public bus = new EventBus(),
  ) {}
  notify(message: string) {
    this.bus.emit({ type: "toast", message });
  }
  changed() {
    this.bus.emit({ type: "change" });
  }
  record(text: string) {
    this.state.journal.unshift({ time: this.state.minutes, text });
    this.state.journal.length = Math.min(60, this.state.journal.length);
  }
  genes(): Genes {
    const r = () => 0.85 + random(this.state) * 0.3;
    return {
      size: r(),
      speed: r(),
      growth: r(),
      efficiency: r(),
      hue: random(this.state),
    };
  }
  collect(id: string) {
    const s = this.state,
      n = s.nodes.find((n) => n.id === id);
    if (!n || n.depleted) return;
    if (n.type === "tree") {
      n.health--;
      this.bus.emit({ type: "sound", id: "chop" });
      if (n.health > 0) {
        this.notify(
          `Un buen golpe. ${n.health} ${n.health === 1 ? "golpe más" : "golpes más"} para talar.`,
        );
        this.changed();
        return;
      }
      n.depleted = true;
      s.stats.trees++;
      for (let i = 0; i < 3; i++)
        s.drops.push({
          id: uid(s, "log"),
          item: "wood",
          quantity: 1,
          x: n.x + (i - 1) * 1.3,
          z: n.z + 2 + i * 0.6,
        });
      this.notify("¡Árbol talado! Recoge los 3 troncos.");
    } else if (n.type === "egg") {
      if (s.eggs.filter((e) => !e.incubating).length >= 2) {
        this.notify("Tu estuche admite dos huevos. Lleva uno a la incubadora.");
        return;
      }
      s.eggs.push({
        id: uid(s, "egg"),
        species: "psittacosaurus",
        sex: n.variant === 0 ? "F" : "M",
        genes: this.genes(),
        progress: 0,
        incubating: false,
        generation: 1,
      });
      s.stats.discovered++;
      n.depleted = true;
      this.record(
        "He encontrado un huevo de Psittacosaurus. Todavía conserva su calor.",
      );
      this.notify(
        "¡Un huevo de Psittacosaurus! Llévalo a la incubadora de tu finca.",
      );
      this.bus.emit({ type: "sound", id: "discovery" });
    } else {
      const item =
        n.type === "scrap" ? "scrap" : n.type === "fossil" ? "fossil" : "stone";
      const qty = n.type === "scrap" ? 8 : n.type === "stone" ? 3 : 1;
      if (!add(s.inventory, item, qty)) {
        this.notify(
          "No cabe en tu mochila. Deposita algo en la camioneta o el almacén.",
        );
        return;
      }
      n.depleted = true;
      this.notify(`+${qty} ${ITEMS[item].name.toLowerCase()}`);
    }
    this.changed();
  }
  pickup(id: string) {
    const s = this.state,
      d = s.drops.find((d) => d.id === id);
    if (!d) return;
    if (!add(s.inventory, d.item, d.quantity)) {
      this.notify(
        "La mochila está llena. Puedes usar la caja de la camioneta.",
      );
      return;
    }
    s.drops = s.drops.filter((x) => x.id !== id);
    this.notify(`+${d.quantity} ${ITEMS[d.item].name.toLowerCase()}`);
    this.changed();
  }
  drop(item: ItemId) {
    const s = this.state;
    if (remove(s.inventory, item, 1)) {
      s.drops.push({
        id: uid(s, "drop"),
        item,
        quantity: 1,
        x: s.player.x + 1,
        z: s.player.z + 1,
      });
      this.changed();
    }
  }
  buy(item: ItemId) {
    const s = this.state,
      cost = ITEMS[item]?.buy;
    if (!cost) return;
    if (s.money < cost) {
      this.notify("Necesitas un poco más de dinero.");
      return;
    }
    if (!add(s.inventory, item, 1)) {
      this.notify("No hay espacio en la mochila.");
      return;
    }
    s.money -= cost;
    this.notify(`Has comprado ${ITEMS[item].name.toLowerCase()}.`);
    this.changed();
  }
  sell(item?: ItemId, cargo = false) {
    const s = this.state,
      bag = cargo ? s.vehicle.cargo : s.inventory;
    let earned = 0;
    for (const key of Object.keys(bag) as ItemId[]) {
      if (item && key !== item) continue;
      if (
        !item &&
        !["wood", "stone", "scrap", "vegetable", "fossil"].includes(key)
      )
        continue;
      earned += (bag[key] || 0) * ITEMS[key].value;
      delete bag[key];
    }
    if (!earned) {
      this.notify("No tienes recursos para vender.");
      return;
    }
    s.money += earned;
    s.stats.sold += earned;
    this.notify(`Venta completada. +${earned} monedas`);
    this.bus.emit({ type: "sound", id: "coin" });
    this.changed();
  }
  transfer(item: ItemId, target: "cargo" | "storage", reverse = false) {
    const s = this.state,
      other = target === "cargo" ? s.vehicle.cargo : s.storage;
    const from = reverse ? other : s.inventory,
      to = reverse ? s.inventory : other;
    const ok = transfer(
      from,
      to,
      item,
      1,
      reverse ? 60 : target === "cargo" ? CARGO_LIMIT : 10000,
    );
    if (!ok) this.notify("No cabe en el destino.");
    this.changed();
  }
  repair(part: "truck" | "house" | "enclosure" | "incubator") {
    const s = this.state;
    if (part === "truck" ? s.vehicle.repaired : s.property[part]) return;
    const { item, quantity: qty } = REPAIR_MATERIALS[part];
    if (s.money < ECONOMY[part] || (s.inventory[item] || 0) < qty) {
      this.notify(
        `Necesitas ${qty} ${ITEMS[item].name.toLowerCase()} y ${ECONOMY[part]} monedas.`,
      );
      return;
    }
    remove(s.inventory, item, qty);
    s.money -= ECONOMY[part];
    if (part === "truck") {
      s.vehicle.repaired = true;
      s.vehicle.condition = 100;
      s.vehicle.parts = { engine: 100, battery: 100, wheels: 100 };
    } else {
      s.property[part] = true;
    }
    const name = {
      truck: "La vieja camioneta vuelve a rodar.",
      house: "Mi casa vuelve a tener vida.",
      enclosure: "El corral está listo para su primer habitante.",
      incubator: "La incubadora vuelve a funcionar.",
    }[part];
    this.record(name);
    this.notify(name);
    this.changed();
  }
  refuel() {
    const v = this.state.vehicle;
    if (v.fuel >= 99) {
      this.notify("El depósito está lleno.");
      return;
    }
    if (!remove(this.state.inventory, "fuel", 1)) {
      this.notify("Compra un bidón de gasolina en el almacén de Clara.");
      return;
    }
    v.fuel = Math.min(100, v.fuel + 50);
    this.notify("Depósito repostado.");
    this.changed();
  }
  maintain() {
    const s = this.state;
    if (!s.vehicle.repaired) return;
    if (!remove(s.inventory, "scrap", 1)) {
      this.notify("Necesitas 1 de chatarra.");
      return;
    }
    s.vehicle.condition = Math.min(100, s.vehicle.condition + 35);
    s.vehicle.parts.engine = s.vehicle.condition;
    this.changed();
  }
  incubate(id: string) {
    const s = this.state,
      e = s.eggs.find((e) => e.id === id);
    if (!e || e.incubating) return;
    if (!s.property.incubator || !s.property.enclosure) {
      this.notify("Repara primero la incubadora y el corral.");
      return;
    }
    if (s.eggs.some((e) => e.incubating)) {
      this.notify("La incubadora ya está ocupada.");
      return;
    }
    if (s.dinosaurs.length >= SPECIES.psittacosaurus.maxResidents) {
      this.notify("Este corral admite un máximo de 8 dinosaurios.");
      return;
    }
    e.incubating = true;
    this.record("Un nuevo huevo descansa en la incubadora.");
    this.notify("Incubación en marcha. La eclosión llegará en un minuto.");
    this.changed();
  }
  hatch(egg: Egg) {
    const s = this.state;
    const d: Dinosaur = {
      id: uid(s, "dino"),
      species: egg.species,
      name:
        s.stats.hatched === 0
          ? "Guijarro"
          : s.stats.hatched === 1
            ? "Musgo"
            : `Brote ${s.stats.hatched + 1}`,
      sex: egg.sex,
      age: 0,
      genes: { ...egg.genes },
      food: 90,
      water: 90,
      health: 100,
      happiness: 85,
      bond: 10,
      mother: egg.mother,
      father: egg.father,
      offspring: [],
      generation: egg.generation,
      trait: ["Curioso", "Tranquilo", "Juguetón"][
        Math.floor(random(s) * 3)
      ] as Dinosaur["trait"],
      behaviour: "wander",
      target: { x: 20, z: -8 },
      x: 18,
      z: -8,
      decisionAt: s.minutes + 4,
      breedAt: 0,
      following: false,
      lastPet: -100,
    };
    s.dinosaurs.push(d);
    s.eggs = s.eggs.filter((e) => e.id !== egg.id);
    s.stats.hatched++;
    for (const p of s.dinosaurs)
      if (p.id === d.mother || p.id === d.father) p.offspring.push(d.id);
    this.record(`${d.name} ha nacido. Una nueva historia en la finca.`);
    this.bus.emit({ type: "hatched", id: d.id });
    this.bus.emit({ type: "sound", id: "hatch" });
    this.changed();
  }
  rename(id: string, name: string) {
    const d = this.state.dinosaurs.find((d) => d.id === id);
    if (d) {
      d.name = name.trim().slice(0, 24) || d.name;
      this.changed();
    }
  }
  care(id: string, action: "feed" | "pet" | "follow") {
    const d = this.state.dinosaurs.find((d) => d.id === id);
    if (!d) return;
    if (action === "feed") {
      if (
        !remove(this.state.inventory, "feed", 1) &&
        !remove(this.state.inventory, "vegetable", 1)
      ) {
        this.notify("Necesitas pienso o una hortaliza.");
        return;
      }
      d.food = Math.min(100, d.food + 35);
      d.bond = Math.min(100, d.bond + 5);
      d.happiness = Math.min(100, d.happiness + 8);
      d.behaviour = "eat";
      d.decisionAt = this.state.minutes + 5;
      this.notify(`${d.name} disfruta de su comida.`);
    }
    if (action === "pet") {
      if (this.state.minutes - d.lastPet < 15) {
        this.notify(`${d.name} ya ha recibido muchos mimos. Dale un ratito.`);
        return;
      }
      d.lastPet = this.state.minutes;
      d.bond = Math.min(100, d.bond + 8);
      d.happiness = Math.min(100, d.happiness + 10);
      this.notify(`${d.name} se acerca a tu mano. ♥`);
      this.bus.emit({ type: "sound", id: "pet" });
    }
    if (action === "follow") {
      d.following = !d.following;
      d.decisionAt = 0;
      this.notify(
        d.following
          ? `${d.name} te sigue. Abre la puerta para salir del corral.`
          : `${d.name} vuelve a explorar a su aire.`,
      );
    }
    this.changed();
  }
  provision(water = false) {
    const s = this.state;
    if (water) {
      s.property.water = 100;
      this.notify("Bebedero lleno de agua fresca.");
    } else {
      if (
        !remove(s.inventory, "feed", 1) &&
        !remove(s.inventory, "vegetable", 1)
      ) {
        this.notify("Necesitas pienso u hortalizas.");
        return;
      }
      s.property.food = Math.min(100, s.property.food + 35);
      this.notify(
        "Comedero repuesto. Tus dinosaurios comerán cuando tengan hambre.",
      );
    }
    this.changed();
  }
  related(a: Dinosaur, b: Dinosaur) {
    const ancestors = (d: Dinosaur, depth = 0): string[] =>
      depth >= 8
        ? []
        : [
            d.id,
            ...[d.mother, d.father].flatMap((id) => {
              const p = this.state.dinosaurs.find((x) => x.id === id);
              return p ? ancestors(p, depth + 1) : id ? [id] : [];
            }),
          ];
    const aa = ancestors(a);
    return ancestors(b).some((id) => aa.includes(id));
  }
  breed() {
    const s = this.state,
      sp = SPECIES.psittacosaurus;
    const ready = s.dinosaurs.filter(
      (d) =>
        d.age >= sp.adultAge &&
        d.food >= 50 &&
        d.water >= 50 &&
        d.happiness >= 50 &&
        s.minutes >= d.breedAt,
    );
    let pair: [Dinosaur, Dinosaur] | undefined;
    for (const a of ready.filter((d) => d.sex === "F"))
      for (const b of ready.filter((d) => d.sex === "M"))
        if (!this.related(a, b)) {
          pair = [a, b];
          break;
        }
    if (!pair) {
      this.notify(
        "Necesitas dos adultos de distinto sexo, sin parentesco, con bienestar y necesidades por encima del 50 % y sin descanso de cría.",
      );
      return;
    }
    if (
      s.eggs.filter((e) => !e.incubating).length >= 2 ||
      s.dinosaurs.length + s.eggs.length >= sp.maxResidents
    ) {
      this.notify("No hay espacio para otro huevo o habitante.");
      return;
    }
    const [a, b] = pair;
    const genes = {} as Genes;
    for (const key of Object.keys(a.genes) as (keyof Genes)[]) {
      genes[key] = Math.max(
        key === "hue" ? 0 : 0.65,
        Math.min(
          key === "hue" ? 1 : 1.4,
          (a.genes[key] + b.genes[key]) / 2 + (random(s) - 0.5) * 0.1,
        ),
      );
    }
    s.eggs.push({
      id: uid(s, "egg"),
      species: a.species,
      sex: random(s) > 0.5 ? "F" : "M",
      genes,
      progress: 0,
      incubating: false,
      mother: a.id,
      father: b.id,
      generation: Math.max(a.generation, b.generation) + 1,
    });
    a.breedAt = b.breedAt = s.minutes + sp.breedCooldown;
    s.stats.bred++;
    this.record(
      `${a.name} y ${b.name} tienen un huevo. Comienza una nueva generación.`,
    );
    this.notify("¡Un nuevo huevo! Sus genes proceden de ambos progenitores.");
    this.changed();
  }
  placement(
    type: PieceId,
    x: number,
    z: number,
    rotation: number,
  ): string | null {
    const s = this.state,
      def = BUILDINGS[type];
    const swap = Math.abs(Math.sin(rotation)) > 0.5;
    const [w, h] = swap ? [def.size[1], def.size[0]] : def.size;
    if (x - w / 2 < -33 || x + w / 2 > 34 || z - h / 2 < -28 || z + h / 2 > 23)
      return "Construye dentro de los límites de tu finca.";
    const boxes = [
      [-15, -9, 13, 12],
      [6, -12, 4, 4],
      [10, 13, 6, 7],
      [19, -9, 21, 19],
      [-5, 5, 3, 3],
    ];
    if (
      boxes.some(
        ([bx, bz, bw, bh]) =>
          Math.abs(x - bx) < (w + bw) / 2 + 0.2 &&
          Math.abs(z - bz) < (h + bh) / 2 + 0.2,
      )
    )
      return "Este espacio está ocupado.";
    if (Math.hypot(x - s.player.x, z - s.player.z) < 1.8)
      return "Deja un poco de espacio para moverte.";
    if (
      s.nodes.some(
        (n) =>
          !n.depleted &&
          Math.abs(n.x - x) < w / 2 + 1 &&
          Math.abs(n.z - z) < h / 2 + 1,
      )
    )
      return "Retira primero el recurso que ocupa este espacio.";
    if (
      type === "roof" &&
      !s.buildings.some((b) => b.type === "floor" && b.x === x && b.z === z)
    )
      return "Coloca primero una tarima bajo el tejado.";
    if (
      s.buildings.some((b) => {
        if (b.type === "floor" && (type === "wall" || type === "roof"))
          return false;
        if (type === "roof" && b.type === "wall") return false;
        const bs = BUILDINGS[b.type].size;
        const bw = Math.abs(Math.sin(b.rotation)) > 0.5 ? bs[1] : bs[0],
          bh = Math.abs(Math.sin(b.rotation)) > 0.5 ? bs[0] : bs[1];
        return (
          Math.abs(x - b.x) < (w + bw) / 2 - 0.1 &&
          Math.abs(z - b.z) < (h + bh) / 2 - 0.1
        );
      })
    )
      return "Ya hay una construcción aquí.";
    if ((s.inventory.wood || 0) < def.wood || s.money < def.money)
      return `Necesitas ${def.wood} troncos y ${def.money} monedas.`;
    return null;
  }
  build(type: PieceId, x: number, z: number, rotation: number) {
    const error = this.placement(type, x, z, rotation);
    if (error) {
      this.notify(error);
      return false;
    }
    const s = this.state,
      def = BUILDINGS[type];
    remove(s.inventory, "wood", def.wood);
    s.money -= def.money;
    s.buildings.push({ id: uid(s, "building"), type, x, z, rotation });
    this.notify(`${def.name} construida.`);
    this.changed();
    return true;
  }
  demolish(id: string) {
    const s = this.state,
      b = s.buildings.find((b) => b.id === id);
    if (!b) return;
    add(s.storage, "wood", BUILDINGS[b.type].wood, 10000);
    s.buildings = s.buildings.filter((x) => x.id !== id);
    this.notify(
      "Construcción retirada. La madera se ha recuperado en el almacén.",
    );
    this.changed();
  }
  farm(id: string) {
    const s = this.state,
      b = s.buildings.find((b) => b.id === id);
    if (!b || b.type !== "planter") return;
    if (b.plantedAt === undefined) {
      if (!remove(s.inventory, "seed", 1)) {
        this.notify("Necesitas semillas del almacén de Clara.");
        return;
      }
      b.plantedAt = s.minutes;
      s.stats.planted++;
      this.notify("Sembrado. La cosecha estará lista en 3 horas del juego.");
    } else if (s.minutes - b.plantedAt >= CROP_MINUTES) {
      if (!add(s.inventory, "vegetable", 5)) {
        this.notify("Necesitas espacio para la cosecha.");
        return;
      }
      delete b.plantedAt;
      this.notify("¡Cosecha recogida! +5 hortalizas.");
    } else
      this.notify(
        `Creciendo. Faltan ${Math.ceil(CROP_MINUTES - (s.minutes - b.plantedAt))} minutos del juego.`,
      );
    this.changed();
  }
  tick(minutes: number) {
    const s = this.state;
    s.minutes += minutes;
    const sp = SPECIES.psittacosaurus;
    for (const e of [...s.eggs])
      if (e.incubating) {
        e.progress += minutes;
        if (e.progress >= sp.incubation) this.hatch(e);
      }
    for (const d of s.dinosaurs) {
      d.age += minutes * d.genes.growth;
      d.food = Math.max(
        0,
        d.food - (minutes * sp.foodRate) / d.genes.efficiency,
      );
      d.water = Math.max(0, d.water - minutes * sp.waterRate);
      const night = s.minutes % 1440 > 1260 || s.minutes % 1440 < 360;
      if (
        d.food < 80 &&
        s.property.food > 0 &&
        Math.hypot(d.x - 24, d.z + 14) < 3
      ) {
        const amount = Math.min(minutes * 4, s.property.food, 100 - d.food);
        d.food += amount;
        s.property.food -= amount;
        d.behaviour = "eat";
      }
      if (
        d.water < 80 &&
        s.property.water > 0 &&
        Math.hypot(d.x - 14, d.z + 14) < 3
      ) {
        const amount = Math.min(minutes * 4, s.property.water, 100 - d.water);
        d.water += amount;
        s.property.water -= amount;
        d.behaviour = "drink";
      }
      if (d.food < 10 || d.water < 10) {
        d.health = Math.max(20, d.health - minutes * 0.06);
        d.happiness = Math.max(10, d.happiness - minutes * 0.08);
      } else {
        d.health = Math.min(100, d.health + minutes * 0.03);
        d.happiness = Math.min(100, d.happiness + minutes * 0.01);
      }
      if (s.minutes > d.decisionAt) {
        d.decisionAt = s.minutes + 4 + random(s) * 8;
        if (night) {
          d.behaviour = "sleep";
          d.target = { x: 23, z: -5 };
        } else if (d.food < 80 && s.property.food > 0) {
          d.behaviour = "eat";
          d.target = { x: 24, z: -14 };
        } else if (d.water < 80 && s.property.water > 0) {
          d.behaviour = "drink";
          d.target = { x: 14, z: -14 };
        } else if (d.following) {
          d.behaviour = "follow";
          d.target = { x: s.player.x, z: s.player.z };
        } else {
          d.behaviour = random(s) > 0.22 ? "wander" : "rest";
          d.target = { x: 11 + random(s) * 16, z: -16 + random(s) * 13 };
        }
      }
      if (d.behaviour === "follow") d.target = { x: s.player.x, z: s.player.z };
      const dx = d.target.x - d.x,
        dz = d.target.z - d.z,
        dist = Math.hypot(dx, dz);
      if (
        d.behaviour !== "rest" &&
        dist > (d.behaviour === "follow" ? 2 : 0.3)
      ) {
        const speed = Math.min(dist, minutes * 0.85 * d.genes.speed);
        d.x += (dx / dist) * speed;
        d.z += (dz / dist) * speed;
      }
      if (!s.property.gate) {
        d.x = Math.max(10.3, Math.min(27.7, d.x));
        d.z = Math.max(-17, Math.min(-1.2, d.z));
      }
    }
  }
  sleep() {
    for (let i = 0; i < 480; i++) this.tick(1);
    this.record("He descansado ocho horas. Un nuevo comienzo.");
    this.notify("Ocho horas después… el valle sigue su curso.");
    this.changed();
  }
  objective(): { title: string; text: string; target: Vec; progress: number } {
    const s = this.state;
    if (!s.vehicle.repaired)
      return {
        title: "Una segunda vida",
        text: "Recoge la chatarra del patio y repara tu camioneta.",
        target: { x: -5, z: 5 },
        progress: 0,
      };
    if (s.stats.sold === 0)
      return {
        title: "El fruto de tu trabajo",
        text: "Tala un árbol, carga los troncos y véndelos en el aserradero.",
        target: { x: -30, z: 5 },
        progress: 1,
      };
    if (!s.stats.discovered)
      return {
        title: "Algo extraordinario",
        text: "Explora la estación Olmo, al noreste del valle.",
        target: { x: 61, z: -50 },
        progress: 2,
      };
    if (!s.property.enclosure || !s.property.incubator)
      return {
        title: "Un hogar a su medida",
        text: "Restaura el corral y la incubadora de tu finca.",
        target: { x: 6, z: -12 },
        progress: 3,
      };
    if (!s.stats.hatched)
      return {
        title: "La vida se abre camino",
        text: "Coloca tu huevo en la incubadora y acompaña su nacimiento.",
        target: { x: 6, z: -12 },
        progress: 4,
      };
    if (!s.stats.bred)
      return {
        title: "Raíces y nuevas ramas",
        text: "Cría a tu dinosaurio. Un segundo huevo espera al noroeste de la laguna.",
        target: { x: -72, z: -72 },
        progress: 5,
      };
    return {
      title: "Una historia que es tuya",
      text: "Mejora tu casa, cultiva y haz crecer tu nueva familia.",
      target: { x: -15, z: -2 },
      progress: 6,
    };
  }
}
