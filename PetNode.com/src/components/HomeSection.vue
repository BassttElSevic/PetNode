<template>
  <section id="section-index" class="page-section video-section">
    <video class="bg-video" autoplay loop muted playsinline>
      <source src="/assets/media/home_video.mp4" type="video/mp4">
    </video>
    <div class="video-overlay"></div>
  </section>
</template>

<style scoped>
.video-section {
  position: relative; width: 100%; height: 100vh; overflow: hidden; background: #000;
}
.bg-video {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1;
}
.video-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.3); z-index: 2;
}
</style>
