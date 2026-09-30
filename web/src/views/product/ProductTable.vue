<script setup lang="ts">
import type { Product } from '@/api/product'

defineProps<{
  list: readonly Product[]
}>()

const emit = defineEmits<{
  edit: [id: number]
  toggle: [row: Product]
}>()
</script>

<template>
  <el-table :data="list" row-key="id">
    <el-table-column label="图片" width="80">
      <template #default="{ row }">
        <img v-if="row.cover" class="cover" :src="row.cover" alt="" />
        <span v-else class="empty">无</span>
      </template>
    </el-table-column>
    <el-table-column prop="name" label="商品" min-width="160" />
    <el-table-column prop="categoryName" label="分类" width="100" />
    <el-table-column label="价格" width="100">
      <template #default="{ row }">¥{{ row.price }}</template>
    </el-table-column>
    <el-table-column prop="stock" label="库存" width="80" />
    <el-table-column label="状态" width="90">
      <template #default="{ row }">
        <el-tag :type="row.status === 1 ? 'success' : 'info'">
          {{ row.status === 1 ? '在售' : '下架' }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="160" fixed="right">
      <template #default="{ row }">
        <el-button v-permission="'product:edit'" link type="primary" @click="emit('edit', row.id)">
          编辑
        </el-button>
        <el-button v-permission="'product:status'" link type="primary" @click="emit('toggle', row)">
          {{ row.status === 1 ? '下架' : '上架' }}
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.cover {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.empty {
  color: #c0c4cc;
}
</style>
