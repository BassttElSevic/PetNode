document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // State
    // ==========================================
    let adminActive = false;
    let activeAccordionIndex = -1;
    let isCurtainAnimating = false;

    // ==========================================
    // DOM References
    // ==========================================
    const overlay        = document.getElementById('admin-overlay');
    const toggleInput    = document.getElementById('admin-toggle-input');
    const closeBtn       = document.getElementById('admin-close-btn');
    const curtain        = document.getElementById('map-curtain');
    const mapHeat        = document.getElementById('map-heat');
    const briefingBody   = document.getElementById('briefing-body');
    const briefingTextEl = briefingBody ? briefingBody.querySelector('.briefing-text') : null;
    const accordion      = document.getElementById('accordion');
    const consoleStatus  = document.getElementById('console-status');
    const body           = document.body;

    // ==========================================
    // Data
    // ==========================================
    const indicatorData = [
        {
            title: '狗狗项圈型号分布情况',
            heatColor: '#00c8ff',
            briefing: '根据重庆市各区域宠物佩戴数据分析，PetNode Max 型号在渝北、江北等大型犬集中区域占比最高，达到 <em>42%</em>；PetNode Core 作为全能型号在各区域分布均匀，占比 <em>35%</em>；轻量化的 PetNode Slim 主要集中于渝中半岛等小型犬偏好区域，占比 <em>23%</em>。整体来看，重庆主城区项圈覆盖率已达 87.3%，处于全国领先水平。',
            metrics: [
                { label: 'PetNode Max',   value: '42%', pct: 42, color: '#00c8ff' },
                { label: 'PetNode Core',  value: '35%', pct: 35, color: '#00e5ff' },
                { label: 'PetNode Slim',  value: '23%', pct: 23, color: '#80f0ff' }
            ],
            heatSpots: [
                { x: 50, y: 15, r: 90 },  // 渝北
                { x: 40, y: 30, r: 85 },  // 江北
                { x: 50, y: 48, r: 70 },  // 渝中
                { x: 35, y: 55, r: 60 },  // 九龙坡
                { x: 28, y: 40, r: 55 },  // 沙坪坝
                { x: 55, y: 50, r: 50 },  // 南岸
                { x: 25, y: 75, r: 45 },  // 巴南
            ]
        },
        {
            title: '狗狗心跳健康情况分布情况',
            heatColor: '#ff3b5c',
            briefing: '实时心率监测数据显示，当前在线设备中 <em>94.2%</em> 的犬只心率处于正常区间（60–140 bpm），<em>3.1%</em> 存在偶发性心动过速，<em>1.8%</em> 表现为静息心率偏低。沙坪坝区域报告了 5 例心率异常预警，建议关注该区域宠物的运动强度管理。系统已自动推送健康提醒至相关饲主。',
            metrics: [
                { label: '心率正常 (60-140)',  value: '94.2%', pct: 94, color: '#00e676' },
                { label: '偶发心动过速',        value: '3.1%',  pct: 31, color: '#ff9100' },
                { label: '静息心率偏低',        value: '1.8%',  pct: 18, color: '#ffc400' },
                { label: '异常预警',            value: '0.9%',  pct: 9,  color: '#ff3b5c' }
            ],
            heatSpots: [
                { x: 28, y: 40, r: 95 },  // 沙坪坝 - 异常预警集中
                { x: 50, y: 48, r: 65 },  // 渝中
                { x: 40, y: 30, r: 55 },  // 江北
                { x: 50, y: 15, r: 50 },  // 渝北
                { x: 35, y: 55, r: 60 },  // 九龙坡
                { x: 25, y: 75, r: 50 },  // 巴南
                { x: 55, y: 50, r: 45 },  // 南岸
            ]
        },
        {
            title: '狗狗运动量指数情况',
            heatColor: '#ff9100',
            briefing: '本周运动量统计表明，江北区与渝北区犬只日均运动时长分别为 <em>72 分钟</em> 和 <em>68 分钟</em>，高于全市均值 55 分钟。渝中区因居住密度较高，日均运动时长仅 <em>38 分钟</em>，提示该区域宠物可能存在运动不足风险。系统建议渝中区饲主增加每日遛狗频次。',
            metrics: [
                { label: '高活跃 (>90min)',  value: '28%',  pct: 28, color: '#ff9100' },
                { label: '正常 (45-90min)',  value: '47%',  pct: 47, color: '#00e5ff' },
                { label: '偏低 (20-45min)',  value: '18%',  pct: 18, color: '#ffc400' },
                { label: '严重不足 (<20min)', value: '7%',   pct: 7,  color: '#ff5252' }
            ],
            heatSpots: [
                { x: 42, y: 28, r: 95 },  // 江北 - 高活跃
                { x: 50, y: 15, r: 85 },  // 渝北 - 高活跃
                { x: 50, y: 48, r: 55 },  // 渝中 - 偏低
                { x: 28, y: 40, r: 50 },  // 沙坪坝
                { x: 55, y: 50, r: 55 },  // 南岸
                { x: 35, y: 55, r: 60 },  // 九龙坡
                { x: 25, y: 75, r: 50 },  // 巴南
            ]
        },
        {
            title: '狗狗瘙痒动作频繁分布情况',
            heatColor: '#00e676',
            briefing: '通过项圈内置加速度传感器与 AI 行为识别模型分析，近 7 日瘙痒动作频率较上月上升 <em>12.7%</em>。其中南岸区与巴南区增幅最为显著（<em>+18.3%</em>），可能与近期气温回升及花粉浓度升高有关。系统已标记 23 台设备为"高频瘙痒"，建议相关饲主关注皮肤健康及寄生虫防护。',
            metrics: [
                { label: '低频 (<2次/时)',   value: '62%',  pct: 62, color: '#00e676' },
                { label: '正常 (2-5次/时)',  value: '24%',  pct: 24, color: '#00e5ff' },
                { label: '高频 (5-10次/时)', value: '11%',  pct: 11, color: '#ff9100' },
                { label: '持续高频 (>10次)',  value: '3%',   pct: 3,  color: '#ff3b5c' }
            ],
            heatSpots: [
                { x: 60, y: 55, r: 95 },  // 南岸 - 高频
                { x: 30, y: 78, r: 85 },  // 巴南 - 高频
                { x: 50, y: 48, r: 55 },  // 渝中
                { x: 40, y: 30, r: 50 },  // 江北
                { x: 35, y: 55, r: 60 },  // 九龙坡
                { x: 20, y: 65, r: 48 },  // 大渡口
                { x: 28, y: 40, r: 45 },  // 沙坪坝
            ]
        },
        {
            title: '狗狗睡眠质量区域分布情况',
            heatColor: '#b450ff',
            briefing: '基于夜间体动与心率变异性（HRV）综合评估，全市犬只睡眠质量评分为 <em>78.6/100</em>。九龙坡区与沙坪坝区得分最高（<em>84.2</em>），渝中区得分较低（<em>71.5</em>），可能与夜间环境噪音相关。深度睡眠时长平均为 5.2 小时，占整体睡眠的 42%。',
            metrics: [
                { label: '优秀 (>8h)',    value: '32%',  pct: 32, color: '#b450ff' },
                { label: '良好 (6-8h)',   value: '41%',  pct: 41, color: '#7c4dff' },
                { label: '一般 (4-6h)',   value: '19%',  pct: 19, color: '#448aff' },
                { label: '不足 (<4h)',    value: '8%',   pct: 8,  color: '#ff5252' }
            ],
            heatSpots: [
                { x: 35, y: 55, r: 92 },  // 九龙坡 - 优秀
                { x: 28, y: 40, r: 85 },  // 沙坪坝 - 优秀
                { x: 50, y: 48, r: 60 },  // 渝中 - 较低分
                { x: 40, y: 30, r: 55 },  // 江北
                { x: 50, y: 15, r: 50 },  // 渝北
                { x: 55, y: 50, r: 55 },  // 南岸
                { x: 25, y: 75, r: 50 },  // 巴南
            ]
        }
    ];

    // ==========================================
    // Build Accordion
    // ==========================================
    function buildAccordion() {
        accordion.innerHTML = '';
        indicatorData.forEach((item, i) => {
            const el = document.createElement('div');
            el.className = 'accordion-item';
            el.innerHTML = [
                '<button class="accordion-trigger" data-index="' + i + '">',
                    '<span class="accordion-marker"></span>',
                    '<span class="accordion-title">' + item.title + '</span>',
                    '<span class="accordion-arrow"></span>',
                '</button>',
                '<div class="accordion-panel">',
                    '<div class="accordion-content">',
                        item.metrics.map(function(m) {
                            return [
                                '<div class="metric-row">',
                                    '<div class="metric-header">',
                                        '<span class="metric-label">' + m.label + '</span>',
                                        '<span class="metric-value">' + m.value + '</span>',
                                    '</div>',
                                    '<div class="metric-bar">',
                                        '<div class="metric-fill" style="background:' + m.color + ';width:0"></div>',
                                    '</div>',
                                '</div>'
                            ].join('');
                        }).join(''),
                    '</div>',
                '</div>'
            ].join('');
            accordion.appendChild(el);
        });
    }

    // ==========================================
    // Heat Spots
    // ==========================================
    function clearHeatSpots() {
        var spots = mapHeat.querySelectorAll('.heat-spot, .heat-dot');
        for (var i = 0; i < spots.length; i++) {
            spots[i].remove();
        }
    }

    function renderHeatSpots(spots, color) {
        clearHeatSpots();
        spots.forEach(function(s) {
            var spot = document.createElement('div');
            spot.className = 'heat-spot';
            spot.style.left = s.x + '%';
            spot.style.top = s.y + '%';
            spot.style.width = s.r + 'px';
            spot.style.height = s.r + 'px';
            spot.style.marginLeft = -(s.r / 2) + 'px';
            spot.style.marginTop = -(s.r / 2) + 'px';
            spot.style.background = 'radial-gradient(circle, ' + color + ' 0%, transparent 70%)';
            mapHeat.appendChild(spot);
        });

        // Scatter density dots
        var seed = activeAccordionIndex * 137 + 42;
        var rng = mulberry32(seed);
        for (var i = 0; i < 50; i++) {
            var x = 15 + rng() * 70;
            var y = 15 + rng() * 70;
            var dot = document.createElement('div');
            dot.className = 'heat-dot';
            dot.style.left = x + '%';
            dot.style.top = y + '%';
            dot.style.background = color;
            dot.style.boxShadow = '0 0 4px ' + color;
            dot.style.transitionDelay = (rng() * 0.3).toFixed(2) + 's';
            mapHeat.appendChild(dot);
        }
    }

    // Deterministic PRNG
    function mulberry32(a) {
        return function() {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    // ==========================================
    // Curtain Animation
    // ==========================================
    function animateCurtain(onCovered) {
        if (isCurtainAnimating) return;
        isCurtainAnimating = true;

        // Reset curtain above viewport
        curtain.classList.remove('animating');
        curtain.style.transform = 'translateY(-100%)';
        // Force reflow
        void curtain.offsetHeight;

        // Phase 1: pull down to cover
        curtain.classList.add('animating');
        curtain.style.transform = 'translateY(0%)';

        // Phase 2: at 350ms, swap and pull through
        setTimeout(function() {
            if (onCovered) onCovered();
            curtain.style.transform = 'translateY(100%)';
        }, 350);

        // Phase 3: reset
        setTimeout(function() {
            curtain.classList.remove('animating');
            curtain.style.transform = 'translateY(-100%)';
            isCurtainAnimating = false;
        }, 750);
    }

    // ==========================================
    // Briefing Fade
    // ==========================================
    function updateBriefing(html) {
        if (!briefingTextEl) return;
        briefingTextEl.classList.add('fading');
        setTimeout(function() {
            briefingTextEl.innerHTML = html;
            briefingTextEl.classList.remove('fading');
        }, 260);
    }

    // ==========================================
    // Accordion Interaction
    // ==========================================
    function setActiveAccordion(index) {
        var items = accordion.querySelectorAll('.accordion-item');
        var wasSame = activeAccordionIndex === index;

        // Collapse all
        for (var i = 0; i < items.length; i++) {
            items[i].classList.remove('active');
            var fill = items[i].querySelector('.metric-fill');
            if (fill) fill.style.width = '0';
        }

        if (wasSame) {
            // Toggle off
            activeAccordionIndex = -1;
            animateCurtain(function() {
                mapHeat.classList.remove('active');
            });
            updateBriefing('请选择右侧数据指标以查看详细分析简报。');
            if (consoleStatus) consoleStatus.textContent = '系统就绪';
            return;
        }

        // Expand new item
        activeAccordionIndex = index;
        var activeItem = items[index];
        activeItem.classList.add('active');

        // Animate metric bars
        var data = indicatorData[index];
        setTimeout(function() {
            var fills = activeItem.querySelectorAll('.metric-fill');
            for (var i = 0; i < fills.length; i++) {
                if (data.metrics[i]) fills[i].style.width = data.metrics[i].pct + '%';
            }
        }, 100);

        // Curtain + heatmap + briefing
        animateCurtain(function() {
            renderHeatSpots(data.heatSpots, data.heatColor);
            mapHeat.classList.add('active');
        });

        updateBriefing(data.briefing);
        if (consoleStatus) consoleStatus.textContent = '指标: ' + data.title;
    }

    function attachAccordionEvents() {
        accordion.addEventListener('click', function(e) {
            var trigger = e.target.closest('.accordion-trigger');
            if (!trigger) return;
            var index = parseInt(trigger.getAttribute('data-index'), 10);
            setActiveAccordion(index);
        });
    }

    // ==========================================
    // Admin Overlay Toggle
    // ==========================================
    function openAdmin() {
        adminActive = true;
        toggleInput.checked = true;
        overlay.classList.add('active');
        body.style.overflow = 'hidden';
    }

    function closeAdmin() {
        adminActive = false;
        toggleInput.checked = false;
        overlay.classList.remove('active');
        body.style.overflow = '';

        // Reset all accordion state
        var items = accordion.querySelectorAll('.accordion-item');
        for (var i = 0; i < items.length; i++) {
            items[i].classList.remove('active');
            var fill = items[i].querySelector('.metric-fill');
            if (fill) fill.style.width = '0';
        }
        activeAccordionIndex = -1;
        mapHeat.classList.remove('active');
        if (consoleStatus) consoleStatus.textContent = '系统就绪';
        if (briefingTextEl) briefingTextEl.textContent = '请选择右侧数据指标以查看详细分析简报。';
        clearHeatSpots();
    }

    toggleInput.addEventListener('change', function() {
        if (toggleInput.checked) {
            openAdmin();
        } else {
            closeAdmin();
        }
    });

    closeBtn.addEventListener('click', closeAdmin);

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && adminActive) {
            closeAdmin();
        }
    });

    // ==========================================
    // Init
    // ==========================================
    buildAccordion();
    attachAccordionEvents();
});
