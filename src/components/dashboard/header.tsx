import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"

export function DashboardHeader() {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Mon Portfolio</h1>
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
        <Button variant="outline" asChild className="flex-1 sm:flex-none">
          <Link href="/assets/new">Add Asset</Link>
        </Button>
        <Button variant="outline" asChild className="flex-1 sm:flex-none">
          <Link href="/transactions/new">Add Transaction</Link>
        </Button>
        <ThemeToggle />
      </div>
    </div>
  )
} 