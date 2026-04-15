'use client'

import type { ReactNode } from 'react'
import { SettingsProvider } from '@/contexts/settings-context'
import { ProductsProvider } from '@/contexts/products-context'
import { SuppliersProvider } from '@/contexts/suppliers-context'
import { CategoriesProvider } from '@/contexts/categories-context'
import { UsersProvider } from '@/contexts/users-context'
import { ActivityLogsProvider } from '@/contexts/activity-logs-context'
import { CartProvider } from '@/contexts/cart-context'
import { InventoryProvider } from '@/contexts/inventory-context'
import { TransactionProvider } from '@/contexts/transaction-context'
import { OrderProvider } from '@/contexts/order-context'
import { BatchProvider } from '@/contexts/batch-context'

function composeProviders(children: ReactNode, providers: Array<(node: ReactNode) => ReactNode>) {
  return providers.reduceRight((acc, provider) => provider(acc), children)
}

export function AdminRouteProviders({ children }: { children: ReactNode }) {
  return composeProviders(children, [
    node => <SettingsProvider>{node}</SettingsProvider>,
    node => <ProductsProvider>{node}</ProductsProvider>,
    node => <SuppliersProvider>{node}</SuppliersProvider>,
    node => <CategoriesProvider>{node}</CategoriesProvider>,
    node => <UsersProvider>{node}</UsersProvider>,
    node => <ActivityLogsProvider>{node}</ActivityLogsProvider>,
    node => <CartProvider>{node}</CartProvider>,
    node => <InventoryProvider>{node}</InventoryProvider>,
    node => <TransactionProvider>{node}</TransactionProvider>,
    node => <OrderProvider>{node}</OrderProvider>,
    node => <BatchProvider>{node}</BatchProvider>,
  ])
}

export function CashierRouteProviders({ children }: { children: ReactNode }) {
  return composeProviders(children, [
    node => <SettingsProvider>{node}</SettingsProvider>,
    node => <ProductsProvider>{node}</ProductsProvider>,
    node => <SuppliersProvider>{node}</SuppliersProvider>,
    node => <CategoriesProvider>{node}</CategoriesProvider>,
    node => <CartProvider>{node}</CartProvider>,
    node => <InventoryProvider>{node}</InventoryProvider>,
    node => <TransactionProvider>{node}</TransactionProvider>,
    node => <OrderProvider>{node}</OrderProvider>,
  ])
}

export function StockmanRouteProviders({ children }: { children: ReactNode }) {
  return composeProviders(children, [
    node => <SettingsProvider>{node}</SettingsProvider>,
    node => <ProductsProvider>{node}</ProductsProvider>,
    node => <SuppliersProvider>{node}</SuppliersProvider>,
    node => <CategoriesProvider>{node}</CategoriesProvider>,
    node => <InventoryProvider>{node}</InventoryProvider>,
    node => <BatchProvider>{node}</BatchProvider>,
  ])
}

export function CustomerRouteProviders({ children }: { children: ReactNode }) {
  return composeProviders(children, [
    node => <ProductsProvider>{node}</ProductsProvider>,
    node => <CartProvider>{node}</CartProvider>,
    node => <InventoryProvider>{node}</InventoryProvider>,
    node => <OrderProvider>{node}</OrderProvider>,
  ])
}
