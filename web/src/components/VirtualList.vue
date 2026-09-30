<script setup lang="ts">
// 【面试重点】自己实现的虚拟滚动
// 解决的问题：订单有 5 万条。如果一次性渲染 5 万个 DOM，页面会卡住。
// 为什么这样设计：滚动容器的高度按「总条数 × 行高」撑开，看起来能滚完所有订单。真正创建的 DOM 只有视口里的行，再加上几行缓冲区。滚动时用 translateY 把这窗口挪到对应位置，不使用第三方虚拟列表。

import { computed, onMounted, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    total: number
    itemHeight: number
    overscan?: number
  }>(),
  { overscan: 6 },
)

const emit = defineEmits<{
  range: [start: number, end: number]
}>()

const container = useTemplateRef<HTMLElement>('container')
const scrollTop = shallowRef(0)
const viewportHeight = shallowRef(0)

const totalHeight = computed(() => props.total * props.itemHeight)
const start = computed(() =>
  Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan),
)
const visibleCount = computed(
  () => Math.ceil(viewportHeight.value / props.itemHeight) + props.overscan * 2,
)
const end = computed(() => Math.min(props.total, start.value + visibleCount.value))
const offset = computed(() => start.value * props.itemHeight)

watch([start, end], () => {
  emit('range', start.value, end.value)
})

function onScroll(event: Event) {
  scrollTop.value = (event.target as HTMLElement).scrollTop
}

function measure() {
  viewportHeight.value = container.value?.clientHeight ?? 0
}

function scrollTo(top: number) {
  if (!container.value) return
  container.value.scrollTop = top
  scrollTop.value = top
}

defineExpose({ scrollTo })

onMounted(() => {
  measure()
  emit('range', start.value, end.value)
  const observer = new ResizeObserver(measure)
  if (container.value) observer.observe(container.value)
  onUnmounted(() => observer.disconnect())
})
</script>

<template>
  <div ref="container" class="viewport" @scroll="onScroll">
    <div class="phantom" :style="{ height: `${totalHeight}px` }">
      <div class="window" :style="{ transform: `translateY(${offset}px)` }">
        <slot :start="start" :end="end" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewport {
  height: 560px;
  overflow: auto;
}

.phantom {
  position: relative;
  width: 100%;
}

.window {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
}
</style>
