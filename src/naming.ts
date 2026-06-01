/** Build the base output name for a timestamp. */
export function baseName(epochMs: number): string {
  return `${epochMs}.png`;
}

/**
 * Deterministic name allocator. Assigns `<ms>.png`, and on collision (a name
 * already taken in this run, or an optional set of pre-existing names) appends
 * `_1`, `_2`, ... For reproducible suffixes, feed items in epoch-ms order.
 */
export function createNamer(existing: Iterable<string> = []): (epochMs: number) => string {
  const taken = new Set<string>(existing);
  return (epochMs: number): string => {
    let candidate = baseName(epochMs);
    let counter = 0;
    while (taken.has(candidate)) {
      counter += 1;
      candidate = `${epochMs}_${counter}.png`;
    }
    taken.add(candidate);
    return candidate;
  };
}
