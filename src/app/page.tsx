import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Asset, Transaction, AssetWithPrice } from '@/lib/types'
import { enrichAssetWithPriceAndTransactions } from '@/lib/services/price-service'
import { supabase } from '@/lib/supabase/client'
import { PostgrestError } from '@supabase/supabase-js'
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon, BarChartIcon } from 'lucide-react'
import { PerformanceChart } from '@/components/performance-chart'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Metadata } from "next"

function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

// Function to generate dates between start and end
function getDates(startDate: Date, endDate: Date) {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0); // Set to midnight

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

// Function to format date for chart
function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit',
    year: 'numeric' 
  });
}

export const metadata: Metadata = {
  icons: {
    icon: [
      {
        url: '/favicon-dark.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/favicon-light.png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
  }
}

interface ChartDataPoint {
  date: string;
  [key: string]: number | string;
}

export const revalidate = 0

export default async function DashboardPage() {
  // Fetch assets and transactions from Supabase
  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select('*') as { data: Asset[] | null, error: PostgrestError | null }

  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false }) as { data: Transaction[] | null, error: PostgrestError | null }

  if (assetsError) {
    console.error('Error fetching assets:', assetsError)
    return <div>Error loading assets</div>
  }

  if (transactionsError) {
    console.error('Error fetching transactions:', transactionsError)
    return <div>Error loading transactions</div>
  }

  if (!assets || !transactions) {
    return <div>Loading...</div>
  }

  // Enrich assets with current prices and calculations
  const enrichedAssets: AssetWithPrice[] = await Promise.all(
    assets.map(asset => enrichAssetWithPriceAndTransactions(asset, transactions))
  )

  // Calculate total portfolio metrics
  const totalValue = enrichedAssets.reduce((sum, asset) => sum + asset.totalValue, 0)
  const totalInvested = enrichedAssets.reduce((sum, asset) => {
    const assetTransactions = transactions.filter(t => t.asset_id === asset.id)
    return sum + assetTransactions.reduce((total, t) => total + (t.type === 'buy' ? t.total_amount : -t.total_amount), 0)
  }, 0)
  const totalProfitLoss = totalValue - totalInvested
  const totalProfitLossPercentage = (totalProfitLoss / totalInvested) * 100

  // Group assets by category
  const etfs = enrichedAssets.filter(asset => asset.type === 'etf')
  const crypto = enrichedAssets.filter(asset => asset.type === 'crypto')

  const categories = [
    {
      category: "Actions & Fonds",
      icon: <BarChartIcon className="w-5 h-5" />,
      total: etfs.reduce((sum, asset) => sum + asset.totalValue, 0),
      invested: etfs.reduce((sum, asset) => {
        const assetTransactions = transactions.filter(t => t.asset_id === asset.id)
        return sum + assetTransactions.reduce((total, t) => total + (t.type === 'buy' ? t.total_amount : -t.total_amount), 0)
      }, 0),
      percentage: (etfs.reduce((sum, asset) => sum + asset.totalValue, 0) / totalValue) * 100 || 0,
      items: etfs.filter(asset => asset.totalQuantity > 0).map(asset => ({
        name: asset.name,
        symbol: asset.symbol,
        value: asset.totalValue,
        quantity: asset.totalQuantity,
        currentPrice: asset.currentPrice,
        averagePrice: asset.averagePrice,
        percentage: (asset.totalValue / totalValue) * 100 || 0,
        profitLoss: asset.profitLoss,
        profitLossPercentage: asset.profitLossPercentage,
      })),
      archivedItems: etfs.filter(asset => asset.totalQuantity === 0).map(asset => ({
        name: asset.name,
        symbol: asset.symbol,
        value: asset.totalValue,
        quantity: asset.totalQuantity,
        currentPrice: asset.currentPrice,
        averagePrice: asset.averagePrice,
        percentage: (asset.totalValue / totalValue) * 100 || 0,
        profitLoss: asset.profitLoss,
        profitLossPercentage: asset.profitLossPercentage,
      })),
    },
    {
      category: "Crypto",
      icon: <TrendingUpIcon className="w-5 h-5" />,
      total: crypto.reduce((sum, asset) => sum + asset.totalValue, 0),
      invested: crypto.reduce((sum, asset) => {
        const assetTransactions = transactions.filter(t => t.asset_id === asset.id)
        return sum + assetTransactions.reduce((total, t) => total + (t.type === 'buy' ? t.total_amount : -t.total_amount), 0)
      }, 0),
      percentage: (crypto.reduce((sum, asset) => sum + asset.totalValue, 0) / totalValue) * 100 || 0,
      items: crypto.filter(asset => asset.totalQuantity > 0).map(asset => ({
        name: asset.name,
        symbol: asset.symbol,
        value: asset.totalValue,
        quantity: asset.totalQuantity,
        currentPrice: asset.currentPrice,
        averagePrice: asset.averagePrice,
        percentage: (asset.totalValue / totalValue) * 100 || 0,
        profitLoss: asset.profitLoss,
        profitLossPercentage: asset.profitLossPercentage,
      })),
      archivedItems: crypto.filter(asset => asset.totalQuantity === 0).map(asset => ({
        name: asset.name,
        symbol: asset.symbol,
        value: asset.totalValue,
        quantity: asset.totalQuantity,
        currentPrice: asset.currentPrice,
        averagePrice: asset.averagePrice,
        percentage: (asset.totalValue / totalValue) * 100 || 0,
        profitLoss: asset.profitLoss,
        profitLossPercentage: asset.profitLossPercentage,
      })),
    },
  ]

  // Generate dates for the chart from the first transaction to today
  const firstTransactionDate = new Date(Math.min(...transactions.map(t => new Date(t.transaction_date).getTime())));
  firstTransactionDate.setHours(0, 0, 0, 0); // Set to midnight
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to midnight
  
  const dates = getDates(firstTransactionDate, today);

  // Prepare chart data
  const chartData: ChartDataPoint[] = dates.map(date => {
    const dataPoint: ChartDataPoint = {
      date: formatDate(date),
    };

    // Calculate value for each asset at this date
    enrichedAssets.forEach(asset => {
      // Get all transactions up to this date for this asset
      const assetTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.transaction_date);
        transactionDate.setHours(0, 0, 0, 0);
        return t.asset_id === asset.id && transactionDate <= date;
      });
      
      if (assetTransactions.length > 0) {
        let quantity = 0;
        assetTransactions.forEach(t => {
          quantity += t.type === 'buy' ? t.quantity : -t.quantity;
        });
        dataPoint[asset.name] = quantity * asset.currentPrice;
      } else {
        dataPoint[asset.name] = 0;
      }
    });

    return dataPoint;
  });

  return (
    <div className="flex justify-center min-h-screen text-primary bg-background">
      <main className="flex flex-col w-full max-w-[1440px] mx-auto my-4 sm:my-8 px-4 sm:px-6">
        <div className="space-y-8 sm:space-y-12">
          {/* Header with Theme Toggle */}
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

          {/* Portfolio Summary Section */}
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
                  
                  <div className="grid grid-cols-2 gap-4 sm:gap-8 pt-4 sm:pt-6 border-t border-primary/10">
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
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Assets Section */}
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Répartition des actifs</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {categories.map((category) => (
                <Card 
                  key={category.category} 
                  className="border border-primary/20 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    {/* Category Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/5">
                          {category.icon}
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold">{category.category}</h3>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-lg sm:text-xl font-semibold">{formatCurrency(category.total)}</p>
                        <p className="text-sm font-medium text-muted-foreground">{category.percentage.toFixed(1)}% du total</p>
                      </div>
                    </div>

                    {/* Category Performance */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-8 pt-4 border-t border-primary/10">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Investi</p>
                        <p className="text-base sm:text-lg font-semibold mt-2">{formatCurrency(category.invested)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Plus/Moins value</p>
                        <p className="text-base sm:text-lg font-semibold mt-2">{formatCurrency(category.total - category.invested)}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Performance</p>
                        <div className="flex items-center gap-2 mt-2">
                          {(category.total - category.invested) >= 0 ? (
                            <ArrowUpIcon className="w-4 h-4 text-green-500" />
                          ) : (
                            <ArrowDownIcon className="w-4 h-4 text-red-500" />
                          )}
                          <p className={`text-base sm:text-lg font-semibold ${(category.total - category.invested) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatPercentage(((category.total - category.invested) / category.invested) * 100)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Category Items */}
                  <div className="border-t border-primary/10">
                    <div className="grid grid-cols-1 divide-y divide-primary/10">
                      {category.items.map((item) => (
                        <div
                          key={item.name}
                          className="p-4 sm:p-6 hover:bg-muted/50 transition-colors duration-200"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6">
                            {/* Asset Identity */}
                            <div className="col-span-1">
                              <div className="flex items-center justify-between sm:block">
                                <div>
                                  <h4 className="text-base font-semibold">{item.name}</h4>
                                  <p className="text-sm font-medium text-muted-foreground mt-0.5">{item.symbol}</p>
                                </div>
                                <p className="text-sm font-medium text-muted-foreground sm:mt-2">{item.percentage.toFixed(1)}% du portfolio</p>
                              </div>
                            </div>

                            {/* Quantity and Value */}
                            <div className="col-span-1 grid grid-cols-2 sm:block gap-4">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Quantité</p>
                                <p className="text-base font-semibold mt-1">{item.quantity.toFixed(item.quantity < 1 ? 8 : 2)}</p>
                              </div>
                              <div className="sm:mt-3">
                                <p className="text-sm font-medium text-muted-foreground">Valeur totale</p>
                                <p className="text-base font-semibold mt-1">{formatCurrency(item.value)}</p>
                              </div>
                            </div>

                            {/* Prices */}
                            <div className="col-span-1 grid grid-cols-2 sm:block gap-4">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Prix actuel</p>
                                <p className="text-base font-semibold mt-1">{formatCurrency(item.currentPrice)}</p>
                              </div>
                              <div className="sm:mt-3">
                                <p className="text-sm font-medium text-muted-foreground">Prix moyen</p>
                                <p className="text-base font-semibold mt-1">{formatCurrency(item.averagePrice)}</p>
                              </div>
                            </div>

                            {/* Performance */}
                            <div className="col-span-1 grid grid-cols-2 sm:block gap-4">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Plus/Moins value</p>
                                <p className={`text-base font-semibold mt-1 ${item.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {formatCurrency(item.profitLoss)}
                                </p>
                              </div>
                              <div className="sm:mt-3">
                                <p className="text-sm font-medium text-muted-foreground">Performance</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {item.profitLoss >= 0 ? (
                                    <ArrowUpIcon className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <ArrowDownIcon className="w-4 h-4 text-red-500" />
                                  )}
                                  <p className={`text-base font-semibold ${item.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {formatPercentage(item.profitLossPercentage)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Archived Assets Section - Mobile Optimized */}
                      {category.archivedItems.length > 0 && (
                        <details className="group">
                          <summary className="p-4 sm:p-6 hover:bg-muted/50 transition-colors duration-200 cursor-pointer list-none">
                            <div className="flex items-center gap-2">
                              <div className="rotate-0 group-open:rotate-90 transition-transform duration-200">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                              <h4 className="text-base font-semibold text-muted-foreground">Actifs archivés ({category.archivedItems.length})</h4>
                            </div>
                          </summary>
                          
                          <div className="divide-y divide-primary/10">
                            {category.archivedItems.map((item) => (
                              <div
                                key={item.name}
                                className="p-4 sm:p-6 hover:bg-muted/50 transition-colors duration-200 bg-muted/30"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6">
                                  {/* Asset Identity */}
                                  <div className="col-span-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="text-base font-semibold text-muted-foreground">{item.name}</h4>
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">Archivé</span>
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground mt-0.5">{item.symbol}</p>
                                  </div>

                                  {/* Quantity and Value */}
                                  <div className="col-span-1 grid grid-cols-2 sm:block gap-4">
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Quantité</p>
                                      <p className="text-base font-semibold mt-1 text-muted-foreground">{item.quantity.toFixed(item.quantity < 1 ? 8 : 2)}</p>
                                    </div>
                                    <div className="sm:mt-3">
                                      <p className="text-sm font-medium text-muted-foreground">Valeur totale</p>
                                      <p className="text-base font-semibold mt-1 text-muted-foreground">{formatCurrency(item.value)}</p>
                                    </div>
                                  </div>

                                  {/* Prices */}
                                  <div className="col-span-1 grid grid-cols-2 sm:block gap-4">
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Prix actuel</p>
                                      <p className="text-base font-semibold mt-1 text-muted-foreground">{formatCurrency(item.currentPrice)}</p>
                                    </div>
                                    <div className="sm:mt-3">
                                      <p className="text-sm font-medium text-muted-foreground">Prix moyen</p>
                                      <p className="text-base font-semibold mt-1 text-muted-foreground">{formatCurrency(item.averagePrice)}</p>
                                    </div>
                                  </div>

                                  {/* Performance */}
                                  <div className="col-span-1 grid grid-cols-2 sm:block gap-4">
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Plus/Moins value</p>
                                      <p className="text-base font-semibold mt-1 text-muted-foreground">
                                        {formatCurrency(item.profitLoss)}
                                      </p>
                                    </div>
                                    <div className="sm:mt-3">
                                      <p className="text-sm font-medium text-muted-foreground">Performance</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <p className="text-base font-semibold text-muted-foreground">
                                          {formatPercentage(item.profitLossPercentage)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Performance Chart Section */}
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Évolution du portfolio</h2>
            <Card className="p-4 sm:p-6 border border-primary/20">
              <PerformanceChart 
                data={chartData}
                assets={enrichedAssets.map(asset => ({
                  id: asset.id,
                  name: asset.name,
                }))}
              />
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
