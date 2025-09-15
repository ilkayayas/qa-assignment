describe('Root', () => {
	it('GET / returns API info', () => {
		cy.request('/').then((res) => {
			expect(res.status).to.eq(200)
			expect(res.body).to.have.property('message', 'User Management API')
			expect(res.body).to.have.property('version', '1.0.0')
		})
	})
})

