<template>
  <section id="section-explore" class="page-section explore-section">
    <div class="explore-container">
      <div class="explore-left">
        <h2 class="explore-title">一个 PetNode 小程序。<br>全周期的安心体验。</h2>
        <p class="explore-desc">依托高精度传感器，精准捕捉爱犬的呼吸率与睡眠周期等核心体征。实时 GPS 追踪、多设备无缝切换与家庭组数据共享，加上内置的专属宠物健康科普库——让您不仅是使用硬件，更是掌握专业的健康守护。</p>
        <el-button type="warning" round size="large">探索 PetNode 小程序</el-button>
      </div>
      <div class="explore-right">
        <video
          ref="exploreVideo" class="explore-video" muted playsinline preload="auto"
          @ended="onVideoEnded"
        >
          <source src="/assets/media/Explor_1.mp4" type="video/mp4">
        </video>
      </div>
    </div>
    <div class="explore-bottom">
      <video class="explore-video-full" loop autoplay muted playsinline preload="auto">
        <source src="/assets/media/Explor_2.mp4" type="video/mp4">
      </video>
      <video class="explore-video-full" loop autoplay muted playsinline preload="auto">
        <source src="/assets/media/Explor_3.mp4" type="video/mp4">
      </video>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const exploreVideo = ref(null)

function onVideoEnded() {
  exploreVideo.value?.pause()
}

onMounted(() => {
  const v = exploreVideo.value
  if (v) {
    v.playbackRate = 2.0
    // IntersectionObserver for play/pause logic
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (v.currentTime < v.duration) v.play()
        } else {
          v.pause()
          if (entry.boundingClientRect.top > 0) v.currentTime = 0
        }
      })
    }, { threshold: 0.1 })
    const sec = document.getElementById('section-explore')
    if (sec) obs.observe(sec)
  }
})
</script>

<style scoped>
.explore-section {
  min-height: 100vh; background: #080c12; padding: 80px 60px 40px;
}
.explore-container { display: flex; gap: 60px; align-items: center; margin-bottom: 60px; }
.explore-left { flex: 1; color: #fff; }
.explore-title { font-size: 36px; font-weight: 700; margin-bottom: 24px; line-height: 1.3; }
.explore-desc { color: rgba(255,255,255,0.6); line-height: 1.8; margin-bottom: 30px; font-size: 15px; }
.explore-right { flex: 1; }
.explore-video { width: 100%; border-radius: 16px; }
.explore-bottom { display: flex; gap: 20px; }
.explore-video-full { width: 50%; border-radius: 12px; }
</style>
