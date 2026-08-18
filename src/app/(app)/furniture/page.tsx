import { requireMember } from "@/lib/session";
import { getFurnitureItems, toBudgetInput } from "@/db/queries/furniture";
import { computeBudgetRollup } from "@/lib/budget";
import { BudgetRollup } from "./budget-rollup";
import { StatusBoard } from "./status-board";

export default async function FurniturePage() {
  const member = await requireMember();

  const items = await getFurnitureItems(member.householdId);
  const rollup = computeBudgetRollup(toBudgetInput(items));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Furniture</h1>
        <p className="text-muted-foreground">
          What the house needs, what it has, and what it&apos;s cost.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="min-w-0 lg:col-span-3">
          <StatusBoard items={items} />
        </div>
        <div>
          <BudgetRollup rows={rollup} />
        </div>
      </div>
    </div>
  );
}
