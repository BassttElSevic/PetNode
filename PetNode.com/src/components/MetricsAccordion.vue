<template>
  <div class="accordion">
    <div
      v-for="(item, i) in indicators"
      :key="i"
      class="accordion-item"
      :class="{ active: activeIndex === i }"
    >
      <button class="accordion-trigger" @click="$emit('select', i)">
        <span class="accordion-marker"></span>
        <span class="accordion-title">{{ item.title }}</span>
        <span class="accordion-arrow"></span>
      </button>
      <div class="accordion-panel" :class="{ open: activeIndex === i }">
        <div class="accordion-content">
          <div v-for="(m, j) in item.metrics" :key="j" class="metric-row">
            <div class="metric-header">
              <span class="metric-label">{{ m.label }}</span>
              <span class="metric-value">{{ m.value }}</span>
            </div>
            <div class="metric-bar">
              <div
                class="metric-fill"
                :style="{ width: activeIndex === i ? m.pct + '%' : '0', background: m.color }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  indicators: { type: Array, default: () => [] },
  activeIndex: { type: Number, default: -1 },
})
defineEmits(['select'])
</script>

<style scoped>
.accordion {
  border: 1px solid rgba(255,255,255,0.06); border-top: none;
  border-radius: 0 0 8px 8px; overflow: hidden;
  flex: 1; overflow-y: auto;
}
.accordion-item { border-bottom: 1px solid rgba(255,255,255,0.04); }
.accordion-trigger {
  width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 14px 20px; background: rgba(255,255,255,0.02);
  border: none; cursor: pointer; color: rgba(255,255,255,0.7);
  font-size: 14px; transition: 0.2s;
}
.accordion-trigger:hover { background: rgba(255,255,255,0.04); }
.accordion-item.active .accordion-trigger { background: rgba(0,229,255,0.08); color: #00e5ff; }
.accordion-marker {
  width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.2);
  transition: 0.2s;
}
.accordion-item.active .accordion-marker { background: #00e5ff; box-shadow: 0 0 6px #00e5ff; }
.accordion-title { flex: 1; text-align: left; }
.accordion-arrow {
  width: 6px; height: 6px; border-right: 1.5px solid rgba(255,255,255,0.3);
  border-bottom: 1.5px solid rgba(255,255,255,0.3);
  transform: rotate(45deg); transition: 0.3s;
}
.accordion-item.active .accordion-arrow { transform: rotate(-135deg); }
.accordion-panel { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
.accordion-panel.open { max-height: 600px; }
.accordion-content { padding: 12px 20px 16px; }
.metric-row { margin-bottom: 10px; }
.metric-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
.metric-label { color: rgba(255,255,255,0.5); font-size: 12px; }
.metric-value { color: rgba(255,255,255,0.8); font-size: 12px; font-family: monospace; }
.metric-bar {
  height: 3px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden;
}
.metric-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
</style>
