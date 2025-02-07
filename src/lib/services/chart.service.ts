import { AssetWithPrice, Transaction } from '@/lib/types'

export interface ChartDataPoint {
  date: string;
  [key: string]: number | string;
}

export class ChartService {
  private getDates(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0); // Set to midnight

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric' 
    });
  }

  generateChartData(enrichedAssets: AssetWithPrice[], transactions: Transaction[]): ChartDataPoint[] {
    // Generate dates for the chart from the first transaction to today
    const firstTransactionDate = new Date(Math.min(...transactions.map(t => new Date(t.transaction_date).getTime())));
    firstTransactionDate.setHours(0, 0, 0, 0); // Set to midnight
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to midnight
    
    const dates = this.getDates(firstTransactionDate, today);

    // Prepare chart data
    return dates.map(date => {
      const dataPoint: ChartDataPoint = {
        date: this.formatDate(date),
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
  }
} 