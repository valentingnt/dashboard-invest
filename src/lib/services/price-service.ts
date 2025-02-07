import { Asset, AssetWithPrice, Transaction, InterestRateHistory } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';

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
    // Handle savings accounts
    if (asset.type === 'savings') {
      // For savings accounts, we return 1 as the price since the total value
      // will be managed through the quantity field
      return 1;
    }

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
  // Get interest rate history for savings accounts
  let interestRateHistory: InterestRateHistory[] = [];
  let currentInterestRate: number | null = null;
  
  if (asset.type === 'savings') {
    // Get all rates for calculations
    const { data: rates } = await supabase
      .from('interest_rate_history')
      .select('*')
      .eq('asset_id', asset.id)
      .order('start_date', { ascending: true });
    
    if (rates) {
      interestRateHistory = rates;
    }

    // Get current rate using the function
    const { data: currentRate } = await supabase
      .rpc('get_current_interest_rate', { 
        asset_uuid: asset.id 
      });
    
    currentInterestRate = currentRate || null;
  }

  // Get price and market data
  const priceData = await getCachedPrice(
    asset.symbol,
    async () => {
      if (asset.type === 'savings') {
        return {
          price: 1,
          change24h: 0
        };
      } else if (asset.type === 'crypto' && asset.symbol === 'BTC') {
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
  const assetTransactions = transactions
    .filter(t => t.asset_id === asset.id)
    .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

  let totalQuantity = 0;
  let totalCost = 0;
  let accruedInterest = 0;

  if (asset.type === 'savings') {
    // For savings accounts, calculate interest based on daily balances and rate periods
    let currentBalance = 0;
    let lastTransactionDate = new Date(0); // Start from epoch
    let currentRateIndex = 0;

    assetTransactions.forEach(transaction => {
      const transactionDate = new Date(transaction.transaction_date);
      
      // Calculate interest for the period between last transaction and this one
      if (currentBalance > 0) {
        // Split the period into rate periods if necessary
        let periodStartDate = new Date(lastTransactionDate);
        const periodEndDate = new Date(transactionDate);

        while (periodStartDate < periodEndDate) {
          // Find applicable rate for this period
          while (currentRateIndex < interestRateHistory.length - 1 && 
                 new Date(interestRateHistory[currentRateIndex].end_date!) <= periodStartDate) {
            currentRateIndex++;
          }
          
          const currentRate = interestRateHistory[currentRateIndex];
          if (!currentRate) continue;

          // Calculate end of rate period or transaction date, whichever comes first
          const rateEndDate = currentRate.end_date ? new Date(currentRate.end_date) : new Date(8640000000000000);
          const periodEnd = new Date(Math.min(
            periodEndDate.getTime(),
            rateEndDate.getTime()
          ));

          // Calculate interest for this rate period
          const daysBetween = (periodEnd.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24);
          const dailyRate = (currentRate.rate / 100) / 365;
          const periodInterest = currentBalance * dailyRate * daysBetween;
          accruedInterest += periodInterest;

          // Move to next period
          periodStartDate = periodEnd;
        }
      }

      // Update balance
      if (transaction.type === 'buy') {
        currentBalance += transaction.quantity;
      } else {
        currentBalance -= transaction.quantity;
      }
      
      lastTransactionDate = transactionDate;
    });

    // Calculate interest up to today for the current balance
    const today = new Date();
    if (currentBalance > 0 && lastTransactionDate < today) {
      let periodStartDate = new Date(lastTransactionDate);
      
      while (periodStartDate < today) {
        // Find applicable rate
        while (currentRateIndex < interestRateHistory.length - 1 && 
               new Date(interestRateHistory[currentRateIndex].end_date!) <= periodStartDate) {
          currentRateIndex++;
        }
        
        const currentRate = interestRateHistory[currentRateIndex];
        if (!currentRate) break;

        // Calculate end of rate period or today, whichever comes first
        const rateEndDate = currentRate.end_date ? new Date(currentRate.end_date) : today;
        const periodEnd = new Date(Math.min(today.getTime(), rateEndDate.getTime()));

        // Calculate interest for this period
        const daysBetween = (periodEnd.getTime() - periodStartDate.getTime()) / (1000 * 60 * 60 * 24);
        const dailyRate = (currentRate.rate / 100) / 365;
        const periodInterest = currentBalance * dailyRate * daysBetween;
        accruedInterest += periodInterest;

        // Move to next period
        periodStartDate = periodEnd;
      }
    }

    totalQuantity = currentBalance;
    totalCost = assetTransactions.reduce((sum, t) => 
      sum + (t.type === 'buy' ? t.total_amount : -t.total_amount), 0);
  } else {
    // Regular calculation for non-savings assets
    assetTransactions.forEach(transaction => {
      if (transaction.type === 'buy') {
        totalQuantity += transaction.quantity;
        totalCost += transaction.total_amount;
      } else {
        totalQuantity -= transaction.quantity;
        totalCost -= transaction.total_amount;
      }
    });
  }

  const totalValue = totalQuantity * priceData.price;
  const averagePrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;

  // For savings accounts, profit is the accrued interest
  let profitLoss = 0;
  let profitLossPercentage = 0;

  if (asset.type === 'savings') {
    profitLoss = accruedInterest;
    profitLossPercentage = totalCost > 0 ? (accruedInterest / totalCost) * 100 : 0;
  } else {
    profitLoss = totalValue - totalCost;
    profitLossPercentage = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
  }

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
    accruedInterest: asset.type === 'savings' ? accruedInterest : undefined,
    interest_rate: currentInterestRate,
  };
} 