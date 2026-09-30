// 【面试重点】订单状态机
// 解决的问题：订单状态如果在每个接口里用 if 判断，很容易出现「已取消还能发货」这种跳转。
// 为什么这样设计：每个状态只声明它允许的动作和下一个状态。接口只查这张表，表里没有的动作直接拒绝。发货、取消再挂上权限码，客服可以取消，不能发货。

export const orderStatuses = [
  'pending_pay',
  'pending_ship',
  'shipped',
  'completed',
  'cancelled',
] as const

export type OrderStatus = (typeof orderStatuses)[number]
export type OrderAction = 'pay' | 'ship' | 'complete' | 'cancel'

interface Transition {
  action: OrderAction
  to: OrderStatus
  label: string
  perm: '' | 'order:ship' | 'order:cancel'
}

export const orderTransitions: Record<OrderStatus, Transition[]> = {
  pending_pay: [
    { action: 'pay', to: 'pending_ship', label: '确认付款', perm: '' },
    { action: 'cancel', to: 'cancelled', label: '取消订单', perm: 'order:cancel' },
  ],
  pending_ship: [
    { action: 'ship', to: 'shipped', label: '发货', perm: 'order:ship' },
    { action: 'cancel', to: 'cancelled', label: '取消订单', perm: 'order:cancel' },
  ],
  shipped: [{ action: 'complete', to: 'completed', label: '完成订单', perm: '' }],
  completed: [],
  cancelled: [],
}

export const orderStatusText: Record<OrderStatus, string> = {
  pending_pay: '待付款',
  pending_ship: '待发货',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
}

export function isOrderStatus(value: string): value is OrderStatus {
  return (orderStatuses as readonly string[]).includes(value)
}

/** 当前状态没有这条边时返回 null，调用方应拒绝请求。 */
export function findTransition(from: OrderStatus, action: string) {
  return orderTransitions[from].find((item) => item.action === action) ?? null
}

export function visibleActions(from: OrderStatus, perms: Set<string>) {
  return orderTransitions[from]
    .filter((item) => item.perm === '' || perms.has(item.perm))
    .map((item) => ({ action: item.action, label: item.label, perm: item.perm }))
}
