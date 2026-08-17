/**
 * Pure budget arithmetic for the furnishing module. Deliberately kept out
 * of src/db/queries/ so it can be unit-tested without pulling in the
 * database client (importing anything from src/db/ evaluates the Postgres
 * connection at module load and needs a real DATABASE_URL).
 */

export interface RoomRollup {
  room: string;
  neededCount: number;
  ownedCount: number;
  estimatedCents: number;
  actualCents: number;
}

/** The subset of a furniture row the roll-up actually reads. */
export interface BudgetInputItem {
  room: string | null;
  status: "needed" | "researching" | "ordered" | "owned";
  estimatedCents: number | null;
  actualCents: number | null;
}

/** Sentinel room key for the house-wide total row, always returned first. */
export const HOUSE_TOTAL_KEY = "__house__";

/**
 * Groups items by room and totals them, plus a house-wide row. An "owned"
 * item counts toward actual spend; everything else (needed / researching /
 * ordered) counts toward the estimate of what's still to buy.
 */
export function computeBudgetRollup(items: BudgetInputItem[]): RoomRollup[] {
  const byRoom = new Map<string, RoomRollup>();

  const bump = (key: string, item: BudgetInputItem) => {
    const existing = byRoom.get(key) ?? {
      room: key,
      neededCount: 0,
      ownedCount: 0,
      estimatedCents: 0,
      actualCents: 0,
    };
    if (item.status === "owned") {
      existing.ownedCount += 1;
      existing.actualCents += item.actualCents ?? 0;
    } else {
      existing.neededCount += 1;
      existing.estimatedCents += item.estimatedCents ?? 0;
    }
    byRoom.set(key, existing);
  };

  for (const item of items) {
    bump(item.room ?? "Unassigned", item);
    bump(HOUSE_TOTAL_KEY, item);
  }

  const rooms = [...byRoom.values()].filter((r) => r.room !== HOUSE_TOTAL_KEY);
  rooms.sort((a, b) => a.room.localeCompare(b.room));
  const house = byRoom.get(HOUSE_TOTAL_KEY);
  return house ? [house, ...rooms] : rooms;
}
