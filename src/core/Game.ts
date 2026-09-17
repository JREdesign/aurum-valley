import { initialState } from "./state";
import type { State, Interactable, ItemId, PieceId, Vec } from "./types";
import { Simulation } from "../systems/Simulation";
import { Physics } from "../systems/Physics";
import { WorldView } from "../rendering/WorldView";
import { UI, type Menu } from "../ui/UI";
import { AudioSystem } from "../systems/AudioSystem";
import * as Save from "../systems/SaveSystem";
import { LOCATIONS, ITEMS } from "../data/content";
import { icon, escape } from "../ui/icons";

export class Game {
  sim!: Simulation;
  physics = new Physics();
  view!: WorldView;
  ui!: UI;
  audio = new AudioSystem();
  keys = new Set<string>();
  driving = false;
  speed = 0;
  buildType: PieceId | null = null;
  rotation = 0;
  placement: Vec = { x: 0, z: 0 };
  waypoint: (Vec & { name: string }) | null = null;
  walkTarget: Vec | null = null;
  debug = false;
  fps = 60;
  private last = 0;
  private accumulator = 0;
  private saveTimer = 0;
  private uiTimer = 0;
  private actionSave = 0;
  private dragging = false;
  private dragX = 0;
  private dragY = 0;
  private saving = false;
  private saveAgain = false;
  private hiddenAt = 0;
  async init() {
    let state: State;
    let error = "";
    try {
      state = (await Save.load()) || initialState();
    } catch (e) {
      state = initialState();
      error =
        "No se ha podido abrir el guardado. Puedes importar una copia desde Pausa.";
      console.error(e);
    }
    this.sim = new Simulation(state);
    this.driving = state.vehicle.occupied;
    await this.physics.init();
    this.physics.setPositions(state.player, state.vehicle, state.vehicle.angle);
    this.view = new WorldView(state, this.physics);
    this.ui = new UI(this.sim);
    this.ui.onAction = (action, data) => this.action(action, data);
    this.audio.enabled = state.settings.sound;
    this.sim.bus.on((event) => {
      if (event.type === "toast") this.ui.toast(event.message!);
      if (event.type === "sound") this.audio.play(event.id!);
      if (event.type === "hatched") {
        this.ui.hatch(event.id!);
        this.keys.clear();
      }
      if (event.type === "change") {
        this.view.sync();
        this.ui.update();
        if (this.ui.menu) this.ui.renderMenu();
        clearTimeout(this.actionSave);
        this.actionSave = window.setTimeout(() => void this.save(false), 1100);
      }
    });
    this.bind();
    document.querySelector("#loading")!.classList.add("hidden");
    if (error) this.ui.toast(error);
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
    if (import.meta.env.DEV)
      (window as unknown as { aurum: Game }).aurum = this;
  }
  get paused() {
    return (
      this.ui.intro ||
      !!this.ui.menu ||
      document.hidden ||
      !document.querySelector("#hatch")!.classList.contains("hidden")
    );
  }
  private bind() {
    addEventListener("keydown", (e) => {
      if ((e.target as HTMLElement).matches("input,textarea")) {
        if (e.code === "Escape") (e.target as HTMLInputElement).blur();
        return;
      }
      if (
        [
          "Space",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "F1",
          "Tab",
        ].includes(e.code)
      )
        e.preventDefault();
      this.keys.add(e.code);
      if (e.repeat) return;
      if (e.code === "Escape") {
        if (this.buildType) this.endBuild();
        else if (this.ui.menu) this.ui.close();
        else if (!this.ui.intro) this.ui.open("pause");
        return;
      }
      if (e.code === "F3") {
        e.preventDefault();
        this.debug = !this.debug;
        return;
      }
      if (this.ui.intro) {
        if (e.code === "Enter") this.action("start");
        return;
      }
      if (e.code === "KeyE" && !this.paused && !this.buildType) this.interact();
      if (e.code === "KeyR" && this.buildType) {
        this.rotation += Math.PI / 2;
        return;
      }
      if (e.code === "Delete" && this.buildType) {
        const b = this.sim.state.buildings.find(
          (b) => Math.hypot(b.x - this.placement.x, b.z - this.placement.z) < 3,
        );
        if (
          b &&
          Math.hypot(
            b.x - this.sim.state.player.x,
            b.z - this.sim.state.player.z,
          ) < 18
        )
          this.sim.demolish(b.id);
        return;
      }
      const menus: Record<string, Menu> = {
        KeyI: "inventory",
        KeyM: "map",
        KeyJ: "journal",
        KeyR: "ranch",
        F1: "help",
      };
      if (menus[e.code]) this.action("menu", menus[e.code]!);
      if (e.code === "KeyB" && !this.driving) this.action("build-mode");
    });
    addEventListener("keyup", (e) => this.keys.delete(e.code));
    addEventListener("blur", () => {
      this.keys.clear();
      this.dragging = false;
    });
    document.addEventListener("visibilitychange", () => {
      this.keys.clear();
      if (document.hidden) {
        this.hiddenAt = performance.now();
        void this.save(false);
      } else {
        this.last = performance.now();
        this.accumulator = 0;
      }
    });
    const canvas = this.view.renderer.domElement;
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("pointerdown", (e) => {
      if (e.button === 2) {
        this.dragging = true;
        this.dragX = e.clientX;
        this.dragY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
      }
      if (e.button === 0 && !this.paused) {
        const pos = this.view.groundAt(e.clientX, e.clientY);
        if (pos) {
          if (this.buildType) {
            this.placement = pos;
            if (
              Math.hypot(
                pos.x - this.sim.state.player.x,
                pos.z - this.sim.state.player.z,
              ) > 18
            ) {
              this.ui.toast("Acércate al lugar donde quieres construir.");
              return;
            }
            this.sim.build(this.buildType, pos.x, pos.z, this.rotation);
          } else if (!this.driving) this.walkTarget = pos;
        }
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (this.dragging) {
        this.view.yaw -= (e.clientX - this.dragX) * 0.006;
        this.view.pitch = Math.max(
          0.23,
          Math.min(1.15, this.view.pitch + (e.clientY - this.dragY) * 0.004),
        );
        this.dragX = e.clientX;
        this.dragY = e.clientY;
      }
      if (this.buildType) {
        const pos = this.view.groundAt(e.clientX, e.clientY);
        if (pos) this.placement = pos;
      }
    });
    canvas.addEventListener("pointerup", () => (this.dragging = false));
    canvas.addEventListener(
      "lostpointercapture",
      () => (this.dragging = false),
    );
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.view.distance = Math.max(
          8,
          Math.min(49, this.view.distance + e.deltaY * 0.02),
        );
      },
      { passive: false },
    );
    document
      .querySelector("#interaction")!
      .addEventListener("click", () => this.interact());
    window.addEventListener("pagehide", () => void this.save(false));
  }
  endBuild() {
    this.buildType = null;
    this.ui.buildOpen = false;
    this.view.setGhost(null);
    document.querySelector("#buildbar")!.classList.add("hidden");
    this.ui.update();
  }
  private nearHome() {
    return (
      Math.hypot(this.sim.state.player.x - 12, this.sim.state.player.z + 8) < 35
    );
  }
  async action(action: string, data = "") {
    const s = this.sim.state;
    if (action === "start") {
      this.ui.start();
      s.started = true;
      this.audio.start();
      void this.save(false);
      return;
    }
    if (action === "menu") {
      this.endBuild();
      this.keys.clear();
      this.walkTarget = null;
      if (this.ui.menu === data) this.ui.close();
      else this.ui.open(data as Menu);
      return;
    }
    if (action === "close") {
      this.ui.close();
      return;
    }
    if (action === "save") {
      await this.save(true);
      return;
    }
    if (action === "sound") {
      s.settings.sound = !s.settings.sound;
      this.audio.toggle(s.settings.sound);
      this.sim.changed();
      return;
    }
    if (action === "fullscreen") {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        this.ui.toast(
          "El navegador no permite pantalla completa aquí. Puedes abrir el juego en una pestaña independiente.",
        );
      }
      return;
    }
    if (action === "waypoint") {
      const q = this.sim.objective();
      this.waypoint = { ...q.target, name: q.title };
      this.ui.toast("Objetivo marcado. Sigue el indicador de distancia.");
      return;
    }
    if (action === "map-pin") {
      const l = LOCATIONS.find((l) => l.id === data);
      if (l) {
        this.waypoint = { ...l };
        this.ui.close();
      }
      return;
    }
    if (action === "build-mode") {
      if (this.driving) {
        this.ui.toast("Baja de la camioneta para construir.");
        return;
      }
      if (this.buildType) this.endBuild();
      else {
        this.buildType = "fence";
        this.ui.buildBar(this.buildType);
        this.view.setGhost(this.buildType);
        this.placement = {
          x: Math.round(s.player.x / 2) * 2,
          z: Math.round((s.player.z - 6) / 2) * 2,
        };
      }
      return;
    }
    if (action === "select-build") {
      this.buildType = data as PieceId;
      this.ui.buildBar(this.buildType);
      this.view.setGhost(this.buildType);
      return;
    }
    if (action === "inspect-dino") {
      this.ui.selectedDino = data;
      this.ui.open("ranch");
      return;
    }
    if (action === "dino-back") {
      this.ui.selectedDino = null;
      this.ui.renderMenu();
      return;
    }
    if (action === "rename") {
      if (this.ui.selectedDino) this.sim.rename(this.ui.selectedDino, data);
      return;
    }
    if (action === "meet-dino") {
      document.querySelector("#hatch")!.classList.add("hidden");
      this.ui.selectedDino = data;
      this.ui.open("ranch");
      return;
    }
    if (action === "export") {
      const blob = new Blob([JSON.stringify(s, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Aurum-dia-${Math.floor(s.minutes / 1440) + 1}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return;
    }
    if (action === "import") {
      const input = document.querySelector<HTMLInputElement>("#import-save")!;
      input.onchange = async () => {
        const f = input.files?.[0];
        if (!f) return;
        try {
          const imported = Save.validateSave(JSON.parse(await f.text()));
          if (
            !confirm(
              "Esta copia sustituirá tu partida actual. ¿Quieres continuar?",
            )
          )
            return;
          await Save.save(imported);
          location.reload();
        } catch {
          this.ui.toast(
            "No se pudo importar. Elige una copia compatible de Aurum.",
          );
        }
      };
      input.click();
      return;
    }
    if (action === "shadows") {
      s.settings.shadows = !s.settings.shadows;
      this.sim.changed();
      return;
    }
    if (action === "drop") {
      this.sim.drop(data as ItemId);
      return;
    }
    if (["feed", "pet", "follow"].includes(action)) {
      const d = s.dinosaurs.find((d) => d.id === data);
      if (!d || Math.hypot(d.x - s.player.x, d.z - s.player.z) > 5) {
        this.ui.toast("Acércate a tu dinosaurio para interactuar.");
        return;
      }
      this.sim.care(data, action as "feed" | "pet" | "follow");
      return;
    }
    if (action === "breed") {
      if (!this.nearHome()) {
        this.ui.toast("Vuelve al corral para iniciar la cría.");
        return;
      }
      this.sim.breed();
      return;
    }
    if (action === "buy" && this.ui.menu === "shop")
      this.sim.buy(data as ItemId);
    if (action === "sell" && this.ui.menu === "market")
      this.sim.sell(data as ItemId);
    if (action === "sell-all" && this.ui.menu === "market") this.sim.sell();
    if (
      action === "sell-cargo" &&
      this.ui.menu === "market" &&
      Math.hypot(s.vehicle.x + 50, s.vehicle.z - 36) < 16
    )
      this.sim.sell(undefined, true);
    if (action === "repair")
      this.sim.repair(data as "truck" | "house" | "enclosure" | "incubator");
    if (action === "drive") {
      if (!s.vehicle.repaired) {
        this.ui.toast("Primero repara la camioneta.");
        return;
      }
      if (s.vehicle.condition <= 0) {
        this.ui.toast("El motor necesita mantenimiento.");
        return;
      }
      this.driving = true;
      s.vehicle.occupied = true;
      this.speed = 0;
      this.ui.close();
      this.endBuild();
      this.keys.clear();
    }
    if (action === "refuel") this.sim.refuel();
    if (action === "maintain") this.sim.maintain();
    if (action.startsWith("transfer-") || action.startsWith("take-")) {
      const target = action.endsWith("cargo") ? "cargo" : "storage";
      this.sim.transfer(data as ItemId, target, action.startsWith("take-"));
    }
    if (action === "sleep") {
      this.ui.close();
      this.sim.sleep();
      void this.save(false);
    }
    if (action === "incubate") this.sim.incubate(data);
    if (action === "provision") this.sim.provision();
    if (action === "water") this.sim.provision(true);
    if (action === "gate") {
      s.property.gate = !s.property.gate;
      this.sim.changed();
    }
  }
  nearest(): Interactable | null {
    const s = this.sim.state,
      p = s.player;
    const all: Interactable[] = [
      {
        id: "home",
        kind: "home",
        x: -15,
        z: -2,
        label: "Volver a casa",
        subtitle: "Restaurar · descansar · guardar",
        radius: 4.8,
      },
      {
        id: "storage",
        kind: "storage",
        x: -8,
        z: 1,
        label: "Abrir el almacén",
        subtitle: "Un sitio para cada cosa",
        radius: 3,
      },
      {
        id: "truck",
        kind: "vehicle",
        x: s.vehicle.x,
        z: s.vehicle.z,
        label: s.vehicle.repaired ? "Mi camioneta" : "Reparar la camioneta",
        subtitle: s.vehicle.repaired
          ? "Conducir · cargar · repostar"
          : "4 chatarra + 35 monedas",
        radius: 5,
      },
      {
        id: "incubator",
        kind: "incubator",
        x: 6,
        z: -12,
        label: "Usar la incubadora",
        subtitle: s.property.incubator
          ? "Un pequeño milagro en marcha"
          : "Reparar · 3 chatarra + 55 monedas",
        radius: 3.8,
      },
      {
        id: "enclosure",
        kind: "enclosure",
        x: 19,
        z: 1,
        label: s.property.enclosure
          ? "Cuidar el corral"
          : "Restaurar el corral",
        subtitle: s.property.enclosure
          ? "Comida · agua · puerta"
          : "6 troncos + 45 monedas",
        radius: 4.8,
      },
      {
        id: "feeder",
        kind: "enclosure",
        x: 24,
        z: -14,
        label: "Reponer comedero",
        subtitle: "Cuidar el corral",
        radius: 3,
      },
      {
        id: "water",
        kind: "enclosure",
        x: 14,
        z: -14,
        label: "Llenar el bebedero",
        subtitle: "Agua fresca para tu familia",
        radius: 3,
      },
      {
        id: "shop",
        kind: "shop",
        x: 44,
        z: 34,
        label: "Hablar con Clara",
        subtitle: "Pienso · semillas · materiales",
        radius: 4,
      },
      {
        id: "market",
        kind: "market",
        x: -50,
        z: 36,
        label: "Vender a Tomás",
        subtitle: "El aserradero compra tus recursos",
        radius: 4.8,
      },
    ];
    for (const n of s.nodes)
      if (!n.depleted && Math.hypot(n.x - p.x, n.z - p.z) < 5)
        all.push({
          id: n.id,
          kind: "node",
          ref: n.id,
          x: n.x,
          z: n.z,
          radius: n.type === "tree" ? 3.6 : 3,
          label:
            n.type === "tree"
              ? `Talar ${n.variant === 0 ? "pino" : "roble"}`
              : n.type === "egg"
                ? "Recoger huevo misterioso"
                : n.type === "scrap"
                  ? "Recuperar chatarra"
                  : n.type === "fossil"
                    ? "Recoger fragmento fósil"
                    : "Recoger piedra",
          subtitle:
            n.type === "tree"
              ? `Hacha de mano · ${n.health}/3 golpes restantes`
              : n.type === "egg"
                ? "Algo extraordinario espera dentro"
                : "Materiales para un nuevo comienzo",
        });
    for (const d of s.drops)
      if (Math.hypot(d.x - p.x, d.z - p.z) < 4)
        all.push({
          id: d.id,
          kind: "drop",
          ref: d.id,
          x: d.x,
          z: d.z,
          radius: 3,
          label: `Recoger ${ITEMS[d.item].name.toLowerCase()}`,
          subtitle: `${d.quantity} unidad · ${ITEMS[d.item].weight * d.quantity} kg`,
        });
    for (const d of s.dinosaurs)
      if (Math.hypot(d.x - p.x, d.z - p.z) < 5)
        all.push({
          id: d.id,
          kind: "dino",
          ref: d.id,
          x: d.x,
          z: d.z,
          radius: 3.5,
          label: `Saludar a ${d.name}`,
          subtitle: `Psittacosaurus · ${d.trait.toLowerCase()}`,
        });
    for (const b of s.buildings)
      if (Math.hypot(b.x - p.x, b.z - p.z) < 4) {
        if (["planter", "storage", "trough"].includes(b.type))
          all.push({
            id: b.id,
            kind:
              b.type === "planter"
                ? "farm"
                : b.type === "storage"
                  ? "storage"
                  : "enclosure",
            ref: b.id,
            x: b.x,
            z: b.z,
            radius: 3,
            label:
              b.type === "planter"
                ? b.plantedAt === undefined
                  ? "Sembrar el huerto"
                  : "Revisar la cosecha"
                : b.type === "storage"
                  ? "Abrir el almacén"
                  : "Reponer comedero",
            subtitle: "Tu finca está creciendo",
          });
      }
    return (
      all
        .filter((a) => Math.hypot(a.x - p.x, a.z - p.z) < a.radius)
        .sort(
          (a, b) =>
            Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z),
        )[0] || null
    );
  }
  interact() {
    if (this.paused || this.buildType) return;
    const s = this.sim.state;
    if (this.driving) {
      if (Math.abs(this.speed) > 1.5) {
        this.ui.toast("Frena antes de bajar de la camioneta.");
        return;
      }
      const a = s.vehicle.angle;
      const candidates = [
        {
          x: s.vehicle.x + Math.cos(a) * 3.3,
          z: s.vehicle.z - Math.sin(a) * 3.3,
        },
        {
          x: s.vehicle.x - Math.cos(a) * 3.3,
          z: s.vehicle.z + Math.sin(a) * 3.3,
        },
        {
          x: s.vehicle.x - Math.sin(a) * 4.5,
          z: s.vehicle.z - Math.cos(a) * 4.5,
        },
      ];
      const p = candidates.find((p) => this.physics.canStand(p));
      if (!p) {
        this.ui.toast("No hay espacio para bajar. Aparca un poco más lejos.");
        return;
      }
      this.driving = false;
      s.vehicle.occupied = false;
      this.speed = 0;
      s.player.x = p.x;
      s.player.z = p.z;
      this.physics.teleportPlayer(p);
      this.sim.changed();
      return;
    }
    const target = this.nearest();
    if (!target) return;
    this.walkTarget = null;
    this.keys.clear();
    if (target.kind === "node") {
      const n = s.nodes.find((n) => n.id === target.id)!;
      if (n.type === "tree" && n.health === 1) this.view.fallTree(n);
      this.sim.collect(target.id);
    } else if (target.kind === "drop") this.sim.pickup(target.id);
    else if (target.kind === "dino") {
      this.ui.selectedDino = target.id;
      this.ui.open("ranch");
    } else if (target.kind === "farm") this.sim.farm(target.id);
    else this.ui.open(target.kind as Menu);
  }
  async save(manual: boolean) {
    if (this.saving) {
      this.saveAgain = true;
      return;
    }
    this.saving = true;
    try {
      await Save.save(this.sim.state);
      this.ui.saveStatus = "Tu historia está guardada";
      if (manual) this.ui.toast("Partida guardada. Tu hogar te espera.");
    } catch (e) {
      console.error(e);
      this.ui.saveStatus = "No se ha podido guardar";
      this.ui.toast(
        "No se pudo guardar en este navegador. Descarga una copia desde Pausa.",
      );
    } finally {
      this.saving = false;
      this.ui.update();
      if (this.saveAgain) {
        this.saveAgain = false;
        void this.save(false);
      }
    }
  }
  private frame(now: number) {
    const elapsed = (now - this.last) / 1000;
    const dt = Math.min(elapsed, 0.05);
    this.fps += (1 / Math.max(0.001, elapsed) - this.fps) * 0.05;
    this.last = now;
    const s = this.sim.state;
    let moving = false;
    if (!this.paused) {
      const up = this.keys.has("KeyW") || this.keys.has("ArrowUp"),
        down = this.keys.has("KeyS") || this.keys.has("ArrowDown"),
        left = this.keys.has("KeyA") || this.keys.has("ArrowLeft"),
        right = this.keys.has("KeyD") || this.keys.has("ArrowRight");
      if (this.driving) {
        const v = s.vehicle,
          throttle = (up ? 1 : 0) - (down ? 1 : 0),
          steer = (left ? 1 : 0) - (right ? 1 : 0);
        if (v.fuel > 0 && v.condition > 0) this.speed += throttle * 8 * dt;
        this.speed *= Math.exp(
          -dt * (this.keys.has("Space") ? 7 : throttle === 0 ? 1.1 : 0.15),
        );
        this.speed = Math.max(-6, Math.min(16, this.speed));
        v.angle +=
          steer *
          Math.min(1.2, Math.abs(this.speed) / 7) *
          dt *
          Math.sign(this.speed);
        const dx = Math.sin(v.angle) * this.speed * dt,
          dz = Math.cos(v.angle) * this.speed * dt;
        const p = this.physics.move(dx, dz, dt, true, v.angle);
        if (
          Math.hypot(p.x - v.x, p.z - v.z) < Math.hypot(dx, dz) * 0.4 &&
          Math.abs(this.speed) > 2
        ) {
          v.condition = Math.max(0, v.condition - Math.abs(this.speed) * 0.14);
          v.parts.engine = v.condition;
          this.speed *= 0.2;
        }
        v.x = p.x;
        v.z = p.z;
        s.player.x = p.x;
        s.player.z = p.z;
        s.player.angle = v.angle;
        v.fuel = Math.max(0, v.fuel - Math.abs(this.speed) * dt * 0.014);
        moving = Math.abs(this.speed) > 0.1;
      } else {
        const f = (up ? 1 : 0) - (down ? 1 : 0),
          r = (right ? 1 : 0) - (left ? 1 : 0),
          len = Math.hypot(f, r),
          speed =
            this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") ? 8 : 4.8;
        let dx = len
            ? ((-Math.sin(this.view.yaw) * f + Math.cos(this.view.yaw) * r) /
                len) *
              speed *
              dt
            : 0,
          dz = len
            ? ((-Math.cos(this.view.yaw) * f - Math.sin(this.view.yaw) * r) /
                len) *
              speed *
              dt
            : 0;
        if (len) this.walkTarget = null;
        if (this.walkTarget) {
          const tx = this.walkTarget.x - s.player.x,
            tz = this.walkTarget.z - s.player.z,
            dist = Math.hypot(tx, tz);
          if (dist < 0.6) this.walkTarget = null;
          else {
            dx = (tx / dist) * speed * dt;
            dz = (tz / dist) * speed * dt;
          }
        }
        const p = this.physics.move(dx, dz, dt, false, s.vehicle.angle);
        if (
          this.walkTarget &&
          Math.hypot(p.x - s.player.x, p.z - s.player.z) < 0.003 &&
          dt > 0.005
        )
          this.walkTarget = null;
        s.player.x = p.x;
        s.player.z = p.z;
        if (dx || dz) s.player.angle = Math.atan2(dx, dz);
        moving = !!(dx || dz);
      }
      this.accumulator += dt;
      while (this.accumulator >= 0.1) {
        this.sim.tick(0.1);
        this.accumulator -= 0.1;
      }
      this.saveTimer += dt;
      if (this.saveTimer >= 30) {
        this.saveTimer = 0;
        void this.save(false);
      }
    }
    if (this.buildType) {
      const p = this.placement;
      const error =
        Math.hypot(p.x - s.player.x, p.z - s.player.z) > 18
          ? "Acércate para construir aquí."
          : this.sim.placement(this.buildType, p.x, p.z, this.rotation);
      this.view.updateGhost(p.x, p.z, this.rotation, !error);
      this.ui.set(
        "build-hint",
        error || "Espacio disponible · Haz clic para construir.",
      );
    }
    const target = this.nearest();
    this.view.targetRing.visible =
      !!target && !this.paused && !this.buildType && !this.driving;
    if (target) this.view.targetRing.position.set(target.x, 0.08, target.z);
    this.uiTimer += dt;
    if (this.uiTimer > 0.15) {
      this.uiTimer = 0;
      this.ui.update();
      this.ui.showInteraction(target, this.driving);
      const el = document.querySelector("#vehicle-hud")!;
      el.classList.toggle("hidden", !this.driving);
      if (this.driving)
        el.innerHTML = `<span class="eyebrow">AURUM PICKUP</span><strong>${Math.round(Math.abs(this.speed) * 3.6)}</strong><small>km/h</small><div class="stats"><span>◒ ${Math.round(s.vehicle.fuel)} %</span><span>⚙ ${Math.round(s.vehicle.condition)} %</span></div>`;
      const wp = document.querySelector("#waypoint")!;
      wp.classList.toggle(
        "hidden",
        !this.waypoint || this.ui.intro || !!this.ui.menu,
      );
      if (this.waypoint) {
        const d = Math.hypot(
          this.waypoint.x - s.player.x,
          this.waypoint.z - s.player.z,
        );
        wp.innerHTML = `${icon("pin", 13)} ${escape(this.waypoint.name)} · ${Math.round(d)} m`;
        if (d < 5) this.waypoint = null;
      }
    }
    let debugEl = document.querySelector<HTMLDivElement>("#debug");
    if (!debugEl) {
      debugEl = document.createElement("div");
      debugEl.id = "debug";
      document.querySelector("#ui")!.append(debugEl);
    }
    debugEl.classList.toggle("hidden", !this.debug);
    if (this.debug)
      debugEl.textContent = `${Math.round(this.fps)} FPS · X ${s.player.x.toFixed(1)} Z ${s.player.z.toFixed(1)} · Cámara ${this.view.yaw.toFixed(2)} / ${this.view.pitch.toFixed(2)} · Destino ${JSON.stringify(this.walkTarget)} · Teclas ${[...this.keys].join(",")} · ${this.view.renderer.info.render.calls} llamadas`;
    this.view.render(dt, moving, this.driving, this.speed);
    requestAnimationFrame((t) => this.frame(t));
  }
}
