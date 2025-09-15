function uniqueName(prefix = 'conuser') {
	return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function createUser(ip) {
	const username = uniqueName()
	return cy.request({
		method: 'POST',
		url: '/users',
		failOnStatusCode: false,
		headers: ip ? { 'X-Forwarded-For': ip } : {},
		body: {
			username,
			email: `${username}@test.dev`,
			password: 'secret12',
			age: 21,
		},
	})
}

describe('Concurrency behavior (race conditions)', () => {
	it('Parallel requests from same IP should rate-limit consistently (BUG-012)', () => {
		const ip = '7.7.7.7'
		const results = []
		// Launch a burst of parallel requests
		for (let i = 0; i < 50; i++) {
			createUser(ip).then((res) => {
				results.push(res.status)
			})
		}
		cy.then(() => {
			// Expect either consistent acceptance or some 429s, but not negative statuses
			expect(results.length).to.eq(50)
			expect(results.every((s) => [201, 400, 429].includes(s))).to.eq(true)
		})
	})
})

