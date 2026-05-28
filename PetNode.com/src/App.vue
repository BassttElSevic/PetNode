<template>
  <div class="app-root">
    <Sidebar
      :active-section="activeSection"
      :admin-mode="adminMode"
      :is-logged-in="isLoggedIn"
      @navigate="onNavigate"
      @toggle-admin="onToggleAdmin"
      @open-login="showLoginModal = true"
    />
    <main class="main-scroll" @scroll="onScroll">
      <HomeSection id="section-index" />
      <ProductsSection id="section-products" />
      <ExploreSection id="section-explore" />
      <FreeTrialSection id="section-freetrial" />
    </main>
    <LoginModal
      v-model:visible="showLoginModal"
      @login-success="onLoginSuccess"
    />
    <AdminDashboard
      v-if="adminMode"
      @close="adminMode = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { isLoggedIn } from './api.js'
import Sidebar from './components/Sidebar.vue'
import HomeSection from './components/HomeSection.vue'
import ProductsSection from './components/ProductsSection.vue'
import ExploreSection from './components/ExploreSection.vue'
import FreeTrialSection from './components/FreeTrialSection.vue'
import LoginModal from './components/LoginModal.vue'
import AdminDashboard from './components/AdminDashboard.vue'

const activeSection = ref('section-index')
const adminMode = ref(false)
const showLoginModal = ref(false)

function onNavigate(sectionId) {
  activeSection.value = sectionId
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onScroll(e) {
  const el = e.target
  const sections = el.querySelectorAll('.page-section')
  const mid = el.clientHeight / 2
  for (const s of sections) {
    const rect = s.getBoundingClientRect()
    if (rect.top <= mid && rect.bottom >= 0) {
      activeSection.value = s.id
      break
    }
  }
}

function onToggleAdmin(val) {
  if (val && !isLoggedIn()) {
    showLoginModal.value = true
    return
  }
  adminMode.value = val
}

function onLoginSuccess() {
  adminMode.value = true
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { height: 100%; overflow: hidden; }
body { font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif; }
.app-root { display: flex; height: 100vh; }
.main-scroll { flex: 1; overflow-y: auto; scroll-behavior: smooth; }
</style>
