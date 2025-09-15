function expectUser (u) {
	expect(u).to.have.all.keys(
		'id', 'username', 'email', 'age', 'created_at', 'is_active', 'phone', 'last_login'
	)
	expect(u.id).to.be.a('number')
	expect(u.username).to.be.a('string')
	expect(u.email).to.be.a('string')
	expect(u.age).to.be.a('number')
	expect(u.is_active).to.be.a('boolean')
}

describe('Schema validation for endpoints', () => {
	it('GET / schema', () => {
		cy.request('/').then((res) => {
			expect(res.status).to.eq(200)
			expect(res.body).to.have.property('message')
			expect(res.body).to.have.property('version')
		})
	})

	it('POST /users returns UserResponse', () => {
		const username = `schema_${Date.now()}`
		cy.request('POST', '/users', {
			username,
			email: `${username}@test.dev`,
			password: 'secret12',
			age: 25,
		}).then((res) => {
			expect(res.status).to.eq(201)
			expectUser(res.body)
		})
	})

	it('GET /users returns array of UserResponse', () => {
		cy.request('/users').then((res) => {
			expect(res.status).to.eq(200)
			expect(res.body).to.be.an('array')
			if (res.body.length) expectUser(res.body[0])
		})
	})

	it('GET /users/{id} returns UserResponse or 404', () => {
		cy.request('/users').then((list) => {
			const id = list.body[0]?.id
			if (!id) return
			cy.request(`/users/${id}`).then((res) => {
				expect(res.status).to.eq(200)
				expectUser(res.body)
			})
		})
	})

	it('GET /stats schema', () => {
		cy.request('/stats').then((res) => {
			expect(res.status).to.eq(200)
			expect(res.body).to.have.all.keys(
				'total_users', 'active_users', 'inactive_users', 'active_sessions', 'api_version'
			)
		})
	})

	it('GET /health schema', () => {
		cy.request('/health').then((res) => {
			expect(res.status).to.eq(200)
			expect(res.body).to.have.keys('status', 'timestamp', 'memory_users', 'memory_sessions')
		})
	})
})

