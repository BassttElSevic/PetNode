document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 🌟 1. 基础导航：点击平滑跳转
    // ==========================================
    const navItems = document.querySelectorAll('.nav-menu .nav-item');
    const sections = document.querySelectorAll('.page-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if(item.getAttribute('href').startsWith('#')) {
                e.preventDefault(); 
                const targetId = item.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });

    // ==========================================
    // 🌟 2. 全局滚动：监听当前页面位置并高亮左侧导航
    // ==========================================
    const observerOptions = {
        root: null,
        rootMargin: '-40% 0px -40% 0px', 
        threshold: 0
    };

    const sidebarObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const currentId = `#${entry.target.getAttribute('id')}`;
                navItems.forEach(item => {
                    item.classList.remove('active');
                    if (item.getAttribute('href') === currentId) {
                        item.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => sidebarObserver.observe(section));


    // ==========================================
    // 🌟 3. 探索页：全新二倍速播放与视口重置逻辑 (已纠正括号)
    // ==========================================
    const exploreVideo = document.getElementById('explore-video');
    const exploreSection = document.getElementById('section-explore');

    if (exploreVideo && exploreSection) {
        
        // 1. 强行设定视频为 2 倍速播放
        exploreVideo.playbackRate = 2.0;

        // 2. 监听视频播放完毕，强制定格在最后一帧
        exploreVideo.addEventListener('ended', () => {
            exploreVideo.pause();
        });

        // 3. 观察探索页板块是否进入视野
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // 情况 A：只要用户能看到视频（不管是刚滑进来还是在看），且没播完，就播放
                    if (exploreVideo.currentTime < exploreVideo.duration) {
                        exploreVideo.play();
                    }
                } else {
                    // 情况 B：视频完全离开了视野，判断用户是向上滚了还是向下滚了
                    // boundingClientRect.top > 0 说明整个探索页掉到了屏幕下方 (即用户往上滑回了产品页或首页)
                    if (entry.boundingClientRect.top > 0) {
                        exploreVideo.pause();
                        exploreVideo.currentTime = 0; // 核心要求：在上方看不到时彻底重置进度
                    } else {
                        // 如果用户一路向下滚，探索页跑到了屏幕上方，保持暂停在最后一帧即可
                        exploreVideo.pause();
                    }
                }
            });
        }, {
            threshold: 0.1 // 只要页面露出 10% 面积就开始触发逻辑
        });

        // 激活探索页视频观察器
        videoObserver.observe(exploreSection);
    }
}); // 🌟 整个文件的最外层大括号完美闭合

// ==========================================
// 🌟 4. 登录弹窗逻辑
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const authArea        = document.querySelector('.auth-area');
    const loginOverlay    = document.getElementById('login-overlay');
    const loginCloseBtn   = document.getElementById('login-close-btn');
    const viewUser        = document.getElementById('login-view-user');
    const viewAdmin       = document.getElementById('login-view-admin');
    const adminTrigger    = document.getElementById('login-admin-trigger');
    const backUser        = document.getElementById('login-back-user');
    const codeBtn         = document.getElementById('login-code-btn');
    const userBtn         = document.getElementById('login-user-btn');
    const passwordLink    = document.getElementById('login-password-link');
    const adminBtn        = document.getElementById('login-admin-btn');
    const adminUserInput  = document.getElementById('admin-username');
    const adminPassInput  = document.getElementById('admin-password');
    const userAvatarImg   = document.querySelector('.avatar-img');
    const userActionText  = document.querySelector('.user-action-text');

    // ── Feedback helpers ──

    function showMsg(btn, text, type) {
        // Remove any existing msg
        var old = btn.parentNode.querySelector('.login-msg');
        if (old) old.remove();
        var el = document.createElement('span');
        el.className = 'login-msg login-msg-' + type;
        el.textContent = text;
        btn.parentNode.insertBefore(el, btn.nextSibling);
    }

    function clearMsg(btn) {
        var old = btn.parentNode.querySelector('.login-msg');
        if (old) old.remove();
    }

    function setBtnLoading(btn, loading) {
        if (loading) {
            btn.disabled = true;
            btn.classList.add('btn-loading');
            btn.dataset.origText = btn.textContent;
            btn.textContent = '登录中...';
        } else {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
            if (btn.dataset.origText) {
                btn.textContent = btn.dataset.origText;
            }
        }
    }

    // ── Sidebar status update ──

    function updateSidebar(username) {
        if (userActionText) userActionText.textContent = username;
        if (userAvatarImg) {
            userAvatarImg.style.border = '2px solid #07c160';
            userAvatarImg.style.borderRadius = '50%';
        }
        authArea.style.cursor = 'default';
        // Remove click-to-login behavior when already logged in
        authArea.style.pointerEvents = 'auto';
    }

    function openModal() {
        // If already logged in as admin, show admin panel directly
        if (localStorage.getItem('petnode_admin_token')) {
            return;
        }
        loginOverlay.classList.remove('login-overlay-hidden');
        viewUser.style.display = 'block';
        viewAdmin.style.display = 'none';
        if (adminUserInput) adminUserInput.value = '';
        if (adminPassInput) adminPassInput.value = '';
        if (adminBtn) {
            adminBtn.classList.remove('btn-success');
            setBtnLoading(adminBtn, false);
            clearMsg(adminBtn);
        }
    }

    function closeModal() {
        loginOverlay.classList.add('login-overlay-hidden');
    }

    function showBlockedAlert() {
        alert('非常抱歉，暂时没有开放用户的网页登陆与注册');
    }

    // ── Auth area click ──

    if (authArea) {
        authArea.addEventListener('click', function() {
            // If already logged in, toggle admin panel via the switch
            if (localStorage.getItem('petnode_admin_token')) {
                // Don't open login modal when already logged in
                return;
            }
            openModal();
        });
    }

    if (loginCloseBtn) {
        loginCloseBtn.addEventListener('click', closeModal);
    }

    if (loginOverlay) {
        loginOverlay.addEventListener('click', (e) => {
            if (e.target === loginOverlay) closeModal();
        });
    }

    // User login - all actions show blocked alert
    if (codeBtn)     codeBtn.addEventListener('click', showBlockedAlert);
    if (userBtn)     userBtn.addEventListener('click', showBlockedAlert);
    if (passwordLink) passwordLink.addEventListener('click', showBlockedAlert);

    // Switch to admin view
    if (adminTrigger) {
        adminTrigger.addEventListener('click', () => {
            viewUser.style.display = 'none';
            viewAdmin.style.display = 'block';
            if (adminUserInput) adminUserInput.focus();
        });
    }

    // Switch back to user view
    if (backUser) {
        backUser.addEventListener('click', () => {
            viewUser.style.display = 'block';
            viewAdmin.style.display = 'none';
        });
    }

    // ── Admin login ──

    if (adminBtn) {
        adminBtn.addEventListener('click', function() {
            var u = adminUserInput ? adminUserInput.value.trim() : '';
            var p = adminPassInput ? adminPassInput.value.trim() : '';

            if (!u) {
                showMsg(adminBtn, '请输入用户名', 'error');
                if (adminUserInput) adminUserInput.focus();
                return;
            }
            if (!p) {
                showMsg(adminBtn, '请输入密码', 'error');
                if (adminPassInput) adminPassInput.focus();
                return;
            }

            clearMsg(adminBtn);
            setBtnLoading(adminBtn, true);

            fetch('http://127.0.0.1:5000/api/v1/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
            }).then(function(res) {
                return res.json().then(function(data) {
                    return { ok: res.ok, status: res.status, data: data };
                });
            }).then(function(result) {
                if (result.data.code === 0 && result.data.data && result.data.data.access_token) {
                    localStorage.setItem('petnode_admin_token', result.data.data.access_token);

                    // Success feedback
                    adminBtn.classList.add('btn-success');
                    adminBtn.textContent = '登录成功';
                    showMsg(adminBtn, '正在进入管理面板...', 'success');

                    // Update sidebar
                    updateSidebar(u);

                    // Close modal after brief delay
                    setTimeout(function() {
                        closeModal();
                        adminBtn.classList.remove('btn-success');
                        adminBtn.textContent = '管理员登录';
                        clearMsg(adminBtn);
                    }, 800);

                    // Trigger admin mode activation
                    setTimeout(function() {
                        document.body.classList.add('admin-mode-active');
                    }, 400);
                } else {
                    var msg = result.data.message || '用户名或密码错误';
                    showMsg(adminBtn, msg, 'error');
                    setBtnLoading(adminBtn, false);
                }
            }).catch(function(err) {
                showMsg(adminBtn, '无法连接服务器，请确认后端已启动', 'error');
                setBtnLoading(adminBtn, false);
            });
        });

        // Clear error msg on input
        if (adminUserInput) {
            adminUserInput.addEventListener('input', function() { clearMsg(adminBtn); });
        }
        if (adminPassInput) {
            adminPassInput.addEventListener('input', function() { clearMsg(adminBtn); });
            adminPassInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') adminBtn.click();
            });
        }
    }

    // ── Restore sidebar on page load if already logged in ──
    (function restoreLoginState() {
        if (localStorage.getItem('petnode_admin_token')) {
            updateSidebar('管理员');
            document.body.classList.add('admin-mode-active');
        }
    })();
});