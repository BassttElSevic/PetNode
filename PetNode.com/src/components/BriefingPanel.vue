<template>
  <div class="briefing-area">
    <div class="briefing-header">
      <span class="briefing-line"></span>
      <h2 class="briefing-title">简 报</h2>
    </div>
    <div class="briefing-body">
      <p class="briefing-text" v-html="html"></p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  html: { type: String, default: '请选择右侧数据指标以查看详细分析简报。' }
})
</script>

<style scoped>
.briefing-area {
  border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;
  padding: 20px; flex: 1; min-height: 0;
}
.briefing-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.briefing-line { width: 3px; height: 18px; background: #00e5ff; border-radius: 2px; }
.briefing-title { color: #fff; font-size: 16px; font-weight: 600; letter-spacing: 4px; }
.briefing-body { color: rgba(255,255,255,0.7); line-height: 1.8; font-size: 14px; }
.briefing-text :deep(em) { color: #00e5ff; font-style: normal; font-weight: 600; }
.briefing-text :deep(code) { color: #00e5ff; font-size: 12px; font-family: 'SF Mono', 'Consolas', monospace; }
</style>
