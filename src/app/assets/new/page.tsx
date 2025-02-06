'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from "@/components/ui/card"
import { supabase } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import Link from 'next/link'
import { ChevronsUpDown } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useDebounce } from "@/hooks/use-debounce"

interface SearchResult {
  symbol: string;
  name: string;
  exchDisp: string;
}

interface YahooFinanceQuote {
  symbol: string;
  longname?: string;
  shortname?: string;
  exchDisp: string;
}

interface YahooFinanceResponse {
  quotes: YahooFinanceQuote[];
}

export default function NewAssetPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debouncedSearch = useDebounce(searchQuery, 300)
  const initialFormState = {
    symbol: '',
    name: '',
    isin: '',
    type: 'etf',
  }
  const [formData, setFormData] = useState(initialFormState)

  const searchAssets = useCallback(async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const url = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/auto-complete?region=FR&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '',
          'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
        }
      });
      
      const data = await response.json() as YahooFinanceResponse;
      if (data.quotes) {
        setSearchResults(data.quotes.map((quote: YahooFinanceQuote) => ({
          symbol: quote.symbol,
          name: quote.longname || quote.shortname || quote.symbol,
          exchDisp: quote.exchDisp
        })));
      }
    } catch (error) {
      console.error('Error searching assets:', error);
      toast({
        title: "Error",
        description: "Failed to search assets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  }, [toast]);

  // Effect to trigger search when debounced value changes
  useEffect(() => {
    searchAssets(debouncedSearch);
  }, [debouncedSearch, searchAssets]);

  function selectAsset(result: SearchResult) {
    setFormData({
      ...formData,
      symbol: result.symbol,
      name: result.name,
      type: result.symbol.includes('BTC') || result.symbol.includes('ETH') ? 'crypto' : 'etf'
    });
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate form data
      if (!formData.symbol || !formData.name || !formData.type) {
        throw new Error('Please fill in all required fields')
      }

      const { error } = await supabase
        .from('assets')
        .insert([{
          symbol: formData.symbol,
          name: formData.name,
          isin: formData.isin || null, // Make ISIN optional
          type: formData.type,
        }])

      if (error) {
        throw error
      }

      // Reset form
      setFormData(initialFormState)

      toast({
        title: "Success",
        description: "Asset added successfully",
      })

      // Update the dashboard in the background
      router.refresh()
    } catch (error) {
      console.error('Error adding asset:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add asset. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-6">
      <main className="w-full max-w-[600px]">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Add Asset</h1>
          <Button variant="outline" asChild>
            <Link href="/">Back to Dashboard</Link>
          </Button>
        </div>

        <Card className="p-6">
          <div className="space-y-4 mb-6">
            <Label>Search Asset</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {searchQuery || "Search for an asset..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command className="w-full" shouldFilter={false}>
                  <CommandInput 
                    placeholder="Search assets..." 
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    className={searching ? "opacity-50" : ""}
                  />
                  {searching && (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Searching...
                    </div>
                  )}
                  <CommandList>
                    <CommandEmpty>No assets found.</CommandEmpty>
                    <CommandGroup>
                      {searchResults.map((result) => (
                        <CommandItem
                          key={result.symbol}
                          value={result.symbol}
                          onSelect={() => selectAsset(result)}
                          className="w-full"
                        >
                          <div className="flex flex-col w-full gap-1">
                            <div className="font-medium">{result.name}</div>
                            <div className="flex justify-between items-center w-full">
                              <span className="text-sm text-muted-foreground">{result.symbol}</span>
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">{result.exchDisp}</span>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="isin">ISIN</Label>
              <Input
                id="isin"
                value={formData.isin}
                onChange={(e) => setFormData({ ...formData, isin: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Adding Asset...' : 'Add Asset'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  )
} 