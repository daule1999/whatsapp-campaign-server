/**
 * API Test Suite - Main Runner
 * 
 * Run all tests: node tests/index.js
 * Run specific: node tests/index.js --only=auth,security
 */

const { colors, log, printSummary, getResults, BASE_URL } = require('./utils');

// Import test modules
const { testHealth } = require('./health.test');
const { testAuth } = require('./auth.test');
const { testSecurity } = require('./security.test');
const { testPersonsApi } = require('./persons.test');
const { testTemplatesApi } = require('./templates.test');
const { testCampaignsApi } = require('./campaigns.test');
const { testAdminApi } = require('./admin.test');
const { testPublicApi } = require('./public-api.test');
const { testAuditApi } = require('./audit.test');
const { cleanup } = require('./cleanup.test');

// Shared context for storing tokens and IDs
const context = {
    adminToken: null,
    userToken: null,
    apiKey: null,
    testPersonId: null,
    testTemplateId: null,
    testCampaignId: null
};

// Available test suites
const testSuites = {
    health: testHealth,
    auth: testAuth,
    security: testSecurity,
    persons: testPersonsApi,
    templates: testTemplatesApi,
    campaigns: testCampaignsApi,
    admin: testAdminApi,
    publicApi: testPublicApi,
    audit: testAuditApi,
    cleanup: cleanup
};

async function runTests(only = null) {
    console.log(`${colors.bold}${colors.blue}`);
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                    API TEST SUITE                                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
    console.log(colors.reset);
    console.log(`Testing API at: ${BASE_URL}\n`);

    const suitesToRun = only
        ? only.split(',').map(s => s.trim())
        : Object.keys(testSuites);

    try {
        for (const suite of suitesToRun) {
            if (testSuites[suite]) {
                await testSuites[suite](context);
            } else {
                log('yellow', `Unknown test suite: ${suite}`);
            }
        }
    } catch (error) {
        log('red', `\n❌ Test suite error: ${error.message}`);
        console.error(error);
    }

    printSummary();

    const results = getResults();
    process.exit(results.failed > 0 ? 1 : 0);
}

// Parse CLI args
const args = process.argv.slice(2);
const onlyArg = args.find(a => a.startsWith('--only='));
const only = onlyArg ? onlyArg.split('=')[1] : null;

runTests(only);
