const paths: Record<string, string> = {
  home: "M3 10 12 3l9 7M5 9v12h14V9M9 21v-7h6v7",
  sun: 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 1.4 1.4m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4<circle cx="12" cy="12" r="4"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12"/>',
  bag: "M7 7V5a5 5 0 0 1 10 0v2M5 7h14l1 14H4L5 7M8 12h8v5H8z",
  map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5m6-2v16m6-14v16",
  build: "m3 9 9-6 9 6-9 6-9-6m0 6 9 6 9-6M12 15v6",
  book: "M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4V4m9 3a3 3 0 0 1 3-3h5v15h-5a4 4 0 0 0-3 2",
  egg: '<path d="M19 15a7 7 0 0 1-14 0C5 9 9 3 12 3s7 6 7 12Z"/><path d="m9 10 2 2-1 3m4-7 1 2"/>',
  leaf: "M20 3C9 2 3 6 4 13s14 9 16-10ZM4 21l11-12",
  sprout:
    "M12 22V11M12 15C3 16 3 10 3 8c6-1 9 2 9 7Zm0-4C12 4 17 3 21 3c0 5-3 8-9 8Z",
  wood: 'm4 9 12-5M4 17l12-5<ellipse cx="5" cy="13" rx="3" ry="4"/><path d="M16 4c5-1 7 5 3 7l-3 1"/>',
  stone: "m7 4 10 1 5 10-6 6-12-3L2 9l5-5Z",
  gear: 'M10 3h4l1 3 3 1 3 3v4l-3 1-1 3-3 3h-4l-1-3-3-1-3-3v-4l3-1 1-3 3-3Z<circle cx="12" cy="12" r="3"/>',
  box: "m3 7 9-4 9 4v12l-9 3-9-3V7m0 0 9 4 9-4M12 11v11M7 5l10 4",
  fuel: "M4 21V4h10v17M4 11h10m-8-5h6v3H6m8 5h3v4a2 2 0 0 0 4 0V9l-3-4M2 21h14",
  fence: "M3 3v18M12 3v18M21 3v18M3 7h18M3 16h18",
  shop: "M4 10v11h16V10M2 10l2-7h16l2 7M8 21v-7h8v7M2 10c2 2 4 2 5 0 2 2 4 2 5 0 2 2 4 2 5 0 2 2 4 2 5 0",
  water: "M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Zm-4 13a4 4 0 0 0 4 4",
  fossil: "M4 20c-2-5 0-13 6-15s12 3 10 8-8 6-10 2 3-8 5-4-3 5-2 2M4 20l4-2",
  dino: "M3 18c6 1 7-4 8-7s5-4 7-2l3 1v3h-5l-2 5 2 3m-7-4-1 4m7-8 2 3",
  save: "M4 3h13l4 4v14H3V3h1m3 0v6h9V3M7 21v-8h10v8",
  sound: "m3 9 5 0 5-5v16l-5-5H3V9m14-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16",
  mute: "m3 9 5 0 5-5v16l-5-5H3V9m14 0 5 6m0-6-5 6",
  close: "m6 6 12 12M6 18 18 6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  check: "m4 12 5 5L20 6",
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 1 1 4 3c-1 1-1 2-1 3m0 3h.01"/>',
  truck:
    'M3 6h11v11H3V6m11 5h4l3 4v2h-7<circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  heart: "M12 21 3 12C-1 5 7 1 12 7c5-6 13-2 9 5l-9 9Z",
  pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z<circle cx="12" cy="10" r="2"/>',
  pause: "M8 4v16M16 4v16",
  full: "M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6",
  moon: "M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z",
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v7l4 2"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15 8-2 6-5 2 2-6 5-2Z"/>',
  tools: "m3 21 10-10M14 3c-4 1-5 6-2 9s8 2 9-2l-5 1-3-3 1-5Z",
};
export function icon(name: string, size = 20) {
  const p = paths[name] || paths.leaf;
  let content = p;
  if (!p.startsWith("<")) {
    const i = p.indexOf("<");
    content =
      i >= 0 ? `<path d="${p.slice(0, i)}"/>${p.slice(i)}` : `<path d="${p}"/>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
}
export function escape(text: string) {
  return text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
