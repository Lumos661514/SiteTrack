<script setup lang="ts">
import { onMounted, reactive, shallowRef } from 'vue'
import { fetchStock, moveStock, type StockRow } from '@/api/stock'
import { useTable } from '@/composables/useTable'

const keyword = shallowRef('')
const lowOnly = shallowRef(false)
const appliedKeyword = shallowRef('')
const appliedLowOnly = shallowRef(false)
const lowCount = shallowRef(0)
const visible = shallowRef(false)
const saving = shallowRef(false)
const current = shallowRef<StockRow | null>(null)
const form = reactive({ type: 'in' as 'in' | 'out', quantity: 1, remark: '' })

const { list, total, page, pageSize, loading, load, search, changePage } = useTable<StockRow>(
  async (pageNo, size) => {
    const data = await fetchStock(appliedKeyword.value, appliedLowOnly.value, pageNo, size)
    lowCount.value = data.lowCount
    return data
  },
)

function onSearch() {
  appliedKeyword.value = keyword.value.trim()
  appliedLowOnly.value = lowOnly.value
  return search()
}

function openMove(row: StockRow, type: 'in' | 'out') {
  current.value = row
  form.type = type
  form.quantity = 1
  form.remark = ''
  visible.value = true
}

async function save() {
  if (!current.value) return
  saving.value = true
  try {
    await moveStock({
      productId: current.value.id,
      type: form.type,
      quantity: form.quantity,
      remark: form.remark.trim(),
    })
    visible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="panel">
    <el-form inline @submit.prevent="onSearch()">
      <el-form-item label="商品">
        <el-input v-model="keyword" clearable placeholder="名称" />
      </el-form-item>
      <el-form-item>
        <el-checkbox v-model="lowOnly">只看低库存（{{ lowCount }}）</el-checkbox>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch()">查询</el-button>
      </el-form-item>
    </el-form>
  </section>
  <section class="panel">
    <div v-loading="loading">
      <el-table :data="list" row-key="id">
        <el-table-column prop="name" label="商品" min-width="160" />
        <el-table-column prop="categoryName" label="分类" width="100" />
        <el-table-column prop="stock" label="库存" width="90" />
        <el-table-column prop="warningStock" label="预警值" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.low ? 'danger' : 'success'">{{ row.low ? '低库存' : '正常' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button link type="primary" @click="openMove(row, 'in')">入库</el-button>
            <el-button link type="primary" @click="openMove(row, 'out')">出库</el-button>
          </template>
        </el-table-column>
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
  <el-dialog v-model="visible" :title="form.type === 'in' ? '入库' : '出库'" width="420px">
    <p v-if="current">{{ current.name }}，当前库存 {{ current.stock }}</p>
    <el-form label-width="72px">
      <el-form-item label="数量">
        <el-input-number v-model="form.quantity" :min="1" :step="1" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" maxlength="50" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">确认</el-button>
    </template>
  </el-dialog>
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
