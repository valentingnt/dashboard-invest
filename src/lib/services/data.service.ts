import { supabase } from '@/lib/supabase/client'
import { Asset, Transaction } from '@/lib/types'
import { PostgrestError } from '@supabase/supabase-js'

export class DataService {
  async getAssets(): Promise<Asset[]> {
    const { data: assets, error } = await supabase
      .from('assets')
      .select('*') as { data: Asset[] | null, error: PostgrestError | null }

    if (error) {
      console.error('Error fetching assets:', error)
      throw error
    }

    if (!assets) {
      return []
    }

    return assets
  }

  async getTransactions(): Promise<Transaction[]> {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false }) as { data: Transaction[] | null, error: PostgrestError | null }

    if (error) {
      console.error('Error fetching transactions:', error)
      throw error
    }

    if (!transactions) {
      return []
    }

    return transactions
  }
} 