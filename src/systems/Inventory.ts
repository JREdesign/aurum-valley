import { ITEMS, INVENTORY_LIMIT } from "../data/content";
import type { Bag, ItemId } from "../core/types";
export function weight(bag: Bag): number {
  return Object.entries(bag).reduce(
    (sum, [id, n]) => sum + ITEMS[id as ItemId].weight * n,
    0,
  );
}
export function add(
  bag: Bag,
  item: ItemId,
  quantity: number,
  limit = INVENTORY_LIMIT,
): boolean {
  if (
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    !ITEMS[item] ||
    weight(bag) + ITEMS[item].weight * quantity > limit + 0.001
  )
    return false;
  if (
    (bag[item] || 0) + quantity > ITEMS[item].stack &&
    limit === INVENTORY_LIMIT
  )
    return false;
  bag[item] = (bag[item] || 0) + quantity;
  return true;
}
export function remove(bag: Bag, item: ItemId, quantity: number): boolean {
  if (
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    (bag[item] || 0) < quantity
  )
    return false;
  bag[item]! -= quantity;
  if (!bag[item]) delete bag[item];
  return true;
}
export function transfer(
  from: Bag,
  to: Bag,
  item: ItemId,
  quantity: number,
  limit: number,
): boolean {
  if ((from[item] || 0) < quantity || !add(to, item, quantity, limit))
    return false;
  remove(from, item, quantity);
  return true;
}
