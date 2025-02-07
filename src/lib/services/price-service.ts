import { Asset, AssetWithPrice, Transaction } from '@/lib/types';
import { SavingsService } from './asset-services/savings.service';
import { CryptoService } from './asset-services/crypto.service';
import { ETFService } from './asset-services/etf.service';

// Initialize services
const savingsService = new SavingsService();
const cryptoService = new CryptoService();
const etfService = new ETFService();

export async function enrichAssetWithPriceAndTransactions(
  asset: Asset,
  transactions: Transaction[]
): Promise<AssetWithPrice> {
  switch (asset.type) {
    case 'savings':
      return savingsService.enrichAssetWithPriceAndTransactions(asset, transactions);
    case 'crypto':
      return cryptoService.enrichAssetWithPriceAndTransactions(asset, transactions);
    case 'etf':
      return etfService.enrichAssetWithPriceAndTransactions(asset, transactions);
    default:
      throw new Error(`Unsupported asset type: ${asset.type}`);
  }
} 