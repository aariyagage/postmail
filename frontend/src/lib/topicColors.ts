const TINTS_LIGHT = [
  { bg: "#f0ddd8", border: "#d4b5ad" },  // rose
  { bg: "#dde8df", border: "#b5ccb9" },  // sage
  { bg: "#f2ebe0", border: "#d4c9b5" },  // cream
  { bg: "#e4e0ed", border: "#c4bdd4" },  // lavender
  { bg: "#dce6ed", border: "#b5c9d4" },  // sky
  { bg: "#ede8da", border: "#d4ccab" },  // sand
  { bg: "#f2e0e4", border: "#d4b5be" },  // blush
  { bg: "#d8ede6", border: "#add4c7" },  // mint
];

const TINTS_DARK = [
  { bg: "#3d2b28", border: "#6b4a44" },  // rose
  { bg: "#2a3a2d", border: "#4a6b50" },  // sage
  { bg: "#3a3428", border: "#6b5f44" },  // cream
  { bg: "#332e3d", border: "#5a4f6b" },  // lavender
  { bg: "#2a333a", border: "#4a5f6b" },  // sky
  { bg: "#3a3528", border: "#6b6044" },  // sand
  { bg: "#3d2a30", border: "#6b4a55" },  // blush
  { bg: "#283d35", border: "#446b5a" },  // mint
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function isDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function getTopicTint(topic: string) {
  const idx = hashString(topic.toLowerCase()) % TINTS_LIGHT.length;
  return isDark() ? TINTS_DARK[idx] : TINTS_LIGHT[idx];
}

export function getTopicBg(topic: string): string {
  return getTopicTint(topic).bg;
}

export function getTopicBorder(topic: string): string {
  return getTopicTint(topic).border;
}
