import { Asset, AssetWithPrice, Transaction, InterestRateHistory } from '@/lib/types';
import { BaseAssetService } from './base-asset.service';
import { supabase } from '@/lib/supabase/client';

export class SavingsService extends BaseAssetService {
  async enrichAssetWithPriceAndTransactions(
    asset: Asset,
    transactions: Transaction[]
  ): Promise<AssetWithPrice> {
    // Get interest rate history
    const { data: rates } = await supabase
      .from('interest_rate_history')
      .select('*')
      .eq('asset_id', asset.id)
      .order('start_date', { ascending: true });

    const interestRateHistory: InterestRateHistory[] = rates || [];

    // Get current rate
    const { data: currentRate } = await supabase
      .rpc('get_current_interest_rate', { 
        asset_uuid: asset.id 
      });

    // Sort transactions by date
    const sortedTransactions = transactions
      .filter(t => t.asset_id === asset.id)
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

    // Calculate interest
    const { totalQuantity, accruedInterest } = this.calculateSavingsMetrics(sortedTransactions, interestRateHistory);
    const totalCost = this.calculateTotalCost(sortedTransactions);
    const totalValue = totalQuantity + accruedInterest;

    return {
      ...asset,
      currentPrice: 1, // Always 1 for savings accounts
      totalValue,
      totalQuantity,
      averagePrice: totalQuantity > 0 ? totalCost / totalQuantity : 0,
      profitLoss: accruedInterest,
      profitLossPercentage: totalCost > 0 ? (accruedInterest / totalCost) * 100 : 0,
      accruedInterest,
      interest_rate: currentRate,
    };
  }

  private calculateSavingsMetrics(
    transactions: Transaction[],
    interestRateHistory: InterestRateHistory[]
  ): { totalQuantity: number; accruedInterest: number } {
    let currentBalance = 0;
    let lastTransactionDate = new Date(0);
    let accruedInterest = 0;

    // Process each transaction and calculate interest up to the next transaction
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const transactionDate = new Date(transaction.transaction_date);
      
      // Calculate interest for the period between last transaction and this one
      if (currentBalance > 0) {
        // Calculate interest for each rate period between transactions
        for (const rate of interestRateHistory) {
          const rateStartDate = new Date(rate.start_date);
          const rateEndDate = rate.end_date ? new Date(rate.end_date) : new Date();
          
          // Check if this rate period overlaps with our transaction period
          const periodStart = new Date(Math.max(lastTransactionDate.getTime(), rateStartDate.getTime()));
          const periodEnd = new Date(Math.min(transactionDate.getTime(), rateEndDate.getTime()));

          // Set hours to 0 for consistent date comparison
          periodStart.setHours(0, 0, 0, 0);
          periodEnd.setHours(0, 0, 0, 0);
          
          if (periodStart < periodEnd) {
            // Calculate days in this period (add 1 to include both start and end dates)
            const daysBetween = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
            const dailyRate = (rate.rate / 100) / 365;
            const periodInterest = currentBalance * dailyRate * daysBetween;
            console.log(`Calculating interest for period ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
            console.log(`Balance: ${currentBalance}, Rate: ${rate.rate}%, Days: ${daysBetween}`);
            console.log(`Interest earned: ${periodInterest}`);
            accruedInterest += periodInterest;
          }
        }
      }

      // Update balance
      if (transaction.type === 'buy') {
        currentBalance += transaction.quantity;
      } else {
        currentBalance -= transaction.quantity;
      }
      
      lastTransactionDate = transactionDate;
    }

    // Calculate interest from last transaction to today
    if (currentBalance > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate interest for each rate period from last transaction to today
      for (const rate of interestRateHistory) {
        const rateStartDate = new Date(rate.start_date);
        const rateEndDate = rate.end_date ? new Date(rate.end_date) : today;
        
        // Set hours to 0 for consistent date comparison
        rateStartDate.setHours(0, 0, 0, 0);
        rateEndDate.setHours(0, 0, 0, 0);
        
        // Check if this rate period overlaps with our final period
        const periodStart = new Date(Math.max(lastTransactionDate.getTime(), rateStartDate.getTime()));
        const periodEnd = new Date(Math.min(today.getTime(), rateEndDate.getTime()));
        
        // Set hours to 0 for consistent date comparison
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setHours(0, 0, 0, 0);
        
        if (periodStart < periodEnd) {
          // Calculate days in this period (add 1 to include both start and end dates)
          const daysBetween = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
          const dailyRate = (rate.rate / 100) / 365;
          const periodInterest = currentBalance * dailyRate * daysBetween;
          console.log(`Calculating interest for final period ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
          console.log(`Balance: ${currentBalance}, Rate: ${rate.rate}%, Days: ${daysBetween}`);
          console.log(`Interest earned: ${periodInterest}`);
          accruedInterest += periodInterest;
        }
      }
    }

    return {
      totalQuantity: currentBalance,
      accruedInterest,
    };
  }
} 