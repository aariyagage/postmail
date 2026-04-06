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
  { bg: "#2e2220", border: "#8a6a60" },  // rose
  { bg: "#1e2820", border: "#5a7a5e" },  // sage
  { bg: "#2a2418", border: "#8a7a5a" },  // cream
  { bg: "#24202e", border: "#6a5a8a" },  // lavender
  { bg: "#1e242a", border: "#5a7a8a" },  // sky
  { bg: "#2a2618", border: "#8a7a50" },  // sand
  { bg: "#2e2024", border: "#8a5a6a" },  // blush
  { bg: "#1e2a26", border: "#4a8a70" },  // mint
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
