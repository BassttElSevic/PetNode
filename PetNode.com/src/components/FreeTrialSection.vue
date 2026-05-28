<template>
  <section id="section-freetrial" class="page-section freetrial-section">
    <div class="freetrial-container">
      <div class="freetrial-left">
        <span class="freetrial-tag">FREE TRIAL</span>
        <h2 class="freetrial-title">免费试用<br>PetNode</h2>
        <p class="freetrial-desc">申请获取为期 1 个月的免费试用设备，让您零成本体验 PetNode 带来的全方位爱宠健康与安全守护。</p>
        <el-button type="warning" round size="large">免费申请试用</el-button>
      </div>
      <div class="freetrial-right">
        <img src="/assets/images/Try_for_free.png" alt="PetNode 免费试用设备" class="freetrial-img">
      </div>
    </div>
  </section>
</template>

<style scoped>
.freetrial-section {
  min-height: 100vh; background: linear-gradient(180deg, #080c12 0%, #0a1018 100%);
  display: flex; align-items: center; padding: 60px;
}
.freetrial-container { display: flex; gap: 60px; align-items: center; max-width: 1200px; margin: 0 auto; }
.freetrial-left { flex: 1; color: #fff; }
.freetrial-tag { color: #00e5ff; font-size: 13px; font-weight: 600; letter-spacing: 3px; }
.freetrial-title { font-size: 48px; font-weight: 700; margin: 16px 0 24px; line-height: 1.2; }
.freetrial-desc { color: rgba(255,255,255,0.6); line-height: 1.8; margin-bottom: 30px; font-size: 15px; }
.freetrial-right { flex: 1; }
.freetrial-img { width: 100%; max-width: 400px; }
</style>
