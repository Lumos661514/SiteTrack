<script setup lang="ts">
import { onMounted, reactive, shallowRef, useTemplateRef } from 'vue'
import {
  fetchOrder,
  fetchOrders,
  runOrderAction,
  type OrderDetail,
  type OrderQuery,
  type OrderRow,
} from '@/api/order'
import VirtualList from '@/components/VirtualList.vue'

const CHUNK = 100
const ROW_HEIGHT = 48

const query = reactive<OrderQuery>({ orderNo: '', buyer: '', status: '' })
const total = shallowRef(0)
const rows = shallowRef<Array<OrderRow | undefined>>([])
const loading = shallowRef(false)
const detail = shallowRef<OrderDetail | null>(null)
const detailVisible = shallowRef(false)
const acting = shallowRef(false)
const virtualRef = useTemplateRef<{ scrollTo: (top: number) => void }>('virtual')
let generation = 0
const inflight = new Set<string>()

function appliedQuery(): OrderQuery {
  return {
    orderNo: query.orderNo.trim(),
    buyer: query.buyer.trim(),
    status: query.status || '',
  }
}

async function refresh() {
  generation += 1
  const current = generation
  inflight.clear()
  loading.value = true
  try {
    const data = await fetchOrders(appliedQuery(), 0, CHUNK)
    if (current !== generation) return
    total.value = data.total
    const next = new Array<OrderRow | undefined>(data.total)
    data.list.forEach((item, index) => {
      next[index] = item
    })
    rows.value = next
    virtualRef.value?.scrollTo(0)
  } finally {
    if (current === generation) loading.value = false
  }
}

// 【面试重点】按视口去要数据，而不是一次拉完 5 万条
// 解决的问题：虚拟列表只解决 DOM 数量，如果接口仍一次返回全部订单，浏览器还是会卡在 JSON 解析上。
// 为什么这样设计：滚动到哪一段，就按 100 条一块向接口要。同一块正在请求时不重复发。筛选条件一变，旧请求的结果直接丢掉。
async function onRange(start: number, end: number) {
  if (!total.value || end <= start) return
  const chunkStart = Math.floor(start / CHUNK) * CHUNK
  const chunkEnd = Math.min(total.value, Math.ceil(end / CHUNK) * CHUNK)
  let missing = false
  for (let index = chunkStart; index < chunkEnd; index += 1) {
    if (!rows.value[index]) {
      missing = true
      break
    }
  }
  if (!missing) return
  const current = generation
  const key = `${current}:${chunkStart}:${chunkEnd}`
  if (inflight.has(key)) return
  inflight.add(key)
  try {
    const data = await fetchOrders(appliedQuery(), chunkStart, chunkEnd - chunkStart)
    if (current !== generation) return
    const next = rows.value.slice()
    data.list.forEach((item, index) => {
      next[chunkStart + index] = item
    })
    rows.value = next
  } finally {
    inflight.delete(key)
  }
}

function indexes(start: number, end: number) {
  return Array.from({ length: Math.max(0, end - start) }, (_, index) => start + index)
}

async function openDetail(row: OrderRow) {
  detail.value = await fetchOrder(row.id)
  detailVisible.value = true
}

async function runAction(action: string) {
  if (!detail.value) return
  acting.value = true
  try {
    await runOrderAction(detail.value.id, action)
    const next = await fetchOrder(detail.value.id)
    detail.value = next
    const index = rows.value.findIndex((item) => item?.id === next.id)
    if (index >= 0) {
      const copy = rows.value.slice()
      copy[index] = next
      rows.value = copy
    }
  } finally {
    acting.value = false
  }
}

onMounted(() => {
  void refresh()
})
</script>

<template>
  <section class="panel">
    <el-form inline @submit.prevent="refresh">
      <el-form-item label="订单号">
        <el-input v-model="query.orderNo" clearable placeholder="前缀匹配" />
      </el-form-item>
      <el-form-item label="买家">
        <el-input v-model="query.buyer" clearable placeholder="姓名" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
          <el-option label="待付款" value="pending_pay" />
          <el-option label="待发货" value="pending_ship" />
          <el-option label="已发货" value="shipped" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="refresh">查询</el-button>
      </el-form-item>
      <el-form-item>
        <span class="total">共 {{ total.toLocaleString('zh-CN') }} 条</span>
      </el-form-item>
    </el-form>
  </section>
  <section v-loading="loading" class="panel table">
    <div class="row head">
      <span>订单号</span>
      <span>买家</span>
      <span>金额</span>
      <span>状态</span>
      <span>下单时间</span>
      <span>操作</span>
    </div>
    <VirtualList
      ref="virtual"
      :total="total"
      :item-height="ROW_HEIGHT"
      @range="onRange"
    >
      <template #default="{ start, end }">
        <div v-for="index in indexes(start, end)" :key="index" class="row">
          <template v-if="rows[index]">
            <span>{{ rows[index].orderNo }}</span>
            <span>{{ rows[index].buyerName }}</span>
            <span>¥{{ rows[index].amount }}</span>
            <span>{{ rows[index].statusText }}</span>
            <span>{{ rows[index].createdAt }}</span>
            <span>
              <el-button link type="primary" @click="openDetail(rows[index]!)">详情</el-button>
            </span>
          </template>
          <span v-else class="placeholder">加载中</span>
        </div>
      </template>
    </VirtualList>
  </section>
  <el-drawer v-model="detailVisible" title="订单详情" size="420px">
    <template v-if="detail">
      <p>订单号：{{ detail.orderNo }}</p>
      <p>买家：{{ detail.buyerName }}</p>
      <p>状态：{{ detail.statusText }}</p>
      <p>地址：{{ detail.address }}</p>
      <p>下单时间：{{ detail.createdAt }}</p>
      <el-table :data="detail.items" size="small">
        <el-table-column prop="productName" label="商品" />
        <el-table-column prop="quantity" label="数量" width="70" />
        <el-table-column prop="price" label="单价" width="90" />
      </el-table>
      <p class="amount">金额 ¥{{ detail.amount }}</p>
      <div class="actions">
        <el-button
          v-for="item in detail.actions"
          :key="item.action"
          :type="item.action === 'cancel' ? 'danger' : 'primary'"
          :loading="acting"
          @click="runAction(item.action)"
        >
          {{ item.label }}
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.panel {
  margin-bottom: 10px;
  padding: 16px;
  background: #fff;
  border-radius: 4px;
}

.table {
  padding-top: 0;
}

.total {
  color: #909399;
}

.row {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 160px 90px 100px 90px 180px 1fr;
  align-items: center;
  height: 48px;
  padding: 0 12px;
  border-bottom: 1px solid #ebeef5;
}

.head {
  color: #909399;
  font-weight: 600;
  background: #fafafa;
}

.placeholder {
  color: #c0c4cc;
}

.amount {
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
