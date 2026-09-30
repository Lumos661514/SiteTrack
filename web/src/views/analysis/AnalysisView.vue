<script setup lang="ts">
// 【面试重点】ECharts 按需引入
// 解决的问题：整包 echarts 会把地图、雷达等用不到的图表打进看板页面。
// 为什么这样设计：只用到折线和柱状图，以及提示框、图例、网格和 canvas 渲染器。其余图表不注册，就不会出现在这个 chunk 里。

import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { init, use, type ECharts } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue'
import { fetchAnalysis } from '@/api/analysis'

use([LineChart, BarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const trendEl = useTemplateRef<HTMLElement>('trendEl')
const rankEl = useTemplateRef<HTMLElement>('rankEl')
const loading = shallowRef(false)
let trendChart: ECharts | null = null
let rankChart: ECharts | null = null

function resize() {
  trendChart?.resize()
  rankChart?.resize()
}

onMounted(async () => {
  loading.value = true
  try {
    const data = await fetchAnalysis(30)
    if (trendEl.value) {
      trendChart = init(trendEl.value)
      trendChart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['销售额', '订单量'] },
        grid: { left: 48, right: 48, bottom: 32, top: 40 },
        xAxis: { type: 'category', data: data.trend.map((item) => item.day.slice(5)) },
        yAxis: [
          { type: 'value', name: '销售额' },
          { type: 'value', name: '订单量' },
        ],
        series: [
          {
            name: '销售额',
            type: 'line',
            smooth: true,
            data: data.trend.map((item) => item.sales),
            itemStyle: { color: '#409eff' },
          },
          {
            name: '订单量',
            type: 'bar',
            yAxisIndex: 1,
            data: data.trend.map((item) => item.orderCount),
            itemStyle: { color: '#b3d8ff' },
          },
        ],
      })
    }
    if (rankEl.value) {
      const ranking = [...data.ranking].reverse()
      rankChart = init(rankEl.value)
      rankChart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 88, right: 24, bottom: 24, top: 16 },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: ranking.map((item) => item.name) },
        series: [
          {
            type: 'bar',
            data: ranking.map((item) => item.quantity),
            itemStyle: { color: '#409eff' },
          },
        ],
      })
    }
  } finally {
    loading.value = false
  }
  window.addEventListener('resize', resize)
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  trendChart?.dispose()
  rankChart?.dispose()
})
</script>

<template>
  <div v-loading="loading" class="grid">
    <section class="panel">
      <h2>近 30 天销售额与订单量</h2>
      <div ref="trendEl" class="chart" />
    </section>
    <section class="panel">
      <h2>热销商品</h2>
      <div ref="rankEl" class="chart" />
    </section>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 10px;
}

.panel {
  padding: 16px;
  background: #fff;
  border-radius: 4px;
}

h2 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
}

.chart {
  height: 360px;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
