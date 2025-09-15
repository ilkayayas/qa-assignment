function makeUser(base) {
	const username = `${base}_${Date.now()}`
	return cy.request('POST', '/users', {
		username,
		email: `${username}@Test.dev`,
		password: 'secret12',
		age: 21,
	}).then((res) => res.body)
}

describe('Search / Stats / Health', () => {
	it('Search exact/email behavior (BUG-007)', () => {
		makeUser('search_user').then((user) => {
			cy.request(`/users/search?q=${user.username}&field=username&exact=true`).then((res) => {
				expect(res.status).to.eq(200)
				// Username exact works
				expect(res.body.find((u) => u.username === user.username)).to.exist
			})
			cy.request(`/users/search?q=${user.email.toLowerCase()}&field=email&exact=true`).then((res) => {
				expect(res.status).to.eq(200)
				// Email exact/case handling inconsistent; document behavior
				expect(res.body).to.be.an('array')
			})
		})
	})

	it('Stats leaks sensitive info (BUG-010)', () => {
		cy.request('/stats?include_details=true').then((res) => {
			expect(res.status).to.eq(200)
			expect(res.body).to.have.property('user_emails')
			expect(res.body).to.have.property('session_tokens')
		})
	})

	it('Health returns status and timestamp', () => {
		cy.request('/health').then((res) => {
			expect(res.status).to.eq(200)
			expect(res.body).to.have.property('status', 'healthy')
			expect(res.body).to.have.property('timestamp')
		})
	})
})

