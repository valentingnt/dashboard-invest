import { Card } from "@/components/ui/card"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react'
import { CategoryItem } from "@/lib/types"

interface AssetCategoryProps {
  category: string
  icon: React.ReactNode
  total: number
  invested: number
  percentage: number
  items: CategoryItem[]
  archivedItems: CategoryItem[]
}

export function AssetCategory({
  category,
  icon,
  total,
  invested,
  percentage,
  items,
  archivedItems,
}: AssetCategoryProps) {
  return (
    <Card className="border border-primary/20 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Category Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/5">
              {icon}
            </div>
            <h3 className="text-lg sm:text-xl font-semibold">{category}</h3>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-lg sm:text-xl font-semibold">{formatCurrency(total)}</p>
            <p className="text-sm font-medium text-muted-foreground">{percentage.toFixed(1)}% du total</p>
          </div>
        </div>

        {/* Category Performance */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-8 pt-4 border-t border-primary/10">
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Investi</p>
            <p className="text-base sm:text-lg font-semibold mt-2">{formatCurrency(invested)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Plus/Moins value</p>
            <p className="text-base sm:text-lg font-semibold mt-2">{formatCurrency(total - invested)}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Performance</p>
            <div className="flex items-center gap-2 mt-2">
              {(total - invested) >= 0 ? (
                <ArrowUpIcon className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowDownIcon className="w-4 h-4 text-red-500" />
              )}
              <p className={`text-base sm:text-lg font-semibold ${(total - invested) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercentage(((total - invested) / invested) * 100)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Items */}
      <div className="border-t border-primary/10">
        <div className="grid grid-cols-1 divide-y divide-primary/10">
          {items.map((item) => (
            <AssetItem key={item.name} item={item} category={category} />
          ))}

          {/* Archived Assets Section */}
          {archivedItems.length > 0 && (
            <details className="group">
              <summary className="p-4 sm:p-6 hover:bg-muted/50 transition-colors duration-200 cursor-pointer list-none">
                <div className="flex items-center gap-2">
                  <div className="rotate-0 group-open:rotate-90 transition-transform duration-200">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h4 className="text-base font-semibold text-muted-foreground">Actifs archivés ({archivedItems.length})</h4>
                </div>
              </summary>
              
              <div className="divide-y divide-primary/10">
                {archivedItems.map((item) => (
                  <AssetItem key={item.name} item={item} category={category} isArchived />
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </Card>
  )
}

interface AssetItemProps {
  item: CategoryItem
  category: string
  isArchived?: boolean
}

function AssetItem({ item, category, isArchived = false }: AssetItemProps) {
  const itemClasses = `p-4 sm:p-6 hover:bg-muted/50 transition-colors duration-200 ${isArchived ? 'bg-muted/30' : ''}`

  if (category === "Épargne") {
    return (
      <div className={itemClasses}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6">
          <div className="col-span-1">
            <div className="flex items-center justify-between sm:block">
              <div>
                <h4 className="text-base font-semibold">{item.name}</h4>
                <p className="text-sm font-medium text-muted-foreground mt-0.5">{item.symbol}</p>
                {item.interest_rate && (
                  <p className="text-sm font-medium text-green-500 mt-1">
                    Taux : {item.interest_rate}%
                  </p>
                )}
              </div>
              <p className="text-sm font-medium text-muted-foreground sm:mt-2">{item.percentage.toFixed(1)}% du portfolio</p>
            </div>
          </div>

          <div className="col-span-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Solde actuel</p>
                <p className="text-base font-semibold mt-1">{formatCurrency(item.quantity)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Intérêts cumulés</p>
                <p className="text-base font-semibold text-green-500 mt-1">
                  {formatCurrency(item.accruedInterest || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-1">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Intérêts mensuels projetés</p>
                <p className="text-base font-semibold text-green-500 mt-1">
                  {formatCurrency((item.quantity * (item.interest_rate || 0)) / 1200)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rendement</p>
                <div className="flex items-center gap-2 mt-1">
                  <ArrowUpIcon className="w-4 h-4 text-green-500" />
                  <p className="text-base font-semibold text-green-500">
                    {item.interest_rate}% par an
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={itemClasses}>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6">
        <div className="col-span-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={`text-base font-semibold ${isArchived ? 'text-muted-foreground' : ''}`}>{item.name}</h4>
            {isArchived && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">Archivé</span>
            )}
          </div>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">{item.symbol}</p>
          <p className="text-sm font-medium text-muted-foreground sm:mt-2">{item.percentage.toFixed(1)}% du portfolio</p>
        </div>

        <div className="col-span-1 grid grid-cols-2 sm:block gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Quantité</p>
            <p className={`text-base font-semibold mt-1 ${isArchived ? 'text-muted-foreground' : ''}`}>
              {item.quantity.toFixed(item.quantity < 1 ? 8 : 2)}
            </p>
          </div>
          <div className="sm:mt-3">
            <p className="text-sm font-medium text-muted-foreground">Valeur totale</p>
            <p className={`text-base font-semibold mt-1 ${isArchived ? 'text-muted-foreground' : ''}`}>
              {formatCurrency(item.value)}
            </p>
          </div>
        </div>

        <div className="col-span-1 grid grid-cols-2 sm:block gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Prix actuel</p>
            <p className={`text-base font-semibold mt-1 ${isArchived ? 'text-muted-foreground' : ''}`}>
              {formatCurrency(item.currentPrice)}
            </p>
          </div>
          <div className="sm:mt-3">
            <p className="text-sm font-medium text-muted-foreground">Prix moyen</p>
            <p className={`text-base font-semibold mt-1 ${isArchived ? 'text-muted-foreground' : ''}`}>
              {formatCurrency(item.averagePrice)}
            </p>
          </div>
        </div>

        <div className="col-span-1 grid grid-cols-2 sm:block gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Plus/Moins value</p>
            <p className={`text-base font-semibold mt-1 ${isArchived ? 'text-muted-foreground' : item.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(item.profitLoss)}
            </p>
          </div>
          <div className="sm:mt-3">
            <p className="text-sm font-medium text-muted-foreground">Performance</p>
            <div className="flex items-center gap-2 mt-1">
              {!isArchived && (
                item.profitLoss >= 0 ? (
                  <ArrowUpIcon className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4 text-red-500" />
                )
              )}
              <p className={`text-base font-semibold ${isArchived ? 'text-muted-foreground' : item.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercentage(item.profitLossPercentage)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 