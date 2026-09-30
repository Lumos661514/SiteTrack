<script setup lang="ts">
import type { Category } from '@/api/category'
import type { ProductQuery } from '@/api/product'

defineProps<{
  categories: Category[]
}>()

const query = defineModel<ProductQuery>({ required: true })

const emit = defineEmits<{
  search: []
  reset: []
}>()
</script>

<template>
  <el-form class="search" inline @submit.prevent="emit('search')">
    <el-form-item label="商品名称">
      <el-input v-model="query.keyword" clearable placeholder="名称" />
    </el-form-item>
    <el-form-item label="分类">
      <el-select v-model="query.categoryId" clearable placeholder="全部" style="width: 140px">
        <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
    </el-form-item>
    <el-form-item label="状态">
      <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
        <el-option label="在售" :value="1" />
        <el-option label="下架" :value="0" />
      </el-select>
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="emit('search')">查询</el-button>
      <el-button @click="emit('reset')">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped>
.search {
  margin-bottom: -18px;
}
</style>
