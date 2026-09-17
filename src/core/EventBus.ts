export type GameEvent = {
  type: "change" | "toast" | "hatched" | "sound";
  message?: string;
  id?: string;
};
export class EventBus {
  private listeners = new Set<(event: GameEvent) => void>();
  on(callback: (event: GameEvent) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  emit(event: GameEvent) {
    this.listeners.forEach((callback) => callback(event));
  }
}
