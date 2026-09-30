import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { RowDataPacket } from 'mysql2'
import mysql from 'mysql2/promise'
import { config } from '../config'

const ORDER_COUNT = 50000
const BATCH = 2000

const categories = [
  { id: 1, name: '数码', sort: 1 },
  { id: 2, name: '服饰', sort: 2 },
  { id: 3, name: '家居', sort: 3 },
  { id: 4, name: '食品', sort: 4 },
]

interface ProductSeed {
  categoryId: number
  name: string
  price: number
  stock: number
  warningStock: number
  status: number
  specs: { name: string; values: string[] }[] | null
}

const products: ProductSeed[] = [
  { categoryId: 1, name: '无线降噪耳机', price: 399, stock: 86, warningStock: 20, status: 1, specs: [{ name: '颜色', values: ['黑色', '白色'] }] },
  { categoryId: 1, name: '机械键盘', price: 259, stock: 6, warningStock: 15, status: 1, specs: [{ name: '轴体', values: ['红轴', '茶轴'] }] },
  { categoryId: 1, name: '27 英寸显示器', price: 1299, stock: 40, warningStock: 8, status: 1, specs: null },
  { categoryId: 1, name: '移动电源', price: 129, stock: 200, warningStock: 30, status: 1, specs: null },
  { categoryId: 2, name: '纯棉 T 恤', price: 79, stock: 4, warningStock: 20, status: 1, specs: [{ name: '颜色', values: ['白', '黑'] }, { name: '尺码', values: ['S', 'M', 'L'] }] },
  { categoryId: 2, name: '牛仔裤', price: 159, stock: 70, warningStock: 15, status: 1, specs: [{ name: '尺码', values: ['29', '30', '31', '32'] }] },
  { categoryId: 2, name: '连帽卫衣', price: 199, stock: 9, warningStock: 12, status: 1, specs: [{ name: '颜色', values: ['灰', '藏青'] }] },
  { categoryId: 2, name: '运动鞋', price: 329, stock: 55, warningStock: 10, status: 1, specs: [{ name: '尺码', values: ['40', '41', '42', '43'] }] },
  { categoryId: 2, name: '棒球帽', price: 49, stock: 3, warningStock: 10, status: 0, specs: null },
  { categoryId: 3, name: '记忆枕', price: 99, stock: 60, warningStock: 10, status: 1, specs: null },
  { categoryId: 3, name: '台灯', price: 89, stock: 25, warningStock: 8, status: 1, specs: null },
  { categoryId: 3, name: '收纳箱', price: 39, stock: 140, warningStock: 20, status: 1, specs: null },
  { categoryId: 3, name: '空气炸锅', price: 299, stock: 18, warningStock: 6, status: 1, specs: null },
  { categoryId: 4, name: '咖啡豆', price: 68, stock: 90, warningStock: 20, status: 1, specs: null },
  { categoryId: 4, name: '坚果礼盒', price: 128, stock: 7, warningStock: 15, status: 1, specs: null },
  { categoryId: 4, name: '燕麦片', price: 36, stock: 110, warningStock: 25, status: 0, specs: null },
]

const buyers = ['陈一', '林晓', '周宁', '吴迪', '郑凯', '孙悦', '钱进', '冯雪', '蒋磊', '韩梅']
const addresses = [
  '上海市浦东新区演示路 88 号',
  '杭州市西湖区学院路 18 号',
  '深圳市南山区科技园 6 栋',
  '成都市武侯区天府大道 200 号',
]
const statuses = ['pending_pay', 'pending_ship', 'shipped', 'completed', 'cancelled'] as const

interface MenuSeed {
  id: number
  parentId: number
  name: string
  path: string
  component: string
  icon: string
  perm: string
  type: number
  sort: number
}

const menus: MenuSeed[] = [
  { id: 1, parentId: 0, name: '工作台', path: '/dashboard', component: 'dashboard/DashboardView', icon: 'Odometer', perm: '', type: 1, sort: 1 },
  { id: 2, parentId: 0, name: '商品管理', path: '/product', component: '', icon: 'Goods', perm: '', type: 1, sort: 2 },
  { id: 3, parentId: 2, name: '商品列表', path: '/product/list', component: 'product/ProductList', icon: '', perm: 'product:list', type: 1, sort: 1 },
  { id: 4, parentId: 2, name: '分类管理', path: '/product/category', component: 'product/CategoryList', icon: '', perm: 'product:category', type: 1, sort: 2 },
  { id: 5, parentId: 0, name: '订单管理', path: '/order', component: 'order/OrderList', icon: 'List', perm: 'order:list', type: 1, sort: 3 },
  { id: 6, parentId: 0, name: '库存管理', path: '/stock', component: '', icon: 'Box', perm: '', type: 1, sort: 4 },
  { id: 7, parentId: 6, name: '库存列表', path: '/stock/list', component: 'stock/StockList', icon: '', perm: 'stock:list', type: 1, sort: 1 },
  { id: 8, parentId: 6, name: '出入库记录', path: '/stock/logs', component: 'stock/StockLogs', icon: '', perm: 'stock:log', type: 1, sort: 2 },
  { id: 9, parentId: 0, name: '数据看板', path: '/analysis', component: 'analysis/AnalysisView', icon: 'DataLine', perm: '', type: 1, sort: 5 },
  { id: 10, parentId: 0, name: '监控看板', path: '/monitor', component: 'monitor/MonitorView', icon: 'Monitor', perm: '', type: 1, sort: 6 },
  { id: 11, parentId: 0, name: '系统管理', path: '/system', component: '', icon: 'Setting', perm: '', type: 1, sort: 7 },
  { id: 12, parentId: 11, name: '用户管理', path: '/system/user', component: 'system/UserList', icon: '', perm: 'system:user', type: 1, sort: 1 },
  { id: 13, parentId: 11, name: '角色管理', path: '/system/role', component: 'system/RoleList', icon: '', perm: 'system:role', type: 1, sort: 2 },
  { id: 20, parentId: 3, name: '新增商品', path: '', component: '', icon: '', perm: 'product:add', type: 2, sort: 1 },
  { id: 21, parentId: 3, name: '编辑商品', path: '', component: '', icon: '', perm: 'product:edit', type: 2, sort: 2 },
  { id: 22, parentId: 3, name: '上下架', path: '', component: '', icon: '', perm: 'product:status', type: 2, sort: 3 },
  { id: 23, parentId: 5, name: '发货', path: '', component: '', icon: '', perm: 'order:ship', type: 2, sort: 1 },
  { id: 24, parentId: 5, name: '取消订单', path: '', component: '', icon: '', perm: 'order:cancel', type: 2, sort: 2 },
]

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function orderStatus(index: number) {
  const bucket = index % 20
  if (bucket < 2) return statuses[0]
  if (bucket < 5) return statuses[1]
  if (bucket < 9) return statuses[2]
  if (bucket < 18) return statuses[3]
  return statuses[4]
}

async function main() {
  const server = await mysql.createConnection({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
    multipleStatements: true,
  })
  await server.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  )
  await server.end()

  const conn = await mysql.createConnection({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
    multipleStatements: true,
  })

  const schemaPath = fileURLToPath(new URL('../../sql/schema.sql', import.meta.url))
  await conn.query(readFileSync(schemaPath, 'utf8'))
  console.log('schema ready')

  const passwordHash = await bcrypt.hash('123456', 10)
  await conn.beginTransaction()
  try {
    await conn.query('INSERT INTO roles (id, code, name) VALUES ?', [
      [
        [1, 'super', '超级管理员'],
        [2, 'operator', '运营'],
        [3, 'service', '客服'],
      ],
    ])
    await conn.query(
      'INSERT INTO users (username, password_hash, nickname, role_id) VALUES ?',
      [
        [
          ['admin', passwordHash, '超级管理员', 1],
          ['operator', passwordHash, '运营同学', 2],
          ['service', passwordHash, '客服同学', 3],
        ],
      ],
    )
    await conn.query(
      'INSERT INTO menus (id, parent_id, name, path, component, icon, perm, type, sort) VALUES ?',
      [
        menus.map((menu) => [
          menu.id,
          menu.parentId,
          menu.name,
          menu.path,
          menu.component,
          menu.icon,
          menu.perm,
          menu.type,
          menu.sort,
        ]),
      ],
    )

    const allMenuIds = menus.map((menu) => menu.id)
    // 运营能进商品列表，但不能新增。用来对照「菜单权限」和「按钮权限」。
    const operatorMenuIds = allMenuIds.filter((id) => (id < 11 || id >= 20) && id !== 20)
    const serviceMenuIds = [1, 5, 24]
    const roleMenus = [
      ...allMenuIds.map((menuId) => [1, menuId]),
      ...operatorMenuIds.map((menuId) => [2, menuId]),
      ...serviceMenuIds.map((menuId) => [3, menuId]),
    ]
    await conn.query('INSERT INTO role_menus (role_id, menu_id) VALUES ?', [roleMenus])

    await conn.query('INSERT INTO categories (id, parent_id, name, sort) VALUES ?', [
      categories.map((item) => [item.id, 0, item.name, item.sort]),
    ])
    await conn.query(
      'INSERT INTO products (category_id, name, price, stock, warning_stock, status, specs) VALUES ?',
      [
        products.map((item) => [
          item.categoryId,
          item.name,
          item.price,
          item.stock,
          item.warningStock,
          item.status,
          item.specs ? JSON.stringify(item.specs) : null,
        ]),
      ],
    )

    const now = Date.now()
    for (let offset = 0; offset < ORDER_COUNT; offset += BATCH) {
      const count = Math.min(BATCH, ORDER_COUNT - offset)
      const orderRows: unknown[][] = []
      const itemRows: unknown[][] = []
      for (let i = 0; i < count; i += 1) {
        const index = offset + i
        const product = products[index % products.length]
        const quantity = 1 + (index % 3)
        const created = new Date(now - (index % 90) * 86400000 - (index % 24) * 3600000)
        orderRows.push([
          `ST${String(index + 1).padStart(8, '0')}`,
          buyers[index % buyers.length],
          (product.price * quantity).toFixed(2),
          orderStatus(index),
          addresses[index % addresses.length],
          formatDate(created),
        ])
        itemRows.push([
          index + 1,
          (index % products.length) + 1,
          product.name,
          quantity,
          product.price,
        ])
      }
      await conn.query(
        'INSERT INTO orders (order_no, buyer_name, amount, status, address, created_at) VALUES ?',
        [orderRows],
      )
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES ?',
        [itemRows],
      )
      console.log(`orders ${offset + count}/${ORDER_COUNT}`)
    }

    const logRows = products.flatMap((item, index) => {
      const productId = index + 1
      const created = formatDate(new Date(now - (index + 1) * 86400000))
      return [
        [productId, 'in', 20 + index, '采购入库', created],
        [productId, item.stock < item.warningStock ? 'out' : 'in', 5, item.stock < item.warningStock ? '销售出库' : '补货入库', created],
      ]
    })
    await conn.query(
      'INSERT INTO stock_logs (product_id, type, quantity, remark, created_at) VALUES ?',
      [logRows],
    )

    const [countRows] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM orders')
    const total = Number(countRows[0]?.total ?? 0)
    if (total !== ORDER_COUNT) {
      throw new Error(`订单数量应为 ${ORDER_COUNT}，实际 ${total}`)
    }

    await conn.commit()
    console.log(`seed done, orders=${total}`)
    console.log('accounts: admin / operator / service, password 123456')
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    await conn.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
