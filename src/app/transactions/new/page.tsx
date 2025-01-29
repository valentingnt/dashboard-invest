'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from "@/components/ui/card"
import { Asset } from '@/lib/types'
import { supabase } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import Link from 'next/link'

export default function NewTransactionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const initialFormState = {
    asset_id: '',
    type: 'buy',
    quantity: '',
    price_per_unit: '',
    transaction_date: new Date().toISOString().split('T')[0],
  }
  const [formData, setFormData] = useState(initialFormState)

  // Fetch assets on component mount
  useEffect(() => {
    const fetchAssets = async () => {
      const { data: assets, error } = await supabase
        .from('assets')
        .select('*')
      
      if (error) {
        console.error('Error fetching assets:', error)
        toast({
          title: "Error",
          description: "Failed to load assets. Please try again.",
          variant: "destructive",
        })
        return
      }

      if (assets) {
        setAssets(assets)
      }
    }

    fetchAssets()
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Calculate total amount
      const quantity = parseFloat(formData.quantity)
      const pricePerUnit = parseFloat(formData.price_per_unit)
      const totalAmount = quantity * pricePerUnit

      const { error } = await supabase
        .from('transactions')
        .insert([
          {
            asset_id: formData.asset_id,
            type: formData.type,
            quantity,
            price_per_unit: pricePerUnit,
            total_amount: totalAmount,
            transaction_date: new Date(formData.transaction_date).toISOString(),
          }
        ])

      if (error) throw error

      // Reset form to initial state
      setFormData({
        ...initialFormState,
        asset_id: formData.asset_id, // Keep the same asset selected
        transaction_date: formData.transaction_date, // Keep the same date
      })

      toast({
        title: "Success",
        description: "Transaction added successfully",
      })

      // Update the dashboard in the background
      router.refresh()
    } catch (error) {
      console.error('Error adding transaction:', error)
      toast({
        title: "Error",
        description: "Failed to add transaction. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-center min-h-screen bg-background">
      <main className="flex flex-col w-full max-w-[600px] mx-auto my-8 px-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Add Transaction</h1>
          <Button variant="outline" asChild>
            <Link href="/">Back to Dashboard</Link>
          </Button>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="asset">Asset</Label>
              <Select
                value={formData.asset_id}
                onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} ({asset.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_per_unit">Price per Unit (€)</Label>
              <Input
                id="price_per_unit"
                type="number"
                step="any"
                value={formData.price_per_unit}
                onChange={(e) => setFormData({ ...formData, price_per_unit: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_date">Transaction Date</Label>
              <Input
                id="transaction_date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Adding Transaction...' : 'Add Transaction'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  )
} 
