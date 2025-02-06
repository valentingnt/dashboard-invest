import { Asset, AssetWithPrice, Transaction } from '../types';

// Replace Yahoo Finance API with RapidAPI endpoint
const RAPIDAPI_YAHOO_FINANCE = 'https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Cache for prices with a shorter duration since we have limited API calls
const priceCache = new Map<string, { 
  price: number; 
  timestamp: number;
  change24h?: number;
  dayHigh?: number;
  dayLow?: number;
  previousClose?: number;
  volume?: number;
}>();

const CACHE_DURATION = 20 * 1000; // 20 seconds cache for more frequent updates
const API_CALLS = new Map<string, number[]>();
const MAX_CALLS_PER_MINUTE = 30;

// Add your RapidAPI key here
const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '';
if (!RAPIDAPI_KEY) {
  throw new Error('RAPIDAPI_KEY environment variable is not set');
}

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
  fetchFn: () => Promise<{ 
    price: number; 
    change24h?: number;
    dayHigh?: number;
    dayLow?: number;
    previousClose?: number;
    volume?: number;
  }>,
  apiKey: string
): Promise<{ 
  price: number; 
  change24h?: number;
  dayHigh?: number;
  dayLow?: number;
  previousClose?: number;
  volume?: number;
}> {
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
      // Handle different stock exchange suffixes
      const symbol = asset.symbol.includes('.') ? asset.symbol : `${asset.symbol}.PA`;
      
      const { price } = await getCachedPrice(
        symbol,
        async () => {
          // Use RapidAPI Yahoo Finance endpoint
          const response = await fetch(
            `${RAPIDAPI_YAHOO_FINANCE}?region=FR&symbols=${symbol}`,
            {
              method: 'GET',
              headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
              },
            }
          );

          if (response.status === 429) {
            throw new Error('RapidAPI rate limit exceeded. Please try again later.');
          }

          if (!response.ok) {
            throw new Error(`RapidAPI Yahoo Finance error: ${response.status}`);
          }

          const data = await response.json();
          const result = data?.quoteResponse?.result?.[0];
          
          if (!result?.regularMarketPrice) {
            console.error('Unexpected RapidAPI Yahoo Finance response for symbol', symbol, ':', JSON.stringify(data, null, 2));
            return { price: 0 };
          }

          return { 
            price: result.regularMarketPrice,
            change24h: result.regularMarketChangePercent,
            dayHigh: result.regularMarketDayHigh,
            dayLow: result.regularMarketDayLow,
            previousClose: result.regularMarketPreviousClose,
            volume: result.regularMarketVolume
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
  // Get price and market data
  const priceData = await getCachedPrice(
    asset.symbol,
    async () => {
      if (asset.type === 'crypto' && asset.symbol === 'BTC') {
        const response = await fetch(
          `${COINGECKO_API}/simple/price?ids=bitcoin&vs_currencies=eur&include_24hr_change=true`,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!response.ok) {
          throw new Error(`CoinGecko API error: ${response.status}`);
        }

        const data = await response.json();
        return {
          price: data.bitcoin.eur,
          change24h: data.bitcoin.eur_24h_change
        };
      } else {
        const symbol = asset.symbol.includes('.') ? asset.symbol : `${asset.symbol}.PA`;
        const response = await fetch(
          `${RAPIDAPI_YAHOO_FINANCE}?region=FR&symbols=${symbol}`,
          {
            method: 'GET',
            headers: {
              'x-rapidapi-key': RAPIDAPI_KEY,
              'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
            },
          }
        );

        if (!response.ok) {
          throw new Error(`RapidAPI Yahoo Finance error: ${response.status}`);
        }

        const data = await response.json();
        const result = data?.quoteResponse?.result?.[0];
        
        if (!result?.regularMarketPrice) {
          console.error('Unexpected RapidAPI Yahoo Finance response for symbol', symbol, ':', JSON.stringify(data, null, 2));
          return { price: 0 };
        }
        
        return {
          price: result.regularMarketPrice,
          change24h: result.regularMarketChangePercent,
          dayHigh: result.regularMarketDayHigh,
          dayLow: result.regularMarketDayLow,
          previousClose: result.regularMarketPreviousClose,
          volume: result.regularMarketVolume
        };
      }
    },
    asset.type === 'crypto' ? 'coingecko' : 'yahoo'
  );
  
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

  const totalValue = totalQuantity * priceData.price;
  const averagePrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
  const profitLoss = totalValue - totalCost;
  const profitLossPercentage = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

  return {
    ...asset,
    currentPrice: priceData.price,
    totalValue,
    totalQuantity,
    averagePrice,
    profitLoss,
    profitLossPercentage,
    dayHigh: priceData.dayHigh,
    dayLow: priceData.dayLow,
    previousClose: priceData.previousClose,
    volume: priceData.volume,
    change24h: priceData.change24h,
  };
} 