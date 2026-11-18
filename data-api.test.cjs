const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const wallet = '0x56687bf447db6ffa42ffe2204a05edaa20f55839';
const rows = {
    leaderboard: { user_id: wallet, user_name: 'Theo4', volume: 1234, rank: 1 },
    positions: { current_size: 10, current_price: 0.3, avg_price: 0.1, condition_id: 'c', end_date: '2030-01-01' },
    activity: { usdc_size: 5, timestamp: 1794997600 }
};
const context = vm.createContext({
    URL, location: { origin: 'https://preview.example' }, console,
    document: { addEventListener() {} },
    fetch: async (input) => {
        const url = new URL(input);
        const key = url.pathname.split('/').at(-1);
        assert.equal(url.pathname, '/api/polymarket/' + key);
        assert.ok(rows[key]);
        return { ok: true, json: async () => ({ data: [rows[key]] }) };
    }
});
vm.runInContext(fs.readFileSync('app.js', 'utf8'), context);
(async () => {
    const [leader] = await vm.runInContext("apiFetch('/leaderboard')", context);
    assert.equal(leader.proxyWallet, wallet);
    assert.equal(leader.vol, 1234);
    const [position] = await vm.runInContext("apiFetch('/positions')", context);
    assert.equal(position.size, 10);
    assert.equal(position.curPrice, 0.3);
    assert.equal(position.avgPrice, 0.1);
    assert.equal(position.conditionId, 'c');
    assert.equal(position.endDate, '2030-01-01');
    const [activity] = await vm.runInContext("apiFetch('/activity')", context);
    assert.equal(activity.usdcSize, 5);
})().catch((error) => { console.error(error); process.exitCode = 1; });
