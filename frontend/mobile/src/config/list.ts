/** Keeps long lists light on low-end phones: fewer off-screen rows stay rendered. */
export const LIST_PERFORMANCE_PROPS = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 5,
  windowSize: 7,
} as const;
