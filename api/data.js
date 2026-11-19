const endpoints = new Set(['leaderboard', 'positions', 'activity']);
const queryKeys = ['category', 'time_period', 'sort_by', 'sort_direction', 'limit', 'user'];

module.exports = async function handleData(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { endpoint } = req.query;
    if (!endpoints.has(endpoint)) {
        return res.status(404).json({ error: 'Unknown data endpoint' });
    }

    const url = new URL(`https://data-api.polymarket.com/v2/${endpoint}`);
    for (const key of queryKeys) {
        if (typeof req.query[key] === 'string') url.searchParams.set(key, req.query[key]);
    }

    try {
        const upstream = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const body = await upstream.text();
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/plain');
        if (upstream.ok) res.setHeader('Cache-Control', 'public, s-maxage=30');
        return res.status(upstream.status).send(body);
    } catch {
        return res.status(502).json({ error: 'Polymarket upstream unavailable' });
    }
};
