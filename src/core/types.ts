export type Vec = { x: number; z: number };
export type ItemId =
  | "wood"
  | "stone"
  | "scrap"
  | "feed"
  | "seed"
  | "vegetable"
  | "fuel"
  | "fossil";
export type Bag = Partial<Record<ItemId, number>>;
export type PieceId =
  | "fence"
  | "floor"
  | "wall"
  | "roof"
  | "trough"
  | "planter"
  | "shelter"
  | "storage";
export interface Genes {
  size: number;
  speed: number;
  growth: number;
  efficiency: number;
  hue: number;
}
export interface Egg {
  id: string;
  species: string;
  sex: "F" | "M";
  genes: Genes;
  progress: number;
  incubating: boolean;
  mother?: string;
  father?: string;
  generation: number;
}
export type Behaviour =
  "wander" | "eat" | "drink" | "rest" | "sleep" | "follow";
export interface Dinosaur extends Vec {
  id: string;
  species: string;
  name: string;
  sex: "F" | "M";
  age: number;
  genes: Genes;
  food: number;
  water: number;
  health: number;
  happiness: number;
  bond: number;
  mother?: string;
  father?: string;
  offspring: string[];
  generation: number;
  trait: "Curioso" | "Tranquilo" | "Juguetón";
  behaviour: Behaviour;
  target: Vec;
  decisionAt: number;
  breedAt: number;
  following: boolean;
  lastPet: number;
}
export interface Building extends Vec {
  id: string;
  type: PieceId;
  rotation: number;
  plantedAt?: number;
  stock?: number;
}
export interface ResourceNode extends Vec {
  id: string;
  type: "tree" | "stone" | "scrap" | "egg" | "fossil";
  health: number;
  size: number;
  variant: number;
  depleted: boolean;
}
export interface Drop extends Vec {
  id: string;
  item: ItemId;
  quantity: number;
}
export interface State {
  version: 1;
  seed: number;
  rng: number;
  nextId: number;
  minutes: number;
  money: number;
  player: Vec & { angle: number };
  inventory: Bag;
  storage: Bag;
  vehicle: Vec & {
    angle: number;
    fuel: number;
    condition: number;
    repaired: boolean;
    occupied: boolean;
    cargo: Bag;
    parts: { engine: number; battery: number; wheels: number };
  };
  property: {
    house: boolean;
    enclosure: boolean;
    incubator: boolean;
    gate: boolean;
    food: number;
    water: number;
  };
  nodes: ResourceNode[];
  drops: Drop[];
  buildings: Building[];
  dinosaurs: Dinosaur[];
  eggs: Egg[];
  stats: {
    trees: number;
    sold: number;
    discovered: number;
    hatched: number;
    bred: number;
    planted: number;
  };
  journal: { time: number; text: string }[];
  settings: { sound: boolean; shadows: boolean };
  started: boolean;
}
export interface Interactable extends Vec {
  id: string;
  label: string;
  subtitle: string;
  kind: string;
  radius: number;
  ref?: string;
}
