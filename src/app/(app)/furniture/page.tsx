import { Sofa } from "lucide-react";
import { requireMember } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
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
      <PageHeader
        title="Furniture"
        description="What the house needs, what it has, and what it's cost."
        icon={Sofa}
        accent="furniture"
      />

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
