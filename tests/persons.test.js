/**
 * Persons API Tests
 */

const { log, test, request } = require('./utils');

async function testPersonsApi(context) {
    log('blue', '\n👤 PERSONS API TESTS');

    const headers = { Authorization: `Bearer ${context.adminToken}` };

    // Create person
    const createRes = await request('POST', '/api/persons', {
        firstName: 'Test',
        lastName: 'Person',
        phoneNumber: `${Date.now()}`.slice(-10),
        phoneCountryCode: '91',
        email: `test${Date.now()}@test.com`,
        tags: ['test', 'api']
    }, headers);
    test('Create person succeeds', createRes.status === 201);

    if (createRes.data.data) {
        context.testPersonId = createRes.data.data._id || createRes.data.data.id;
        test('Person has ID', !!context.testPersonId);
        test('Person has firstName', createRes.data.data.firstName === 'Test');
    }

    // Get all persons
    const getRes = await request('GET', '/api/persons', null, headers);
    test('Get persons succeeds', getRes.status === 200);
    test('Persons returns array', Array.isArray(getRes.data.data));
    test('Pagination info present', !!getRes.data.pagination);

    // Get single person
    if (context.testPersonId) {
        const getOneRes = await request('GET', `/api/persons/${context.testPersonId}`, null, headers);
        test('Get single person succeeds', getOneRes.status === 200);
    }

    // Update person
    if (context.testPersonId) {
        const updateRes = await request('PUT', `/api/persons/${context.testPersonId}`, {
            lastName: 'Updated'
        }, headers);
        test('Update person succeeds', updateRes.status === 200);
    }

    // Search persons
    const searchRes = await request('GET', '/api/persons?search=Test', null, headers);
    test('Search persons works', searchRes.status === 200);

    // Test duplicate phone
    const dupRes = await request('POST', '/api/persons', {
        firstName: 'Duplicate',
        phoneNumber: createRes.data?.data?.phoneNumber || '1234567890'
    }, headers);
    test('Duplicate phone returns error', dupRes.status === 400 || dupRes.status === 409);
}

module.exports = { testPersonsApi };
