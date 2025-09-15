const { defineConfig } = require('cypress')

module.exports = defineConfig({
	reporter: 'cypress-mochawesome-reporter',
	reporterOptions: {
		reportDir: 'cypress/results',
		overwrite: false,
		html: true,
		json: true,
	},
	e2e: {
		baseUrl: 'http://localhost:8000',
		setupNodeEvents (on, config) {
			require('cypress-mochawesome-reporter/plugin')(on)
		},
	},
})
