'use client'

import Link from 'next/link'
import { Fragment } from 'react'
import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, RefreshCw, ChevronDown, ChevronRight, Package } from 'lucide-react'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { TablePagination } from '@/components/shared/table-pagination'

const buildCategorySkuPrefix = (categoryName: string) => {
  const compact = categoryName.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return (compact.slice(0, 4) || 'PROD')
}

const generateCategorySku = (categoryId: string, categories: { id: string; name: string }[], products: Product[]) => {
  const category = categories.find((item) => item.id === categoryId)
  if (!category) {
    return ''
  }

  const prefix = buildCategorySkuPrefix(category.name)
  const pattern = new RegExp(`^${prefix}-(\\d+)$`)
  const nextNumber = products.reduce((max, product) => {
    if (product.categoryId !== categoryId) {
      return max
    }

    const match = product.sku.match(pattern)
    if (!match) {
      return max
    }

    return Math.max(max, parseInt(match[1], 10))
  }, 0) + 1

  return `${prefix}-${String(nextNumber).padStart(3, '0')}`
}

const buildVariantSkuBase = (productSku: string, variantName: string) => {
  const variantPart = variantName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'VARIANT'
  return `${productSku.toUpperCase()}-${variantPart}`
}

const generateVariantSkuPreview = (
  productId: string,
  variantName: string,
  products: Product[],
  excludeVariantId?: string,
) => {
  const product = products.find((item) => item.id === productId)
  if (!product || !variantName.trim()) {
    return ''
  }

  const baseSku = buildVariantSkuBase(product.sku, variantName)
  const existingSkus = new Set(
    product.variants
      .filter((variant) => variant.id !== excludeVariantId)
      .map((variant) => (variant.sku || '').toUpperCase())
      .filter(Boolean),
  )

  if (!existingSkus.has(baseSku)) {
    return baseSku
  }

  let suffix = 2
  while (existingSkus.has(`${baseSku}-${suffix}`)) {
    suffix += 1
  }

  return `${baseSku}-${suffix}`
}

export default function ProductsPage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { inventoryLevels, refreshInventory } = useInventory()
  const { products: liveProducts, categories, refreshProducts } = useProducts()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [products, setProducts] = useState<Product[]>([])
  const [isSyncingProducts, setIsSyncingProducts] = useState(false)
  
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

  useEffect(() => {
    const productId = searchParams.get('productId')
    const shouldOpenView = searchParams.get('view') === '1'

    if (!productId || !shouldOpenView || products.length === 0) {
      return
    }

    const matchedProduct = products.find((product) => product.id === productId)
    if (!matchedProduct) {
      return
    }

    setSelectedProduct(matchedProduct)
    setIsViewOpen(true)
  }, [products, searchParams])

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
  const [editVariantPriceAdjustment, setEditVariantPriceAdjustment] = useState('')
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!selectedProduct || isEditOpen) {
      return
    }

    const refreshedProduct = products.find((product) => product.id === selectedProduct.id)
    if (!refreshedProduct) {
      return
    }

    setSelectedProduct(refreshedProduct)
  }, [isEditOpen, products, selectedProduct])

  useEffect(() => {
    if (!selectedVariantProduct || !selectedVariant || isVariantEditOpen) {
      return
    }

    const refreshedProduct = products.find((product) => product.id === selectedVariantProduct.id)
    if (!refreshedProduct) {
      return
    }

    const refreshedVariant = refreshedProduct.variants.find((variant) => variant.id === selectedVariant.id)
    if (!refreshedVariant) {
      return
    }

    setSelectedVariantProduct(refreshedProduct)
    setSelectedVariant(refreshedVariant)
  }, [isVariantEditOpen, products, selectedVariant, selectedVariantProduct])
  
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
      if (!newName.trim() || !newCategory) {
        toast.error('Name and Category are required')
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
          name: newCreationType === 'base' ? newName.trim() : undefined,
          description: newCreationType === 'base' ? (newDescription.trim() || undefined) : undefined,
          categoryId: newCreationType === 'base' ? newCategory : undefined,
          costPrice: newCreationType === 'base' ? parseFloat(newCostPrice) : undefined,
          wholesalePrice: newCreationType === 'base' ? parseFloat(newWholesalePrice) : undefined,
          retailPrice: newCreationType === 'base' ? parseFloat(newRetailPrice) : undefined,
          isActive: newCreationType === 'base' ? newIsActive : undefined,
          baseProductId: newCreationType === 'variant' ? newBaseProductId : undefined,
          variantName: newCreationType === 'variant' ? newVariantName.trim() : undefined,
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

  const handleSyncProducts = async () => {
    try {
      setIsSyncingProducts(true)

      const result = await apiFetch<{
        success: boolean
        message: string
        missingCount: number
        createdCount: number
        createdProductsCount: number
        createdVariantsCount: number
      }>('/api/products/backfill_variant_inventory.php', {
        method: 'POST',
      })

      await Promise.all([reloadProducts(), refreshInventory()])

      toast.success(
        result.createdCount > 0
          ? `Products updated. Added ${result.createdCount} missing inventory record(s) for ${result.createdProductsCount} product(s) and ${result.createdVariantsCount} variant(s).`
          : result.message,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message.replace('API request failed: ', '') : 'Failed to sync products'
      toast.error(message)
    } finally {
      setIsSyncingProducts(false)
    }
  }

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsViewOpen(true)
  }

  const closeViewProduct = () => {
    setIsViewOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('productId')
    params.delete('view')
    const nextQuery = params.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }

  const handleEditProduct = (product: Product) => {
    const productInventory = inventoryLevels.find(
      (inv) => inv.productId === product.id && !inv.variantId,
    )

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
    const variantInventory = inventoryLevels.find(
      (inv) => inv.productId === product.id && inv.variantId === variant.id,
    )

    setSelectedVariantProduct(product)
    setSelectedVariant(variant)
    setEditVariantName(variant.name)
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
      product.sku.toLowerCase().includes(search.toLowerCase()) ||
      product.variants.some((variant) => variant.name.toLowerCase().includes(search.toLowerCase()))
    const matchesCategory = categoryFilter === 'all' || product.categoryId === categoryFilter
    return matchesSearch && matchesCategory
  })

  const toggleProductVariants = (productId: string) => {
    setExpandedProducts((current) => ({
      ...current,
      [productId]: !current[productId],
    }))
  }

  const getCategoryName = (categoryId: string) => {
    return categories.find((category) => category.id === categoryId)?.name ?? '-'
  }

  const baseProductOptions = products
    .filter(product => product.id !== selectedProduct?.id)
    .sort((a, b) => a.name.localeCompare(b.name))

  useEffect(() => {
    if (newCreationType !== 'base') {
      setNewSku('')
      return
    }

    if (!newCategory) {
      setNewSku('')
      return
    }

    setNewSku(generateCategorySku(newCategory, categories, products))
  }, [categories, newCategory, newCreationType, products])

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
  const newVariantSkuPreview = newBaseProductId
    ? generateVariantSkuPreview(newBaseProductId, newVariantName, products)
    : ''
  const editVariantSkuPreview = selectedVariantProduct && selectedVariant
    ? generateVariantSkuPreview(selectedVariantProduct.id, editVariantName, products, selectedVariant.id)
    : ''

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
            {isAdmin && !isEditOpen && !isVariantEditOpen && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSyncProducts}
                  disabled={isSyncingProducts}
                >
                  <RefreshCw className={`mr-2 size-4 ${isSyncingProducts ? 'animate-spin' : ''}`} />
                  {isSyncingProducts ? 'Syncing Products...' : 'Sync Products'}
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
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Wholesale Price</TableHead>
                <TableHead className="text-right">Retail Price</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginatedItems.map(product => {
                return (
                  <Fragment key={product.id}>
                    <TableRow>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {product.variants.length > 0 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => toggleProductVariants(product.id)}
                              title={expandedProducts[product.id] ? 'Hide variants' : 'Show variants'}
                            >
                              {expandedProducts[product.id] ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </Button>
                          ) : (
                            <span className="flex items-center">
                              <Package className="size-4 text-muted-foreground" />
                            </span>
                          )}
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {getCategoryName(product.categoryId)}
                            </div>
                          </div>
                        </div>
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
                    {expandedProducts[product.id] && product.variants.map((variant) => {
                      const variantWholesalePrice = product.wholesalePrice + variant.priceAdjustment
                      const variantRetailPrice = product.retailPrice + variant.priceAdjustment

                      return (
                        <TableRow key={variant.id} className="bg-muted/20">
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {variant.sku || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="ml-9 flex items-center">
                                <Package className="size-4 text-muted-foreground opacity-60" />
                              </span>
                              <div>
                                <div className="text-sm font-medium">{variant.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Variant of {product.name}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatPeso(product.costPrice)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatPeso(variantWholesalePrice)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatPeso(variantRetailPrice)}
                          </TableCell>
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
                                <DropdownMenuItem onClick={() => handleViewVariant(product, variant)}>
                                  <Eye className="size-4 mr-2" />
                                  View Variant
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedVariantProduct(product)
                                    setSelectedVariant(variant)
                                    setEditVariantName(variant.name)
                                    setEditVariantPriceAdjustment(variant.priceAdjustment.toString())
                                    setIsVariantEditOpen(true)
                                  }}>
                                    <Edit className="size-4 mr-2" />
                                    Edit Variant
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </Fragment>
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
                    <Label htmlFor="newSku">SKU</Label>
                    <Input
                      id="newSku"
                      value={newSku}
                      readOnly
                      disabled={!newCategory}
                    />
                    <p className="text-xs text-muted-foreground">
                      {newCategory ? 'Generated automatically from the selected category.' : 'Select a category to generate the SKU.'}
                    </p>
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
                      value={newVariantSkuPreview}
                      readOnly
                      disabled={!newBaseProductId || !newVariantName.trim()}
                    />
                    <p className="text-xs text-muted-foreground">
                      {newBaseProductId && newVariantName.trim()
                        ? 'Generated automatically from the base product SKU and variant name.'
                        : 'Select a base product and enter a variant name to generate the SKU.'}
                    </p>
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
      <Dialog open={isViewOpen} onOpenChange={(open) => {
        if (!open) {
          closeViewProduct()
          return
        }
        setIsViewOpen(true)
      }}>
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
                  <Label className="text-muted-foreground text-xs">Wholesale Reorder Level</Label>
                  <p className="font-medium">{selectedProductInventory?.wholesaleReorderLevel ?? 0}</p>
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
            <Button variant="outline" onClick={closeViewProduct}>
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
                  onClick={closeViewProduct}
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
                  <Label className="text-muted-foreground text-xs">Wholesale Reorder Level</Label>
                  <p className="font-medium">{selectedVariantInventory?.wholesaleReorderLevel ?? 0}</p>
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
                  value={editVariantSkuPreview}
                  readOnly
                  disabled={!editVariantName.trim()}
                />
                <p className="text-xs text-muted-foreground">
                  Generated automatically from the base product SKU and variant name.
                </p>
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
