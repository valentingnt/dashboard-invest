import { Card } from "@/components/ui/card"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react'

interface PortfolioSummaryProps {
  totalValue: number
  totalInvested: number
  totalProfitLoss: number
  totalProfitLossPercentage: number
}

export function PortfolioSummary({
  totalValue,
  totalInvested,
  totalProfitLoss,
  totalProfitLossPercentage,
}: PortfolioSummaryProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-6 sm:p-8 border border-primary/20 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="space-y-6 sm:space-y-8">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Patrimoine brut</h2>
              <p className="text-3xl sm:text-4xl font-bold mt-2">
                {formatCurrency(totalValue)}
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-8 pt-4 sm:pt-6 border-t border-primary/10">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Investi</p>
                <p className="text-lg sm:text-xl font-semibold mt-2">{formatCurrency(totalInvested)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Performance</p>
                <div className="flex items-center gap-2 mt-2">
                  {totalProfitLoss >= 0 ? (
                    <ArrowUpIcon className="w-4 sm:w-5 h-4 sm:h-5 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="w-4 sm:w-5 h-4 sm:h-5 text-red-500" />
                  )}
                  <p className={`text-lg sm:text-xl font-semibold ${totalProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPercentage(totalProfitLossPercentage)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Plus/Moins value</p>
                <div className="flex items-center gap-2 mt-2">
                  <p className={`text-lg sm:text-xl font-semibold ${totalProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(totalProfitLoss)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
} 