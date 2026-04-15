'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useInventory } from '@/contexts/inventory-context'
import { useProducts } from '@/contexts/products-context'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { Product } from '@/lib/types'
import { apiFetch } from '@/lib/api-client'
import { formatPeso } from '@/lib/utils/currency'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { TablePagination } from '@/components/shared/table-pagination'

export default function ProductsPage() {
  const { user } = useAuth()
  const { inventoryLevels, refreshInventory } = useInventory()
  const { products: liveProducts, categories, refreshProducts } = useProducts()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [products, setProducts] = useState<Product[]>([])
  const [isRepairingVariantInventory, setIsRepairingVariantInventory] = useState(false)
  
  useEffect(() => {
    if (user?.role !== 'admin') {
      setProducts(liveProducts)
      return
    }

    let isMounted = true

    const loadAdminProducts = async () => {
      try {
        const adminProducts = await apiFetch<Product[]>('/api/products/get_admin_all.php')
        if (!isMounted) return

        setProducts(
          (adminProducts as Product[]).map(product => ({
            ...product,
            createdAt: new Date(product.createdAt),
          }))
        )
      } catch (error) {
        if (!isMounted) return
        console.error('Failed to load admin products:', error)
        setProducts(liveProducts)
      }
    }

    loadAdminProducts()

    return () => {
      isMounted = false
    }
  }, [liveProducts, user?.role])
  
  // Dialog states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isVariantViewOpen, setIsVariantViewOpen] = useState(false)
  const [isVariantEditOpen, setIsVariantEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  
  // Add form state
  const [newSku, setNewSku] = useState('')
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCostPrice, setNewCostPrice] = useState('')
  const [newWholesalePrice, setNewWholesalePrice] = useState('')
  const [newRetailPrice, setNewRetailPrice] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newIsActive, setNewIsActive] = useState(true)
  const [newCreationType, setNewCreationType] = useState<'base' | 'variant'>('base')
  const [newBaseProductId, setNewBaseProductId] = useState('')
  const [newVariantName, setNewVariantName] = useState('')
  const [newVariantSku, setNewVariantSku] = useState('')
  const [newVariantPriceAdjustment, setNewVariantPriceAdjustment] = useState('')
  
  // Edit form state
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCostPrice, setEditCostPrice] = useState('')
  const [editWholesalePrice, setEditWholesalePrice] = useState('')
  const [editRetailPrice, setEditRetailPrice] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState<Product['variants'][number] | null>(null)
  const [selectedVariantProduct, setSelectedVariantProduct] = useState<Product | null>(null)
  const [editVariantName, setEditVariantName] = useState('')
  const [editVariantSku, setEditVariantSku] = useState('')
  const [editVariantPriceAdjustment, setEditVariantPriceAdjustment] = useState('')
  
  // Show stock columns only for admin and stockman roles
  const showStockColumns = user?.role === 'admin' || user?.role === 'stockman'
  const isAdmin = user?.role === 'admin'

  const resetAddForm = () => {
    setNewSku('')
    setNewName('')
    setNewDescription('')
    setNewCostPrice('')
    setNewWholesalePrice('')
    setNewRetailPrice('')
    setNewCategory('')
    setNewIsActive(true)
    setNewCreationType('base')
    setNewBaseProductId('')
    setNewVariantName('')
    setNewVariantSku('')
    setNewVariantPriceAdjustment('')
  }

  const reloadProducts = async () => {
    await refreshProducts()

    if (user?.role === 'admin') {
      const adminProducts = await apiFetch<Product[]>('/api/products/get_admin_all.php')
      setProducts(
        (adminProducts as Product[]).map(product => ({
          ...product,
          createdAt: new Date(product.createdAt),
        }))
      )
      return
    }

    setProducts(liveProducts)
  }

  const handleAddProduct = async () => {
    if (newCreationType === 'variant') {
      if (!newBaseProductId || !newVariantName.trim()) {
        toast.error('Base product and variant name are required')
        return
      }
    } else {
      if (!newSku.trim() || !newName.trim() || !newCategory) {
        toast.error('SKU, Name, and Category are required')
        return
      }
      if (!newCostPrice || !newWholesalePrice || !newRetailPrice) {
        toast.error('All prices are required')
        return
      }
    }

    try {
      await apiFetch('/api/products/create.php', {
        method: 'POST',
        body: {
          creationType: newCreationType,
          sku: newCreationType === 'base' ? newSku.trim().toUpperCase() : undefined,
          name: newCreationType === 'base' ? newName.trim() : undefined,
          description: newCreationType === 'base' ? (newDescription.trim() || undefined) : undefined,
          categoryId: newCreationType === 'base' ? newCategory : undefined,
          costPrice: newCreationType === 'base' ? parseFloat(newCostPrice) : undefined,
          wholesalePrice: newCreationType === 'base' ? parseFloat(newWholesalePrice) : undefined,
          retailPrice: newCreationType === 'base' ? parseFloat(newRetailPrice) : undefined,
          isActive: newCreationType === 'base' ? newIsActive : undefined,
          baseProductId: newCreationType === 'variant' ? newBaseProductId : undefined,
          variantName: newCreationType === 'variant' ? newVariantName.trim() : undefined,
          variantSku: newCreationType === 'variant' ? (newVariantSku.trim().toUpperCase() || undefined) : undefined,
          variantPriceAdjustment: newCreationType === 'variant' ? (parseFloat(newVariantPriceAdjustment) || 0) : undefined,
        },
      })

      await reloadProducts()
      setIsAddOpen(false)
      resetAddForm()
      toast.success(newCreationType === 'variant' ? 'Variant added successfully' : 'Product added successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message.replace('API request failed: ', '') : 'Failed to add product'
      toast.error(message)
    }
  }

  const handleRepairVariantInventory = async () => {
    try {
      setIsRepairingVariantInventory(true)

      const result = await apiFetch<{
        success: boolean
        message: string
        missingCount: number
        createdCount: number
      }>('/api/products/backfill_variant_inventory.php', {
        method: 'POST',
      })

      await Promise.all([reloadProducts(), refreshInventory()])

      toast.success(
        result.createdCount > 0
          ? `Repaired ${result.createdCount} missing variant inventory row(s)`
          : result.message,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message.replace('API request failed: ', '') : 'Failed to repair variant inventory'
      toast.error(message)
    } finally {
      setIsRepairingVariantInventory(false)
    }
  }

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsViewOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setEditName(product.name)
    setEditDescription(product.description || '')
    setEditCostPrice(product.costPrice.toString())
    setEditWholesalePrice(product.wholesalePrice.toString())
    setEditRetailPrice(product.retailPrice.toString())
    setEditCategory(product.categoryId)
    setEditIsActive(product.isActive)
    setIsEditOpen(true)
  }

  const handleViewVariant = (product: Product, variant: Product['variants'][number]) => {
    setSelectedVariantProduct(product)
    setSelectedVariant(variant)
    setEditVariantName(variant.name)
    setEditVariantSku(variant.sku || '')
    setEditVariantPriceAdjustment(variant.priceAdjustment.toString())
    setIsVariantViewOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedProduct) return

    try {
      await apiFetch('/api/products/update.php', {
        method: 'POST',
        body: {
          id: selectedProduct.id,
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          costPrice: parseFloat(editCostPrice),
          wholesalePrice: parseFloat(editWholesalePrice),
          retailPrice: parseFloat(editRetailPrice),
          categoryId: editCategory,
          isActive: editIsActive,
        },
      })

      await reloadProducts()
      setIsEditOpen(false)
      setSelectedProduct(null)
      toast.success('Product updated successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message.replace('API request failed: ', '') : 'Failed to update product'
      toast.error(message)
    }
  }

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsDeleteOpen(true)
  }

  const handleSaveVariantEdit = async () => {
    if (!selectedVariant) return

    if (!editVariantName.trim()) {
      toast.error('Variant name is required')
      return
    }

    try {
      await apiFetch('/api/products/update_variant.php', {
        method: 'POST',
        body: {
          id: selectedVariant.id,
          name: editVariantName.trim(),
          sku: editVariantSku.trim() || undefined,
          priceAdjustment: parseFloat(editVariantPriceAdjustment) || 0,
        },
      })

      await reloadProducts()
      setIsVariantEditOpen(false)
      setSelectedVariant(null)
      setSelectedVariantProduct(null)
      toast.success('Variant updated successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message.replace('API request failed: ', '') : 'Failed to update variant'
      toast.error(message)
    }
  }

  const openVariantEditFromView = () => {
    setIsVariantViewOpen(false)
    setIsVariantEditOpen(true)
  }

  const closeVariantDialogs = () => {
    setIsVariantViewOpen(false)
    setIsVariantEditOpen(false)
    setSelectedVariant(null)
    setSelectedVariantProduct(null)
  }

  const confirmDelete = async () => {
    if (!selectedProduct) return

    try {
      await apiFetch('/api/products/delete.php', {
        method: 'POST',
        body: { id: selectedProduct.id },
      })

      await reloadProducts()
      setIsDeleteOpen(false)
      setSelectedProduct(null)
      toast.success('Product deleted successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message.replace('API request failed: ', '') : 'Failed to delete product'
      toast.error(message)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || product.categoryId === categoryFilter
    return matchesSearch && matchesCategory
  })

  const baseProductOptions = products
    .filter(product => product.id !== selectedProduct?.id)
    .sort((a, b) => a.name.localeCompare(b.name))

  const selectedVariantInventory = selectedVariant && selectedVariantProduct
    ? inventoryLevels.find(
        (inv) => inv.productId === selectedVariantProduct.id && inv.variantId === selectedVariant.id,
      )
    : undefined
  const selectedProductInventory = selectedProduct
    ? inventoryLevels.find(
        (inv) => inv.productId === selectedProduct.id && !inv.variantId,
      )
    : undefined

  const pagination = usePagination(filteredProducts, { itemsPerPage: 10 })

  return (
    <DashboardShell
      title="Products"
      description="Manage your product catalog"
      allowedRoles={['admin', 'stockman']}
    >
      <Card>
        <CardContent className="p-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  onClick={handleRepairVariantInventory}
                  disabled={isRepairingVariantInventory}
                >
                  {isRepairingVariantInventory ? 'Repairing...' : 'Repair Variant Inventory'}
                </Button>
                <Button onClick={() => setIsAddOpen(true)}>
                  <Plus className="size-4 mr-2" />
                  Add Product
                </Button>
              </>
            )}
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Wholesale Price</TableHead>
                <TableHead className="text-right">Retail Price</TableHead>
                {showStockColumns && (
                  <>
                    <TableHead className="text-right">Wholesale Stock</TableHead>
                    <TableHead className="text-right">Retail Stock</TableHead>
                    <TableHead className="text-right">Shelf Stock</TableHead>
                  </>
                )}
                <TableHead>Availability</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginatedItems.map(product => {
                const inventory = inventoryLevels.find(inv => inv.productId === product.id)

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>
                      <div className="font-medium">{product.name}</div>
                      {product.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {product.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{categories.find(cat => cat.id === product.categoryId)?.name || '-'}</TableCell>
                    <TableCell>
                      {product.variants.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {product.variants.map(v => (
                            <Button
                              key={v.id}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => handleViewVariant(product, v)}
                            >
                              {v.name}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPeso(product.costPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPeso(product.wholesalePrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatPeso(product.retailPrice)}
                    </TableCell>
                    {showStockColumns && (
                      <>
                        <TableCell className="text-right tabular-nums">
                          {inventory?.wholesaleQty ?? 0}
                          <span className="text-xs text-muted-foreground ml-1">
                            {inventory?.wholesaleUnit ?? ''}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {inventory?.retailQty ?? 0}
                          <span className="text-xs text-muted-foreground ml-1">
                            {inventory?.retailUnit ?? ''}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {inventory?.shelfQty ?? 0}
                          <span className="text-xs text-muted-foreground ml-1">
                            {inventory?.shelfUnit ?? ''}
                          </span>
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      {product.isActive ? (
                        <Badge className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewProduct(product)}>
                            <Eye className="size-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                                <Edit className="size-4 mr-2" />
                                Edit Product
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDeleteProduct(product)}
                              >
                                <Trash2 className="size-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No products found matching your criteria.
            </div>
          )}

          <TablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={pagination.goToPage}
            onPrevPage={pagination.goToPrevPage}
            onNextPage={pagination.goToNextPage}
            onItemsPerPageChange={pagination.setItemsPerPage}
          />
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => {
        setIsAddOpen(open)
        if (!open) resetAddForm()
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Create a base product or register a new variant under an existing product
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={newCreationType} onValueChange={(value: 'base' | 'variant') => setNewCreationType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base Product</SelectItem>
                  <SelectItem value="variant">Variant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newCreationType === 'base' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newSku">SKU *</Label>
                    <Input
                      id="newSku"
                      placeholder="e.g., PROD-001"
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newName">Product Name *</Label>
                  <Input
                    id="newName"
                    placeholder="Enter product name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newDescription">Description</Label>
                  <Input
                    id="newDescription"
                    placeholder="Brief product description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newCostPrice">Cost Price *</Label>
                    <Input
                      id="newCostPrice"
                      type="number"
                      placeholder="0.00"
                      value={newCostPrice}
                      onChange={(e) => setNewCostPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newWholesalePrice">Wholesale *</Label>
                    <Input
                      id="newWholesalePrice"
                      type="number"
                      placeholder="0.00"
                      value={newWholesalePrice}
                      onChange={(e) => setNewWholesalePrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newRetailPrice">Retail *</Label>
                    <Input
                      id="newRetailPrice"
                      type="number"
                      placeholder="0.00"
                      value={newRetailPrice}
                      onChange={(e) => setNewRetailPrice(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="newIsActive"
                    checked={newIsActive}
                    onChange={(e) => setNewIsActive(e.target.checked)}
                    className="size-4 rounded border-input"
                  />
                  <Label htmlFor="newIsActive">Active (available for sale)</Label>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Base Product *</Label>
                  <Select value={newBaseProductId} onValueChange={setNewBaseProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select base product" />
                    </SelectTrigger>
                    <SelectContent>
                      {baseProductOptions.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newVariantName">Variant Name *</Label>
                  <Input
                    id="newVariantName"
                    placeholder="e.g., Spicy"
                    value={newVariantName}
                    onChange={(e) => setNewVariantName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newVariantSku">Variant SKU</Label>
                    <Input
                      id="newVariantSku"
                      placeholder="Optional SKU"
                      value={newVariantSku}
                      onChange={(e) => setNewVariantSku(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newVariantPriceAdjustment">Price Adjustment</Label>
                    <Input
                      id="newVariantPriceAdjustment"
                      type="number"
                      placeholder="0.00"
                      value={newVariantPriceAdjustment}
                      onChange={(e) => setNewVariantPriceAdjustment(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  This creates the variant record and its dedicated inventory row. Stock can then be received specifically for that variant.
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddOpen(false)
              resetAddForm()
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct}>
              {newCreationType === 'variant' ? 'Add Variant' : 'Add Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Product Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              View product information
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">SKU</Label>
                  <p className="font-mono">{selectedProduct.sku}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Category</Label>
                  <p>{categories.find(cat => cat.id === selectedProduct.categoryId)?.name || '-'}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Name</Label>
                <p className="font-medium">{selectedProduct.name}</p>
              </div>
              {selectedProduct.description && (
                <div>
                  <Label className="text-muted-foreground text-xs">Description</Label>
                  <p className="text-sm">{selectedProduct.description}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Cost Price</Label>
                  <p className="font-medium">{formatPeso(selectedProduct.costPrice)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Wholesale Price</Label>
                  <p className="font-medium">{formatPeso(selectedProduct.wholesalePrice)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Retail Price</Label>
                  <p className="font-medium">{formatPeso(selectedProduct.retailPrice)}</p>
                </div>
              </div>
              {selectedProduct.variants.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs">Variants</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedProduct.variants.map(v => (
                      <Badge key={v.id} variant="outline">
                        {v.name}
                        {v.priceAdjustment !== 0 && (
                          <span className="ml-1 text-muted-foreground">
                            ({v.priceAdjustment > 0 ? '+' : ''}{formatPeso(v.priceAdjustment)})
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground text-xs">Base Product Stock Totals</Label>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Wholesale</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {selectedProductInventory?.wholesaleQty ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedProductInventory?.wholesaleUnit ?? 'box'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Retail</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {selectedProductInventory?.retailQty ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedProductInventory?.retailUnit ?? 'pack'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Shelf</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {selectedProductInventory?.shelfQty ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedProductInventory?.shelfUnit ?? 'pack'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Reorder Level</Label>
                  <p className="font-medium">{selectedProductInventory?.reorderLevel ?? 0}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Updated At</Label>
                  <p className="font-medium">
                    {selectedProductInventory?.updatedAt
                      ? new Date(selectedProductInventory.updatedAt).toLocaleString()
                      : '-'}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Status</Label>
                <div className="mt-1">
                  <Badge variant={selectedProduct.isActive ? 'default' : 'secondary'}>
                    {selectedProduct.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            {selectedProduct && (
              <Button asChild variant="outline">
                <Link
                  href={{
                    pathname: '/admin/inventory/movements',
                    query: {
                      productId: selectedProduct.id,
                      productName: selectedProduct.name,
                    },
                  }}
                  onClick={() => setIsViewOpen(false)}
                >
                  View Movements
                </Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Input
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editCostPrice">Cost Price</Label>
                <Input
                  id="editCostPrice"
                  type="number"
                  value={editCostPrice}
                  onChange={(e) => setEditCostPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editWholesalePrice">Wholesale Price</Label>
                <Input
                  id="editWholesalePrice"
                  type="number"
                  value={editWholesalePrice}
                  onChange={(e) => setEditWholesalePrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRetailPrice">Retail Price</Label>
                <Input
                  id="editRetailPrice"
                  type="number"
                  value={editRetailPrice}
                  onChange={(e) => setEditRetailPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editIsActive"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="size-4 rounded border-input"
              />
              <Label htmlFor="editIsActive">Active</Label>
            </div>
            {selectedProduct && selectedProduct.variants.length > 0 && (
              <div className="space-y-2">
                <Label>Existing Variants</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.variants.map(v => (
                    <Badge key={v.id} variant="outline">
                      {v.name}
                      {v.priceAdjustment !== 0 && (
                        <span className="ml-1 text-muted-foreground">
                          ({v.priceAdjustment > 0 ? '+' : ''}{formatPeso(v.priceAdjustment)})
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Variants are now added from the Add Product modal using the Variant option so they can receive stock independently.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Variant Dialog */}
      <Dialog open={isVariantViewOpen} onOpenChange={setIsVariantViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Variant Details</DialogTitle>
            <DialogDescription>
              View variant information before making changes
            </DialogDescription>
          </DialogHeader>
          {selectedVariant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Base Product</Label>
                  <p className="font-medium">{selectedVariantProduct?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Variant SKU</Label>
                  <p className="font-mono">{selectedVariant.sku || '-'}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Variant Name</Label>
                <p className="font-medium">{selectedVariant.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Price Adjustment</Label>
                <p className="font-medium">
                  {selectedVariant.priceAdjustment > 0 ? '+' : ''}
                  {formatPeso(selectedVariant.priceAdjustment)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Variant Stock Totals</Label>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Wholesale</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {selectedVariantInventory?.wholesaleQty ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedVariantInventory?.wholesaleUnit ?? 'box'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Retail</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {selectedVariantInventory?.retailQty ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedVariantInventory?.retailUnit ?? 'pack'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Shelf</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {selectedVariantInventory?.shelfQty ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedVariantInventory?.shelfUnit ?? 'pack'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Reorder Level</Label>
                  <p className="font-medium">{selectedVariantInventory?.reorderLevel ?? 0}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Updated At</Label>
                  <p className="font-medium">
                    {selectedVariantInventory?.updatedAt
                      ? new Date(selectedVariantInventory.updatedAt).toLocaleString()
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeVariantDialogs}>
              Close
            </Button>
            {selectedVariant && selectedVariantProduct && (
              <Button asChild variant="outline">
                <Link
                  href={{
                    pathname: '/admin/inventory/movements',
                    query: {
                      productId: selectedVariantProduct.id,
                      productName: selectedVariantProduct.name,
                      variantId: selectedVariant.id,
                      variantName: selectedVariant.name,
                    },
                  }}
                  onClick={closeVariantDialogs}
                >
                  View Movements
                </Link>
              </Button>
            )}
            <Button onClick={openVariantEditFromView}>
              Edit Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Variant Dialog */}
      <Dialog open={isVariantEditOpen} onOpenChange={setIsVariantEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Variant</DialogTitle>
            <DialogDescription>
              Update the selected variant for {selectedVariantProduct?.name || 'this product'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Product</Label>
                <Input value={selectedVariantProduct?.name || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Variant ID</Label>
                <Input value={selectedVariant?.id || ''} disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editVariantName">Variant Name</Label>
              <Input
                id="editVariantName"
                value={editVariantName}
                onChange={(e) => setEditVariantName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editVariantSku">Variant SKU</Label>
                <Input
                  id="editVariantSku"
                  value={editVariantSku}
                  onChange={(e) => setEditVariantSku(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editVariantPriceAdjustment">Price Adjustment</Label>
                <Input
                  id="editVariantPriceAdjustment"
                  type="number"
                  value={editVariantPriceAdjustment}
                  onChange={(e) => setEditVariantPriceAdjustment(e.target.value)}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This updates only the variant record. Its inventory row and movement history remain linked to the same variant ID.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeVariantDialogs}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveVariantEdit}>
              Save Variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedProduct?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  )
}
