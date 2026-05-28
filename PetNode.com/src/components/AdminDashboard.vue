<template>
  <div class="admin-overlay">
    <button class="close-btn" @click="$emit('close')">
      <span></span><span></span>
    </button>
    <div class="dashboard">
      <div class="panel-left">
        <MapPanel :heat-spots="currentHeatSpots" :heat-color="currentHeatColor" />
        <BriefingPanel :html="currentBriefing" />
      </div>
      <div class="panel-right">
        <div class="console-header">
          <span class="console-icon">◇</span>
          <h3>数据指标面板</h3>
          <span class="console-status">{{ statusText }}</span>
        </div>
        <MetricsAccordion
          :indicators="indicators"
          :active-index="activeAccordionIndex"
          @select="onAccordionSelect"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { isLoggedIn, getStats } from '../api.js'
import MapPanel from './MapPanel.vue'
import BriefingPanel from './BriefingPanel.vue'
import MetricsAccordion from './MetricsAccordion.vue'

defineEmits(['close'])

const indicators = ref(fallbackIndicators)
const activeAccordionIndex = ref(-1)
const statusText = ref('系统就绪')
let refreshTimer = null

const currentHeatSpots = computed(() => {
  const i = activeAccordionIndex.value
  return i >= 0 && indicators.value[i] ? indicators.value[i].heatSpots : []
})
const currentHeatColor = computed(() => {
  const i = activeAccordionIndex.value
  return i >= 0 && indicators.value[i] ? indicators.value[i].heatColor : '#00c8ff'
})
const currentBriefing = computed(() => {
  const i = activeAccordionIndex.value
  return i >= 0 && indicators.value[i]
    ? indicators.value[i].briefing
    : '请选择右侧数据指标以查看详细分析简报。'
})

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

const fallbackIndicators = [
  {
    title: '设备活跃概况', heatColor: '#00c8ff',
    briefing: '请先登录管理员账号以获取实时数据。',
    metrics: [
      { label: '活跃设备', value: '--', pct: 0, color: '#00c8ff' },
      { label: '近期记录', value: '--', pct: 0, color: '#00e5ff' },
      { label: '活跃事件', value: '--', pct: 0, color: '#ff9100' },
    ],
    heatSpots: [{ x: 40, y: 30, r: 70 }, { x: 50, y: 48, r: 65 }, { x: 35, y: 55, r: 60 }]
  }
]

function buildIndicatorsFromStats(stats) {
  const avg = stats.averages || {}
  const hrDist = stats.heart_rate_distribution || {}
  const behDist = stats.behavior_distribution || {}
  const behHr = stats.behavior_avg_hr || {}
  const sampleCount = stats.sample_count || 0

  const pct = (n, total) => total > 0 ? Math.round(n / total * 100) : 0

  return [
    {
      title: '设备活跃概况', heatColor: '#00c8ff',
      briefing: `当前共有 <em>${stats.active_devices || 0} 台</em>活跃设备在线，最近采集了 <em>${stats.total_recent_records || 0} 条</em>遥测数据。`,
      metrics: [
        { label: '活跃设备数', value: `${stats.active_devices || 0} 台`, pct: Math.min((stats.active_devices || 0) * 5, 100), color: '#00c8ff' },
        { label: '近期记录数', value: `${stats.total_recent_records || 0} 条`, pct: Math.min((stats.total_recent_records || 0) / 2, 100), color: '#00e5ff' },
        { label: '活跃事件数', value: `${stats.active_events || 0} 个`, pct: Math.min((stats.active_events || 0) * 20, 100), color: '#ff9100' },
      ],
      heatSpots: [{ x: 40, y: 30, r: 80 }, { x: 50, y: 48, r: 70 }, { x: 35, y: 55, r: 65 }, { x: 50, y: 15, r: 55 }]
    },
    {
      title: '心率健康分布', heatColor: '#ff3b5c',
      briefing: `基于最近 <em>${sampleCount} 条</em>采样数据：正常（60-140）<em>${pct(hrDist.normal_60_140, sampleCount)}%</em>，心动过速 <em>${hrDist.tachycardia_over_140 || 0} 条</em>，偏低 <em>${hrDist.low_under_60 || 0} 条</em>。`,
      metrics: [
        { label: '正常 (60-140 bpm)', value: `${hrDist.normal_60_140 || 0} 条 (${pct(hrDist.normal_60_140, sampleCount)}%)`, pct: pct(hrDist.normal_60_140, sampleCount), color: '#00e676' },
        { label: '心动过速 (>140)', value: `${hrDist.tachycardia_over_140 || 0} 条`, pct: pct(hrDist.tachycardia_over_140, sampleCount), color: '#ff9100' },
        { label: '心率偏低 (<60)', value: `${hrDist.low_under_60 || 0} 条`, pct: pct(hrDist.low_under_60, sampleCount), color: '#ffc400' },
        { label: '临界异常', value: `${hrDist.critical || 0} 条`, pct: pct(hrDist.critical, sampleCount), color: '#ff3b5c' },
      ],
      heatSpots: [{ x: 40, y: 30, r: 75 }, { x: 50, y: 48, r: 65 }, { x: 28, y: 40, r: 85 }, { x: 55, y: 50, r: 50 }, { x: 35, y: 55, r: 55 }]
    },
    {
      title: '行为状态分布', heatColor: '#ff9100',
      briefing: `睡眠 <em>${behDist.sleeping || 0} 条</em>（${behHr.sleeping ? behHr.sleeping.avg_hr : '--'} bpm），休息 <em>${behDist.resting || 0} 条</em>，行走 <em>${behDist.walking || 0} 条</em>，奔跑 <em>${behDist.running || 0} 条</em>。`,
      metrics: [
        { label: '睡眠中', value: `${behDist.sleeping || 0} 条`, pct: pct(behDist.sleeping, sampleCount), color: '#7c4dff' },
        { label: '休息中', value: `${behDist.resting || 0} 条`, pct: pct(behDist.resting, sampleCount), color: '#448aff' },
        { label: '行走中', value: `${behDist.walking || 0} 条`, pct: pct(behDist.walking, sampleCount), color: '#00e5ff' },
        { label: '奔跑中', value: `${behDist.running || 0} 条`, pct: pct(behDist.running, sampleCount), color: '#ff9100' },
      ],
      heatSpots: [{ x: 42, y: 28, r: 85 }, { x: 50, y: 15, r: 75 }, { x: 28, y: 40, r: 65 }, { x: 35, y: 55, r: 60 }, { x: 55, y: 50, r: 55 }]
    },
    {
      title: '综合生理指标', heatColor: '#00e676',
      briefing: `心率 <em>${avg.heart_rate_bpm || '--'} bpm</em>，呼吸 <em>${avg.resp_rate_bpm || '--'} 次/分</em>，体温 <em>${avg.temperature_c || '--'} °C</em>，步数 <em>${avg.steps || '--'} 步</em>。`,
      metrics: [
        { label: '平均心率', value: `${avg.heart_rate_bpm || '--'} bpm`, pct: (avg.heart_rate_bpm || 0) / 2.5, color: '#ff5252' },
        { label: '平均呼吸率', value: `${avg.resp_rate_bpm || '--'} 次/分`, pct: (avg.resp_rate_bpm || 0) * 1.25, color: '#448aff' },
        { label: '平均体温', value: `${avg.temperature_c || '--'} °C`, pct: ((avg.temperature_c || 36) - 35) * 20, color: '#ff9100' },
        { label: '平均步数', value: `${avg.steps || '--'} 步`, pct: Math.min((avg.steps || 0) * 2, 100), color: '#00e676' },
      ],
      heatSpots: [{ x: 35, y: 55, r: 80 }, { x: 28, y: 40, r: 75 }, { x: 50, y: 48, r: 60 }, { x: 40, y: 30, r: 55 }]
    },
    {
      title: '设备实时列表', heatColor: '#b450ff',
      briefing: `当前在线设备：<br><code>${((stats.device_ids || []).slice(0, 10).join(', ') || '暂无')}</code>`,
      metrics: (stats.device_ids || []).slice(0, 10).map((did, i) => ({
        label: `设备 ${i + 1}`, value: did, pct: 60 + i * 3, color: '#b450ff'
      })),
      heatSpots: (stats.device_ids || []).slice(0, 7).map((_, i) => {
        const rng = mulberry32(i * 73 + 17)
        return { x: 20 + rng() * 55, y: 15 + rng() * 60, r: 40 + rng() * 40 }
      })
    }
  ]
}

async function refreshDashboard() {
  statusText.value = '正在获取实时数据...'
  try {
    const stats = await getStats()
    indicators.value = buildIndicatorsFromStats(stats)
    activeAccordionIndex.value = -1
    statusText.value = '实时数据 · ' + new Date().toLocaleTimeString()
  } catch (err) {
    statusText.value = '数据获取失败: ' + (err.message || '网络错误')
  }
}

function onAccordionSelect(index) {
  if (activeAccordionIndex.value === index) {
    activeAccordionIndex.value = -1
  } else {
    activeAccordionIndex.value = index
  }
}

onMounted(() => {
  if (isLoggedIn()) {
    refreshDashboard()
    refreshTimer = setInterval(refreshDashboard, 30000)
  } else {
    statusText.value = '未登录 · 显示示例数据'
  }
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.admin-overlay {
  position: fixed; inset: 0; background: #080d15; z-index: 999;
  display: flex; flex-direction: column; overflow: hidden;
}
.close-btn {
  position: absolute; top: 24px; right: 24px; width: 32px; height: 32px;
  background: none; border: none; cursor: pointer; z-index: 1000;
}
.close-btn span {
  position: absolute; top: 50%; left: 0; width: 100%; height: 2px;
  background: rgba(255,255,255,0.5);
}
.close-btn span:first-child { transform: rotate(45deg); }
.close-btn span:last-child { transform: rotate(-45deg); }
.close-btn:hover span { background: #00e5ff; }

.dashboard { display: flex; flex: 1; height: 100%; padding: 20px; gap: 20px; }
.panel-left { flex: 2; display: flex; flex-direction: column; gap: 20px; }
.panel-right { flex: 1; display: flex; flex-direction: column; min-width: 360px; }
.console-header {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px; background: rgba(255,255,255,0.03);
  border-radius: 8px 8px 0 0; border: 1px solid rgba(255,255,255,0.06);
  color: #fff;
}
.console-icon { color: #00e5ff; }
.console-header h3 { font-size: 16px; font-weight: 600; flex: 1; }
.console-status { font-size: 12px; color: rgba(255,255,255,0.4); }
</style>
