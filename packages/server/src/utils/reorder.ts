/**
 * Pure helpers for computing card position changes when a card is moved
 * within a list or across lists. Kept free of any DB/Mongoose dependency so
 * the reorder math can be unit tested in isolation.
 */

export interface PositionShift {
  /** The list whose cards need a position adjustment. */
  listId: string;
  /** Inclusive lower bound of positions to shift. */
  from: number;
  /** Inclusive upper bound of positions to shift, or null for "no upper bound". */
  to: number | null;
  /** Amount to add to matching cards' positions. */
  delta: 1 | -1;
}

export interface PlanCardMoveParams {
  sourceListId: string;
  targetListId: string;
  oldPosition: number;
  requestedPosition: number;
  /** Number of cards already in the target list, excluding the card being moved. */
  destCount: number;
}

export interface PlanCardMoveResult {
  /** The final, clamped position the moved card should be saved at. */
  position: number;
  /** Position-shift operations that must be applied to other cards. */
  shifts: PositionShift[];
}

/**
 * Computes the clamped destination position for a moved card plus the set
 * of position-shift operations required to keep every other card's
 * `position` contiguous (0-based, no gaps or duplicates).
 */
export function planCardMove({
  sourceListId,
  targetListId,
  oldPosition,
  requestedPosition,
  destCount,
}: PlanCardMoveParams): PlanCardMoveResult {
  const position = Math.max(0, Math.min(requestedPosition, destCount));
  const shifts: PositionShift[] = [];

  if (sourceListId === targetListId) {
    if (position > oldPosition) {
      // Card moved down: cards strictly after the old spot, up to and
      // including the new spot, shift up by one to close the gap.
      shifts.push({ listId: sourceListId, from: oldPosition + 1, to: position, delta: -1 });
    } else if (position < oldPosition) {
      // Card moved up: cards from the new spot up to (not including) the
      // old spot shift down by one to make room.
      shifts.push({ listId: sourceListId, from: position, to: oldPosition - 1, delta: 1 });
    }
    // position === oldPosition: no-op, nothing to shift.
  } else {
    // Close the gap left behind in the source list.
    shifts.push({ listId: sourceListId, from: oldPosition + 1, to: null, delta: -1 });
    // Open a gap in the destination list at the target position.
    shifts.push({ listId: targetListId, from: position, to: null, delta: 1 });
  }

  return { position, shifts };
}
