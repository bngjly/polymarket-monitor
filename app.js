// ===== Polymarket Smart Money Monitor =====
// All API calls are public, no auth required.

const API = {
    DATA: 'https://data-api.polymarket.com',
    GAMMA: 'https://gamma-api.polymarket.com',
};

// Pre-configured "Smart Money" addresses
const SMART_MONEY = [
    { name: 'Theo4', address: '', tag: '88.9% 胜率' },
    { name: 'aenews2', address: '0x44c1dfe43260c94ed4f1d00de2e1f80fb113ebc1', tag: '数据驱动' },
    { name: 'YatSen', address: '0x5bffcf561bcae83af680ad600cb99f1184d6ffbe', tag: '政治赛道' },
    { name: 'ImJustKen', address: '0x9d84ce0306f8551e02efef1680475fc0f1dc1344', tag: '总盈利 #1' },
    { name: 'debased', address: '0x24c8cf69a0e0a17eee21f69d29752bfa32e823e1', tag: '做市策略' },
];

// ===== State =====
const state = {
    category: 'OVERALL',
    timePeriod: 'ALL',
    orderBy: 'PNL',
    selectedUser: null,
    leaderboardData: [],
    autoRefresh: true,
    refreshInterval: null,
};

// ===== DOM Cache =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== Utility Functions =====
function formatUSD(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '—';
    const abs = Math.abs(num);
    if (abs >= 1_000_000) return (num >= 0 ? '+' : '') + '$' + (num / 1_000_000).toFixed(2) + 'M';
    if (abs >= 1_000) return (num >= 0 ? '+' : '') + '$' + (num / 1_000).toFixed(1) + 'K';
    return (num >= 0 ? '+' : '') + '$' + num.toFixed(2);
}

function formatVolume(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '—';
    if (num >= 1_000_000) return '$' + (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return '$' + (num / 1_000).toFixed(1) + 'K';
    return '$' + num.toFixed(2);
}

function shortAddress(addr) {
    if (!addr) return '—';
    return addr.slice(0, 6) + '…' + addr.slice(-4);
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return `${Math.floor(diff / 86400)}天前`;
}

function showToast(message, type = 'info') {
    const container = $('#toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== API Fetch Helper =====
async function apiFetch(baseUrl, path, params = {}) {
    const url = new URL(path, baseUrl);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });

    try {
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error(`Fetch failed: ${url}`, err);
        throw err;
    }
}

// ===== Leaderboard =====
async function loadLeaderboard() {
    const btn = $('#refreshLeaderboard');
    btn.classList.add('spinning');

    const list = $('#leaderboardList');
    list.innerHTML = `<div class="loading-skeleton">${'<div class="skeleton-row"></div>'.repeat(8)}</div>`;

    try {
        const data = await apiFetch(API.DATA, '/v1/leaderboard', {
            category: state.category,
            timePeriod: state.timePeriod,
            orderBy: state.orderBy,
            limit: 50,
        });

        state.leaderboardData = data;
        renderLeaderboard(data);
        updateTimestamp();
        updateWelcomeStats(data);
    } catch (err) {
        showToast('排行榜加载失败，请检查网络连接', 'error');
        list.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>数据加载失败</p></div>`;
    } finally {
        btn.classList.remove('spinning');
    }
}

function renderLeaderboard(data) {
    const list = $('#leaderboardList');

    if (!data || data.length === 0) {
        list.innerHTML = `<div class="empty-state"><i class="fas fa-chart-bar"></i><p>暂无排行数据</p></div>`;
        return;
    }

    list.innerHTML = data.map((item, idx) => {
        const rank = item.rank || idx + 1;
        const rankClass = rank === 1 ? 'top-1' : rank === 2 ? 'top-2' : rank === 3 ? 'top-3' : 'normal';
        const pnl = parseFloat(item.pnl || 0);
        const pnlClass = pnl >= 0 ? 'positive' : 'negative';
        const isActive = state.selectedUser && state.selectedUser.proxyWallet === item.proxyWallet;
        const avatarHtml = item.profileImage
            ? `<img src="${item.profileImage}" alt="" loading="lazy">`
            : `<i class="fas fa-user"></i>`;

        return `
            <div class="lb-item ${isActive ? 'active' : ''} fade-in"
                 data-wallet="${item.proxyWallet || ''}"
                 data-username="${item.userName || ''}"
                 style="animation-delay: ${idx * 30}ms">
                <div class="lb-rank ${rankClass}">${rank}</div>
                <div class="lb-avatar">${avatarHtml}</div>
                <div class="lb-info">
                    <div class="lb-name">${item.userName || shortAddress(item.proxyWallet)}</div>
                    <div class="lb-address-short">${shortAddress(item.proxyWallet)}</div>
                </div>
                <div class="lb-stats">
                    <div class="lb-pnl ${pnlClass}">${formatUSD(pnl)}</div>
                    <div class="lb-vol">Vol: ${formatVolume(item.vol || 0)}</div>
                </div>
            </div>
        `;
    }).join('');

    // Bind click
    list.querySelectorAll('.lb-item').forEach(el => {
        el.addEventListener('click', () => {
            const wallet = el.dataset.wallet;
            const username = el.dataset.username;
            if (wallet) selectUser(wallet, username);
        });
    });
}

function updateWelcomeStats(data) {
    if (!data || data.length === 0) return;
    const topPnl = data[0] ? formatUSD(data[0].pnl) : '—';
    const totalVol = data.reduce((sum, d) => sum + parseFloat(d.vol || 0), 0);
    const avgPnl = data.reduce((sum, d) => sum + parseFloat(d.pnl || 0), 0) / data.length;

    const stats = $('#welcomeStats');
    stats.innerHTML = `
        <div class="welcome-stat">
            <div class="stat-value">${topPnl}</div>
            <div class="stat-label">榜首盈亏</div>
        </div>
        <div class="welcome-stat">
            <div class="stat-value">${formatVolume(totalVol)}</div>
            <div class="stat-label">Top50 总交易量</div>
        </div>
        <div class="welcome-stat">
            <div class="stat-value">${formatUSD(avgPnl)}</div>
            <div class="stat-label">平均盈亏</div>
        </div>
    `;
}

// ===== Select User =====
async function selectUser(wallet, username) {
    // Highlight in leaderboard
    $$('.lb-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.querySelector(`.lb-item[data-wallet="${wallet}"]`);
    if (activeEl) activeEl.classList.add('active');

    // Find user data
    const userData = state.leaderboardData.find(d => d.proxyWallet === wallet) || {};

    state.selectedUser = { proxyWallet: wallet, userName: username, ...userData };

    // Show detail panel
    $('#welcomeState').classList.add('hidden');
    $('#userDetail').classList.remove('hidden');

    // Populate summary card
    const avatarEl = $('#userAvatar');
    if (userData.profileImage) {
        avatarEl.innerHTML = `<img src="${userData.profileImage}" alt="">`;
    } else {
        avatarEl.innerHTML = `<i class="fas fa-user"></i>`;
    }

    $('#userName').textContent = username || shortAddress(wallet);

    const addrCode = $('#userAddress').querySelector('code');
    addrCode.textContent = wallet;

    const pnl = parseFloat(userData.pnl || 0);
    const pnlEl = $('#userPnl');
    pnlEl.textContent = formatUSD(pnl);
    pnlEl.className = `metric-value ${pnl >= 0 ? 'positive' : 'negative'}`;

    $('#userVolume').textContent = formatVolume(userData.vol || 0);
    $('#userRank').textContent = userData.rank ? `#${userData.rank}` : '—';

    // Load positions and activity
    loadPositions(wallet);
    loadActivity(wallet);
}

// ===== Load Positions =====
async function loadPositions(wallet) {
    const grid = $('#positionsGrid');
    grid.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><span>加载持仓数据…</span></div>`;

    try {
        const data = await apiFetch(API.DATA, '/positions', {
            user: wallet,
            limit: 50,
            sortBy: 'VALUE',
            sizeThreshold: 0.01,
        });

        if (!data || data.length === 0) {
            grid.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>该地址暂无活跃持仓</p></div>`;
            return;
        }

        grid.innerHTML = data.map((pos, idx) => {
            const title = pos.title || pos.market?.question || `Market ${pos.asset || ''}`;
            const size = parseFloat(pos.size || 0);
            const curPrice = parseFloat(pos.curPrice || pos.price || 0);
            const avgPrice = parseFloat(pos.avgPrice || pos.price || 0);
            const value = size * curPrice;
            const pnl = size * (curPrice - avgPrice);
            const side = pos.outcome === 'No' ? 'no' : 'yes';
            const sideLabel = pos.outcome === 'No' ? 'NO' : 'YES';

            return `
                <div class="position-card fade-in" style="animation-delay: ${idx * 50}ms">
                    <div class="position-header">
                        <div class="position-title">${title}</div>
                        <span class="position-side ${side}">${sideLabel}</span>
                    </div>
                    <div class="position-details">
                        <div class="pos-detail">
                            <div class="pos-detail-label">持仓量</div>
                            <div class="pos-detail-value">${size.toFixed(1)}</div>
                        </div>
                        <div class="pos-detail">
                            <div class="pos-detail-label">当前价格</div>
                            <div class="pos-detail-value">$${curPrice.toFixed(3)}</div>
                        </div>
                        <div class="pos-detail">
                            <div class="pos-detail-label">价值</div>
                            <div class="pos-detail-value" style="color: ${pnl >= 0 ? 'var(--green)' : 'var(--red)'}">
                                ${formatUSD(value)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>持仓数据加载失败</p></div>`;
        showToast('持仓数据加载失败', 'error');
    }
}

// ===== Load Activity =====
async function loadActivity(wallet) {
    const list = $('#activityList');
    list.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><span>加载交易活动…</span></div>`;

    try {
        const data = await apiFetch(API.DATA, '/activity', {
            user: wallet,
            limit: 50,
        });

        if (!data || data.length === 0) {
            list.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><p>暂无交易活动记录</p></div>`;
            return;
        }

        list.innerHTML = data.map((act, idx) => {
            const type = (act.type || act.action || '').toLowerCase();
            let iconClass = 'other';
            let icon = 'fa-exchange-alt';

            if (type.includes('buy') || type.includes('trade')) {
                iconClass = 'buy';
                icon = 'fa-arrow-up';
            } else if (type.includes('sell')) {
                iconClass = 'sell';
                icon = 'fa-arrow-down';
            } else if (type.includes('redeem') || type.includes('claim')) {
                iconClass = 'buy';
                icon = 'fa-check-circle';
            }

            const title = act.title || act.market?.question || act.type || '交易';
            const amount = act.usdcSize || act.value || act.amount || '';
            const timestamp = act.timestamp || act.createdAt || act.time || '';
            const outcome = act.outcome || '';
            const subtitle = outcome ? `${act.type || '交易'} · ${outcome}` : (act.type || '交易');

            return `
                <div class="activity-item fade-in" style="animation-delay: ${idx * 30}ms">
                    <div class="activity-icon ${iconClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="activity-info">
                        <div class="activity-title">${title}</div>
                        <div class="activity-subtitle">${subtitle}</div>
                    </div>
                    <div class="activity-amount">
                        <div class="activity-value">${amount ? formatVolume(amount) : '—'}</div>
                        <div class="activity-time">${timeAgo(timestamp)}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        list.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>交易活动加载失败</p></div>`;
        showToast('交易活动加载失败', 'error');
    }
}

// ===== Filter Handlers =====
function initFilters() {
    // Category filter
    $('#categoryFilter').addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        $('#categoryFilter .filter-btn.active')?.classList.remove('active');
        btn.classList.add('active');
        state.category = btn.dataset.value;
        loadLeaderboard();
    });

    // Time filter
    $('#timeFilter').addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        $('#timeFilter .filter-btn.active')?.classList.remove('active');
        btn.classList.add('active');
        state.timePeriod = btn.dataset.value;
        loadLeaderboard();
    });

    // Order filter
    $('#orderFilter').addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        $('#orderFilter .filter-btn.active')?.classList.remove('active');
        btn.classList.add('active');
        state.orderBy = btn.dataset.value;
        loadLeaderboard();
    });
}

// ===== Smart Money Chips =====
function initSmartMoneyChips() {
    const container = $('#smartMoneyChips');
    container.innerHTML = SMART_MONEY.map(sm => {
        if (!sm.address) return '';
        return `
            <div class="chip" data-address="${sm.address}" data-name="${sm.name}" title="${sm.tag}">
                <span class="chip-dot"></span>
                <span>${sm.name}</span>
            </div>
        `;
    }).join('');

    container.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        const addr = chip.dataset.address;
        const name = chip.dataset.name;
        if (addr) selectUser(addr, name);
    });
}

// ===== Search =====
function initSearch() {
    const input = $('#walletSearch');
    const btn = $('#searchBtn');

    const doSearch = () => {
        const val = input.value.trim();
        if (!val) {
            showToast('请输入钱包地址', 'info');
            return;
        }
        if (val.startsWith('0x') && val.length >= 10) {
            selectUser(val, '');
            showToast('正在查询钱包数据…', 'info');
        } else {
            // Try searching by username in leaderboard
            const found = state.leaderboardData.find(
                d => d.userName && d.userName.toLowerCase() === val.toLowerCase()
            );
            if (found) {
                selectUser(found.proxyWallet, found.userName);
            } else {
                showToast('未找到该用户，请输入完整的钱包地址', 'error');
            }
        }
    };

    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSearch();
    });
}

// ===== Copy Address =====
function initCopyAddress() {
    $('#copyAddress').addEventListener('click', () => {
        const addr = $('#userAddress').querySelector('code').textContent;
        if (addr && addr !== '—') {
            navigator.clipboard.writeText(addr).then(() => {
                showToast('地址已复制到剪贴板', 'success');
            }).catch(() => {
                showToast('复制失败', 'error');
            });
        }
    });
}

// ===== Tabs =====
function initTabs() {
    $$('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.tab-btn').forEach(b => b.classList.remove('active'));
            $$('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const tabName = btn.dataset.tab;
            $(`#${tabName}Tab`).classList.add('active');
        });
    });
}

// ===== Auto Refresh =====
function initAutoRefresh() {
    const toggle = $('#autoRefreshToggle');
    toggle.addEventListener('change', () => {
        state.autoRefresh = toggle.checked;
        if (state.autoRefresh) {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
    });
    startAutoRefresh();
}

function startAutoRefresh() {
    stopAutoRefresh();
    state.refreshInterval = setInterval(() => {
        loadLeaderboard();
        if (state.selectedUser) {
            loadPositions(state.selectedUser.proxyWallet);
            loadActivity(state.selectedUser.proxyWallet);
        }
    }, 60000); // 60 seconds
}

function stopAutoRefresh() {
    if (state.refreshInterval) {
        clearInterval(state.refreshInterval);
        state.refreshInterval = null;
    }
}

// ===== Refresh Button =====
function initRefreshButton() {
    $('#refreshLeaderboard').addEventListener('click', () => {
        loadLeaderboard();
    });
}

// ===== Timestamp =====
function updateTimestamp() {
    const el = $('#lastUpdate');
    const now = new Date();
    const time = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.innerHTML = `<i class="fas fa-clock"></i><span>更新于 ${time}</span>`;
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    initSmartMoneyChips();
    initSearch();
    initCopyAddress();
    initTabs();
    initAutoRefresh();
    initRefreshButton();
    loadLeaderboard();
});
