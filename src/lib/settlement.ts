/**
 * Net "who owes whom", reduced to the fewest payments.
 *
 * Every payment and shared purchase lands in `ledger_entries` as a positive
 * amount against the member who put money in. Fair share is the total
 * divided evenly across participating members, so a member's *net* position
 * is what they put in minus what they should have. Positive net = they're
 * owed money; negative = they owe.
 *
 * The transfer list is produced by the standard greedy debt-simplification:
 * repeatedly match the largest creditor with the largest debtor. For a
 * four-person share house this is optimal in practice and always produces
 * at most n-1 transfers, which beats everyone paying everyone.
 */

export interface LedgerParticipant {
  memberId: string;
  name: string;
  /** Total this member has actually paid in, in cents. */
  paidCents: number;
}

export interface NetPosition {
  memberId: string;
  name: string;
  paidCents: number;
  fairShareCents: number;
  /** Positive = owed money by the house. Negative = owes the house. */
  netCents: number;
}

export interface Transfer {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amountCents: number;
}

/**
 * Splits the total pot evenly and returns each member's net position.
 * Fair shares use the same remainder rule as bill splitting: the leftover
 * cents go to the first members in order, so shares always sum exactly to
 * the pot and the nets always sum to zero.
 */
export function computeNetPositions(participants: LedgerParticipant[]): NetPosition[] {
  if (participants.length === 0) return [];

  const totalCents = participants.reduce((sum, p) => sum + p.paidCents, 0);
  const base = Math.floor(totalCents / participants.length);
  const remainder = totalCents - base * participants.length;

  return participants.map((p, index) => {
    const fairShareCents = base + (index < remainder ? 1 : 0);
    return {
      memberId: p.memberId,
      name: p.name,
      paidCents: p.paidCents,
      fairShareCents,
      netCents: p.paidCents - fairShareCents,
    };
  });
}

/**
 * Reduces net positions to a minimal list of transfers. Amounts under
 * `toleranceCents` are treated as settled — without this, a 1c rounding
 * residue would generate a pointless "pay Sam $0.01" line.
 */
export function computeTransfers(
  positions: NetPosition[],
  toleranceCents: number = 1,
): Transfer[] {
  const creditors = positions
    .filter((p) => p.netCents > toleranceCents)
    .map((p) => ({ ...p, remaining: p.netCents }))
    .sort((a, b) => b.remaining - a.remaining);

  const debtors = positions
    .filter((p) => p.netCents < -toleranceCents)
    .map((p) => ({ ...p, remaining: -p.netCents }))
    .sort((a, b) => b.remaining - a.remaining);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.remaining, debtor.remaining);

    if (amount > 0) {
      transfers.push({
        fromMemberId: debtor.memberId,
        fromName: debtor.name,
        toMemberId: creditor.memberId,
        toName: creditor.name,
        amountCents: amount,
      });
    }

    creditor.remaining -= amount;
    debtor.remaining -= amount;

    if (creditor.remaining <= toleranceCents) ci++;
    if (debtor.remaining <= toleranceCents) di++;
  }

  return transfers;
}
