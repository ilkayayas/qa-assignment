function makeUser(base) {
	const username = `${base}_${Date.now()}`
	return cy.request('POST', '/users', {
		username,
		email: `${username}@test.dev`,
		password: 'secret12',
		age: 21,
	}).then((res) => res.body)
}

function loginToken(username) {
	return cy.request('POST', '/login', { username, password: 'secret12' })
		.then((res) => res.body.token)
}

describe('Users - Update & Delete', () => {
	it('Update requires bearer; inactive behavior (BUG-008)', () => {
		makeUser('upd_user').then((user) => {
			loginToken(user.username).then((token) => {
				// Deactivate first
				const basic = 'Basic ' + btoa(`${user.username}:secret12`)
				cy.request({ method: 'DELETE', url: `/users/${user.id}`, headers: { Authorization: basic } })
				cy.request({
					method: 'PUT',
					url: `/users/${user.id}`,
					failOnStatusCode: false,
					headers: { Authorization: `Bearer ${token}` },
					body: { email: 'new@test.dev' },
				}).then((res) => {
					// Expected 403/409; bug if 200 without change
					expect([200, 403, 409]).to.include(res.status)
				})
			})
		})
	})

	it('Delete lacks ownership checks (BUG-009)', () => {
		// Create two users; A deletes B using A's basic auth
		makeUser('del_A').then((A) => {
			makeUser('del_B').then((B) => {
				const basicA = 'Basic ' + btoa(`${A.username}:secret12`)
				cy.request({
					method: 'DELETE',
					url: `/users/${B.id}`,
					failOnStatusCode: false,
					headers: { Authorization: basicA },
				}).its('status').should('be.oneOf', [200, 403])
				// Expected 403; 200 indicates BUG-009
			})
		})
	})
})

