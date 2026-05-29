document.addEventListener('DOMContentLoaded', () => {

    var adminActive = false;
    var devices = [];
    var stats = null;
    var deviceDetails = {};
    var openDevice = null;
    var openSection = 'devices'; // 'overview' | 'devices'
    var refreshTimer = null;
    var REFRESH = 5000;

    var overlay       = document.getElementById('admin-overlay');
    var toggleInput   = document.getElementById('admin-toggle-input');
    var closeBtn      = document.getElementById('admin-close-btn');
    var accordion     = document.getElementById('accordion');
    var consoleStatus = document.getElementById('console-status');
    var briefingBody  = document.getElementById('briefing-body');
    var briefingTextEl = briefingBody ? briefingBody.querySelector('.briefing-text') : null;
    var mapHeat       = document.getElementById('map-heat');
    var body          = document.body;

    function gpsToMap(lat, lng) {
        return {
            x: ((lng - 106.3) / 0.6) * 95.83 + 2.5,
            y: ((29.7 - lat) / 0.4) * 97 + 1
        };
    }

    function renderHeatMap() {
        if (!mapHeat) return;
        mapHeat.querySelectorAll('.heat-spot, .heat-dot').forEach(function(el) { el.remove(); });
        devices.forEach(function(d) {
            if (!d.gps_lat || !d.gps_lng) return;
            var pos = gpsToMap(d.gps_lat, d.gps_lng);
            var color = hrClr(d.heart_rate);
            var spot = document.createElement('div');
            spot.className = 'heat-spot';
            spot.style.left = pos.x + '%';
            spot.style.top = pos.y + '%';
            spot.style.width = '55px';
            spot.style.height = '55px';
            spot.style.marginLeft = '-27px';
            spot.style.marginTop = '-27px';
            spot.style.background = 'radial-gradient(circle, ' + color + ' 0%, transparent 70%)';
            mapHeat.appendChild(spot);
        });
        for (var i = 0; i < 40; i++) {
            var dot = document.createElement('div');
            dot.className = 'heat-dot';
            dot.style.left = (15 + Math.random() * 70) + '%';
            dot.style.top = (15 + Math.random() * 70) + '%';
            dot.style.background = '#00e5ff';
            dot.style.boxShadow = '0 0 4px #00e5ff';
            mapHeat.appendChild(dot);
        }
    }

    function fmtTime(ts) {
        if (!ts) return '--';
        return ts.replace('T', ' ').substring(11, 19);
    }
    function bLabel(b) {
        var m = { sleeping: '睡眠', resting: '休息', walking: '行走', running: '奔跑' };
        return m[b] || b || '--';
    }
    function bEmoji(b) {
        var m = { sleeping: '😴', resting: '🛌', walking: '🚶', running: '🏃' };
        return m[b] || '🐕';
    }
    function hrClr(hr) {
        if (!hr) return '#888';
        if (hr > 140) return '#ff3b5c';
        if (hr < 60) return '#ff9100';
        return '#00e676';
    }

    function apiFetch(path) {
        var h = { 'Content-Type': 'application/json' };
        var t = localStorage.getItem('petnode_admin_token');
        if (t) h['Authorization'] = 'Bearer ' + t;
        return fetch('http://127.0.0.1:5000' + path, { headers: h })
            .then(function(r) { return r.json(); })
            .then(function(d) { return d.code === 0 ? d.data : Promise.reject(new Error(d.message)); });
    }

    // ── Render ──
    function render() {
        if (!accordion) return;
        var h = '';

        // ── Section switcher ──
        h += '<div class="section-tabs">';
        h += '<button class="section-tab' + (openSection === 'overview' ? ' active' : '') + '" data-section="overview">📊 总览</button>';
        h += '<button class="section-tab' + (openSection === 'devices' ? ' active' : '') + '" data-section="devices">🐕 设备 (' + devices.length + ')</button>';
        h += '</div>';

        // ── Overview section ──
        if (openSection === 'overview') {
            if (stats) {
                var hrDist = stats.heart_rate_distribution || {};
                var hrTotal = hrDist.normal_60_140 + hrDist.tachycardia_over_140 + hrDist.low_under_60 + hrDist.critical || 1;
                var behDist = stats.behavior_distribution || {};
                var behTotal = (behDist.sleeping || 0) + (behDist.resting || 0) + (behDist.walking || 0) + (behDist.running || 0) || 1;
                var avgs = stats.averages || {};
                var behAvgHr = stats.behavior_avg_hr || {};

                var indicators = [
                    {
                        title: '心率健康分布',
                        color: '#ff3b5c',
                        items: [
                            { label: '正常 (60-140)', val: hrDist.normal_60_140, pct: Math.round(hrDist.normal_60_140 / hrTotal * 100), clr: '#00e676' },
                            { label: '心动过速 (>140)', val: hrDist.tachycardia_over_140, pct: Math.round(hrDist.tachycardia_over_140 / hrTotal * 100), clr: '#ff9100' },
                            { label: '心率偏低 (<60)', val: hrDist.low_under_60, pct: Math.round(hrDist.low_under_60 / hrTotal * 100), clr: '#ffc400' },
                            { label: '异常预警', val: hrDist.critical, pct: Math.round(hrDist.critical / hrTotal * 100), clr: '#ff3b5c' }
                        ]
                    },
                    {
                        title: '行为状态分布',
                        color: '#ff9100',
                        items: [
                            { label: '睡眠', val: behDist.sleeping || 0, pct: Math.round((behDist.sleeping || 0) / behTotal * 100), clr: '#7c4dff' },
                            { label: '休息', val: behDist.resting || 0, pct: Math.round((behDist.resting || 0) / behTotal * 100), clr: '#448aff' },
                            { label: '行走', val: behDist.walking || 0, pct: Math.round((behDist.walking || 0) / behTotal * 100), clr: '#00e5ff' },
                            { label: '奔跑', val: behDist.running || 0, pct: Math.round((behDist.running || 0) / behTotal * 100), clr: '#ff9100' }
                        ]
                    }
                ];

                // Behavior avg HR
                var behNames = { sleeping: '睡眠', resting: '休息', walking: '行走', running: '奔跑' };
                var behColors = { sleeping: '#7c4dff', resting: '#448aff', walking: '#00e5ff', running: '#ff9100' };
                var behHrItems = [];
                var maxHr = 60;
                for (var k in behAvgHr) { if (behAvgHr[k].avg_hr > maxHr) maxHr = behAvgHr[k].avg_hr; }
                for (var kk in behAvgHr) {
                    behHrItems.push({
                        label: behNames[kk] || kk,
                        val: behAvgHr[kk].avg_hr.toFixed(1) + ' bpm',
                        pct: Math.round(behAvgHr[kk].avg_hr / maxHr * 100),
                        clr: behColors[kk] || '#00e5ff'
                    });
                }
                indicators.push({ title: '各行为平均心率', color: '#00e5ff', items: behHrItems });

                // Summary
                indicators.push({
                    title: '设备运行总览',
                    color: '#00c8ff',
                    items: [
                        { label: '活跃设备', val: (stats.active_devices || 0) + ' 台', pct: Math.min((stats.active_devices || 0) * 10, 100), clr: '#00c8ff' },
                        { label: '平均心率', val: (avgs.heart_rate_bpm || '--') + ' bpm', pct: Math.round((avgs.heart_rate_bpm || 60) / 200 * 100), clr: '#ff3b5c' },
                        { label: '平均呼吸', val: (avgs.resp_rate_bpm || '--') + ' 次/分', pct: Math.round((avgs.resp_rate_bpm || 15) / 40 * 100), clr: '#00e676' },
                        { label: '平均体温', val: (avgs.temperature_c || '--') + '°C', pct: Math.round((avgs.temperature_c || 38) / 42 * 100), clr: '#ff9100' }
                    ]
                });

                indicators.forEach(function(ind) {
                    h += '<div class="overview-card">';
                    h += '<div class="overview-title" style="border-left:3px solid ' + ind.color + '">' + ind.title + '</div>';
                    ind.items.forEach(function(m) {
                        h += '<div class="metric-row">';
                        h += '<div class="metric-header"><span class="metric-label">' + m.label + '</span><span class="metric-value">' + m.val + '</span></div>';
                        h += '<div class="metric-bar"><div class="metric-fill" style="background:' + m.clr + ';width:' + Math.max(m.pct, 3) + '%"></div></div>';
                        h += '</div>';
                    });
                    h += '</div>';
                });

                h += '<div class="overview-footer">样本数: ' + stats.sample_count + ' · 事件: ' + (stats.active_events || 0) + ' · ' + (stats.generated_at || '').substring(11, 19);
                h += '</div>';
            } else {
                h += '<div class="device-empty">加载总览数据中...</div>';
            }
        }

        // ── Devices section ──
        if (openSection === 'devices') {
            if (devices.length === 0) {
                h += '<div class="device-empty">暂无在线设备</div>';
            } else {
                devices.forEach(function(d, i) {
                    var hr = d.heart_rate || 0;
                    var detail = deviceDetails[d.device_id];
                    var open = openDevice === d.device_id;
                    var name = d.pet_name || ('设备 ' + d.device_id.substring(0, 8));

                    h += '<div class="device-card' + (open ? ' expanded' : '') + '">';
                    h += '<div class="device-card-header" data-device="' + d.device_id + '">';
                    h += '<div class="device-card-main">';
                    h += '<span class="device-emoji">' + bEmoji(d.behavior) + '</span>';
                    h += '<div class="device-info"><span class="device-name">' + name + '</span>';
                    h += '<span class="device-id">' + d.device_id.substring(0, 12) + '</span></div>';
                    h += '<span class="device-expand-arrow">' + (open ? '▼' : '▶') + '</span>';
                    h += '</div>';
                    h += '<div class="device-vitals">';
                    h += '<div class="vital-item"><span class="vital-value" style="color:' + hrClr(hr) + '">' + (hr || '--') + '</span><span class="vital-unit">bpm</span></div>';
                    h += '<div class="vital-item"><span class="vital-value">' + ((d.temperature || 0).toFixed ? d.temperature.toFixed(1) : (d.temperature || '--')) + '</span><span class="vital-unit">°C</span></div>';
                    h += '<div class="vital-item"><span class="vital-value">' + bLabel(d.behavior) + '</span></div>';
                    h += '<div class="vital-item"><span class="vital-value">🔋' + (d.battery || '--') + '%</span></div>';
                    h += '</div>';
                    h += '</div>';

                    if (open) {
                        if (detail && detail.latest) {
                            var l = detail.latest;
                            h += '<div class="device-detail">';
                            h += '<div class="detail-row">';
                            h += '<div class="detail-item"><span class="detail-label">心率</span><span class="detail-val" style="color:' + hrClr(l.heart_rate) + '">' + (l.heart_rate || '--') + ' bpm</span></div>';
                            h += '<div class="detail-item"><span class="detail-label">呼吸</span><span class="detail-val">' + (l.resp_rate || '--') + ' 次/分</span></div>';
                            h += '<div class="detail-item"><span class="detail-label">体温</span><span class="detail-val">' + ((l.temperature || 0).toFixed ? l.temperature.toFixed(1) : '--') + ' °C</span></div>';
                            h += '<div class="detail-item"><span class="detail-label">步数</span><span class="detail-val">' + (l.steps || '--') + '</span></div>';
                            h += '</div><div class="detail-row">';
                            h += '<div class="detail-item"><span class="detail-label">行为</span><span class="detail-val">' + bEmoji(l.behavior) + ' ' + bLabel(l.behavior) + '</span></div>';
                            h += '<div class="detail-item"><span class="detail-label">GPS</span><span class="detail-val">' + (l.gps_lat ? l.gps_lat.toFixed(4) : '--') + ', ' + (l.gps_lng ? l.gps_lng.toFixed(4) : '--') + '</span></div>';
                            h += '<div class="detail-item"><span class="detail-label">更新</span><span class="detail-val">' + fmtTime(l.timestamp) + '</span></div>';
                            h += '<div class="detail-item"><span class="detail-label">事件</span><span class="detail-val">' + (l.event ? ('⚠ ' + l.event + ' ' + l.event_phase) : '无') + '</span></div>';
                            h += '</div>';
                        } else {
                            h += '<div class="device-detail"><div class="detail-loading">加载中...</div></div>';
                        }
                    }
                    h += '</div>';
                });
            }
        }

        h += '<div class="refresh-bar"><span class="refresh-text">⏱ ' + (REFRESH / 1000) + 's 刷新</span><button class="refresh-btn" id="refresh-btn">刷新</button></div>';
        accordion.innerHTML = h;

        // Events
        accordion.querySelectorAll('.section-tab').forEach(function(b) {
            b.addEventListener('click', function() { openSection = b.dataset.section; openDevice = null; render(); });
        });
        accordion.querySelectorAll('.device-card-header').forEach(function(hdr) {
            hdr.addEventListener('click', function() {
                var did = hdr.dataset.device;
                if (openDevice === did) { openDevice = null; render(); return; }
                openDevice = did;
                if (!deviceDetails[did]) {
                    apiFetch('/api/v1/admin/devices/' + encodeURIComponent(did) + '/detail')
                        .then(function(data) { deviceDetails[did] = data; render(); })
                        .catch(function() { deviceDetails[did] = { latest: null }; render(); });
                    return;
                }
                render();
            });
        });
        var rb = document.getElementById('refresh-btn');
        if (rb) rb.addEventListener('click', loadAll);
    }

    function loadAll() {
        if (consoleStatus) consoleStatus.textContent = '刷新中...';
        var p1 = apiFetch('/api/v1/admin/stats').then(function(d) { stats = d; }).catch(function() {});
        var p2 = apiFetch('/api/v1/admin/devices/realtime').then(function(d) {
            devices = d.devices || [];
            var ids = {};
            devices.forEach(function(x) { ids[x.device_id] = true; });
            Object.keys(deviceDetails).forEach(function(k) { if (!ids[k]) delete deviceDetails[k]; });
            if (openDevice && !ids[openDevice]) openDevice = null;
        }).catch(function() {});
        Promise.all([p1, p2]).then(function() {
            if (consoleStatus) consoleStatus.textContent = '就绪 · ' + devices.length + ' 设备 · ' + (stats ? stats.sample_count : 0) + ' 样本';
            render();
            updateBriefing();
            if (mapHeat) { mapHeat.classList.remove('active'); mapHeat.querySelectorAll('.heat-spot, .heat-dot').forEach(function(el) { el.remove(); }); }
            setTimeout(function() { renderHeatMap(); if (mapHeat) mapHeat.classList.add('active'); }, 100);
        }).catch(function() {
            if (consoleStatus) consoleStatus.textContent = '连接失败';
            render();
        });
    }

    function updateBriefing() {
        if (!briefingTextEl) return;
        if (devices.length === 0) { briefingTextEl.textContent = '当前无在线设备。'; return; }
        var t = '<em>' + devices.length + '</em> 台设备在线：';
        devices.forEach(function(d, i) {
            var name = d.pet_name || ('设备' + (i + 1));
            t += '<em>' + name + '</em> (' + bLabel(d.behavior) + ', ' + (d.heart_rate || '--') + ' bpm)';
            t += i < devices.length - 1 ? '；' : '。';
        });
        briefingTextEl.classList.add('fading');
        setTimeout(function() { briefingTextEl.innerHTML = t; briefingTextEl.classList.remove('fading'); }, 260);
    }

    function openAdmin() {
        adminActive = true;
        toggleInput.checked = true;
        overlay.classList.add('active');
        body.style.overflow = 'hidden';
        loadAll();
        refreshTimer = setInterval(loadAll, REFRESH);
    }

    function closeAdmin() {
        adminActive = false;
        toggleInput.checked = false;
        overlay.classList.remove('active');
        body.style.overflow = '';
        if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
        openDevice = null; openSection = 'devices'; devices = []; stats = null; deviceDetails = {};
        if (accordion) accordion.innerHTML = '';
        if (consoleStatus) consoleStatus.textContent = '系统就绪';
        if (briefingTextEl) briefingTextEl.textContent = '请选择右侧数据指标以查看详细分析简报。';
        if (mapHeat) { mapHeat.classList.remove('active'); mapHeat.querySelectorAll('.heat-spot, .heat-dot').forEach(function(el) { el.remove(); }); }
    }

    toggleInput.addEventListener('change', function() {
        if (toggleInput.checked) {
            if (!localStorage.getItem('petnode_admin_token')) { alert('请先登录管理员账号'); toggleInput.checked = false; return; }
            openAdmin();
        } else { closeAdmin(); }
    });
    closeBtn.addEventListener('click', closeAdmin);
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && adminActive) closeAdmin(); });
});
