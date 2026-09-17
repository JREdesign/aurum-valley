import type {
  State,
  Interactable,
  ItemId,
  PieceId,
  Dinosaur,
} from "../core/types";
import {
  BUILDINGS,
  ITEMS,
  LOCATIONS,
  ECONOMY,
  REPAIR_MATERIALS,
  SPECIES,
} from "../data/content";
import { weight } from "../systems/Inventory";
import { Simulation } from "../systems/Simulation";
import { icon, escape } from "./icons";

export type Menu =
  | "inventory"
  | "map"
  | "journal"
  | "ranch"
  | "shop"
  | "market"
  | "vehicle"
  | "home"
  | "storage"
  | "incubator"
  | "enclosure"
  | "help"
  | "pause"
  | null;
export class UI {
  menu: Menu = null;
  intro = true;
  buildOpen = false;
  selectedDino: string | null = null;
  interaction: Interactable | null = null;
  onAction: (action: string, data?: string) => void = () => {};
  root = document.querySelector<HTMLDivElement>("#ui")!;
  modal!: HTMLElement;
  map!: HTMLCanvasElement;
  toastTimer = 0;
  saveStatus = "Guardado automático";
  constructor(public sim: Simulation) {
    this.layout();
    this.root.addEventListener("click", (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-action]",
      );
      if (el && !el.hasAttribute("disabled"))
        this.onAction(el.dataset.action!, el.dataset.id);
    });
    this.root.addEventListener("change", (e) => {
      const el = e.target as HTMLInputElement;
      if (el.id === "dino-name") this.onAction("rename", el.value);
    });
  }
  get s(): State {
    return this.sim.state;
  }
  layout() {
    this.root.innerHTML = `
    <header class="hud-top"><div class="brand"><span class="brand-symbol">${icon("sprout", 29)}</span><div><strong>aurum<span>®</span></strong><small>VALLE DE LOS GIGANTES</small></div></div><div class="location-chip">${icon("pin", 14)} <span id="location-name">Finca Aurum</span><i></i><span class="location-small">TU NUEVO HOGAR</span></div><div class="status-bar"><span class="weather-icon">${icon("sun", 25)}</span><div><small id="day">DÍA 1 · PRIMAVERA</small><strong id="time">08:00</strong></div><span class="status-divider"></span><div class="money">${icon("coin", 22)}<strong id="money">85</strong></div><button class="icon-button" data-action="menu" data-id="pause" title="Pausa (Esc)" aria-label="Pausa">${icon("pause")}</button></div></header>
    <aside id="objective" class="objective hidden"><div class="eyebrow"><span class="tiny-line"></span>TU PRÓXIMO CAPÍTULO <span id="quest-number">01</span></div><h2 id="quest-title"></h2><p id="quest-text"></p><button class="text-button" data-action="waypoint">Seguir el camino ${icon("arrow", 16)}</button><div class="quest-progress" id="quest-progress"></div></aside>
    <div class="side-actions"><button data-action="save" class="icon-button" title="Guardar partida" aria-label="Guardar partida">${icon("save")}</button><button data-action="sound" id="sound-btn" class="icon-button" title="Sonido" aria-label="Activar o desactivar sonido">${icon("sound")}</button><button data-action="fullscreen" class="icon-button" title="Pantalla completa" aria-label="Pantalla completa">${icon("full")}</button><button data-action="menu" data-id="help" class="icon-button" title="Cómo jugar (F1)" aria-label="Cómo jugar">${icon("help")}</button></div>
    <section id="welcome" class="welcome"><div class="eyebrow"><span class="tiny-line"></span> UN LUGAR AL QUE PERTENECER</div><h1>${this.s.started ? "Tu historia<br>continúa." : "Un pequeño hogar.<br>Una gran <em>aventura.</em>"}</h1><p>Un valle por explorar. Una finca que cuidar.<br>Y una vida extraordinaria a punto de nacer.</p><button class="primary large" data-action="start">${this.s.started ? "Volver a mi rancho" : "Comenzar mi historia"} ${icon("arrow")}</button><span class="welcome-note">${icon("leaf", 14)} A tu ritmo. A tu manera.</span><div class="welcome-controls"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Caminar</span><span><kbd>E</kbd> Interactuar</span></div></section>
    <div id="waypoint" class="waypoint hidden"></div><div id="vehicle-hud" class="vehicle-hud hidden"></div><div id="interaction" class="interaction hidden"></div><div id="toast" class="toast hidden" role="status"></div>
    <div id="buildbar" class="buildbar hidden"></div>
    <footer class="hud-bottom"><div class="bottom-note"><span class="live-dot"></span><span id="save-status">Un nuevo comienzo</span><small>Hecho para perder la noción del tiempo.</small></div><nav class="hotbar" aria-label="Herramientas del rancho">${[
      ["inventory", "bag", "Mochila", "I"],
      ["map", "map", "Mapa", "M"],
      ["build", "build", "Construir", "B"],
      ["ranch", "dino", "Mi rancho", "R"],
      ["journal", "book", "Diario", "J"],
    ]
      .map(
        ([id, ic, label, key]) =>
          `<button data-action="${id === "build" ? "build-mode" : "menu"}" data-id="${id}" title="${label} (${key})" aria-label="${label}" id="nav-${id}"><kbd>${key}</kbd>${icon(ic, 25)}<span>${label}</span></button>`,
      )
      .join(
        "",
      )}</nav><button class="minimap" data-action="menu" data-id="map" aria-label="Abrir mapa"><div class="minimap-title"><span>${icon("compass", 15)} EL VALLE</span><kbd>M</kbd></div><canvas id="minimap" width="400" height="260"></canvas><div class="minimap-foot"><span>Una tierra de posibilidades</span><span>N ↑</span></div></button></footer>
    <div id="modal-root" class="modal-backdrop hidden"></div><div id="hatch" class="hatch hidden"></div>`;
    this.modal = this.root.querySelector("#modal-root")!;
    this.map = this.root.querySelector("#minimap")!;
    this.update();
  }
  start() {
    this.intro = false;
    this.root.querySelector("#welcome")!.classList.add("hidden");
    this.root.querySelector("#objective")!.classList.remove("hidden");
  }
  button(
    action: string,
    label: string,
    data = "",
    style = "secondary",
    disabled = false,
  ) {
    return `<button class="${style}" data-action="${action}" data-id="${escape(data)}" ${disabled ? "disabled" : ""}>${label}</button>`;
  }
  open(menu: Menu) {
    this.menu = menu;
    this.buildOpen = false;
    this.root.querySelector("#buildbar")!.classList.add("hidden");
    this.renderMenu();
    this.update();
  }
  close() {
    this.menu = null;
    this.modal.classList.add("hidden");
    this.update();
  }
  update() {
    const s = this.s,
      min = Math.floor(s.minutes % 1440);
    this.set("day", `DÍA ${Math.floor(s.minutes / 1440) + 1} · PRIMAVERA`);
    this.set(
      "time",
      `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`,
    );
    this.set("money", s.money.toLocaleString("es-ES"));
    this.set("save-status", this.saveStatus);
    const q = this.sim.objective();
    this.set("quest-title", q.title);
    this.set("quest-text", q.text);
    this.set("quest-number", String(q.progress + 1).padStart(2, "0"));
    this.root.querySelector("#quest-progress")!.innerHTML = Array.from(
      { length: 7 },
      (_, i) => `<i class="${i <= q.progress ? "done" : ""}"></i>`,
    ).join("");
    const loc = LOCATIONS.reduce((a, b) =>
      Math.hypot(s.player.x - a.x, s.player.z - a.z) <
      Math.hypot(s.player.x - b.x, s.player.z - b.z)
        ? a
        : b,
    );
    this.set(
      "location-name",
      Math.hypot(s.player.x - loc.x, s.player.z - loc.z) < 30
        ? loc.name
        : "Senderos del valle",
    );
    this.root.querySelector("#sound-btn")!.innerHTML = icon(
      s.settings.sound ? "sound" : "mute",
    );
    for (const el of this.root.querySelectorAll(".hotbar button"))
      el.classList.toggle(
        "selected",
        (el as HTMLElement).dataset.id === this.menu ||
          ((el as HTMLElement).dataset.id === "build" && this.buildOpen),
      );
    this.drawMap(this.map);
    if (this.menu === "map") {
      const c = document.querySelector<HTMLCanvasElement>("#large-map");
      if (c) this.drawMap(c, true);
    }
  }
  set(id: string, text: string) {
    const el = this.root.querySelector("#" + id);
    if (el && el.textContent !== text) el.textContent = text;
  }
  showInteraction(target: Interactable | null, driving = false) {
    this.interaction = target;
    const el = this.root.querySelector("#interaction")!;
    el.classList.toggle(
      "hidden",
      (!target && !driving) || this.intro || !!this.menu || this.buildOpen,
    );
    if (driving) {
      el.innerHTML = `<kbd>E</kbd><div><strong>Bajar de la camioneta</strong><span>W/S acelerar · A/D girar · Espacio frenar</span></div>`;
      return;
    }
    if (target)
      el.innerHTML = `<kbd>E</kbd><div><strong>${escape(target.label)}</strong><span>${escape(target.subtitle)}</span></div><span class="interaction-dot">↗</span>`;
  }
  toast(message: string) {
    const el = this.root.querySelector("#toast")!;
    el.innerHTML = `<span>${icon("leaf", 18)}</span>${escape(message)}`;
    el.classList.remove("hidden");
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => el.classList.add("hidden"), 4500);
  }
  hatch(id: string) {
    const d = this.s.dinosaurs.find((d) => d.id === id);
    if (!d) return;
    const el = this.root.querySelector("#hatch")!;
    el.classList.remove("hidden");
    el.innerHTML = `<div class="hatch-stars">✦ &nbsp; ✧ &nbsp; ✦</div><div class="eyebrow">LA VIDA SE ABRE CAMINO</div><div class="hatch-egg">${icon("dino", 70)}</div><h2>Hola, ${escape(d.name)}.</h2><p>Un pequeño Psittacosaurus.<br>Una historia que empieza contigo.</p>${this.button("meet-dino", "Conocer a mi dinosaurio " + icon("heart", 17), id, "primary")}`;
  }
  buildBar(selected: PieceId) {
    this.buildOpen = true;
    this.menu = null;
    this.modal.classList.add("hidden");
    const el = this.root.querySelector("#buildbar")!;
    el.classList.remove("hidden");
    el.innerHTML = `<div class="build-heading"><div><span class="eyebrow">HAZLO TUYO</span><strong>Un nuevo rincón para tu finca</strong></div><span><kbd>R</kbd> Girar &nbsp; <kbd>Clic</kbd> Colocar &nbsp; <kbd>Supr</kbd> Retirar &nbsp; <kbd>Esc</kbd> Salir</span></div><div class="build-options">${Object.entries(
      BUILDINGS,
    )
      .map(
        ([id, b]) =>
          `<button class="${id === selected ? "active" : ""}" data-action="select-build" data-id="${id}">${icon(b.icon, 24)}<strong>${b.name}</strong><small>${b.wood} troncos · ${b.money} ¤</small></button>`,
      )
      .join(
        "",
      )}</div><div id="build-hint">Mueve el cursor sobre el terreno de tu finca.</div>`;
    this.update();
  }
  renderMenu() {
    if (!this.menu) {
      this.modal.classList.add("hidden");
      return;
    }
    this.modal.classList.remove("hidden");
    const titles: Record<Exclude<Menu, null>, [string, string]> = {
      inventory: ["LO QUE LLEVAS CONTIGO", "Tu mochila"],
      map: ["TODOS LOS CAMINOS LLEVAN A CASA", "El valle de Aurum"],
      journal: ["LAS PEQUEÑAS COSAS IMPORTAN", "Mi diario"],
      ranch: ["CADA UNO TIENE SU HISTORIA", "La familia del rancho"],
      shop: ["CLARA · ALMACÉN DEL VALLE", "Un poco de todo"],
      market: ["TOMÁS · ASERRADERO", "El fruto de tu trabajo"],
      vehicle: ["VIEJAS RUEDAS, NUEVOS CAMINOS", "Mi camioneta"],
      home: ["TU REFUGIO EN EL VALLE", "Hogar, dulce hogar"],
      storage: ["UN SITIO PARA CADA COSA", "Almacén de la finca"],
      incubator: ["ALGO EXTRAORDINARIO ESTÁ CRECIENDO", "La incubadora"],
      enclosure: ["UN HOGAR PARA TU NUEVA FAMILIA", "El pequeño corral"],
      help: ["BIENVENIDO A AURUM", "A tu ritmo"],
      pause: ["UN RESPIRO", "Tu aventura te espera"],
    };
    const [eyebrow, title] = titles[this.menu];
    this.modal.innerHTML = `<section class="panel ${this.menu === "map" ? "map-panel" : ""}" role="dialog" aria-modal="true" aria-label="${title}"><header><div><div class="eyebrow">${eyebrow}</div><h2>${title}</h2></div><button class="icon-button close" data-action="close" aria-label="Cerrar">${icon("close")}</button></header><div class="panel-body">${this.content()}</div><footer>${icon("leaf", 14)} <span>Las buenas historias se construyen poco a poco.</span><kbd>Esc</kbd></footer></section>`;
    if (this.menu === "map")
      this.drawMap(this.root.querySelector("#large-map")!, true);
  }
  private content(): string {
    const s = this.s;
    if (this.menu === "inventory")
      return `<div class="section-line"><span>Herramientas y provisiones</span><strong>${weight(s.inventory).toFixed(1)} / 60 kg</strong></div><div class="meter"><i style="width:${(weight(s.inventory) / 60) * 100}%"></i></div><div class="item-grid"><div class="item-card tool">${icon("tools", 30)}<strong>Hacha de mano</strong><span>Siempre contigo</span><small>Acércate a un árbol y pulsa E.</small></div>${this.itemCards("inventory")}</div>${s.eggs.length ? `<div class="notice">${icon("egg")} Estuche protegido: ${s.eggs.filter((e) => !e.incubating).length}/2 huevos. Puedes revisarlos en la incubadora.</div>` : ""}<p class="subtle">Los objetos que sueltes permanecen en el suelo. Puedes recuperarlos con E.</p>`;
    if (this.menu === "shop")
      return `<p class="dialogue">«Todo lo que necesitas para empezar. Y si encuentras algo raro en el bosque… ven a contármelo.» <span>— Clara</span></p><div class="shop-grid">${(["feed", "seed", "fuel", "scrap", "wood"] as ItemId[]).map((id) => `<div class="shop-item"><span class="item-icon">${icon(ITEMS[id].icon, 28)}</span><div><strong>${ITEMS[id].name}</strong><small>${ITEMS[id].weight} kg · Tienes ${s.inventory[id] || 0}</small></div>${this.button("buy", `${ITEMS[id].buy} ${icon("coin", 16)}`, id, "secondary", s.money < ITEMS[id].buy)}</div>`).join("")}</div>`;
    if (this.menu === "market")
      return `<p class="dialogue">«Buen trabajo ahí fuera. La madera del valle siempre encuentra un hogar.» <span>— Tomás</span></p><div class="shop-grid">${
        Object.entries(s.inventory)
          .filter(([id]) =>
            ["wood", "stone", "scrap", "fossil", "vegetable"].includes(id),
          )
          .map(
            ([id, n]) =>
              `<div class="shop-item"><span class="item-icon">${icon(ITEMS[id as ItemId].icon, 26)}</span><div><strong>${ITEMS[id as ItemId].name} × ${n}</strong><small>${ITEMS[id as ItemId].value} monedas por unidad</small></div>${this.button("sell", `Vender · ${n * ITEMS[id as ItemId].value} ¤`, id)}</div>`,
          )
          .join("") ||
        '<div class="empty">Tu mochila no tiene recursos para vender. El bosque está al oeste de tu finca.</div>'
      }</div>${this.button("sell-all", "Vender todos los recursos de la mochila", "", "primary")}<div class="notice">${icon("truck")} ${Math.hypot(s.vehicle.x + 50, s.vehicle.z - 36) < 16 ? `${weight(s.vehicle.cargo)} kg en tu camioneta. ${this.button("sell-cargo", "Vender carga")}` : "Acerca la camioneta al aserradero para vender su carga."}</div>`;
    if (this.menu === "vehicle")
      return `<div class="vehicle-card"><span>${icon("truck", 60)}</span><div><span class="eyebrow">AURUM PICKUP · 1987</span><h3>Quedan muchos kilómetros.</h3><p>${s.vehicle.repaired ? "Vieja, fiel y lista para trabajar." : "El motor está averiado. Un poco de chatarra y paciencia."}</p></div></div>${this.stat("Combustible", s.vehicle.fuel)}${this.stat("Estado del motor", s.vehicle.condition)}<div class="actions">${s.vehicle.repaired ? this.button("drive", "Subir y conducir " + icon("arrow", 17), "", "primary") : this.button("repair", this.repairLabel("truck"), "truck", "primary")}${this.button("refuel", "Repostar · 1 bidón")}${s.vehicle.repaired ? this.button("maintain", "Mantenimiento · 1 chatarra") : ""}</div><h3>Caja de carga <small>${weight(s.vehicle.cargo)} / 240 kg</small></h3>${this.transferList("cargo")}`;
    if (this.menu === "storage")
      return `<p>Los baúles comparten almacén. Deja aquí lo que no necesitas llevar encima.</p>${this.transferList("storage")}`;
    if (this.menu === "home")
      return `<div class="illustrated-icon">${icon("home", 65)}</div><p class="intro-text">${s.property.house ? "Flores en las ventanas y el olor a madera nueva. Esta casa empieza a contar tu historia." : "Las ventanas están tapiadas y la pintura ha visto días mejores. Pero este lugar ya es tuyo."}</p><div class="actions">${!s.property.house ? this.button("repair", this.repairLabel("house"), "house", "primary") : ""}${this.button("sleep", "Descansar 8 horas " + icon("moon", 17))}${this.button("save", "Guardar mi historia " + icon("save", 17))}</div><p class="subtle">Mientras duermes, crecen los cultivos y los dinosaurios y avanza la incubación. Deja agua y comida en el corral.</p>`;
    if (this.menu === "incubator")
      return `<div class="notice">${icon("egg", 28)}<div><strong>${s.property.incubator ? "Temperatura estable · 29 °C" : "Incubadora pendiente de reparación"}</strong><span>Una cámara · 60 minutos de juego por huevo · ${s.property.enclosure ? "Corral preparado" : "Repara también el corral"}</span></div></div>${!s.property.incubator ? this.button("repair", this.repairLabel("incubator"), "incubator", "primary") : ""}<div class="egg-list">${s.eggs.map((e) => `<div class="egg-card"><div class="egg-visual">${icon("egg", 45)}</div><div><h3>Un pequeño misterio</h3><span>Psittacosaurus · Generación ${e.generation}</span>${e.incubating ? `${this.stat("Incubación", (e.progress / 60) * 100)}<small>Faltan ${Math.max(0, Math.ceil(60 - e.progress))} minutos del juego. Cierra este panel para continuar.</small>` : this.button("incubate", "Iniciar incubación", e.id, "primary", !s.property.incubator || !s.property.enclosure || s.eggs.some((x) => x.incubating))}</div></div>`).join("") || '<div class="empty">Todavía no tienes huevos.<br>En la estación Olmo quedaron cosas por descubrir.</div>'}</div>`;
    if (this.menu === "enclosure")
      return `<div class="illustrated-icon">${icon("fence", 60)}</div><p>${s.property.enclosure ? "Un pequeño lugar seguro, con sombra y mucho por descubrir. Capacidad: 8 dinosaurios." : "Algunas tablas se han caído. Repara el corral antes de recibir a tu primer dinosaurio."}</p>${!s.property.enclosure ? this.button("repair", this.repairLabel("enclosure"), "enclosure", "primary") : ""}${this.stat("Reserva de comida", s.property.food)}${this.stat("Reserva de agua", s.property.water)}<div class="actions">${this.button("provision", "Reponer comida · 1 pienso")}${this.button("water", "Llenar bebedero")}${this.button("gate", s.property.gate ? "Cerrar puerta" : "Abrir puerta")}</div><p class="subtle">Con la puerta cerrada, tus dinosaurios permanecen dentro. Con la puerta abierta pueden seguirte al exterior.</p>`;
    if (this.menu === "ranch") return this.ranchContent();
    if (this.menu === "journal")
      return `<div class="journal-intro">${icon("book", 32)} <span>${s.stats.trees} árboles talados · ${s.stats.hatched} nacimientos · ${s.stats.bred} nuevas generaciones</span></div><div class="journal-entries">${s.journal.map((e) => `<article><span>DÍA ${Math.floor(e.time / 1440) + 1} · ${String(Math.floor((e.time % 1440) / 60)).padStart(2, "0")}:${String(Math.floor(e.time % 60)).padStart(2, "0")}</span><p>${escape(e.text)}</p></article>`).join("")}</div>`;
    if (this.menu === "map")
      return `<canvas id="large-map" width="1100" height="650"></canvas><div class="map-locations">${LOCATIONS.map((l) => `<button data-action="map-pin" data-id="${l.id}">${icon(l.icon, 21)}<strong>${l.name}</strong><small>${l.description}</small></button>`).join("")}</div><p class="subtle">Elige un lugar para marcar el camino. El mapa no permite teletransporte.</p>`;
    if (this.menu === "pause")
      return `<p class="intro-text">La partida está en pausa.<br>Tu pequeño mundo estará aquí cuando vuelvas.</p><div class="pause-options">${this.button("close", "Volver al valle " + icon("arrow"), "", "primary")}${this.button("save", "Guardar partida " + icon("save"))}${this.button("export", "Descargar copia de la partida")}${this.button("import", "Importar una copia")}<input type="file" id="import-save" accept="application/json,.json" hidden/>${this.button("shadows", `Sombras: ${s.settings.shadows ? "activadas" : "desactivadas"}`)}${this.button("menu", "Cómo jugar", "help")}</div><p class="subtle">Guardado automático cada 30 segundos mientras juegas. Las copias te permiten conservar tu rancho al cambiar de navegador.</p>`;
    return `<p class="intro-text">Este valle es tuyo. Empieza con una camioneta averiada y convierte una finca olvidada en un hogar para criaturas extraordinarias.</p><div class="controls-grid">${[
      ["W A S D / ↑ ↓ ← →", "Caminar / conducir"],
      ["Clic en el suelo", "Caminar a un punto cercano"],
      ["Mayús", "Correr"],
      ["Ratón + botón derecho", "Girar la cámara"],
      ["Rueda del ratón", "Acercar / alejar"],
      ["E", "Interactuar / bajar del vehículo"],
      ["Espacio", "Freno de la camioneta"],
      ["I · M · B · R · J", "Mochila · mapa · construir · rancho · diario"],
      ["Esc", "Cerrar / pausar"],
    ]
      .map(([key, text]) => `<div><kbd>${key}</kbd><span>${text}</span></div>`)
      .join(
        "",
      )}</div><div class="notice">${icon("leaf", 24)}<div><strong>Tu primer día</strong><span>Recoge chatarra en el patio y repara la camioneta. Tala árboles con tres golpes de E, recoge los troncos y véndelos en el aserradero. Hay un huevo en la estación Olmo.</span></div></div><p class="subtle">Un día dura 24 minutos reales. La incubación tarda 1 minuto y la madurez, unos 6 minutos. Los menús y las pestañas ocultas pausan el tiempo.</p>`;
  }
  private itemCards(source: "inventory" | "storage") {
    return Object.entries(this.s[source])
      .map(([id, n]) => {
        const item = ITEMS[id as ItemId];
        return `<div class="item-card"><span class="item-count">${n}</span>${icon(item.icon, 32)}<strong>${item.name}</strong><span>${(n * item.weight).toFixed(1)} kg</span>${this.button("drop", "Soltar uno", id, "text-button")}</div>`;
      })
      .join("");
  }
  private transferList(target: "cargo" | "storage") {
    const s = this.s,
      bag = target === "cargo" ? s.vehicle.cargo : s.storage,
      ids = [
        ...new Set([...Object.keys(s.inventory), ...Object.keys(bag)]),
      ] as ItemId[];
    return `<div class="transfer-header"><span>Tu mochila</span><span>${target === "cargo" ? "Camioneta" : "Almacén"}</span></div><div class="transfer-list">${ids.map((id) => `<div>${icon(ITEMS[id].icon, 20)}<strong>${ITEMS[id].name}</strong><span>${s.inventory[id] || 0}</span>${this.button(`transfer-${target}`, "→", id, "mini", !s.inventory[id])}${this.button(`take-${target}`, "←", id, "mini", !bag[id])}<span>${bag[id] || 0}</span></div>`).join("") || '<div class="empty">Todavía no hay objetos.</div>'}</div>`;
  }
  private ranchContent() {
    const s = this.s;
    const d = s.dinosaurs.find((d) => d.id === this.selectedDino);
    if (d) {
      const mature = d.age >= SPECIES.psittacosaurus.adultAge;
      const parent = (id?: string) =>
        escape(
          s.dinosaurs.find((p) => p.id === id)?.name || "Origen silvestre",
        );
      return `${this.button("dino-back", "← Volver a la familia", "", "text-button")}<div class="dino-heading"><div class="dino-avatar">${icon("dino", 60)}</div><div><span class="eyebrow">PSITTACOSAURUS · ${d.sex === "F" ? "HEMBRA" : "MACHO"}</span><input id="dino-name" aria-label="Nombre del dinosaurio" maxlength="24" value="${escape(d.name)}"/><p>${mature ? "Adulto" : d.age < 90 ? "Cría" : d.age < 240 ? "Juvenil" : "Subadulto"} · ${d.trait} · Generación ${d.generation}</p></div></div><div class="stats-grid">${this.stat("Alimentación", d.food)}${this.stat("Agua", d.water)}${this.stat("Bienestar", d.happiness)}${this.stat("Vínculo contigo", d.bond)}</div>${this.stat("Crecimiento", Math.min(100, (d.age / 360) * 100))}<div class="actions">${this.button("feed", "Dar de comer", d.id)}${this.button("pet", "Acariciar " + icon("heart", 16), d.id)}${this.button("follow", d.following ? "Dejar de seguir" : "Sígueme", d.id)}</div><h3>Lo que le hace único</h3><div class="gene-grid">${[
        ["Tamaño", d.genes.size],
        ["Crecimiento", d.genes.growth],
        ["Eficiencia", d.genes.efficiency],
        ["Velocidad", d.genes.speed],
      ]
        .map(
          ([k, v]) =>
            `<div><small>${k}</small><strong>${Number(v).toFixed(2)}×</strong></div>`,
        )
        .join(
          "",
        )}</div><h3>Sus raíces</h3><div class="lineage"><span>Madre<strong>${parent(d.mother)}</strong></span><span>Padre<strong>${parent(d.father)}</strong></span><span>Descendencia<strong>${d.offspring.map((id) => parent(id)).join(", ") || "Todavía sin crías"}</strong></span></div><p class="subtle">Para interactuar, acércate a menos de 5 metros. Puedes cambiar su nombre desde aquí.</p>`;
    }
    return `<div class="section-line"><span>Un hogar para lo extraordinario</span><strong>${s.dinosaurs.length} / 8 habitantes</strong></div><div class="dino-list">${s.dinosaurs.map((d) => `<button class="dino-card" data-action="inspect-dino" data-id="${d.id}"><span class="dino-avatar">${icon("dino", 42)}</span><div><h3>${escape(d.name)} <small>${d.sex === "F" ? "♀" : "♂"}</small></h3><span>Psittacosaurus · ${d.age >= 360 ? "Adulto" : "En crecimiento"}</span><small>${d.trait} · Generación ${d.generation}</small></div>${icon("arrow")}</button>`).join("") || `<div class="empty illustrated-icon">${icon("egg", 58)}<h3>Las grandes historias empiezan<br>con algo muy pequeño.</h3><p>Encuentra un huevo en la estación Olmo.<br>Repara el corral y la incubadora para darle un hogar.</p></div>`}</div>${s.dinosaurs.length >= 2 ? `<div class="notice">${icon("heart", 24)}<div><strong>La siguiente generación</strong><span>Dos adultos de distinto sexo y sin parentesco. Comida, agua y bienestar ≥ 50 %.</span></div>${this.button("breed", "Criar", "", "primary")}</div>` : ""}`;
  }
  stat(label: string, value: number) {
    return `<div class="stat"><div><span>${label}</span><strong>${Math.round(value)} %</strong></div><div class="meter"><i class="${value < 30 ? "low" : ""}" style="width:${Math.max(0, Math.min(100, value))}%"></i></div></div>`;
  }
  repairLabel(part: keyof typeof ECONOMY) {
    const r = REPAIR_MATERIALS[part];
    return `Restaurar · ${r.quantity} ${ITEMS[r.item].name.toLowerCase()} + ${ECONOMY[part]} ¤`;
  }
  drawMap(canvas: HTMLCanvasElement, large = false) {
    const ctx = canvas.getContext("2d")!,
      w = canvas.width,
      h = canvas.height;
    const scale = large ? 3.8 : 2.1;
    const ox = large ? w / 2 : w / 2 - this.s.player.x * scale,
      oz = large ? h * 0.53 : h / 2 - this.s.player.z * scale;
    const xy = (x: number, z: number) => [ox + x * scale, oz + z * scale];
    ctx.fillStyle = "#dce0c3";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#b7c49b";
    const rng = { rng: 142 };
    for (let i = 0; i < 65; i++) {
      const x = (randomMap(rng) - 0.5) * 240,
        z = (randomMap(rng) - 0.5) * 240;
      if (Math.abs(z - 30) < 10 || Math.hypot(x, z) < 33) continue;
      const [px, py] = xy(x, z);
      ctx.beginPath();
      ctx.arc(px, py, (5 + randomMap(rng) * 7) * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#f5edd2";
    ctx.lineWidth = 7 * scale;
    ctx.beginPath();
    ctx.moveTo(...(xy(-250, 30) as [number, number]));
    ctx.lineTo(...(xy(250, 30) as [number, number]));
    ctx.moveTo(...(xy(0, 30) as [number, number]));
    ctx.lineTo(...(xy(0, -22) as [number, number]));
    ctx.stroke();
    ctx.fillStyle = "#91bbb4";
    ctx.beginPath();
    ctx.ellipse(
      ...(xy(-59, -49) as [number, number]),
      21 * scale,
      15 * scale,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.strokeStyle = "#c4b592";
    ctx.lineWidth = 2;
    const [bx, by] = xy(-33, -28);
    ctx.strokeRect(bx, by, 67 * scale, 51 * scale);
    for (const l of LOCATIONS) {
      const [x, y] = xy(l.x, l.z);
      ctx.fillStyle = l.id === "home" ? "#7b9471" : "#be9c6a";
      ctx.fillRect(x - 5 * scale, y - 4 * scale, 10 * scale, 8 * scale);
      if (large) {
        ctx.fillStyle = "#40553f";
        ctx.textAlign = "center";
        ctx.font = "600 16px Segoe UI";
        ctx.fillText(l.name, x, y + 9 * scale);
      }
    }
    for (const d of this.s.dinosaurs) {
      const [x, y] = xy(d.x, d.z);
      ctx.fillStyle = "#799951";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const [cx, cy] = xy(this.s.vehicle.x, this.s.vehicle.z);
    ctx.fillStyle = "#bd894b";
    ctx.fillRect(cx - 4, cy - 6, 8, 12);
    const [px, py] = xy(this.s.player.x, this.s.player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-this.s.player.angle + Math.PI);
    ctx.fillStyle = "#f8f3dc";
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#355b46";
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 4);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
function randomMap(r: { rng: number }) {
  r.rng = (r.rng * 1664525 + 1013904223) >>> 0;
  return r.rng / 4294967296;
}
