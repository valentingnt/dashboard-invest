'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from "@/components/ui/card"
import { supabase } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import Link from 'next/link'

export default function NewAssetPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const initialFormState = {
    symbol: '',
    name: '',
    isin: '',
    type: 'etf', // Default value
  }
  const [formData, setFormData] = useState(initialFormState)

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