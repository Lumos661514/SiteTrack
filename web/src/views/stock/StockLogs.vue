<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { fetchProducts } from '@/api/product'
import { fetchStockLogs, type StockLog } from '@/api/stock'
import { useTable } from '@/composables/useTable'

interface Option {
  id: number
  name: string
}

const productId = shallowRef<number | ''>('')
const products = shallowRef<Option[]>([])

const { list, total, page, pageSize, loading, load, search, changePage } = useTable<StockLog>(
  (pageNo, size) => fetchStockLogs(productId.value, pageNo, size),
)

onMounted(async () => {
  const [productPage] = await Promise.all([fetchProducts({ keyword: '', status: '', categoryId: '' }, 1, 50), load()])
  products.value = productPage.list.map((item) => ({ id: item.id, name: item.name }))
})
</script>

<template>
  <section class="panel">
    <el-form inline @submit.prevent="search()">
      <el-form-item label="商品">
        <el-select v-model="productId" clearable placeholder="全部" style="width: 200px">
          <el-option v-for="item in products" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="search()">查询</el-button>
      </el-form-item>
    </el-form>
  </section>
  <section class="panel">
    <div v-loading="loading">
      <el-table :data="list" row-key="id">
        <el-table-column prop="createdAt" label="时间" width="180" />
        <el-table-column prop="productName" label="商品" min-width="140" />
        <el-table-column label="方向" width="90">
          <template #default="{ row }">{{ row.type === 'in' ? '入库' : '出库' }}</template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="90" />
        <el-table-column prop="remark" label="备注" min-width="160" />
      </el-table>
    </div>
    <div class="pager">
      <el-pagination
        background
        layout="total, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        @current-change="changePage"
      />
    </div>
  </section>
</template>

<style scoped>
.panel {
  margin-bottom: 10px;
  padding: 16px;
  background: #fff;
  border-radius: 4px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
