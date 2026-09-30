<script setup lang="ts">
import type { UploadRequestOptions } from 'element-plus'
import { reactive, shallowRef, watch } from 'vue'
import type { Category } from '@/api/category'
import { fetchProduct, uploadImage, type Spec } from '@/api/product'

interface SpecInput {
  name: string
  valuesText: string
}

const props = defineProps<{
  visible: boolean
  productId: number | null
  categories: Category[]
  saving: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: {
    categoryId: number
    name: string
    price: number
    stock: number
    warningStock: number
    cover: string
    status: number
    specs: Spec[]
  }]
}>()

const form = reactive({
  categoryId: undefined as number | undefined,
  name: '',
  price: 0,
  stock: 0,
  warningStock: 10,
  cover: '',
  status: 1,
})
const specs = reactive<SpecInput[]>([])
const loading = shallowRef(false)

function resetForm() {
  form.categoryId = props.categories[0]?.id
  form.name = ''
  form.price = 0
  form.stock = 0
  form.warningStock = 10
  form.cover = ''
  form.status = 1
  specs.splice(0, specs.length)
}

watch(
  () => [props.visible, props.productId] as const,
  async ([visible, productId]) => {
    if (!visible) return
    if (productId == null) {
      resetForm()
      return
    }
    loading.value = true
    try {
      const detail = await fetchProduct(productId)
      form.categoryId = detail.categoryId
      form.name = detail.name
      form.price = detail.price
      form.stock = detail.stock
      form.warningStock = detail.warningStock
      form.cover = detail.cover
      form.status = detail.status
      specs.splice(
        0,
        specs.length,
        ...detail.specs.map((item) => ({ name: item.name, valuesText: item.values.join(',') })),
      )
    } finally {
      loading.value = false
    }
  },
)

function addSpec() {
  specs.push({ name: '', valuesText: '' })
}

async function onUpload(options: UploadRequestOptions) {
  const result = await uploadImage(options.file)
  form.cover = result.url
}

function submit() {
  if (form.categoryId == null) return
  emit('submit', {
    categoryId: form.categoryId,
    name: form.name.trim(),
    price: form.price,
    stock: form.stock,
    warningStock: form.warningStock,
    cover: form.cover,
    status: form.status,
    specs: specs
      .map((item) => ({
        name: item.name.trim(),
        values: item.valuesText
          .split(/[,，]/)
          .map((value) => value.trim())
          .filter(Boolean),
      }))
      .filter((item) => item.name && item.values.length),
  })
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="productId == null ? '新增商品' : '编辑商品'"
    width="640px"
    @close="emit('close')"
  >
    <el-form v-loading="loading" label-width="88px">
      <el-form-item label="名称">
        <el-input v-model="form.name" maxlength="60" />
      </el-form-item>
      <el-form-item label="分类">
        <el-select v-model="form.categoryId" style="width: 100%">
          <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="价格">
        <el-input-number v-model="form.price" :min="0" :precision="2" />
      </el-form-item>
      <el-form-item v-if="productId == null" label="库存">
        <el-input-number v-model="form.stock" :min="0" :step="1" />
      </el-form-item>
      <el-form-item v-else label="库存">
        <span>请到库存管理里出入库，这里不能直接改数量</span>
      </el-form-item>
      <el-form-item label="预警值">
        <el-input-number v-model="form.warningStock" :min="0" :step="1" />
      </el-form-item>
      <el-form-item label="状态">
        <el-radio-group v-model="form.status">
          <el-radio :value="1">在售</el-radio>
          <el-radio :value="0">下架</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="图片">
        <div class="upload">
          <img v-if="form.cover" class="preview" :src="form.cover" alt="" />
          <el-upload :show-file-list="false" accept="image/*" :http-request="onUpload">
            <el-button>上传图片</el-button>
          </el-upload>
        </div>
      </el-form-item>
      <el-form-item label="规格">
        <div class="specs">
          <div v-for="(spec, index) in specs" :key="index" class="spec">
            <el-input v-model="spec.name" placeholder="规格名，如颜色" />
            <el-input v-model="spec.valuesText" placeholder="可选值，逗号分隔" />
            <el-button link type="danger" @click="specs.splice(index, 1)">删除</el-button>
          </div>
          <el-button @click="addSpec">添加规格</el-button>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('close')">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.upload {
  display: flex;
  gap: 12px;
  align-items: center;
}

.preview {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 4px;
}

.specs {
  width: 100%;
}

.spec {
  display: grid;
  grid-template-columns: 140px 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
