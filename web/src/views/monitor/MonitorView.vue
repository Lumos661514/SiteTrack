<script setup lang="ts">
import { getMonitor } from '@sitetrack/sdk'
import { onMounted, shallowRef } from 'vue'
import { fetchMonitorSummary, type MetricSummary, type PageView } from '@/api/monitor'
import ErrorTable from '@/views/monitor/ErrorTable.vue'

const metricOrder = ['FCP', 'LCP', 'INP', 'CLS']
const metricHint: Record<string, string> = {
  FCP: '首次内容绘制，毫秒',
  LCP: '最大内容绘制，毫秒',
  INP: '交互延迟，毫秒',
  CLS: '布局偏移，越小越好',
}

const metrics = shallowRef<MetricSummary[]>([])
const pages = shallowRef<PageView[]>([])
const loading = shallowRef(false)
const reloadToken = shallowRef(0)

function metricOf(name: string) {
  return metrics.value.find((item) => item.name === name)
}

async function loadSummary() {
  loading.value = true
  try {
    const data = await fetchMonitorSummary()
    metrics.value = data.metrics
    pages.value = data.pages
  } finally {
    loading.value = false
  }
}

function refresh() {
  getMonitor()?.flush()
  window.setTimeout(() => {
    reloadToken.value += 1
    void loadSummary()
  }, 400)
}

function triggerJs() {
  window.setTimeout(() => {
    throw new Error('演示：商品价格计算失败')
  })
  window.setTimeout(refresh, 30)
}

function triggerPromise() {
  void Promise.reject(new Error('演示：订单接口失败'))
  window.setTimeout(refresh, 30)
}

function triggerResource() {
  const image = new Image()
  image.src = `/missing-monitor-asset-${Date.now()}.png`
  window.setTimeout(refresh, 300)
}

onMounted(() => {
  void loadSummary()
})
</script>

<template>
  <section class="panel">
    <div class="toolbar">
      <h2>采集演示</h2>
      <div>
        <el-button @click="triggerJs">触发脚本错误</el-button>
        <el-button @click="triggerPromise">触发 Promise 错误</el-button>
        <el-button @click="triggerResource">触发资源错误</el-button>
        <el-button type="primary" @click="refresh">刷新数据</el-button>
      </div>
    </div>
    <p class="hint">上报会先攒一批。点刷新会立刻发送，再拉一次看板。</p>
  </section>
  <section v-loading="loading" class="metrics">
    <article v-for="name in metricOrder" :key="name" class="card">
      <div class="label">{{ name }}</div>
      <div class="value">{{ metricOf(name)?.avg ?? '--' }}</div>
      <div class="hint">{{ metricHint[name] }} · {{ metricOf(name)?.count ?? 0 }} 次样本</div>
    </article>
  </section>
  <ErrorTable :reload-token="reloadToken" />
  <section class="panel">
    <h2>页面访问</h2>
    <el-table :data="pages" row-key="page">
      <el-table-column prop="page" label="页面" />
      <el-table-column prop="count" label="访问次数" width="120" />
    </el-table>
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
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

h2 {
  margin: 0 0 12px;
  font-size: 16px;
}

.toolbar h2 {
  margin: 0;
}

.hint {
  margin: 8px 0 0;
  color: #909399;
  font-size: 12px;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.card {
  padding: 16px;
  background: #fff;
  border-radius: 4px;
}

.label {
  color: #909399;
}

.value {
  margin: 8px 0;
  font-weight: 600;
  font-size: 28px;
}

@media (max-width: 900px) {
  .metrics {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
