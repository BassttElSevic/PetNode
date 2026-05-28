<template>
  <div class="map-area">
    <div class="map-header">
      <div class="map-header-left">
        <span class="map-live-badge"><i class="pulse-dot"></i>LIVE</span>
        <span class="map-title">重庆市 · 实时监测视图</span>
      </div>
      <div class="map-header-right">
        <span class="map-coords">29.4316° N  /  106.9123° E</span>
      </div>
    </div>
    <div class="map-viewport" ref="viewport">
      <!-- SVG Base Map -->
      <svg viewBox="0 0 600 500" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" class="map-base">
        <defs>
          <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,180,220,0.05)" stroke-width="0.5"/>
          </pattern>
          <radialGradient id="cityGlow" cx="50%" cy="45%" r="35%">
            <stop offset="0%" stop-color="rgba(0,200,255,0.08)"/>
            <stop offset="100%" stop-color="transparent"/>
          </radialGradient>
          <filter id="riverGlowSA">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <!-- Background -->
        <rect width="600" height="500" fill="#080d15"/>
        <rect width="600" height="500" fill="url(#mapGrid)"/>
        <rect width="600" height="500" fill="url(#cityGlow)"/>

        <!-- Contour Lines -->
        <g fill="none" stroke="rgba(0,190,220,0.07)" stroke-width="0.6">
          <path d="M 30,120 C 50,100 80,85 110,90 C 140,95 155,80 170,70 C 185,58 200,65 195,85"/>
          <path d="M 25,135 C 50,112 85,95 115,100 C 148,105 165,88 182,78 C 197,65 215,70 210,95"/>
          <path d="M 20,148 C 55,125 90,108 120,112 C 155,118 175,100 192,90"/>
          <path d="M 380,280 C 410,260 440,250 470,255 C 500,260 530,248 555,240 C 575,232 590,240 580,258"/>
          <path d="M 370,295 C 405,272 440,260 472,265 C 505,270 538,256 562,248"/>
          <path d="M 180,30 C 200,15 230,10 255,18 C 280,28 295,15 315,10"/>
          <path d="M 80,340 C 110,320 140,315 160,325 C 185,336 200,320 220,310"/>
        </g>

        <!-- Districts -->
        <g stroke="rgba(255,255,255,0.15)" stroke-width="1.2" stroke-linejoin="round">
          <path d="M 30,5 L 540,5 L 500,115 L 460,140 L 370,135 L 340,155 L 315,215 L 290,232 L 265,208 L 235,158 L 160,100 L 80,68 Z" fill="rgba(255,179,71,0.12)"/>
          <path d="M 80,68 L 160,100 L 235,158 L 265,208 L 290,232 L 320,232 L 350,200 L 380,155 L 430,130 L 460,140 L 500,115 L 540,5 L 560,5 L 560,195 L 450,200 L 370,240 L 320,240 Z" fill="rgba(78,205,196,0.13)"/>
          <path d="M 15,50 L 130,40 L 210,135 L 248,195 L 265,208 L 290,232 L 300,240 L 195,278 L 50,305 L 15,245 Z" fill="rgba(162,130,255,0.14)"/>
          <path d="M 265,205 L 312,195 L 328,215 L 332,235 L 320,258 L 300,268 L 278,272 L 258,260 L 248,242 L 250,225 Z" fill="rgba(255,107,107,0.18)"/>
          <path d="M 300,240 L 320,240 L 370,238 L 448,200 L 530,190 L 570,188 L 590,195 L 590,310 L 555,460 L 310,410 L 292,340 Z" fill="rgba(100,143,255,0.12)"/>
          <path d="M 300,240 L 195,278 L 50,305 L 25,410 L 140,450 L 295,390 L 310,345 Z" fill="rgba(255,158,87,0.12)"/>
          <path d="M 50,305 L 25,410 L 10,450 L 5,490 L 115,485 L 145,450 L 140,410 L 130,365 Z" fill="rgba(135,211,124,0.13)"/>
          <path d="M 25,410 L 140,450 L 295,390 L 460,435 L 555,460 L 590,500 L 5,500 L 5,490 L 10,450 Z" fill="rgba(236,155,173,0.1)"/>
        </g>

        <!-- Rivers -->
        <g fill="none" stroke-linecap="round" stroke-linejoin="round">
          <g stroke="#0a3858" stroke-width="12" opacity="0.5">
            <path d="M 160,0 C 190,90 230,165 300,240"/>
            <path d="M -5,345 C 95,308 200,270 300,240"/>
            <path d="M 300,240 C 410,205 520,185 610,175"/>
          </g>
          <g stroke="#0b4a6e" stroke-width="7" filter="url(#riverGlowSA)">
            <path d="M 160,0 C 190,90 230,165 300,240"/>
            <path d="M -5,345 C 95,308 200,270 300,240"/>
            <path d="M 300,240 C 410,205 520,185 610,175"/>
          </g>
        </g>

        <!-- Confluence marker -->
        <circle cx="300" cy="240" r="4" fill="none" stroke="rgba(0,229,255,0.5)" stroke-width="1.5"/>
        <circle cx="300" cy="240" r="1.5" fill="rgba(0,229,255,0.7)"/>

        <!-- Labels -->
        <g fill="rgba(255,255,255,0.45)" font-size="10" font-family="sans-serif" text-anchor="middle" letter-spacing="1.5">
          <text x="420" y="70">渝北区</text>
          <text x="200" y="155">江北区</text>
          <text x="95" y="170">沙坪坝区</text>
          <text x="295" y="243">渝中区</text>
          <text x="450" y="280">南岸区</text>
          <text x="170" y="368">九龙坡区</text>
          <text x="75" y="430">大渡口区</text>
          <text x="280" y="460">巴南区</text>
        </g>
        <g fill="rgba(0,200,255,0.3)" font-size="8" letter-spacing="2">
          <text x="185" y="115" transform="rotate(-55,185,115)">嘉 陵 江</text>
          <text x="380" y="215" transform="rotate(-18,380,215)">长 江</text>
          <text x="160" y="305" transform="rotate(25,160,305)">长 江</text>
        </g>

        <!-- Compass -->
        <g transform="translate(545,15)" fill="rgba(255,255,255,0.3)" font-size="7" text-anchor="middle">
          <text x="0" y="0">N</text>
          <line x1="0" y1="3" x2="0" y2="12" stroke="rgba(255,255,255,0.25)" stroke-width="0.8"/>
          <polygon points="0,12 -3,8 0,5 3,8" fill="rgba(255,255,255,0.3)"/>
        </g>
      </svg>

      <!-- Heat Layer -->
      <div class="heat-layer" v-show="heatSpots.length > 0">
        <div
          v-for="(s, i) in heatSpots"
          :key="'spot-' + i"
          class="heat-spot"
          :style="{
            left: s.x + '%', top: s.y + '%',
            width: s.r + 'px', height: s.r + 'px',
            marginLeft: -(s.r / 2) + 'px', marginTop: -(s.r / 2) + 'px',
            background: 'radial-gradient(circle, ' + heatColor + ' 0%, transparent 70%)'
          }"
        ></div>
        <div
          v-for="(_, i) in 50"
          :key="'dot-' + i"
          class="heat-dot"
          :style="{ left: dotPositions[i].x + '%', top: dotPositions[i].y + '%', background: heatColor, boxShadow: '0 0 4px ' + heatColor }"
        ></div>
      </div>
      <div class="map-crosshair"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  heatSpots: { type: Array, default: () => [] },
  heatColor: { type: String, default: '#00c8ff' },
})

const dotPositions = computed(() => {
  return Array.from({ length: 50 }, () => ({
    x: 15 + Math.random() * 70,
    y: 15 + Math.random() * 70,
  }))
})
</script>

<style scoped>
.map-area { border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; }
.map-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 20px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.06);
}
.map-live-badge { color: #ff3b5c; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
.pulse-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #ff3b5c;
  display: inline-block; animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.map-title { color: rgba(255,255,255,0.7); margin-left: 12px; font-size: 14px; }
.map-coords { color: rgba(255,255,255,0.3); font-size: 12px; font-family: monospace; }

.map-viewport {
  position: relative; width: 100%; aspect-ratio: 6/5;
  background: #080d15; overflow: hidden;
}
.map-base { position: absolute; inset: 0; width: 100%; height: 100%; }
.heat-layer { position: absolute; inset: 0; }
.heat-spot { position: absolute; border-radius: 50%; pointer-events: none; animation: fadeInBar 0.5s ease-out; }
.heat-dot {
  position: absolute; width: 3px; height: 3px; border-radius: 50%;
  opacity: 0; pointer-events: none; animation: fadeInBar 0.5s ease-out forwards;
  transition-delay: var(--delay, 0s);
}
.map-crosshair {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.2) 70%);
}
@keyframes fadeInBar { from { opacity: 0; } to { opacity: 0.8; } }
</style>
