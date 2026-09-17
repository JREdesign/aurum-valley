import * as T from "three";
import type { State, PieceId, Vec, ResourceNode } from "../core/types";
import { random } from "../core/state";
import { BUILDINGS, CROP_MINUTES } from "../data/content";
import { Physics } from "../systems/Physics";
import * as M from "./models";

export class WorldView {
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(48, innerWidth / innerHeight, 0.2, 800);
  renderer: T.WebGLRenderer;
  sun = new T.DirectionalLight("#fff0c5", 3.2);
  ambient = new T.HemisphereLight("#d6e5d5", "#857752", 2.3);
  player = M.person();
  car = M.truck();
  root = new T.Group();
  dynamic = new T.Group();
  focus = new T.Vector3(0, 1, 8);
  yaw = 0.36;
  pitch = 0.52;
  distance = 33;
  trees: T.InstancedMesh[] = [];
  treeList: State["nodes"] = [];
  objects = new Map<string, T.Group>();
  dinos = new Map<string, T.Group>();
  propertyStamp = "";
  targetRing: T.Mesh;
  ghost: T.Group | null = null;
  ghostType: PieceId | null = null;
  water: T.Mesh;
  windmill = new T.Group();
  birds = new T.Group();
  clock = 0;
  falling: { object: T.Group; started: number }[] = [];
  private raycaster = new T.Raycaster();
  private cameraObstacles: T.Object3D[] = [];
  private viewDirection = new T.Vector3();
  private desiredCamera = new T.Vector3();
  private cameraTarget = new T.Vector3();
  constructor(
    public state: State,
    public physics: Physics,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = state.settings.shadows;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    document.querySelector("#world")!.append(this.renderer.domElement);
    this.scene.background = new T.Color("#c1d3cc");
    this.scene.fog = new T.Fog("#c1d3cc", 95, 280);
    this.scene.add(
      this.ambient,
      this.sun,
      this.sun.target,
      this.root,
      this.dynamic,
      this.player,
      this.car,
    );
    this.sun.position.set(-45, 85, 40);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -65;
    this.sun.shadow.camera.right = 65;
    this.sun.shadow.camera.top = 65;
    this.sun.shadow.camera.bottom = -65;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 230;
    this.sun.shadow.normalBias = 0.06;
    this.sun.shadow.bias = -0.0003;
    this.targetRing = M.mesh(new T.RingGeometry(1.1, 1.2, 40), "#f5dea0");
    this.targetRing.rotation.x = -Math.PI / 2;
    this.targetRing.position.y = 0.05;
    this.targetRing.castShadow = false;
    this.scene.add(this.targetRing);
    this.terrain();
    this.structures();
    this.vegetation();
    this.water = M.mesh(
      new T.CircleGeometry(1, 48),
      "#72aaa3",
      -59,
      0.055,
      -49,
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.scale.set(21, 15, 1);
    this.water.castShadow = false;
    this.root.add(this.water);
    this.sync();
    this.focus.set(state.player.x, 1, state.player.z);
    this.camera.position.set(state.player.x + 15, 24, state.player.z + 26);
    window.addEventListener("resize", () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
  }
  private terrain() {
    const g = new T.PlaneGeometry(500, 500, 40, 40);
    g.rotateX(-Math.PI / 2);
    const a = g.attributes.position,
      colors = [];
    const rng = { rng: 999 };
    for (let i = 0; i < a.count; i++) {
      const c = new T.Color("#99a16e");
      c.multiplyScalar(0.97 + random(rng) * 0.06);
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    const land = new T.Mesh(
      g,
      new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1,
        flatShading: true,
      }),
    );
    land.receiveShadow = true;
    this.root.add(land);
    const patch = (
      x: number,
      z: number,
      w: number,
      d: number,
      color: string,
    ) => {
      const m = M.mesh(new T.CircleGeometry(1, 14), color, x, 0.018, z);
      m.rotation.x = -Math.PI / 2;
      m.scale.set(w, d, 1);
      m.castShadow = false;
      this.root.add(m);
    };
    patch(-2, 0, 37, 28, "#a2a476");
    patch(-15, -3, 9, 8, "#b7ae87");
    patch(10, 13, 5, 6, "#b2aa7d");
    patch(20, -9, 13, 12, "#a6ad7c");
    patch(-59, -49, 24, 18, "#b9b494");
    patch(44, 40, 16, 13, "#b2aa84");
    patch(-50, 40, 16, 13, "#aea27c");
    const road = M.box(this.root, 500, 0.05, 8, "#b9ac84", 0, 0.01, 30);
    road.castShadow = false;
    M.box(this.root, 7, 0.045, 55, "#bfb28b", 0, 0.035, 2);
    for (const x of [-2.5, 2.5]) {
      M.box(this.root, 0.25, 0.012, 54, "#a9a07c", x, 0.065, 2);
    }
    for (const z of [27.4, 32.6]) {
      M.box(this.root, 499, 0.012, 0.25, "#a79d76", 0, 0.07, z);
    }
    for (let i = 0; i < 20; i++) {
      const x = (random(rng) - 0.5) * 520,
        z = i % 2 ? -245 : 205;
      const hill = M.mesh(
        new T.ConeGeometry(45 + random(rng) * 45, 35 + random(rng) * 40, 6),
        "#809480",
        x,
        20,
        z,
      );
      hill.scale.set(1.5, 1, 0.8);
      hill.rotation.y = random(rng) * 6;
      this.root.add(hill);
    }
    for (let i = 0; i < 13; i++) {
      const cloud = new T.Group();
      for (let j = 0; j < 4; j++)
        M.ball(
          cloud,
          5,
          "#e8e8d4",
          j * 6,
          Math.sin(j) * 2,
          0,
          [1.5, 0.4, 1],
          1,
        );
      cloud.position.set(
        (random(rng) - 0.5) * 440,
        60 + random(rng) * 30,
        (random(rng) - 0.5) * 440,
      );
      cloud.traverse((o) => {
        if (o instanceof T.Mesh) o.castShadow = false;
      });
      this.root.add(cloud);
    }
    this.physics.box("lake", -59, -49, 36, 24, 1);
    for (let i = 0; i < 7; i++) {
      const bird = new T.Group();
      M.beam(
        bird,
        new T.Vector3(-0.4, 0.2, 0),
        new T.Vector3(0, 0, 0),
        0.035,
        "#566b61",
      );
      M.beam(
        bird,
        new T.Vector3(0, 0, 0),
        new T.Vector3(0.4, 0.2, 0),
        0.035,
        "#566b61",
      );
      bird.position.set(i * 2, Math.sin(i) * 2, (i % 3) * 3);
      this.birds.add(bird);
    }
    this.scene.add(this.birds);
  }
  private structures() {
    const addHouse = (
      id: string,
      x: number,
      z: number,
      w: number,
      d: number,
      color: string,
      sign?: string,
    ) => {
      const h = M.house(w, d, color, true, sign);
      h.position.set(x, 0, z);
      this.root.add(h);
      this.physics.box(id, x, z, w, d, 5);
      this.cameraObstacles.push(h);
      return h;
    };
    addHouse("shop", 44, 41, 12, 9, "#b3bca0", "ALMACÉN DE CLARA").rotation.y =
      Math.PI;
    addHouse("sawmill", -50, 43, 13, 10, "#bcaa7d", "ASERRADERO").rotation.y =
      Math.PI;
    addHouse("npc-house", 78, 47, 9, 8, "#c3b99b");
    addHouse("npc-house2", -86, 49, 9, 8, "#c7bd9e");
    const research = addHouse(
      "research",
      63,
      -57,
      10,
      7,
      "#c1c7ac",
      "ESTACIÓN OLMO",
    );
    research.rotation.y = 0.05;
    const antenna = new T.Group();
    M.cylinder(antenna, 0.08, 0.12, 9, "#8e998c", 0, 4.5);
    M.beam(
      antenna,
      new T.Vector3(-2, 8, 0),
      new T.Vector3(2, 8, 0),
      0.06,
      "#5e756c",
    );
    antenna.position.set(70, 0, -59);
    this.root.add(antenna);
    const npc = M.person("#a77964");
    npc.position.set(44, 0, 34.5);
    npc.rotation.y = Math.PI;
    this.root.add(npc);
    const buyer = M.person("#64785c");
    buyer.position.set(-50, 0, 36);
    buyer.rotation.y = Math.PI;
    this.root.add(buyer);
    const silo = new T.Group();
    M.cylinder(silo, 2.4, 2.5, 9, "#c6c5b0", 0, 4.5, 0, 14);
    silo.add(M.mesh(new T.ConeGeometry(2.5, 2, 14), "#9b9e8f", 0, 10));
    for (const y of [1, 3, 5, 7, 9]) {
      const ring = M.mesh(
        new T.TorusGeometry(2.5, 0.045, 4, 14),
        "#9ca493",
        0,
        y,
      );
      ring.rotation.x = Math.PI / 2;
      silo.add(ring);
    }
    silo.position.set(36, 0, -30);
    this.root.add(silo);
    this.physics.box("silo", 36, -30, 5, 5, 10);
    const mill = new T.Group();
    M.cylinder(mill, 0.6, 1, 10, "#b5b7a0", 0, 5);
    for (let i = 0; i < 8; i++) {
      const blade = M.box(this.windmill, 0.52, 4, 0.08, "#d4cbae", 0, 2);
      const pivot = new T.Group();
      pivot.rotation.z = (i * Math.PI) / 4;
      pivot.add(blade);
      this.windmill.add(pivot);
    }
    this.windmill.position.set(0, 10, 0.6);
    mill.add(this.windmill);
    mill.position.set(-31, 0, -28);
    this.root.add(mill);
    for (let i = 0; i < 8; i++) {
      const f = M.fence(5);
      f.position.set(-30 + i * 5, 0, 23);
      if (i === 5 || i === 6) continue;
      this.root.add(f);
      this.physics.box(`boundary-${i}`, f.position.x, 23, 5, 0.25, 1.7);
    }
    const mailbox = new T.Group();
    M.box(mailbox, 0.18, 1.6, 0.18, "#7c7154", 0, 0.8);
    M.box(mailbox, 0.8, 0.5, 0.7, "#6e8b79", 0, 1.6);
    mailbox.position.set(5, 0, 22);
    this.root.add(mailbox);
    const sign = new T.Group();
    for (const x of [-1.5, 1.5])
      M.box(sign, 0.18, 2.7, 0.18, "#7c6c4c", x, 1.3);
    M.box(sign, 3.9, 1.25, 0.15, "#ebdfbd", 0, 2);
    const title = M.label("FINCA AURUM", 4, "#485d42", "#eadfbc");
    title.position.set(0, 2, 0.15);
    sign.add(title);
    sign.position.set(-8, 0, 20);
    this.root.add(sign);
    for (let i = 0; i < 5; i++) {
      const log = new T.Group();
      const m = M.cylinder(log, 0.43, 0.43, 4, "#8b6f46", 0, 0.5);
      m.rotation.z = Math.PI / 2;
      const end = M.cylinder(log, 0.36, 0.36, 4.02, "#d2b887", 0, 0.5);
      end.rotation.z = Math.PI / 2;
      log.position.set(-57, Math.floor(i / 3) * 0.8, 37 + (i % 3));
      this.root.add(log);
    }
    for (let i = 0; i < 5; i++) {
      const b = M.box(
        this.root,
        20,
        0.07,
        1.1,
        "#938966",
        -4,
        0.06,
        -38 - i * 2.2,
      );
      b.castShadow = false;
    }
    const well = new T.Group();
    M.cylinder(well, 0.85, 1.05, 1.2, "#a7a48c", 0, 0.6);
    M.cylinder(well, 0.7, 0.7, 0.03, "#496d66", 0, 1.21);
    for (const x of [-1, 1]) M.box(well, 0.15, 2.8, 0.15, "#7b6c4e", x, 1.4);
    M.roof(well, 2.7, 2.1, 2.8, "#9b7755");
    well.position.set(-7, 0, -18);
    this.root.add(well);
  }
  private vegetation() {
    const rng = { rng: 436 };
    const list = this.state.nodes.filter((n) => n.type === "tree");
    this.treeList = list;
    const trunk = new T.InstancedMesh(
      new T.CylinderGeometry(0.25, 0.45, 5, 6),
      M.mat("#7e7254"),
      list.length,
    );
    const leaves = new T.InstancedMesh(
      new T.IcosahedronGeometry(2.9, 0),
      M.mat("#859060"),
      list.length * 3,
    );
    const pines = new T.InstancedMesh(
      new T.ConeGeometry(3, 4.6, 7),
      M.mat("#607c5a"),
      list.length * 3,
    );
    const obj = new T.Object3D();
    for (let i = 0; i < list.length; i++) {
      const n = list[i],
        size = n.size;
      obj.position.set(n.x, 2.4 * size, n.z);
      obj.scale.set(size, size, size);
      obj.updateMatrix();
      trunk.setMatrixAt(i, obj.matrix);
      for (let j = 0; j < 3; j++) {
        obj.position.set(
          n.x + (j === 0 ? -0.8 : j === 1 ? 0.85 : 0) * size,
          (4.7 + j * 0.8) * size,
          n.z + Math.sin(j * 3) * size,
        );
        obj.scale.set(
          n.variant === 0 ? 0 : size,
          n.variant === 0 ? 0 : size * 0.85,
          n.variant === 0 ? 0 : size,
        );
        obj.rotation.y = i;
        obj.updateMatrix();
        leaves.setMatrixAt(i * 3 + j, obj.matrix);
        leaves.setColorAt(
          i * 3 + j,
          new T.Color(["#859661", "#9c9f67", "#6f875b"][i % 3]),
        );
        obj.position.set(n.x, (3.2 + j * 1.55) * size, n.z);
        obj.scale.setScalar(n.variant === 0 ? size * (1 - j * 0.19) : 0);
        obj.updateMatrix();
        pines.setMatrixAt(i * 3 + j, obj.matrix);
      }
    }
    for (const m of [trunk, leaves, pines]) {
      m.castShadow = true;
      m.receiveShadow = true;
      this.root.add(m);
    }
    this.trees = [trunk, leaves, pines];
    const grassGeo = new T.BufferGeometry();
    grassGeo.setAttribute(
      "position",
      new T.Float32BufferAttribute(
        [
          -0.22, 0, 0, -0.13, 0.55, 0, 0.03, 0, 0, 0, 0, -0.17, 0, 0.65, -0.02,
          0, 0, 0.19, 0.04, 0, 0, 0.19, 0.42, 0, 0.27, 0, 0,
        ],
        3,
      ),
    );
    grassGeo.computeVertexNormals();
    const grassMat = new T.MeshStandardMaterial({
      color: "#8b9b62",
      side: T.DoubleSide,
      roughness: 1,
      flatShading: true,
    });
    const grass = new T.InstancedMesh(grassGeo, grassMat, 5500);
    let count = 0;
    while (count < 5500) {
      const x = (random(rng) - 0.5) * 240,
        z = (random(rng) - 0.5) * 240;
      if (
        (Math.abs(x) < 33 && z > -28 && z < 26) ||
        Math.abs(z - 30) < 6 ||
        Math.hypot(x + 59, (z + 49) * 1.4) < 26 ||
        Math.hypot(x - 44, z - 40) < 12 ||
        Math.hypot(x + 50, z - 40) < 12
      )
        continue;
      obj.position.set(x, 0.04, z);
      obj.scale.setScalar(0.5 + random(rng));
      obj.rotation.set(0, random(rng) * 6, 0);
      obj.updateMatrix();
      grass.setMatrixAt(count, obj.matrix);
      grass.setColorAt(
        count,
        new T.Color(["#829159", "#8f9b65", "#b0ad75", "#6f8558"][count % 4]),
      );
      count++;
    }
    grass.receiveShadow = true;
    this.root.add(grass);
    const flowers = new T.InstancedMesh(
      new T.IcosahedronGeometry(0.16, 0),
      M.mat("#e8d891"),
      360,
    );
    for (let i = 0; i < 360; i++) {
      const a = random(rng) * Math.PI * 2,
        r = 25 + random(rng) * 40;
      obj.position.set(Math.sin(a) * r, 0.3, Math.cos(a) * r);
      if (Math.abs(obj.position.z - 30) < 6) obj.position.z += 10;
      obj.scale.setScalar(1);
      obj.updateMatrix();
      flowers.setMatrixAt(i, obj.matrix);
      flowers.setColorAt(i, new T.Color(i % 3 ? "#e5d7a1" : "#cec4cc"));
    }
    this.root.add(flowers);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const rock = M.mesh(
        new T.IcosahedronGeometry(0.6 + random(rng), 0),
        "#a5aa94",
        -59 + Math.sin(a) * 23,
        0.35,
        -49 + Math.cos(a) * 17,
      );
      rock.scale.y = 0.6;
      this.root.add(rock);
    }
  }
  sync() {
    const s = this.state,
      zero = new T.Matrix4().makeScale(0, 0, 0);
    this.treeList.forEach((n, i) => {
      if (n.depleted) {
        this.trees[0].setMatrixAt(i, zero);
        for (let j = 0; j < 3; j++) {
          this.trees[1].setMatrixAt(i * 3 + j, zero);
          this.trees[2].setMatrixAt(i * 3 + j, zero);
        }
        this.physics.remove(n.id);
        if (!this.objects.has(n.id)) {
          const stump = new T.Group();
          M.cylinder(stump, 0.45, 0.5, 0.38, "#b09667", 0, 0.19);
          stump.position.set(n.x, 0, n.z);
          this.dynamic.add(stump);
          this.objects.set(n.id, stump);
        }
      } else if (!this.physics.obstacles.has(n.id))
        this.physics.box(n.id, n.x, n.z, 0.7, 0.7, 5);
    });
    this.trees.forEach((t) => (t.instanceMatrix.needsUpdate = true));
    const stamp = JSON.stringify(s.property);
    const propertyKey = [
      s.property.house,
      s.property.enclosure,
      s.property.incubator,
      s.property.gate,
    ].join();
    if (propertyKey !== this.propertyStamp) {
      this.propertyStamp = propertyKey;
      const old = this.objects.get("property");
      if (old) M.disposeGroup(old);
      const g = new T.Group();
      const h = M.house(10, 8, "#dad0ae", s.property.house);
      h.position.set(-15, 0, -9);
      g.add(h);
      this.physics.box("home", -15, -9, 10, 8, 5);
      this.cameraObstacles = this.cameraObstacles.filter(
        (o) => o.userData.type !== "home",
      );
      h.userData.type = "home";
      this.cameraObstacles.push(h);
      for (let i = 0; i < 5; i++) {
        for (const z of [-18, 0]) {
          if (z === 0 && i === 2) continue;
          const x = 11 + i * 4;
          const f = M.fence(4, !s.property.enclosure && i % 3 === 1);
          f.position.set(x, 0, z);
          g.add(f);
          this.physics.box(`enclosure-x-${i}-${z}`, x, z, 4, 0.25, 1.7);
        }
      }
      for (let i = 0; i < 4; i++)
        for (const x of [9, 29]) {
          const f = M.fence(4.5, !s.property.enclosure && i === 2);
          f.position.set(x, 0, -15.75 + i * 4.5);
          f.rotation.y = Math.PI / 2;
          g.add(f);
          this.physics.box(
            `enclosure-z-${i}-${x}`,
            x,
            f.position.z,
            0.25,
            4.5,
            1.7,
          );
        }
      const gate = M.fence(4);
      gate.position.set(19, 0, 0);
      if (s.property.gate) {
        gate.position.set(17, 0, 2);
        gate.rotation.y = Math.PI / 2;
        this.physics.remove("gate");
      } else this.physics.box("gate", 19, 0, 4, 0.25, 1.7);
      g.add(gate);
      const inc = M.incubator(s.property.incubator);
      inc.position.set(6, 0, -12);
      g.add(inc);
      this.physics.box("incubator", 6, -12, 2.3, 1.8, 1.4);
      const trough = M.building("trough");
      trough.position.set(24, 0, -14);
      g.add(trough);
      const water = M.building("trough");
      water.position.set(14, 0, -14);
      g.add(water);
      const shelter = M.building("shelter");
      shelter.position.set(25, 0, -5);
      shelter.scale.setScalar(0.8);
      g.add(shelter);
      const store = M.building("storage");
      store.position.set(-8, 0, 0);
      g.add(store);
      this.physics.box("storage", -8, 0, 2, 1, 1.3);
      this.dynamic.add(g);
      this.objects.set("property", g);
    }
    void stamp;
    for (const n of s.nodes.filter((n) => n.type !== "tree")) {
      if (n.depleted) {
        const old = this.objects.get(n.id);
        if (old) {
          M.disposeGroup(old);
          this.objects.delete(n.id);
        }
        continue;
      }
      if (this.objects.has(n.id)) continue;
      const g = new T.Group();
      if (n.type === "egg") {
        g.add(M.egg());
        const ring = M.mesh(new T.RingGeometry(0.9, 1, 24), "#e1c982", 0, 0.06);
        ring.rotation.x = -Math.PI / 2;
        g.add(ring);
        M.ball(g, 0.08, "#ffe2a2", 0, 1.9);
      } else if (n.type === "stone" || n.type === "fossil") {
        const r = M.ball(
          g,
          0.85,
          n.type === "fossil" ? "#c6b996" : "#a3a895",
          0,
          0.4,
          0,
          [1, 0.65, 0.85],
          0,
        );
        r.rotation.y = n.x;
        if (n.type === "fossil")
          for (let i = 0; i < 4; i++)
            M.box(g, 0.55, 0.1, 0.12, "#ede4c9", 0, 0.8, i * 0.2 - 0.3);
      } else {
        M.box(g, 1.8, 0.8, 1.2, "#8c8870", 0, 0.4);
        M.box(g, 0.7, 0.3, 0.7, "#6d7f6d", 0.25, 1, 0);
        const tire = M.mesh(
          new T.TorusGeometry(0.48, 0.15, 5, 10),
          "#525e50",
          -0.65,
          0.8,
          0.3,
        );
        tire.rotation.x = 1.2;
        g.add(tire);
      }
      g.position.set(n.x, 0, n.z);
      this.dynamic.add(g);
      this.objects.set(n.id, g);
    }
    const live = new Set(s.drops.map((d) => d.id));
    for (const [id, obj] of this.objects)
      if ((id.startsWith("log-") || id.startsWith("drop-")) && !live.has(id)) {
        M.disposeGroup(obj);
        this.objects.delete(id);
      }
    for (const d of s.drops)
      if (!this.objects.has(d.id)) {
        const g = new T.Group();
        if (d.item === "wood") {
          const log = M.cylinder(g, 0.3, 0.36, 1.7, "#8f714a", 0, 0.36);
          log.rotation.z = Math.PI / 2;
          const end = M.cylinder(g, 0.26, 0.26, 1.72, "#d3b881", 0, 0.36);
          end.rotation.z = Math.PI / 2;
        } else M.box(g, 0.6, 0.5, 0.6, "#bea16e", 0, 0.25);
        g.position.set(d.x, 0, d.z);
        this.dynamic.add(g);
        this.objects.set(d.id, g);
      }
    for (const [id, obj] of this.objects)
      if (id.startsWith("building-") && !s.buildings.some((b) => b.id === id)) {
        M.disposeGroup(obj);
        this.objects.delete(id);
        this.physics.remove(id);
      }
    for (const b of s.buildings) {
      let g = this.objects.get(b.id);
      const planted = b.plantedAt !== undefined;
      if (g && g.userData.planted !== planted) {
        M.disposeGroup(g);
        this.objects.delete(b.id);
        g = undefined;
      }
      if (!g) {
        g = M.building(b.type);
        g.position.set(b.x, 0, b.z);
        g.rotation.y = b.rotation;
        g.userData.planted = planted;
        if (planted) {
          const crops = new T.Group();
          for (let i = 0; i < 6; i++)
            M.ball(
              crops,
              0.3,
              "#658451",
              -0.8 + (i % 3) * 0.8,
              0.7,
              -0.4 + Math.floor(i / 3) * 0.8,
              [0.8, 1.1, 0.8],
            );
          g.add(crops);
          g.userData.crops = crops;
        }
        this.dynamic.add(g);
        this.objects.set(b.id, g);
        const size = BUILDINGS[b.type].size;
        if (b.type !== "roof" && b.type !== "floor" && b.type !== "shelter")
          this.physics.box(
            b.id,
            b.x,
            b.z,
            ...size,
            b.type === "wall" ? 3 : b.type === "fence" ? 1.7 : 0.8,
            b.rotation,
          );
      }
    }
    for (const d of s.dinosaurs)
      if (!this.dinos.has(d.id)) {
        const g = M.dinosaur(d.genes);
        this.dinos.set(d.id, g);
        this.dynamic.add(g);
      }
    const existing = this.objects.get("inc-egg");
    const incEgg = s.eggs.some((e) => e.incubating);
    if (incEgg && !existing) {
      const e = M.egg();
      e.scale.setScalar(0.55);
      e.position.set(6, 1.33, -12);
      this.dynamic.add(e);
      this.objects.set("inc-egg", e);
    } else if (!incEgg && existing) {
      M.disposeGroup(existing);
      this.objects.delete("inc-egg");
    }
    this.renderer.shadowMap.enabled = s.settings.shadows;
    const cargoCount = Math.min(15, s.vehicle.cargo.wood || 0);
    if (this.car.userData.cargoCount !== cargoCount) {
      this.car.userData.cargoCount = cargoCount;
      const old = this.car.getObjectByName("cargo");
      if (old) M.disposeGroup(old);
      const cargo = new T.Group();
      cargo.name = "cargo";
      for (let i = 0; i < cargoCount; i++) {
        const log = M.cylinder(
          cargo,
          0.19,
          0.22,
          2.1,
          "#ac8851",
          -0.8 + (i % 5) * 0.4,
          1.15 + Math.floor(i / 5) * 0.4,
          -2,
        );
        log.rotation.x = Math.PI / 2;
      }
      this.car.add(cargo);
    }
  }
  setGhost(type: PieceId | null) {
    if (type === this.ghostType) return;
    this.ghostType = type;
    if (this.ghost) {
      M.disposeGroup(this.ghost);
      this.ghost = null;
    }
    if (type) {
      this.ghost = M.building(type);
      this.ghost.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.material = new T.MeshBasicMaterial({
            color: "#cfe8a1",
            transparent: true,
            opacity: 0.48,
            depthWrite: false,
          });
          o.castShadow = false;
        }
      });
      this.scene.add(this.ghost);
    }
  }
  fallTree(n: ResourceNode) {
    const g = new T.Group();
    M.cylinder(g, 0.25, 0.45, 5, "#7e7254", 0, 2.5);
    for (let i = 0; i < 3; i++) {
      if (n.variant === 0) {
        const leaf = M.mesh(
          new T.ConeGeometry(3 - i * 0.5, 4.5, 7),
          "#607c5a",
          0,
          3.2 + i * 1.55,
        );
        g.add(leaf);
      } else
        M.ball(
          g,
          2.8,
          "#859661",
          i === 0 ? -0.7 : i === 1 ? 0.8 : 0,
          4.6 + i * 0.8,
          0,
          [1, 0.85, 1],
          0,
        );
    }
    g.scale.setScalar(n.size);
    g.position.set(n.x, 0, n.z);
    this.dynamic.add(g);
    this.falling.push({ object: g, started: this.clock });
  }
  updateGhost(x: number, z: number, rotation: number, valid: boolean) {
    if (!this.ghost) return;
    this.ghost.position.set(x, 0.06, z);
    this.ghost.rotation.y = rotation;
    this.ghost.traverse((o) => {
      if (o instanceof T.Mesh)
        (o.material as T.MeshBasicMaterial).color.set(
          valid ? "#d0edac" : "#e79276",
        );
    });
  }
  groundAt(clientX: number, clientY: number): Vec | null {
    this.raycaster.setFromCamera(
      new T.Vector2(
        (clientX / innerWidth) * 2 - 1,
        (-clientY / innerHeight) * 2 + 1,
      ),
      this.camera,
    );
    const p = new T.Vector3();
    const hit = this.raycaster.ray.intersectPlane(
      new T.Plane(new T.Vector3(0, 1, 0), 0),
      p,
    );
    return hit
      ? { x: Math.round(p.x / 2) * 2, z: Math.round(p.z / 2) * 2 }
      : null;
  }
  render(dt: number, moving: boolean, driving: boolean, speed: number) {
    this.clock += dt;
    const s = this.state;
    this.player.position.set(s.player.x, 0, s.player.z);
    this.player.rotation.y = s.player.angle;
    this.player.visible = !driving;
    this.car.position.set(s.vehicle.x, 0, s.vehicle.z);
    this.car.rotation.y = s.vehicle.angle;
    const limbs = this.player.userData.limbs as T.Group[];
    limbs.forEach((limb, i) => {
      limb.rotation.x = moving
        ? Math.sin(this.clock * 9 + (i < 2 ? 0 : Math.PI)) *
          (i % 2 ? 0.4 : 0.55)
        : 0;
    });
    for (const f of this.falling) {
      const t = (this.clock - f.started) / 1.45;
      f.object.rotation.x = Math.min(Math.PI / 2, (t * t * Math.PI) / 2);
      if (t > 1.5) M.disposeGroup(f.object);
    }
    this.falling = this.falling.filter((f) => this.clock - f.started < 2.18);
    for (const wheel of this.car.userData.wheels as T.Mesh[])
      wheel.rotation.x += speed * dt;
    this.windmill.rotation.z += dt * 0.22;
    this.birds.position.set(
      Math.sin(this.clock * 0.015) * 80,
      22,
      Math.cos(this.clock * 0.015) * 65,
    );
    this.birds.rotation.y = this.clock * 0.015;
    for (const d of s.dinosaurs) {
      const g = this.dinos.get(d.id);
      if (!g) continue;
      const oldX = g.position.x,
        oldZ = g.position.z;
      g.position.set(d.x, 0, d.z);
      const size = (0.38 + Math.min(1, d.age / 360) * 0.62) * d.genes.size;
      g.scale.setScalar(size);
      const walking = Math.hypot(d.x - oldX, d.z - oldZ) > 0.001;
      const desired = Math.atan2(d.target.x - d.x, d.target.z - d.z);
      let delta = desired - g.rotation.y;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      g.rotation.y += delta * Math.min(1, dt * 4);
      const rig = g.userData;
      rig.legs.forEach(
        (leg: T.Group, i: number) =>
          (leg.rotation.x = walking
            ? Math.sin(this.clock * 7 + i * Math.PI) * 0.35
            : 0),
      );
      rig.tail.rotation.y = Math.sin(this.clock * 2) * 0.12;
      rig.head.rotation.x =
        d.behaviour === "eat" || d.behaviour === "drink"
          ? 0.55 + Math.sin(this.clock * 5) * 0.08
          : Math.sin(this.clock) * 0.07;
      if (d.behaviour === "sleep" && !walking) {
        g.position.y = -0.25 * size;
        rig.head.rotation.x = 0.4;
      }
    }
    for (const b of s.buildings) {
      const crop = this.objects.get(b.id)?.userData.crops as
        T.Group | undefined;
      if (crop && b.plantedAt !== undefined)
        crop.scale.y =
          0.2 + 0.8 * Math.min(1, (s.minutes - b.plantedAt) / CROP_MINUTES);
    }
    const p = driving ? s.vehicle : s.player;
    this.cameraTarget.set(p.x, 1.5, p.z);
    this.focus.lerp(this.cameraTarget, 1 - Math.exp(-dt * 5));
    const dist = driving ? Math.max(22, this.distance) : this.distance;
    this.viewDirection.set(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    this.raycaster.camera = this.camera;
    this.raycaster.set(this.focus, this.viewDirection);
    this.raycaster.far = dist;
    const hit = this.raycaster.intersectObjects(this.cameraObstacles, true)[0];
    const safe = hit ? Math.max(3, hit.distance - 0.8) : dist;
    this.desiredCamera
      .copy(this.focus)
      .addScaledVector(this.viewDirection, safe);
    this.camera.position.lerp(this.desiredCamera, 1 - Math.exp(-dt * 9));
    this.camera.lookAt(this.focus);
    const hour = (s.minutes % 1440) / 60;
    const sunlight =
      0.3 + 0.7 * Math.max(0, Math.sin(((hour - 5) / 14) * Math.PI));
    this.sun.intensity = 1 + sunlight * 2.1;
    this.ambient.intensity = 0.9 + sunlight * 1.4;
    const sky = new T.Color("#708997").lerp(new T.Color("#c7d8cb"), sunlight);
    this.scene.background = sky;
    (this.scene.fog as T.Fog).color.copy(sky);
    this.sun.position.set(p.x - 45, 85, p.z + 40);
    this.sun.target.position.set(p.x, 0, p.z);
    this.renderer.render(this.scene, this.camera);
  }
}
