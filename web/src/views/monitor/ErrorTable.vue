<script setup lang="ts">
import { onMounted, shallowRef, watch } from 'vue'
import { fetchMonitorErrors, type MonitorError } from '@/api/monitor'
import { useTable } from '@/composables/useTable'

const props = defineProps<{
  reloadToken: number
}>()

const type = shallowRef('')
const appliedType = shallowRef('')
const typeText: Record<string, string> = {
  js: '脚本错误',
  promise: 'Promise',
  resource: '资源加载',
  blank: '白屏',
  api: '接口错误',
}

const { list, total, page, pageSize, loading, load, search, changePage } = useTable<MonitorError>(
  (pageNo, size) => fetchMonitorErrors(appliedType.value, pageNo, size),
)

function onSearch() {
  appliedType.value = type.value || ''
  return search()
}

watch(
  () => props.reloadToken,
  () => {
    void load()
  },
)

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="panel">
    <div class="toolbar">
      <h2>报错列表</h2>
      <el-select v-model="type" clearable placeholder="全部类型" style="width: 140px" @change="onSearch()">
        <el-option label="脚本错误" value="js" />
        <el-option label="Promise" value="promise" />
        <el-option label="资源加载" value="resource" />
        <el-option label="白屏" value="blank" />
      </el-select>
    </div>
    <div v-loading="loading">
      <el-table :data="list" row-key="id">
        <el-table-column prop="createdAt" label="时间" width="180" />
        <el-table-column label="类型" width="110">
          <template #default="{ row }">{{ typeText[row.type] ?? row.type }}</template>
        </el-table-column>
        <el-table-column prop="message" label="内容" min-width="220" show-overflow-tooltip />
        <el-table-column prop="page" label="页面" width="160" />
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

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

h2 {
  margin: 0;
  font-size: 16px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
