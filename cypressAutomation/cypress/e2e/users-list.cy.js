describe('Users - List & Pagination', () => {
	it('Limit should not exceed requested size (BUG-002)', () => {
		// Ensure at least 2 users exist by creating them here
		const create = (u) => cy.request('POST', '/users', {
			username: u,
			email: `${u}@test.dev`,
			password: 'secret12',
			age: 21,
		})
		create(`u_${Date.now()}_a`)
		create(`u_${Date.now()}_b`)
		cy.request('/users?limit=1').then((res) => {
			expect(res.status).to.eq(200)
			expect(res.body).to.be.an('array')
			expect(res.body.length).to.eq(1)
		})
	})
})

