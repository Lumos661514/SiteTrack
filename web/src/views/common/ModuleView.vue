<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => route.meta.title ?? '')
const desc = computed(() => route.meta.desc ?? '后续阶段实现')
</script>

<template>
  <section class="card">
    <h1>{{ title }}</h1>
    <p>{{ desc }}</p>
  </section>
</template>

<style scoped>
.card {
  min-height: 240px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 4px;
}

h1 {
  margin: 0;
  font-size: 18px;
}

p {
  margin: 8px 0 0;
  color: rgb(0 0 0 / 45%);
}
</style>
