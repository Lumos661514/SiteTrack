<script setup lang="ts">
import { onMounted, reactive, shallowRef } from 'vue'
import { ElMessageBox } from 'element-plus'
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
  type Category,
} from '@/api/category'
import { useTable } from '@/composables/useTable'

const keyword = shallowRef('')
const appliedKeyword = shallowRef('')
const visible = shallowRef(false)
const saving = shallowRef(false)
const editingId = shallowRef<number | null>(null)
const form = reactive({ name: '', sort: 0 })

const { list, total, page, pageSize, loading, load, search, changePage } = useTable<Category>(
  (pageNo, size) => fetchCategories(appliedKeyword.value, pageNo, size),
)

function onSearch() {
  appliedKeyword.value = keyword.value
  return search()
}

function reset() {
  keyword.value = ''
  appliedKeyword.value = ''
  return search()
}

function openCreate() {
  editingId.value = null
  form.name = ''
  form.sort = 0
  visible.value = true
}

function openEdit(row: Category) {
  editingId.value = row.id
  form.name = row.name
  form.sort = row.sort
  visible.value = true
}

async function save() {
  saving.value = true
  try {
    if (editingId.value == null) {
      await createCategory(form.name.trim(), form.sort)
      visible.value = false
      await search()
      return
    }
    await updateCategory(editingId.value, form.name.trim(), form.sort)
    visible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(row: Category) {
  await ElMessageBox.confirm(`删除分类「${row.name}」？`, '提示', { type: 'warning' })
  await deleteCategory(row.id)
  await load()
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="panel">
    <el-form inline @submit.prevent="onSearch()">
      <el-form-item label="分类名称">
        <el-input v-model="keyword" clearable placeholder="名称" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch()">查询</el-button>
        <el-button @click="reset">重置</el-button>
      </el-form-item>
    </el-form>
  </section>
  <section class="panel">
    <div class="toolbar">
      <el-button v-permission="'product:category'" type="primary" @click="openCreate">新增分类</el-button>
    </div>
    <div v-loading="loading">
      <el-table :data="list" row-key="id">
        <el-table-column prop="name" label="分类" />
        <el-table-column prop="sort" label="排序" width="100" />
        <el-table-column prop="productCount" label="商品数" width="100" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button v-permission="'product:category'" link type="primary" @click="openEdit(row)">
              编辑
            </el-button>
            <el-button v-permission="'product:category'" link type="danger" @click="remove(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
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
  <el-dialog
    :model-value="visible"
    :title="editingId == null ? '新增分类' : '编辑分类'"
    width="420px"
    @close="visible = false"
  >
    <el-form label-width="72px">
      <el-form-item label="名称">
        <el-input v-model="form.name" maxlength="30" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="form.sort" :min="0" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
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
