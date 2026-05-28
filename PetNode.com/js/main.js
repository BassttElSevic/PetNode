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

    function openModal() {
        loginOverlay.classList.remove('login-overlay-hidden');
        viewUser.style.display = 'block';
        viewAdmin.style.display = 'none';
        if (adminUserInput) adminUserInput.value = '';
        if (adminPassInput) adminPassInput.value = '';
    }

    function closeModal() {
        loginOverlay.classList.add('login-overlay-hidden');
    }

    function showBlockedAlert() {
        alert('非常抱歉，暂时没有开放用户的网页登陆与注册');
    }

    if (authArea) {
        authArea.addEventListener('click', openModal);
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
        });
    }

    // Switch back to user view
    if (backUser) {
        backUser.addEventListener('click', () => {
            viewUser.style.display = 'block';
            viewAdmin.style.display = 'none';
        });
    }

    // Admin login
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            const u = adminUserInput ? adminUserInput.value.trim() : '';
            const p = adminPassInput ? adminPassInput.value.trim() : '';
            if (u === 'Test_Endmin' && p === 'Endfiled_Best') {
                alert('Login Successful');
                document.body.classList.add('admin-mode-active');
                closeModal();
            } else {
                alert('Invalid Credentials');
            }
        });
    }
});