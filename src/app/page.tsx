import { Card } from "@/components/ui/card"
import { DashboardHeader } from '@/components/dashboard/header'
import { PortfolioSummary } from '@/components/dashboard/portfolio-summary'
import { AssetCategory } from '@/components/dashboard/asset-category'
import { PerformanceChart } from '@/components/performance-chart'
import { DataService } from '@/lib/services/data.service'
import { PortfolioService } from '@/lib/services/portfolio.service'
import { ChartService } from '@/lib/services/chart.service'

export const revalidate = 0

export default async function DashboardPage() {
  try {
    // Initialize services
    const dataService = new DataService()
    const portfolioService = new PortfolioService()
    const chartService = new ChartService()

    // Fetch data
    const [assets, transactions] = await Promise.all([
      dataService.getAssets(),
      dataService.getTransactions(),
    ])

    // Process data
    const enrichedAssets = await portfolioService.enrichAssets(assets, transactions)
    const metrics = portfolioService.calculatePortfolioMetrics(enrichedAssets, transactions)
    const categories = portfolioService.groupAssetsByCategory(enrichedAssets, transactions, metrics.totalValue)
    const chartData = chartService.generateChartData(enrichedAssets, transactions)

    return (
      <div className="flex justify-center min-h-screen text-primary bg-background">
        <main className="flex flex-col w-full max-w-[1440px] mx-auto my-4 sm:my-8 px-4 sm:px-6">
          <div className="space-y-8 sm:space-y-12">
            <DashboardHeader />

            <PortfolioSummary
              totalValue={metrics.totalValue}
              totalInvested={metrics.totalInvested}
              totalProfitLoss={metrics.totalProfitLoss}
              totalProfitLossPercentage={metrics.totalProfitLossPercentage}
            />

            {/* Assets Section */}
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Répartition des actifs</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {categories.map((category) => (
                  <AssetCategory
                    key={category.category}
                    {...category}
                  />
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
  } catch (error) {
    console.error('Error loading portfolio:', error)
    return (
      <div className="flex justify-center min-h-screen text-primary bg-background">
        <main className="flex flex-col w-full max-w-[1440px] mx-auto my-4 sm:my-8 px-4 sm:px-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-500">Error</h1>
            <p className="text-muted-foreground">Failed to load portfolio data. Please try again later.</p>
          </div>
        </main>
      </div>
    )
  }
}
