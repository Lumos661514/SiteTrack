import { http } from '@/utils/request'

export interface OrderAction {
  action: 'pay' | 'ship' | 'complete' | 'cancel'
  label: string
  perm: '' | 'order:ship' | 'order:cancel'
}

export interface OrderRow {
  id: number
  orderNo: string
  buyerName: string
  amount: number
  status: string
  statusText: string
  address: string
  createdAt: string
  actions: OrderAction[]
}

export interface OrderDetail extends OrderRow {
  items: { productName: string; quantity: number; price: number }[]
}

export interface OrderQuery {
  orderNo: string
  buyer: string
  status: string
}

export function fetchOrders(query: OrderQuery, offset: number, limit: number) {
  return http.get<{ list: OrderRow[]; total: number }>('/orders', {
    orderNo: query.orderNo,
    buyer: query.buyer,
    status: query.status,
    offset,
    limit,
  })
}

export function fetchOrder(id: number) {
  return http.get<OrderDetail>(`/orders/${id}`)
}

export function runOrderAction(id: number, action: string) {
  return http.post<{ status: string; statusText: string }>(`/orders/${id}/actions`, { action })
}
