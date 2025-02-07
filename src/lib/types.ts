export type AssetType = 'etf' | 'crypto' | 'savings';

export interface InterestRateHistory {
  id: string;
  asset_id: string;
  rate: number;
  start_date: string;
  end_date?: string;  // null means current/ongoing rate
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: AssetType;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  asset_id: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total_amount: number;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface AssetWithPrice extends Asset {
  currentPrice: number;
  totalValue: number;
  totalQuantity: number;
  averagePrice: number;
  profitLoss: number;
  profitLossPercentage: number;
  dayHigh?: number;
  dayLow?: number;
  previousClose?: number;
  volume?: number;
  change24h?: number;
  accruedInterest?: number;  // For savings accounts: total interest earned since first deposit
  interest_rate?: number | null;  // Current interest rate for savings accounts
} 