import { Asset, AssetWithPrice, Transaction } from '@/lib/types'
import { enrichAssetWithPriceAndTransactions } from '@/lib/services/price-service'
import { BarChartIcon, TrendingUpIcon, PiggyBankIcon } from 'lucide-react'
import React, { createElement } from 'react'

export interface PortfolioMetrics {
  totalValue: number
  totalInvested: number
  totalProfitLoss: number
  totalProfitLossPercentage: number
}

export interface CategoryItem {
  name: string
  symbol: string
  value: number
  quantity: number
  currentPrice: number
  averagePrice: number
  percentage: number
  profitLoss: number
  profitLossPercentage: number
  interest_rate?: number
  accruedInterest?: number
}

export interface Category {
  category: string
  icon: React.ReactElement
  total: number
  invested: number
  percentage: number
  items: CategoryItem[]
  archivedItems: CategoryItem[]
}

export class PortfolioService {
  async enrichAssets(assets: Asset[], transactions: Transaction[]): Promise<AssetWithPrice[]> {
    return Promise.all(
      assets.map(asset => enrichAssetWithPriceAndTransactions(asset, transactions))
    )
  }

  calculatePortfolioMetrics(enrichedAssets: AssetWithPrice[], transactions: Transaction[]): PortfolioMetrics {
    const totalValue = enrichedAssets.reduce((sum, asset) => sum + asset.totalValue, 0)
    const totalInvested = enrichedAssets.reduce((sum, asset) => {
      const assetTransactions = transactions.filter(t => t.asset_id === asset.id)
      return sum + assetTransactions.reduce((total, t) => total + (t.type === 'buy' ? t.total_amount : -t.total_amount), 0)
    }, 0)
    const totalProfitLoss = totalValue - totalInvested
    const totalProfitLossPercentage = (totalProfitLoss / totalInvested) * 100

    return {
      totalValue,
      totalInvested,
      totalProfitLoss,
      totalProfitLossPercentage
    }
  }

  groupAssetsByCategory(enrichedAssets: AssetWithPrice[], transactions: Transaction[], totalValue: number): Category[] {
    const etfs = enrichedAssets.filter(asset => asset.type === 'etf')
    const crypto = enrichedAssets.filter(asset => asset.type === 'crypto')
    const savings = enrichedAssets.filter(asset => asset.type === 'savings')

    return [
      this.createCategory(
        "Actions & Fonds",
        createElement(BarChartIcon, { className: "w-5 h-5" }),
        etfs,
        transactions,
        totalValue
      ),
      this.createCategory(
        "Crypto",
        createElement(TrendingUpIcon, { className: "w-5 h-5" }),
        crypto,
        transactions,
        totalValue
      ),
      this.createCategory(
        "Épargne",
        createElement(PiggyBankIcon, { className: "w-5 h-5" }),
        savings,
        transactions,
        totalValue
      ),
    ]
  }

  private createCategory(
    name: string, 
    icon: React.ReactElement, 
    assets: AssetWithPrice[], 
    transactions: Transaction[],
    totalValue: number
  ): Category {
    const total = assets.reduce((sum, asset) => sum + asset.totalValue, 0)
    const invested = assets.reduce((sum, asset) => {
      const assetTransactions = transactions.filter(t => t.asset_id === asset.id)
      return sum + assetTransactions.reduce((total, t) => total + (t.type === 'buy' ? t.total_amount : -t.total_amount), 0)
    }, 0)
    const percentage = (total / totalValue) * 100 || 0

    const mapAssetToItem = (asset: AssetWithPrice): CategoryItem => ({
      name: asset.name,
      symbol: asset.symbol,
      value: asset.totalValue,
      quantity: asset.totalQuantity,
      currentPrice: asset.currentPrice,
      averagePrice: asset.averagePrice,
      percentage: (asset.totalValue / totalValue) * 100 || 0,
      profitLoss: asset.profitLoss,
      profitLossPercentage: asset.profitLossPercentage,
      ...(asset.type === 'savings' && {
        interest_rate: asset.interest_rate || undefined,
        accruedInterest: asset.accruedInterest,
      }),
    })

    return {
      category: name,
      icon,
      total,
      invested,
      percentage,
      items: assets.filter(asset => asset.totalQuantity > 0).map(mapAssetToItem),
      archivedItems: assets.filter(asset => asset.totalQuantity === 0).map(mapAssetToItem),
    }
  }
}