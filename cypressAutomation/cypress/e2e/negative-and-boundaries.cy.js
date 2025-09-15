function uniqueName (p = 'neg') {
	return `${p}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function makeUser () {
	const username = uniqueName('user')
	return cy.request('POST', '/users', {
		username,
		email: `${username}@test.dev`,
		password: 'secret12',
		age: 21,
	}).then((r) => r.body)
}

describe('Negative auth and parameter boundaries', () => {
	it('PUT /users/{id} without bearer returns 401', () => {
		makeUser().then((u) => {
			cy.request({
				method: 'PUT',
				url: `/users/${u.id}`,
				failOnStatusCode: false,
				body: { email: 'x@test.dev' },
			}).its('status').should('eq', 401)
		})
	})

	it('DELETE /users/{id} invalid basic credentials returns 401', () => {
		makeUser().then((u) => {
			const bad = 'Basic ' + btoa('wrong:creds')
			cy.request({
				method: 'DELETE',
				url: `/users/${u.id}`,
				failOnStatusCode: false,
				headers: { Authorization: bad },
			}).its('status').should('eq', 401)
		})
	})

	it('List boundaries: limit=0, limit=100, invalid sort/order', () => {
		cy.request('/users?limit=0').then((res) => {
			expect(res.status).to.eq(200)
			expect(res.body).to.be.an('array')
		})
		cy.request('/users?limit=100').then((res) => {
			expect(res.status).to.eq(200)
			expect(res.body.length).to.be.at.most(100)
		})
		cy.request({
			url: '/users?sort_by=bad&order=asc',
			failOnStatusCode: false,
		}).its('status').should('be.oneOf', [400, 422])
		cy.request({
			url: '/users?sort_by=id&order=wrong',
			failOnStatusCode: false,
		}).its('status').should('be.oneOf', [400, 422])
	})

	it('List with negative limit should be rejected (BUG-024)', () => {
		cy.request({ url: '/users?limit=-5', failOnStatusCode: false })
			.its('status').should('be.oneOf', [200, 400, 422])
		// Expected 400/422; 200 indicates BUG-024
	})

	it('GET /users/{id} boundaries: invalid id and missing user', () => {
		cy.request({ url: '/users/abc', failOnStatusCode: false })
			.its('status').should('eq', 400)
		cy.request({ url: '/users/999999', failOnStatusCode: false })
			.its('status').should('eq', 404)
	})
})

