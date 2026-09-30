<script setup lang="ts">
import { Close } from '@element-plus/icons-vue'

export interface TagItem {
  path: string
  title: string
  affix?: boolean
}

defineProps<{
  tags: TagItem[]
  active: string
}>()

const emit = defineEmits<{
  open: [path: string]
  close: [path: string]
}>()
</script>

<template>
  <div class="tags">
    <button
      v-for="tag in tags"
      :key="tag.path"
      class="tag"
      :class="{ active: tag.path === active }"
      type="button"
      @click="emit('open', tag.path)"
    >
      <span>{{ tag.title }}</span>
      <el-icon v-if="!tag.affix" class="close" @click.stop="emit('close', tag.path)">
        <Close />
      </el-icon>
    </button>
  </div>
</template>

<style scoped>
.tags {
  display: flex;
  align-items: center;
  height: var(--st-tags-height);
  padding: 0 8px;
  overflow-x: auto;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.tag {
  display: inline-flex;
  flex: none;
  align-items: center;
  height: 26px;
  margin-right: 6px;
  padding: 0 8px;
  color: #666;
  font-size: 12px;
  background: #fff;
  border: 1px solid #d8dce5;
  border-radius: 3px;
  cursor: pointer;
}

.tag.active {
  color: #fff;
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

.close {
  margin-left: 4px;
  font-size: 12px;
}
</style>
