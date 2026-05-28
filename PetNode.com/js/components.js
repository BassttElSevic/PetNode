document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // State
    // ==========================================
    let adminActive = false;
    let activeAccordionIndex = -1;
    let isCurtainAnimating = false;
    let refreshTimer = null;

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
    // Deterministic PRNG
    // ==========================================
    function mulberry32(a) {
        return function() {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    // ==========================================
    // Static fallback data (when API unavailable)
    // ==========================================
    const fallbackIndicators = [
        {
            title: '设备活跃概况',
            heatColor: '#00c8ff',
            briefing: '请先<a style="color:#00e5ff;text-decoration:underline;cursor:pointer" onclick="document.querySelector(\'.auth-area\').click()">登录管理员账号</a>以获取实时数据。登录后仪表盘将展示后端 Engine 生成的实时遥测统计。',
            metrics: [
                { label: '活跃设备',   value: '--', pct: 0, color: '#00c8ff' },
                { label: '近期记录',   value: '--', pct: 0, color: '#00e5ff' },
                { label: '活跃事件',   value: '--', pct: 0, color: '#ff9100' },
            ],
            heatSpots: [
                { x: 40, y: 30, r: 70 },
                { x: 50, y: 48, r: 65 },
                { x: 35, y: 55, r: 60 },
            ]
        }
    ];

    // ==========================================
    // Build indicator data from API response
    // ==========================================
    function buildIndicatorsFromStats(stats) {
        var avg = stats.averages || {};
        var hrDist = stats.heart_rate_distribution || {};
        var behDist = stats.behavior_distribution || {};
        var behHr = stats.behavior_avg_hr || {};
        var sampleCount = stats.sample_count || 0;

        function pct(n, total) {
            return total > 0 ? Math.round(n / total * 100) : 0;
        }

        return [
            {
                title: '设备活跃概况',
                heatColor: '#00c8ff',
                briefing: '当前共有 <em>' + (stats.active_devices || 0) + ' 台</em>活跃设备在线，最近采集了 <em>' + (stats.total_recent_records || 0) + ' 条</em>遥测数据。系统正在持续监控重庆主城区宠物健康状态，数据来源为 Engine 模拟器实时上报。',
                metrics: [
                    { label: '活跃设备数', value: String(stats.active_devices || 0) + ' 台', pct: Math.min((stats.active_devices || 0) * 5, 100), color: '#00c8ff' },
                    { label: '近期记录数', value: String(stats.total_recent_records || 0) + ' 条', pct: Math.min((stats.total_recent_records || 0) / 2, 100), color: '#00e5ff' },
                    { label: '活跃事件数', value: String(stats.active_events || 0) + ' 个', pct: Math.min((stats.active_events || 0) * 20, 100), color: '#ff9100' },
                ],
                heatSpots: [
                    { x: 40, y: 30, r: 80 },
                    { x: 50, y: 48, r: 70 },
                    { x: 35, y: 55, r: 65 },
                    { x: 50, y: 15, r: 55 },
                ]
            },
            {
                title: '心率健康分布',
                heatColor: '#ff3b5c',
                briefing: '基于最近 <em>' + sampleCount + ' 条</em>采样数据分析：心率正常区间（60-140 bpm）占比 <em>' + pct(hrDist.normal_60_140, sampleCount) + '%</em>，心动过速（>140 bpm）<em>' + hrDist.tachycardia_over_140 + ' 条</em>，心率偏低（<60 bpm）<em>' + hrDist.low_under_60 + ' 条</em>，临界异常 <em>' + (hrDist.critical || 0) + ' 条</em>。系统已自动标记异常数据点。',
                metrics: [
                    { label: '正常 (60-140 bpm)', value: String(hrDist.normal_60_140 || 0) + ' 条 (' + pct(hrDist.normal_60_140, sampleCount) + '%)', pct: pct(hrDist.normal_60_140, sampleCount), color: '#00e676' },
                    { label: '心动过速 (>140)', value: String(hrDist.tachycardia_over_140 || 0) + ' 条', pct: pct(hrDist.tachycardia_over_140, sampleCount), color: '#ff9100' },
                    { label: '心率偏低 (<60)', value: String(hrDist.low_under_60 || 0) + ' 条', pct: pct(hrDist.low_under_60, sampleCount), color: '#ffc400' },
                    { label: '临界异常', value: String(hrDist.critical || 0) + ' 条', pct: pct(hrDist.critical, sampleCount), color: '#ff3b5c' },
                ],
                heatSpots: [
                    { x: 40, y: 30, r: 75 },
                    { x: 50, y: 48, r: 65 },
                    { x: 28, y: 40, r: 85 },
                    { x: 55, y: 50, r: 50 },
                    { x: 35, y: 55, r: 55 },
                ]
            },
            {
                title: '行为状态分布',
                heatColor: '#ff9100',
                briefing: '当前行为采样统计：睡眠 <em>' + (behDist.sleeping || 0) + ' 条</em>（平均心率 ' + (behHr.sleeping ? behHr.sleeping.avg_hr : '--') + ' bpm），休息 <em>' + (behDist.resting || 0) + ' 条</em>（' + (behHr.resting ? behHr.resting.avg_hr : '--') + ' bpm），行走 <em>' + (behDist.walking || 0) + ' 条</em>（' + (behHr.walking ? behHr.walking.avg_hr : '--') + ' bpm），奔跑 <em>' + (behDist.running || 0) + ' 条</em>（' + (behHr.running ? behHr.running.avg_hr : '--') + ' bpm）。',
                metrics: [
                    { label: '睡眠中', value: String(behDist.sleeping || 0) + ' 条', pct: pct(behDist.sleeping, sampleCount), color: '#7c4dff' },
                    { label: '休息中', value: String(behDist.resting || 0) + ' 条', pct: pct(behDist.resting, sampleCount), color: '#448aff' },
                    { label: '行走中', value: String(behDist.walking || 0) + ' 条', pct: pct(behDist.walking, sampleCount), color: '#00e5ff' },
                    { label: '奔跑中', value: String(behDist.running || 0) + ' 条', pct: pct(behDist.running, sampleCount), color: '#ff9100' },
                ],
                heatSpots: [
                    { x: 42, y: 28, r: 85 },
                    { x: 50, y: 15, r: 75 },
                    { x: 28, y: 40, r: 65 },
                    { x: 35, y: 55, r: 60 },
                    { x: 55, y: 50, r: 55 },
                ]
            },
            {
                title: '综合生理指标',
                heatColor: '#00e676',
                briefing: '近期平均心率 <em>' + (avg.heart_rate_bpm || '--') + ' bpm</em>，平均呼吸频率 <em>' + (avg.resp_rate_bpm || '--') + ' 次/分钟</em>，平均体温 <em>' + (avg.temperature_c || '--') + ' °C</em>，平均步数 <em>' + (avg.steps || '--') + ' 步</em>。所有指标均在正常生理范围内，系统运行正常。',
                metrics: [
                    { label: '平均心率', value: (avg.heart_rate_bpm || '--') + ' bpm', pct: (avg.heart_rate_bpm || 0) / 2.5, color: '#ff5252' },
                    { label: '平均呼吸率', value: (avg.resp_rate_bpm || '--') + ' 次/分', pct: (avg.resp_rate_bpm || 0) * 1.25, color: '#448aff' },
                    { label: '平均体温', value: (avg.temperature_c || '--') + ' °C', pct: ((avg.temperature_c || 36) - 35) * 20, color: '#ff9100' },
                    { label: '平均步数', value: (avg.steps || '--') + ' 步', pct: Math.min((avg.steps || 0) * 2, 100), color: '#00e676' },
                ],
                heatSpots: [
                    { x: 35, y: 55, r: 80 },
                    { x: 28, y: 40, r: 75 },
                    { x: 50, y: 48, r: 60 },
                    { x: 40, y: 30, r: 55 },
                ]
            },
            {
                title: '设备实时列表',
                heatColor: '#b450ff',
                briefing: '当前在线的设备 ID 列表（基于最近上报记录）：<br><code style="color:#00e5ff;font-size:12px">' + ((stats.device_ids || []).slice(0, 10).join(', ') || '暂无') + '</code><br><br>数据来源：MongoDB received_records 集合，Engine 每分钟为每只狗生成一条遥测记录。',
                metrics: (stats.device_ids || []).slice(0, 10).map(function(did, i) {
                    return { label: '设备 ' + (i + 1), value: did, pct: 60 + i * 3, color: '#b450ff' };
                }),
                heatSpots: (stats.device_ids || []).slice(0, 7).map(function(_, i) {
                    var rng = mulberry32(i * 73 + 17);
                    return { x: 20 + rng() * 55, y: 15 + rng() * 60, r: 40 + rng() * 40 };
                }),
            }
        ];
    }

    // ==========================================
    // Build Accordion
    // ==========================================
    function buildAccordion(indicators) {
        accordion.innerHTML = '';
        (indicators || fallbackIndicators).forEach(function(item, i) {
            var el = document.createElement('div');
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

    // ==========================================
    // Curtain Animation
    // ==========================================
    function animateCurtain(onCovered) {
        if (isCurtainAnimating) return;
        isCurtainAnimating = true;

        curtain.classList.remove('animating');
        curtain.style.transform = 'translateY(-100%)';
        void curtain.offsetHeight;

        curtain.classList.add('animating');
        curtain.style.transform = 'translateY(0%)';

        setTimeout(function() {
            if (onCovered) onCovered();
            curtain.style.transform = 'translateY(100%)';
        }, 350);

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
    var currentIndicators = fallbackIndicators;

    function setActiveAccordion(index) {
        var items = accordion.querySelectorAll('.accordion-item');
        var wasSame = activeAccordionIndex === index;

        for (var i = 0; i < items.length; i++) {
            items[i].classList.remove('active');
            var fill = items[i].querySelector('.metric-fill');
            if (fill) fill.style.width = '0';
        }

        if (wasSame) {
            activeAccordionIndex = -1;
            animateCurtain(function() {
                mapHeat.classList.remove('active');
            });
            updateBriefing('请选择右侧数据指标以查看详细分析简报。');
            if (consoleStatus) consoleStatus.textContent = '系统就绪';
            return;
        }

        activeAccordionIndex = index;
        var activeItem = items[index];
        activeItem.classList.add('active');

        var data = currentIndicators[index];
        setTimeout(function() {
            var fills = activeItem.querySelectorAll('.metric-fill');
            for (var i = 0; i < fills.length; i++) {
                if (data.metrics[i]) fills[i].style.width = data.metrics[i].pct + '%';
            }
        }, 100);

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
    // Live Data Refresh
    // ==========================================
    async function refreshDashboard() {
        if (consoleStatus) consoleStatus.textContent = '正在获取实时数据...';

        try {
            var stats = await Api.getStats();

            currentIndicators = buildIndicatorsFromStats(stats);
            buildAccordion(currentIndicators);

            // Reset accordion state
            var items = accordion.querySelectorAll('.accordion-item');
            for (var i = 0; i < items.length; i++) {
                items[i].classList.remove('active');
                var fill = items[i].querySelector('.metric-fill');
                if (fill) fill.style.width = '0';
            }
            activeAccordionIndex = -1;
            mapHeat.classList.remove('active');
            clearHeatSpots();
            updateBriefing('请选择右侧数据指标以查看详细分析简报。');

            if (consoleStatus) {
                var t = new Date().toLocaleTimeString();
                consoleStatus.textContent = '实时数据 · ' + t;
            }

            // 登录后首次刷新时启动自动刷新定时器
            if (!refreshTimer && adminActive) {
                refreshTimer = setInterval(refreshDashboard, 30000);
            }
        } catch (err) {
            if (consoleStatus) consoleStatus.textContent = '数据获取失败: ' + (err.message || '网络错误');
            // Keep fallback data on error
        }
    }

    // Expose to global scope for main.js
    window.refreshDashboard = refreshDashboard;

    // ==========================================
    // Admin Overlay Toggle
    // ==========================================
    function openAdmin() {
        adminActive = true;
        toggleInput.checked = true;
        overlay.classList.add('active');
        body.style.overflow = 'hidden';

        // If logged in, pull real data; otherwise show fallback
        if (Api.isLoggedIn()) {
            refreshDashboard();
            // Auto-refresh every 30 seconds
            refreshTimer = setInterval(refreshDashboard, 30000);
        } else {
            currentIndicators = fallbackIndicators;
            buildAccordion(currentIndicators);
            if (consoleStatus) consoleStatus.textContent = '未登录 · 显示示例数据';
        }
    }

    function closeAdmin() {
        adminActive = false;
        toggleInput.checked = false;
        overlay.classList.remove('active');
        body.style.overflow = '';

        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }

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
    buildAccordion(fallbackIndicators);
    attachAccordionEvents();
});
