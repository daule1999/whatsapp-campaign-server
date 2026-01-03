/**
 * Test Utilities and Shared Helpers
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

// Test results tracker
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function test(name, passed, details = '') {
    if (passed) {
        results.passed++;
        log('green', `  ✓ ${name}`);
    } else {
        results.failed++;
        log('red', `  ✗ ${name}`);
        if (details) log('red', `    → ${details}`);
    }
    results.tests.push({ name, passed, details });
}

async function request(method, path, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${path}`,
            headers: { 'Content-Type': 'application/json', ...headers },
            validateStatus: () => true
        };
        if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            config.data = data;
        }
        return await axios(config);
    } catch (error) {
        return { status: 0, data: { error: error.message } };
    }
}

function getResults() {
    return results;
}

function resetResults() {
    results.passed = 0;
    results.failed = 0;
    results.tests = [];
}

function printSummary() {
    console.log(`\n${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}TEST RESULTS${colors.reset}`);
    console.log(`${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
    console.log(`Total:  ${results.passed + results.failed}`);
    console.log(`${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}\n`);

    if (results.failed > 0) {
        log('yellow', 'Failed tests:');
        results.tests.filter(t => !t.passed).forEach(t => {
            log('red', `  - ${t.name}`);
            if (t.details) log('red', `    ${t.details}`);
        });
    }
}

module.exports = {
    BASE_URL,
    colors,
    log,
    test,
    request,
    getResults,
    resetResults,
    printSummary
};
