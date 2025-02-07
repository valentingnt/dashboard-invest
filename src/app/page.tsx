import { Card } from "@/components/ui/card"
import { Asset, Transaction, AssetWithPrice } from '@/lib/types'
import { enrichAssetWithPriceAndTransactions } from '@/lib/services/price-service'
import { supabase } from '@/lib/supabase/client'
import { PostgrestError } from '@supabase/supabase-js'
import { TrendingUpIcon, BarChartIcon, PiggyBankIcon } from 'lucide-react'
import { PerformanceChart } from '@/components/performance-chart'
import { DashboardHeader } from '@/components/dashboard/header'
import { PortfolioSummary } from '@/components/dashboard/portfolio-summary'
import { AssetCategory } from '@/components/dashboard/asset-category'

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
  const savings = enrichedAssets.filter(asset => asset.type === 'savings')

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
    {
      category: "Épargne",
      icon: <PiggyBankIcon className="w-5 h-5" />,
      total: savings.reduce((sum, asset) => sum + asset.totalValue, 0),
      invested: savings.reduce((sum, asset) => {
        const assetTransactions = transactions.filter(t => t.asset_id === asset.id)
        return sum + assetTransactions.reduce((total, t) => total + (t.type === 'buy' ? t.total_amount : -t.total_amount), 0)
      }, 0),
      percentage: (savings.reduce((sum, asset) => sum + asset.totalValue, 0) / totalValue) * 100 || 0,
      items: savings.filter(asset => asset.totalQuantity > 0).map(asset => ({
        name: asset.name,
        symbol: asset.symbol,
        value: asset.totalValue,
        quantity: asset.totalQuantity,
        currentPrice: asset.currentPrice,
        averagePrice: asset.averagePrice,
        percentage: (asset.totalValue / totalValue) * 100 || 0,
        profitLoss: asset.profitLoss,
        profitLossPercentage: asset.profitLossPercentage,
        interest_rate: asset.interest_rate,
        accruedInterest: asset.accruedInterest,
      })),
      archivedItems: savings.filter(asset => asset.totalQuantity === 0).map(asset => ({
        name: asset.name,
        symbol: asset.symbol,
        value: asset.totalValue,
        quantity: asset.totalQuantity,
        currentPrice: asset.currentPrice,
        averagePrice: asset.averagePrice,
        percentage: (asset.totalValue / totalValue) * 100 || 0,
        profitLoss: asset.profitLoss,
        profitLossPercentage: asset.profitLossPercentage,
        interest_rate: asset.interest_rate,
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
          <DashboardHeader />

          <PortfolioSummary
            totalValue={totalValue}
            totalInvested={totalInvested}
            totalProfitLoss={totalProfitLoss}
            totalProfitLossPercentage={totalProfitLossPercentage}
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
}
