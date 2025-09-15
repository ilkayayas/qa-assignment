function uniqueName(prefix = 'rluser') {
	return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function createUserWithIp(ip) {
	const username = uniqueName()
	return cy.request({
		method: 'POST',
		url: '/users',
		failOnStatusCode: false,
		headers: {
			'X-Forwarded-For': ip,
		},
		body: {
			username,
			email: `${username}@test.dev`,
			password: 'secret12',
			age: 21,
		},
	})
}

describe('Rate limit and IP spoofing behavior', () => {
	it('Exceeds 100 requests/min from same IP -> expect some 429 (BUG-011)', () => {
		const ip = '9.9.9.9'
		const total = 110
		const statuses = []
		for (let i = 0; i < total; i++) {
			createUserWithIp(ip).then((res) => {
				statuses.push(res.status)
			})
		}
		cy.then(() => {
			// Expect at least one 429 when limit exceeded
			expect(statuses.some((s) => s === 429)).to.eq(true)
		})
	})

	it('Bypass limit by rotating X-Forwarded-For (spoofable header) (BUG-011)', () => {
		const statuses = []
		const total = 50
		for (let i = 1; i <= total; i++) {
			const ip = `10.0.0.${i}`
			createUserWithIp(ip).then((res) => {
				statuses.push(res.status)
			})
		}
		cy.then(() => {
			// Expect all (or vast majority) to be 201 since limit is per IP
			expect(statuses.filter((s) => s === 201).length).to.be.greaterThan(40)
		})
	})
})

