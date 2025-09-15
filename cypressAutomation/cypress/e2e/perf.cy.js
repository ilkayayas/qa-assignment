function measure (name, reqFn, samples = 20) {
	const times = []
	const run = (i) => {
		const t0 = performance.now()
		return reqFn().then(() => {
			const t1 = performance.now()
			times.push(t1 - t0)
			if (i + 1 < samples) return run(i + 1)
		})
	}
	return run(0).then(() => ({ name, times }))
}

function p95 (arr) {
	const a = [...arr].sort((x, y) => x - y)
	const idx = Math.ceil(0.95 * a.length) - 1
	return a[Math.max(0, Math.min(a.length - 1, idx))]
}

describe('Performance p95 thresholds', () => {
	it('p95 under thresholds for key endpoints', () => {
		const endpoints = [
			{ name: 'GET /', fn: () => cy.request('/') },
			{ name: 'GET /health', fn: () => cy.request('/health') },
			{ name: 'GET /stats', fn: () => cy.request('/stats') },
			{ name: 'GET /users?limit=10', fn: () => cy.request('/users?limit=10') },
		]
		const results = []
		const THRESHOLD_MS = 250
		cy.wrap(null).then(() => {
			return endpoints.reduce((chain, ep) => {
				return chain.then(() => measure(ep.name, ep.fn, 15).then((r) => results.push(r)))
			}, Promise.resolve())
		}).then(() => {
			results.forEach((r) => {
				const v = p95(r.times)
				cy.log(`${r.name} p95=${v.toFixed(1)}ms`)
				expect(v).to.be.lessThan(THRESHOLD_MS)
			})
		})
	})
})

