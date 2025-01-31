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
    total_amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
  }
  const [formData, setFormData] = useState(initialFormState)

  // Fetch assets on component mount
  useEffect(() => {
    async function fetchAssets() {
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

  function validateForm() {
    if (!formData.asset_id) {
      throw new Error('Please select an asset')
    }

    const quantity = parseFloat(formData.quantity)
    const totalAmount = parseFloat(formData.total_amount)

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Please enter a valid quantity greater than 0')
    }

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new Error('Please enter a valid total amount greater than 0')
    }

    const pricePerUnit = totalAmount / quantity
    if (!Number.isFinite(pricePerUnit)) {
      throw new Error('Invalid quantity or total amount')
    }

    return { quantity, totalAmount, pricePerUnit }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate form data
      const { quantity, totalAmount, pricePerUnit } = validateForm()

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

      if (error) {
        if (error.code === '22P02') {
          throw new Error('Invalid data format. Please check your inputs.')
        }
        throw error
      }

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
        description: error instanceof Error ? error.message : "Failed to add transaction. Please try again.",
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
              <Label htmlFor="asset">Asset *</Label>
              <Select
                value={formData.asset_id}
                onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
                required
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
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_amount">Total Amount (€) *</Label>
              <Input
                id="total_amount"
                type="number"
                step="any"
                min="0"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_date">Transaction Date *</Label>
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
