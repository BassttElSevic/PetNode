<template>
  <section id="section-products" class="page-section product-section">
    <div class="product-container">
      <h2 class="section-title">寻找最适合的 PetNode 终端</h2>
      <div class="product-grid">
        <div v-for="p in products" :key="p.name" class="product-card">
          <img :src="p.image" class="product-img" :alt="p.name">
          <div class="product-info">
            <div class="card-title-top">{{ p.name }}</div>
            <h3 class="card-tag">{{ p.tag }}</h3>
            <ul class="card-features">
              <li v-for="f in p.features" :key="f">{{ f }}</li>
            </ul>
            <div class="card-actions">
              <el-button type="warning" round size="large">立即购买</el-button>
              <el-button link type="primary">了解更多</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const products = [
  {
    name: 'PetNode Max', tag: 'FOR MED/LARGE DOGS', image: '/assets/images/gear-large.png',
    features: ['一体化硬核抗冲外壳', '马尔可夫链自适应健康洞察算法', '超长 3 个月强劲续航时间']
  },
  {
    name: 'PetNode Core', tag: 'FOR STANDARD ADVENTURERS', image: '/assets/images/gear-medium.png',
    features: ['流线型日常全天候舒适结构', '高动态睡眠周期与行为拆解', '支持长达 2 个月强劲续航']
  },
  {
    name: 'PetNode Slim', tag: 'FOR LITTLE LEGENDS', image: '/assets/images/gear-small.png',
    features: ['无感无负担超轻量化设计', '全天候精准生命体征数据追踪', '多重省电模式长效陪伴']
  }
]
</script>

<style scoped>
.product-section {
  min-height: 100vh; background: linear-gradient(180deg, #080c12 0%, #111820 60%, #080c12 100%);
  display: flex; align-items: center; justify-content: center; padding: 80px 40px;
}
.product-container { max-width: 1200px; width: 100%; }
.section-title { color: #fff; font-size: 32px; font-weight: 700; text-align: center; margin-bottom: 60px; }
.product-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
.product-card {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px; overflow: hidden; transition: transform 0.3s, border-color 0.3s;
}
.product-card:hover { transform: translateY(-8px); border-color: rgba(0,229,255,0.3); }
.product-img { width: 100%; height: 240px; object-fit: contain; padding: 30px; background: rgba(0,0,0,0.2); }
.product-info { padding: 24px; }
.card-title-top { color: rgba(255,255,255,0.4); font-size: 13px; margin-bottom: 6px; }
.card-tag { color: #fff; font-size: 14px; font-weight: 600; letter-spacing: 2px; margin-bottom: 16px; }
.card-features { list-style: none; margin-bottom: 20px; }
.card-features li {
  color: rgba(255,255,255,0.65); font-size: 13px; padding: 4px 0;
  position: relative; padding-left: 14px;
}
.card-features li::before { content: '•'; color: #00e5ff; position: absolute; left: 0; }
.card-actions { display: flex; gap: 12px; align-items: center; }
</style>
