<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { reactive, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

interface LoginForm {
  username: string
  password: string
}

const router = useRouter()
const route = useRoute()
const user = useUserStore()
const formRef = shallowRef<FormInstance>()
const loading = shallowRef(false)
const form = reactive<LoginForm>({
  username: 'admin',
  password: '123456',
})

const rules: FormRules<LoginForm> = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const accounts = [
  { username: 'admin', role: '超级管理员' },
  { username: 'operator', role: '运营' },
  { username: 'service', role: '客服' },
]

function fillAccount(username: string) {
  form.username = username
  form.password = '123456'
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await user.login(form.username, form.password)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await router.replace(redirect)
  } catch {
    // 错误提示由 Axios 拦截器统一弹出
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <section class="card">
      <div class="brand">
        <span class="mark">S</span>
        <div>
          <h1>SiteTrack</h1>
          <p>电商运营后台</p>
        </div>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" @keyup.enter="submit">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="账号" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="密码" />
        </el-form-item>
        <el-button class="submit" type="primary" :loading="loading" @click="submit">登录</el-button>
      </el-form>
      <div class="accounts">
        <button
          v-for="account in accounts"
          :key="account.username"
          type="button"
          @click="fillAccount(account.username)"
        >
          {{ account.role }} · {{ account.username }}
        </button>
        <span>密码都是 123456</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  background: #f0f2f5;
}

.card {
  width: 400px;
  padding: 36px 32px 28px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 8%);
}

.brand {
  display: flex;
  align-items: center;
  margin-bottom: 28px;
}

.mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  margin-right: 12px;
  color: #fff;
  font-weight: 700;
  font-size: 20px;
  background: var(--el-color-primary);
  border-radius: 10px;
}

h1 {
  margin: 0;
  color: rgb(0 0 0 / 85%);
  font-size: 22px;
}

p {
  margin: 4px 0 0;
  color: rgb(0 0 0 / 45%);
}

.submit {
  width: 100%;
}

.accounts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  color: #909399;
  font-size: 12px;
}

.accounts button {
  padding: 0;
  color: var(--el-color-primary);
  background: transparent;
  border: 0;
  cursor: pointer;
}
</style>
