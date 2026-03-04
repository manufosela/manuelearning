/**
 * Pure utility for computing new order values when moving items up/down.
 * No Firebase dependency - safe for unit testing.
 */

/**
 * Swap the order of two adjacent items in a sorted list.
 * Returns the two items that need their `order` field updated,
 * or null if the move is not possible.
 *
 * @param {{ id: string, order: number }[]} items - Sorted by order ascending
 * @param {string} itemId - ID of item to move
 * @param {'up' | 'down'} direction
 * @returns {{ item: { id: string, order: number }, neighbor: { id: string, order: number } } | null}
 */
export function computeSwap(items, itemId, direction) {
  const index = items.findIndex((i) => i.id === itemId);
  if (index === -1) return null;

  const neighborIndex = direction === 'up' ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= items.length) return null;

  const item = items[index];
  const neighbor = items[neighborIndex];

  return {
    item: { id: item.id, order: neighbor.order },
    neighbor: { id: neighbor.id, order: item.order },
  };
}
