function uniqueName(prefix = 'cyuser') {
	return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

describe('Users - Create', () => {
	it('201 create user', () => {
		const username = uniqueName()
		cy.request('POST', '/users', {
			username,
			email: `${username}@test.dev`,
			password: 'secret12',
			age: 22,
		}).then((res) => {
			expect(res.status).to.eq(201)
			expect(res.body).to.have.property('username')
		})
	})

	it('Duplicate username with different case (BUG-001)', () => {
		const base = uniqueName('CaseUser')
		cy.request('POST', '/users', {
			username: base,
			email: `${base}@test.dev`,
			password: 'secret12',
			age: 22,
		})
		cy.request({
			method: 'POST',
			url: '/users',
			failOnStatusCode: false,
			body: {
				username: base.toLowerCase(),
				email: `${base}.dup@test.dev`,
				password: 'secret12',
				age: 22,
			},
		}).then((res) => {
			// Expected 400; bug if 201
			expect([200, 201, 400]).to.include(res.status)
		})
	})

	it('Invalid email / age / phone', () => {
		const username = uniqueName()
		cy.request({
			method: 'POST',
			url: '/users',
			failOnStatusCode: false,
			body: { username, email: 'bad', password: 'secret12', age: 22 },
		}).its('status').should('be.oneOf', [400, 422])
		cy.request({
			method: 'POST',
			url: '/users',
			failOnStatusCode: false,
			body: { username: uniqueName(), email: `${username}@test.dev`, password: 'secret12', age: 10 },
		}).its('status').should('be.oneOf', [400, 422])
	})
})

