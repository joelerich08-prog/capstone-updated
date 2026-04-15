'use client'

import { StockmanShell } from '@/components/layout/stockman-shell'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useProducts } from '@/contexts/products-context'
import { FolderOpen } from 'lucide-react'

export default function StockmanCategoriesPage() {
  const { products, categories } = useProducts()
  // Count products per category
  const categoryProductCounts = categories.map(cat => ({
    ...cat,
    productCount: products.filter(p => p.categoryId === cat.id).length
  }))

  return (
    <StockmanShell
      title="Categories"
      description="View product categories"
    >
      <div className="grid gap-6 md:grid-cols-3">
        {/* Categories List */}
        <Card className="md:col-span-2">
          <CardHeader>
              <CardTitle>Product Categories</CardTitle>
              <CardDescription>
              {categories.length} categories
              </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Products</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryProductCounts.map(cat => (
                  <TableRow key={cat.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="size-4 text-muted-foreground" />
                        <span className="font-medium">{cat.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {cat.description || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{cat.productCount}</Badge>
                    </TableCell>
                    <TableCell>
                      {cat.isActive ? (
                        <Badge className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Categories</span>
                <span className="font-medium">{categories.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Active</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {categories.filter(c => c.isActive).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Products</span>
                <span className="font-medium">{products.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Categories</CardTitle>
              <CardDescription>By product count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryProductCounts
                  .sort((a, b) => b.productCount - a.productCount)
                  .slice(0, 5)
                  .map((cat, index) => (
                    <div key={cat.id} className="flex items-center gap-3">
                      <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm">{cat.name}</span>
                      <Badge variant="outline">{cat.productCount}</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </StockmanShell>
  )
}
