<script setup lang="ts">
import { onMounted, reactive, shallowRef } from 'vue'
import { fetchCategories, type Category } from '@/api/category'
import {
  createProduct,
  fetchProducts,
  updateProduct,
  updateProductStatus,
  type Product,
  type ProductQuery,
} from '@/api/product'
import { useTable } from '@/composables/useTable'
import ProductForm from '@/views/product/ProductForm.vue'
import ProductSearch from '@/views/product/ProductSearch.vue'
import ProductTable from '@/views/product/ProductTable.vue'

const emptyQuery = (): ProductQuery => ({ keyword: '', status: '', categoryId: '' })
const draft = reactive<ProductQuery>(emptyQuery())
const applied = shallowRef<ProductQuery>(emptyQuery())
const categories = shallowRef<Category[]>([])
const formVisible = shallowRef(false)
const editingId = shallowRef<number | null>(null)
const saving = shallowRef(false)

const { list, total, page, pageSize, loading, load, search, changePage, changeSize } = useTable<Product>(
  (pageNo, size) => fetchProducts(applied.value, pageNo, size),
)

function onSearch() {
  applied.value = { ...draft }
  return search()
}

function reset() {
  Object.assign(draft, emptyQuery())
  applied.value = emptyQuery()
  return search()
}

function openCreate() {
  editingId.value = null
  formVisible.value = true
}

function openEdit(id: number) {
  editingId.value = id
  formVisible.value = true
}

async function toggleStatus(row: Product) {
  await updateProductStatus(row.id, row.status === 1 ? 0 : 1)
  await load()
}

async function save(payload: Parameters<typeof createProduct>[0]) {
  saving.value = true
  try {
    if (editingId.value == null) {
      await createProduct(payload)
      formVisible.value = false
      await search()
      return
    }
    await updateProduct(editingId.value, payload)
    formVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const result = await fetchCategories('', 1, 50)
  categories.value = result.list
  await load()
})
</script>

<template>
  <section class="panel">
    <ProductSearch v-model="draft" :categories="categories" @search="onSearch()" @reset="reset" />
  </section>
  <section class="panel">
    <div class="toolbar">
      <el-button v-permission="'product:add'" type="primary" @click="openCreate">新增商品</el-button>
    </div>
    <div v-loading="loading">
      <ProductTable :list="list" @edit="openEdit" @toggle="toggleStatus" />
    </div>
    <div class="pager">
      <el-pagination
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        :page-sizes="[10, 20, 50]"
        @current-change="changePage"
        @size-change="changeSize"
      />
    </div>
  </section>
  <ProductForm
    :visible="formVisible"
    :product-id="editingId"
    :categories="categories"
    :saving="saving"
    @close="formVisible = false"
    @submit="save"
  />
</template>

<style scoped>
.panel {
  margin-bottom: 10px;
  padding: 16px;
  background: #fff;
  border-radius: 4px;
}

.toolbar {
  margin-bottom: 12px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
