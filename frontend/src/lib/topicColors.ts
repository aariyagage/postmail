const TINTS = [
  { bg: "#f0ddd8", border: "#d4b5ad" },  // rose
  { bg: "#dde8df", border: "#b5ccb9" },  // sage
  { bg: "#f2ebe0", border: "#d4c9b5" },  // cream
  { bg: "#e4e0ed", border: "#c4bdd4" },  // lavender
  { bg: "#dce6ed", border: "#b5c9d4" },  // sky
  { bg: "#ede8da", border: "#d4ccab" },  // sand
  { bg: "#f2e0e4", border: "#d4b5be" },  // blush
  { bg: "#d8ede6", border: "#add4c7" },  // mint
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTopicTint(topic: string) {
  const idx = hashString(topic.toLowerCase()) % TINTS.length;
  return TINTS[idx];
}

export function getTopicBg(topic: string): string {
  return getTopicTint(topic).bg;
}

export function getTopicBorder(topic: string): string {
  return getTopicTint(topic).border;
}
