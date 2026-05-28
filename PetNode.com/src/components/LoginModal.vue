<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    width="400px"
    :close-on-click-modal="true"
    class="login-dialog"
    :show-close="true"
  >
    <div class="login-header">
      <img src="/assets/images/logo.png" alt="PetNode" class="login-logo">
      <span class="login-brand">PetNode</span>
    </div>

    <!-- User Login -->
    <div v-if="view === 'user'" class="login-body">
      <el-input v-model="phone" placeholder="手机号码" size="large" class="mb-3" />
      <div class="code-row mb-3">
        <el-input v-model="smsCode" placeholder="验证码" size="large" />
        <el-button type="primary" plain size="large" @click="onSendSms">发送验证码</el-button>
      </div>
      <el-checkbox v-model="agreed" class="mb-3">
        <span class="agree-text">已同意<a href="#">《用户注册协议》</a><a href="#">《个人信息保护政策》</a>和<a href="#">《儿童个人信息保护政策》</a></span>
      </el-checkbox>
      <el-button type="primary" size="large" class="w-full mb-3" @click="onUserLogin">注册/登录</el-button>
      <el-button link type="primary" @click="view = 'password'" class="w-full mb-2">密码登录</el-button>
      <div class="admin-trigger" @click="view = 'admin'">
        <img src="/assets/icons/Endministrator_test.png" alt="管理员" class="admin-trigger-img">
      </div>
    </div>

    <!-- Password Login -->
    <div v-else-if="view === 'password'" class="login-body">
      <el-input v-model="phone" placeholder="手机号码" size="large" class="mb-3" />
      <el-input v-model="password" type="password" placeholder="密码" size="large" class="mb-3" show-password />
      <el-button type="primary" size="large" class="w-full mb-3" @click="showBlocked">登录</el-button>
      <el-button link type="primary" @click="view = 'user'" class="w-full">← 返回验证码登录</el-button>
    </div>

    <!-- Admin Login -->
    <div v-else-if="view === 'admin'" class="login-body">
      <el-input v-model="adminUsername" placeholder="用户名" size="large" class="mb-3" />
      <el-input v-model="adminPassword" type="password" placeholder="密码" size="large" class="mb-3" show-password />
      <el-button
        type="primary" size="large" class="w-full mb-3"
        :loading="adminLoading" @click="onAdminLogin"
      >
        管理员登录
      </el-button>
      <el-button link type="primary" @click="view = 'user'" class="w-full">← 返回用户登录</el-button>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adminLogin as apiAdminLogin } from '../api.js'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['update:visible', 'login-success'])

const view = ref('user')
const phone = ref('')
const smsCode = ref('')
const password = ref('')
const agreed = ref(false)
const adminUsername = ref('')
const adminPassword = ref('')
const adminLoading = ref(false)

function onSendSms() {
  ElMessage.info('验证码发送功能暂未开放')
}

function onUserLogin() {
  ElMessage.info('用户登录功能暂未开放，请使用管理员登录')
}

function showBlocked() {
  ElMessage.info('用户登录功能暂未开放，请使用管理员登录')
}

async function onAdminLogin() {
  if (!adminUsername.value || !adminPassword.value) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  adminLoading.value = true
  try {
    await apiAdminLogin(adminUsername.value, adminPassword.value)
    ElMessage.success('登录成功')
    emit('update:visible', false)
    emit('login-success')
  } catch (err) {
    ElMessage.error(err.message || '登录失败')
  } finally {
    adminLoading.value = false
  }
}
</script>

<style scoped>
.login-header { text-align: center; margin-bottom: 24px; }
.login-logo { width: 48px; height: 48px; }
.login-brand { display: block; font-size: 18px; font-weight: 600; color: #fff; margin-top: 8px; }
.login-body { padding: 0 10px; }
.mb-3 { margin-bottom: 16px; }
.w-full { width: 100%; }
.code-row { display: flex; gap: 10px; }
.code-row .el-input { flex: 1; }
.agree-text { font-size: 12px; color: rgba(255,255,255,0.5); }
.agree-text a { color: #00e5ff; text-decoration: none; }
.agree-text a:hover { text-decoration: underline; }
.admin-trigger { text-align: center; cursor: pointer; margin-top: 12px; }
.admin-trigger-img { width: 28px; height: 28px; opacity: 0.5; transition: opacity 0.2s; }
.admin-trigger-img:hover { opacity: 0.8; }
</style>

<style>
.login-dialog { --el-dialog-bg-color: #111820; --el-dialog-border-radius: 16px; }
.login-dialog .el-dialog__header { display: none; }
.login-dialog .el-input__wrapper { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); box-shadow: none; }
.login-dialog .el-input__inner { color: #fff; }
.login-dialog .el-input__inner::placeholder { color: rgba(255,255,255,0.3); }
</style>
