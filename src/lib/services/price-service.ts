import { Asset, AssetWithPrice, Transaction } from '../types';

const ALPHA_VANTAGE_API = 'https://www.alphavantage.co/query';
const API_KEY = process.env.NEXT_PUBLIC_ALPHAVANTAGE_API_KEY;

// Cache for prices with a shorter duration since we have limited API calls
const priceCache = new Map<string, { 
  price: number; 
  timestamp: number;
  change24h?: number; 
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache due to API limits
const API_CALLS = new Map<string, number[]>();
const MAX_CALLS_PER_MINUTE = 5; // Alpha Vantage free tier limit

function canMakeApiCall(apiKey: string): boolean {
  const now = Date.now();
  const calls = API_CALLS.get(apiKey) || [];
  const recentCalls = calls.filter(timestamp => now - timestamp < 60000); // Last minute
  
  if (recentCalls.length < MAX_CALLS_PER_MINUTE) {
    API_CALLS.set(apiKey, [...recentCalls, now]);
    return true;
  }
  
  return false;
}

async function getCachedPrice(
  key: string, 
  fetchFn: () => Promise<{ price: number; change24h?: number }>,
  apiKey: string
): Promise<{ price: number; change24h?: number }> {
  const now = Date.now();
  const cached = priceCache.get(key);

  // Return cached price if it's fresh enough
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached;
  }

  // If we can't make an API call and have cached data, use it
  if (!canMakeApiCall(apiKey) && cached) {
    console.warn(`Rate limit approaching for ${apiKey}, using cached price for ${key}`);
    return cached;
  }

  try {
    const result = await fetchFn();
    priceCache.set(key, { ...result, timestamp: now });
    return result;
  } catch (error) {
    if (cached) {
      console.warn(`Using cached price for ${key} due to error:`, error);
      return cached;
    }
    throw error;
  }
}

export async function getAssetPrice(asset: Asset): Promise<number> {
  if (!API_KEY) {
    throw new Error('Alpha Vantage API key is not configured');
  }

  try {
    const { price } = await getCachedPrice(
      asset.symbol,
      async () => {
        // For crypto assets
        if (asset.type === 'crypto') {
          const response = await fetch(
            `${ALPHA_VANTAGE_API}?function=CURRENCY_EXCHANGE_RATE&from_currency=${asset.symbol}&to_currency=EUR&apikey=${API_KEY}`
          );

          if (!response.ok) {
            throw new Error(`Alpha Vantage API error: ${response.status}`);
          }

          const data = await response.json();
          if (!data['Realtime Currency Exchange Rate']) {
            console.error('Unexpected Alpha Vantage API response:', data);
            return { price: 0 };
          }

          const price = parseFloat(data['Realtime Currency Exchange Rate']['5. Exchange Rate']);
          return { price };
        } 
        // For stocks and ETFs
        else {
          const response = await fetch(
            `${ALPHA_VANTAGE_API}?function=GLOBAL_QUOTE&symbol=${asset.symbol}&apikey=${API_KEY}`
          );

          if (!response.ok) {
            throw new Error(`Alpha Vantage API error: ${response.status}`);
          }

          const data = await response.json();
          if (!data['Global Quote']) {
            console.error('Unexpected Alpha Vantage API response:', data);
            return { price: 0 };
          }

          const price = parseFloat(data['Global Quote']['05. price']);
          const change24h = parseFloat(data['Global Quote']['10. change percent'].replace('%', ''));
          return { price, change24h };
        }
      },
      'alphavantage'
    );
    return price;
  } catch (error) {
    console.error(`Error fetching price for ${asset.symbol}:`, error);
    return priceCache.get(asset.symbol)?.price || 0;
  }
}

export async function enrichAssetWithPriceAndTransactions(
  asset: Asset,
  transactions: Transaction[]
): Promise<AssetWithPrice> {
  const currentPrice = await getAssetPrice(asset);
  
  // Calculate totals from transactions
  const assetTransactions = transactions.filter(t => t.asset_id === asset.id);
  let totalQuantity = 0;
  let totalCost = 0;

  assetTransactions.forEach(transaction => {
    if (transaction.type === 'buy') {
      totalQuantity += transaction.quantity;
      totalCost += transaction.total_amount;
    } else {
      totalQuantity -= transaction.quantity;
      totalCost -= transaction.total_amount;
    }
  });

  const totalValue = totalQuantity * currentPrice;
  const averagePrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
  const profitLoss = totalValue - totalCost;
  const profitLossPercentage = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

  return {
    ...asset,
    currentPrice,
    totalValue,
    totalQuantity,
    averagePrice,
    profitLoss,
    profitLossPercentage,
  };
} 