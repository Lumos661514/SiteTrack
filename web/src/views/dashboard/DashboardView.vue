<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { fetchSummary, type Summary } from '@/api/dashboard'
import { useUserStore } from '@/stores/user'

const user = useUserStore()
const { profile } = storeToRefs(user)
const summary = shallowRef<Summary | null>(null)
const loading = shallowRef(false)

const cards = [
  { key: 'orderCount', label: '订单总数' },
  { key: 'productCount', label: '商品数' },
  { key: 'userCount', label: '账号数' },
] as const

onMounted(async () => {
  loading.value = true
  try {
    summary.value = await fetchSummary()
  } catch {
    summary.value = null
  } finally {
    loading.value = false
  }
})

function display(key: (typeof cards)[number]['key']) {
  const value = summary.value?.[key]
  return value == null ? '--' : value.toLocaleString('zh-CN')
}
</script>

<template>
  <div v-loading="loading">
    <section class="welcome">
      <h1>{{ profile?.nickname }}，欢迎回来</h1>
      <p>当前角色：{{ profile?.roleName }}。销售趋势和热销排行在「数据看板」。</p>
    </section>
    <section class="grid">
      <article v-for="card in cards" :key="card.key" class="card">
        <div class="label">{{ card.label }}</div>
        <div class="value">{{ display(card.key) }}</div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.welcome,
.card {
  background: #fff;
  border-radius: 4px;
}

.welcome {
  margin-bottom: 10px;
  padding: 16px 20px;
}

h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

p {
  margin: 8px 0 0;
  color: rgb(0 0 0 / 45%);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.card {
  padding: 16px 20px;
}

.label {
  color: rgb(0 0 0 / 45%);
  font-size: 13px;
}

.value {
  margin-top: 8px;
  font-weight: 600;
  font-size: 28px;
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
