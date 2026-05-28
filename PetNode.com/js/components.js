document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // State
    // ==========================================
    let adminActive = false;
    let activeAccordionIndex = -1;
    let isCurtainAnimating = false;
    let indicatorData = [];
    let realtimeDevices = [];

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
    // GPS → Map coordinate conversion
    // ==========================================
    function gpsToMapPercent(lat, lng) {
        const x = ((lng - 106.3) / 0.6) * 95.83 + 2.5;
        const y = ((29.7 - lat) / 0.4) * 97 + 1;
        return {
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y))
        };
    }

    function generateDeviceHeatSpots(devices) {
        if (!devices || devices.length === 0) return [];
        return devices
            .filter(function(d) { return d.gps_lat && d.gps_lng; })
            .map(function(d) {
                var pos = gpsToMapPercent(d.gps_lat, d.gps_lng);
                return { x: pos.x, y: pos.y, r: 55 };
            });
    }

    // ==========================================
    // Build indicators from API data
    // ==========================================
    function buildIndicatorData(stats, devices) {
        var indicators = [];
        var total = stats.sample_count || 1;

        // ── Indicator 1: 心率健康分布 ──
        var hrDist = stats.heart_rate_distribution || {};
        var hrTotal = hrDist.normal_60_140 + hrDist.tachycardia_over_140 + hrDist.low_under_60 + hrDist.critical || 1;
        var hrNormalPct  = Math.round(hrDist.normal_60_140 / hrTotal * 100);
        var hrTachyPct   = Math.round(hrDist.tachycardia_over_140 / hrTotal * 100);
        var hrLowPct     = Math.round(hrDist.low_under_60 / hrTotal * 100);
        var hrCritPct    = Math.round(hrDist.critical / hrTotal * 100);

        var hrBriefing = '实时心率监测显示，当前在线设备中 <em>' + hrNormalPct + '%</em> 的犬只心率处于正常区间（60–140 bpm），';
        hrBriefing += '<em>' + hrTachyPct + '%</em> 存在偶发性心动过速，';
        hrBriefing += '<em>' + hrLowPct + '%</em> 表现为静息心率偏低。';
        if (hrCritPct > 0) {
            hrBriefing += '系统已标记 <em>' + hrDist.critical + '</em> 例异常心率预警，建议及时关注。';
        }
        hrBriefing += ' 数据基于最近 ' + stats.sample_count + ' 条上报记录。';

        indicators.push({
            title: '狗狗心率健康分布',
            heatColor: '#ff3b5c',
            briefing: hrBriefing,
            metrics: [
                { label: '正常 (60-140 bpm)', value: hrNormalPct + '%',  pct: hrNormalPct, color: '#00e676' },
                { label: '心动过速 (>140)',   value: hrTachyPct + '%',   pct: hrTachyPct,  color: '#ff9100' },
                { label: '心率偏低 (<60)',    value: hrLowPct + '%',     pct: hrLowPct,    color: '#ffc400' },
                { label: '异常预警',          value: hrCritPct + '%',    pct: Math.max(hrCritPct, 10), color: '#ff3b5c' }
            ],
            heatSpots: generateDeviceHeatSpots(devices)
        });

        // ── Indicator 2: 行为状态分布 ──
        var behDist = stats.behavior_distribution || {};
        var behTotal = (behDist.sleeping || 0) + (behDist.resting || 0) + (behDist.walking || 0) + (behDist.running || 0) || 1;
        var sleepPct  = Math.round((behDist.sleeping || 0) / behTotal * 100);
        var restPct   = Math.round((behDist.resting || 0) / behTotal * 100);
        var walkPct   = Math.round((behDist.walking || 0) / behTotal * 100);
        var runPct    = Math.round((behDist.running || 0) / behTotal * 100);

        var activePct = walkPct + runPct;
        var behBriefing = '行为监测统计表明，当前犬只处于活跃状态（行走+奔跑）的比例为 <em>' + activePct + '%</em>，';
        behBriefing += '休息/睡眠占比 <em>' + (sleepPct + restPct) + '%</em>。';
        if (activePct < 20) {
            behBriefing += '活跃度偏低，提示部分宠物可能存在运动不足。';
        } else if (activePct > 50) {
            behBriefing += '活跃度较高，显示宠物运动状态良好。';
        }
        behBriefing += ' 基于最近 ' + stats.sample_count + ' 条记录统计。';

        indicators.push({
            title: '狗狗行为状态分布',
            heatColor: '#ff9100',
            briefing: behBriefing,
            metrics: [
                { label: '睡眠 (sleeping)', value: sleepPct + '%', pct: sleepPct, color: '#7c4dff' },
                { label: '休息 (resting)',  value: restPct + '%',  pct: restPct,  color: '#448aff' },
                { label: '行走 (walking)',  value: walkPct + '%',  pct: walkPct,  color: '#00e5ff' },
                { label: '奔跑 (running)',  value: runPct + '%',   pct: runPct,   color: '#ff9100' }
            ],
            heatSpots: generateDeviceHeatSpots(devices)
        });

        // ── Indicator 3: 各行为平均心率 ──
        var behAvgHr = stats.behavior_avg_hr || {};
        var behHrMetrics = [];
        var behNames = { sleeping: '睡眠时', resting: '休息时', walking: '行走时', running: '奔跑时' };
        var behColors = { sleeping: '#7c4dff', resting: '#448aff', walking: '#00e5ff', running: '#ff9100' };

        var maxHr = 60;
        for (var b in behAvgHr) {
            if (behAvgHr[b].avg_hr > maxHr) maxHr = behAvgHr[b].avg_hr;
        }
        if (maxHr < 60) maxHr = 60;

        for (var key in behAvgHr) {
            var item = behAvgHr[key];
            var pctVal = Math.round(item.avg_hr / maxHr * 100);
            behHrMetrics.push({
                label: behNames[key] || key,
                value: item.avg_hr + ' bpm',
                pct: pctVal,
                color: behColors[key] || '#00e5ff'
            });
        }

        var behHrBriefing = '不同行为状态下的平均心率对比：';
        for (var k in behAvgHr) {
            behHrBriefing += (behNames[k] || k) + '平均心率 <em>' + behAvgHr[k].avg_hr + ' bpm</em>（' + behAvgHr[k].count + ' 条记录）；';
        }
        behHrBriefing += '此数据可用于评估宠物在不同活动强度下的心肺功能表现。';

        indicators.push({
            title: '各行为状态平均心率',
            heatColor: '#00e5ff',
            briefing: behHrBriefing,
            metrics: behHrMetrics,
            heatSpots: generateDeviceHeatSpots(devices)
        });

        // ── Indicator 4: 实时设备总览 ──
        var avg = stats.averages || {};
        var devCount = devices ? devices.length : (stats.active_devices || 0);

        var overviewBriefing = '当前共有 <em>' + devCount + '</em> 台活跃设备在线，';
        overviewBriefing += '最近 ' + stats.sample_count + ' 条数据显示：';
        overviewBriefing += '平均心率 <em>' + (avg.heart_rate_bpm || '--') + ' bpm</em>，';
        overviewBriefing += '平均呼吸率 <em>' + (avg.resp_rate_bpm || '--') + ' 次/分钟</em>，';
        overviewBriefing += '平均体温 <em>' + (avg.temperature_c || '--') + '°C</em>，';
        overviewBriefing += '平均步数 <em>' + (avg.steps || '--') + ' 步</em>。';
        if (stats.active_events > 0) {
            overviewBriefing += '当前有 <em>' + stats.active_events + '</em> 个活跃事件需要关注。';
        } else {
            overviewBriefing += '当前无活跃异常事件。';
        }

        var devMetrics = [
            { label: '活跃设备数', value: devCount + ' 台', pct: Math.min(devCount * 10, 100), color: '#00c8ff' },
            { label: '平均心率',   value: (avg.heart_rate_bpm || '--') + ' bpm', pct: Math.round((avg.heart_rate_bpm || 60) / 200 * 100), color: '#ff3b5c' },
            { label: '平均呼吸率', value: (avg.resp_rate_bpm || '--') + ' 次/分', pct: Math.round((avg.resp_rate_bpm || 15) / 40 * 100), color: '#00e676' },
            { label: '平均体温',   value: (avg.temperature_c || '--') + '°C', pct: Math.round((avg.temperature_c || 38) / 42 * 100), color: '#ff9100' }
        ];

        indicators.push({
            title: '实时设备运行总览',
            heatColor: '#00c8ff',
            briefing: overviewBriefing,
            metrics: devMetrics,
            heatSpots: generateDeviceHeatSpots(devices)
        });

        return indicators;
    }

    // ==========================================
    // Build Accordion
    // ==========================================
    function buildAccordion() {
        accordion.innerHTML = '';
        indicatorData.forEach(function(item, i) {
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
        if (!spots || spots.length === 0) return;

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

        var data = indicatorData[index];
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
    // Admin Overlay Toggle
    // ==========================================
    function openAdmin() {
        adminActive = true;
        toggleInput.checked = true;
        overlay.classList.add('active');
        body.style.overflow = 'hidden';

        if (consoleStatus) consoleStatus.textContent = '正在加载数据...';

        Promise.all([
            Api.getStats().catch(function() { return null; }),
            Api.getDevicesRealtime().catch(function() { return null; })
        ]).then(function(results) {
            var stats = results[0];
            var devicesResp = results[1];

            if (!stats) {
                if (consoleStatus) consoleStatus.textContent = '数据加载失败，请检查后端服务';
                updateBriefing('无法连接到后端服务器，请确认后端已启动。<br>默认地址：' + Api.BASE_URL);
                return;
            }

            realtimeDevices = (devicesResp && devicesResp.devices) ? devicesResp.devices : [];
            indicatorData = buildIndicatorData(stats, realtimeDevices);
            buildAccordion();
            attachAccordionEvents();
            activeAccordionIndex = -1;

            if (consoleStatus) {
                consoleStatus.textContent = '系统就绪 · ' + (stats.active_devices || 0) + ' 台设备在线';
            }
            updateBriefing('数据加载成功。请选择右侧数据指标以查看详细分析简报。');
        }).catch(function(err) {
            if (consoleStatus) consoleStatus.textContent = '数据加载失败: ' + (err.message || '未知错误');
            updateBriefing('数据加载失败: ' + (err.message || '未知错误'));
        });
    }

    function closeAdmin() {
        adminActive = false;
        toggleInput.checked = false;
        overlay.classList.remove('active');
        body.style.overflow = '';

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

    // Admin toggle — always check token at toggle time
    toggleInput.addEventListener('change', function() {
        if (toggleInput.checked) {
            if (!Api.isLoggedIn()) {
                alert('请先登录管理员账号');
                toggleInput.checked = false;
                return;
            }
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
    // Accordion built on-demand when admin opens with real API data.
    // If already logged in, user can toggle admin switch to load data.
});
