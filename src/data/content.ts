import type { ItemId, PieceId } from "../core/types";
export const ITEMS: Record<
  ItemId,
  {
    name: string;
    icon: string;
    weight: number;
    value: number;
    buy: number;
    stack: number;
  }
> = {
  wood: {
    name: "Troncos",
    icon: "wood",
    weight: 4,
    value: 18,
    buy: 26,
    stack: 20,
  },
  stone: {
    name: "Piedra",
    icon: "stone",
    weight: 2,
    value: 8,
    buy: 12,
    stack: 30,
  },
  scrap: {
    name: "Chatarra",
    icon: "gear",
    weight: 1,
    value: 12,
    buy: 18,
    stack: 30,
  },
  feed: {
    name: "Pienso herbívoro",
    icon: "leaf",
    weight: 1,
    value: 5,
    buy: 9,
    stack: 30,
  },
  seed: {
    name: "Semillas",
    icon: "sprout",
    weight: 0.1,
    value: 2,
    buy: 4,
    stack: 40,
  },
  vegetable: {
    name: "Hortalizas",
    icon: "sprout",
    weight: 0.5,
    value: 10,
    buy: 14,
    stack: 30,
  },
  fuel: {
    name: "Bidón de gasolina",
    icon: "fuel",
    weight: 2,
    value: 10,
    buy: 20,
    stack: 5,
  },
  fossil: {
    name: "Fragmento fósil",
    icon: "fossil",
    weight: 2,
    value: 65,
    buy: 0,
    stack: 20,
  },
};
export const ECONOMY = { truck: 35, house: 80, enclosure: 45, incubator: 55 };
export const REPAIR_MATERIALS: Record<
  keyof typeof ECONOMY,
  { item: ItemId; quantity: number }
> = {
  truck: { item: "scrap", quantity: 4 },
  house: { item: "wood", quantity: 8 },
  enclosure: { item: "wood", quantity: 6 },
  incubator: { item: "scrap", quantity: 3 },
};
export const BUILDINGS: Record<
  PieceId,
  {
    name: string;
    description: string;
    wood: number;
    money: number;
    size: [number, number];
    icon: string;
  }
> = {
  fence: {
    name: "Valla de madera",
    description: "Un límite para tu pequeño mundo.",
    wood: 1,
    money: 3,
    size: [4, 0.4],
    icon: "fence",
  },
  floor: {
    name: "Tarima",
    description: "La base de un rincón acogedor.",
    wood: 2,
    money: 5,
    size: [4, 4],
    icon: "build",
  },
  wall: {
    name: "Pared",
    description: "Encaja sobre una tarima.",
    wood: 2,
    money: 6,
    size: [4, 0.4],
    icon: "build",
  },
  roof: {
    name: "Tejado",
    description: "Completa tu refugio sobre una tarima.",
    wood: 3,
    money: 12,
    size: [4, 4],
    icon: "home",
  },
  trough: {
    name: "Comedero",
    description: "Se rellena al repartir pienso en el corral.",
    wood: 2,
    money: 12,
    size: [2, 1],
    icon: "leaf",
  },
  planter: {
    name: "Huerto elevado",
    description: "Siembra, espera y recoge hortalizas.",
    wood: 2,
    money: 8,
    size: [3, 2],
    icon: "sprout",
  },
  shelter: {
    name: "Cobertizo",
    description: "Sombra y descanso para tus dinosaurios.",
    wood: 5,
    money: 25,
    size: [4, 4],
    icon: "home",
  },
  storage: {
    name: "Baúl",
    description: "Acceso al almacén compartido de la finca.",
    wood: 3,
    money: 10,
    size: [2, 1],
    icon: "box",
  },
};
export const SPECIES = {
  psittacosaurus: {
    id: "psittacosaurus",
    name: "Psittacosaurus",
    diet: "Herbívoro",
    adultAge: 360,
    incubation: 60,
    baseValue: 280,
    foodRate: 0.035,
    waterRate: 0.045,
    breedCooldown: 480,
    maxResidents: 8,
  },
};
export const LOCATIONS = [
  {
    id: "home",
    name: "Finca Aurum",
    x: -15,
    z: -2,
    icon: "home",
    description: "Tu casa. Todo empieza aquí.",
  },
  {
    id: "market",
    name: "El aserradero",
    x: -50,
    z: 36,
    icon: "wood",
    description: "Vende tus recursos y la carga de la camioneta.",
  },
  {
    id: "shop",
    name: "Almacén de Clara",
    x: 44,
    z: 34,
    icon: "shop",
    description: "Semillas, pienso, materiales y combustible.",
  },
  {
    id: "research",
    name: "Estación Olmo",
    x: 63,
    z: -52,
    icon: "egg",
    description: "Una estación abandonada entre los pinos.",
  },
  {
    id: "lake",
    name: "Laguna Serena",
    x: -59,
    z: -49,
    icon: "water",
    description: "Un buen sitio para bajar el ritmo.",
  },
];
export const WORLD_SIZE = 500;
export const INVENTORY_LIMIT = 60;
export const CARGO_LIMIT = 240;
export const CROP_MINUTES = 180;
