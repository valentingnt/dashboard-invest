import { Asset, AssetWithPrice, Transaction } from '../types';

const YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Cache for prices with a shorter duration since we have 30 calls/minute
const priceCache = new Map<string, { 
  price: number; 
  timestamp: number;
  change24h?: number; 
}>();

const CACHE_DURATION = 20 * 1000; // 20 seconds cache for more frequent updates
const API_CALLS = new Map<string, number[]>();
const MAX_CALLS_PER_MINUTE = 30;

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
  try {
    if (asset.type === 'crypto' && asset.symbol === 'BTC') {
      const { price } = await getCachedPrice(
        'BTC',
        async () => {
          const response = await fetch(
            `${COINGECKO_API}/simple/price?ids=bitcoin&vs_currencies=eur&include_24hr_change=true`,
            {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
            }
          );
          
          if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please try again in a minute.');
          }

          if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
          }

          const data = await response.json();
          if (!data?.bitcoin?.eur) {
            console.error('Unexpected CoinGecko API response:', data);
            return { price: 0 };
          }

          return { 
            price: data.bitcoin.eur,
            change24h: data.bitcoin.eur_24h_change
          };
        },
        'coingecko'
      );
      return price;
    } else {
      const { price } = await getCachedPrice(
        asset.symbol,
        async () => {
          const response = await fetch(
            `${YAHOO_FINANCE_API}${asset.symbol}?interval=1d&range=1d`,
            {
              headers: {
                'Accept': 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Yahoo Finance API error: ${response.status}`);
          }

          const data = await response.json();
          if (!data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
            console.error('Unexpected Yahoo Finance API response:', data);
            return { price: 0 };
          }

          return { 
            price: data.chart.result[0].meta.regularMarketPrice,
            change24h: data.chart.result[0].meta.regularMarketChangePercent
          };
        },
        'yahoo'
      );
      return price;
    }
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