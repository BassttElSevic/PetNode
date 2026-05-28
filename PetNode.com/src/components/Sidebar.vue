<template>
  <aside class="sidebar">
    <div class="brand">
      <img src="/assets/images/logo.png" alt="PETNODE" class="brand-logo">
    </div>

    <nav class="nav-menu">
      <a
        v-for="item in navItems"
        :key="item.id"
        class="nav-item"
        :class="{ active: activeSection === item.id, 'highlight-item': item.highlight }"
        href="#"
        @click.prevent="$emit('navigate', item.id)"
      >
        <img :src="item.icon" class="nav-icon" :alt="item.label">
        <span class="text">{{ item.label }}</span>
      </a>
      <div class="divider"></div>
      <a
        class="nav-item highlight-item"
        :class="{ active: activeSection === 'section-freetrial' }"
        href="#"
        @click.prevent="$emit('navigate', 'section-freetrial')"
      >
        <img src="/assets/icons/tryfree.png" class="nav-icon" alt="免费试用">
        <span class="text">免费试用</span>
      </a>
    </nav>

    <div class="admin-toggle-wrapper">
      <label class="admin-switch">
        <input type="checkbox" :checked="adminMode" @change="onAdminToggle">
        <span class="toggle-track">
          <span class="toggle-thumb"></span>
        </span>
        <span class="toggle-label">管理员模式</span>
      </label>
    </div>

    <div class="auth-area" @click="$emit('open-login')">
      <div class="user-avatar-container">
        <img src="/assets/images/default_avatar.png" class="avatar-img" alt="用户">
      </div>
      <span class="user-action-text">{{ isLoggedIn ? '管理员 · 已登录' : '登录 / 注册' }}</span>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  activeSection: String,
  adminMode: Boolean,
  isLoggedIn: Boolean,
})
const emit = defineEmits(['navigate', 'toggle-admin', 'open-login'])

const navItems = [
  { id: 'section-index', label: '首页', icon: '/assets/icons/home.png' },
  { id: 'section-products', label: 'PetNode产品', icon: '/assets/icons/products.png' },
  { id: 'section-explore', label: '探索', icon: '/assets/icons/learningmore.png' },
]

function onAdminToggle(e) {
  emit('toggle-admin', e.target.checked)
}
</script>

<style scoped>
.sidebar {
  width: 200px; height: 100vh; background: #0c1119;
  display: flex; flex-direction: column; padding: 20px 0; flex-shrink: 0; z-index: 100;
}
.brand { padding: 0 24px 24px; }
.brand-logo { width: 100%; height: auto; }
.nav-menu { display: flex; flex-direction: column; }
.nav-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 24px;
  text-decoration: none; color: rgba(255,255,255,0.55); font-size: 14px;
  transition: all 0.2s;
}
.nav-item:hover, .nav-item.active { color: #fff; background: rgba(255,255,255,0.05); }
.nav-icon { width: 20px; height: 20px; opacity: 0.6; }
.nav-item.active .nav-icon { opacity: 1; }
.divider { height: 1px; background: rgba(255,255,255,0.08); margin: 8px 24px; }
.highlight-item .text { color: #00e5ff; }

.admin-toggle-wrapper { padding: 12px 24px; }
.admin-switch { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.admin-switch input { display: none; }
.toggle-track { width: 36px; height: 20px; border-radius: 10px; background: rgba(255,255,255,0.15); position: relative; transition: 0.2s; }
.admin-switch input:checked + .toggle-track { background: #00e5ff; }
.toggle-thumb {
  position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  border-radius: 50%; background: #fff; transition: 0.2s;
}
.admin-switch input:checked + .toggle-track .toggle-thumb { left: 18px; }
.toggle-label { color: rgba(255,255,255,0.55); font-size: 12px; }

.auth-area {
  margin-top: auto; padding: 12px 24px; display: flex; align-items: center;
  gap: 10px; cursor: pointer; border-top: 1px solid rgba(255,255,255,0.06);
}
.avatar-img { width: 32px; height: 32px; border-radius: 50%; }
.user-action-text { color: rgba(255,255,255,0.45); font-size: 13px; }
</style>
