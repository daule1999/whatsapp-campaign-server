#!/usr/bin/env node

/**
 * Database Migration Script
 * Migrates data between MySQL and MongoDB
 * 
 * Usage:
 *   npm run migrate -- --from mysql --to mongodb
 *   npm run migrate -- --from mongodb --to mysql
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');

const config = require('./config');

// Parse command line arguments
const args = process.argv.slice(2);
let fromDb = null;
let toDb = null;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from' && args[i + 1]) fromDb = args[i + 1];
    if (args[i] === '--to' && args[i + 1]) toDb = args[i + 1];
}

if (!fromDb || !toDb) {
    console.log('Usage: npm run migrate -- --from <mysql|mongodb> --to <mysql|mongodb>');
    console.log('Example: npm run migrate -- --from mysql --to mongodb');
    process.exit(1);
}

if (fromDb === toDb) {
    console.log('Error: Source and destination databases cannot be the same');
    process.exit(1);
}

console.log(`\n🔄 Migrating data from ${fromDb.toUpperCase()} to ${toDb.toUpperCase()}\n`);

// MongoDB Models
const MongoUser = require('./db/models/mongoose/User');
const MongoTemplate = require('./db/models/mongoose/Template');
const MongoContact = require('./db/models/mongoose/Contact');
const MongoCampaign = require('./db/models/mongoose/Campaign');
const MongoCampaignContact = require('./db/models/mongoose/CampaignContact');
const MongoAuditLog = require('./db/models/mongoose/AuditLog');

// Sequelize setup
async function getSequelizeModels() {
    const sequelize = new Sequelize(
        config.database.mysql.name,
        config.database.mysql.user,
        config.database.mysql.password,
        {
            host: config.database.mysql.host,
            port: config.database.mysql.port,
            dialect: 'mysql',
            logging: false
        }
    );

    const User = require('./db/models/sequelize/User')(sequelize);
    const Template = require('./db/models/sequelize/Template')(sequelize);
    const Contact = require('./db/models/sequelize/Contact')(sequelize);
    const Campaign = require('./db/models/sequelize/Campaign')(sequelize);
    const CampaignContact = require('./db/models/sequelize/CampaignContact')(sequelize);
    const AuditLog = require('./db/models/sequelize/AuditLog')(sequelize);

    return { sequelize, User, Template, Contact, Campaign, CampaignContact, AuditLog };
}

async function connectMongoDB() {
    await mongoose.connect(config.database.mongoUri);
    console.log('✓ Connected to MongoDB');
}

async function connectMySQL(sequelize) {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('✓ Connected to MySQL');
}

// ID mapping for foreign keys
const idMap = {
    users: new Map(),
    templates: new Map(),
    contacts: new Map(),
    campaigns: new Map()
};

async function migrateFromMySQLToMongoDB(sql) {
    console.log('\n📦 Starting MySQL → MongoDB migration...\n');

    // 1. Migrate Users
    console.log('Migrating users...');
    const users = await sql.User.findAll();
    for (const user of users) {
        const data = user.toJSON();
        const newUser = await MongoUser.create({
            email: data.email,
            passwordHash: data.passwordHash,
            name: data.name,
            role: data.role,
            refreshToken: data.refreshToken,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
        idMap.users.set(data.id, newUser._id);
    }
    console.log(`  ✓ ${users.length} users migrated`);

    // 2. Migrate Templates
    console.log('Migrating templates...');
    const templates = await sql.Template.findAll();
    for (const template of templates) {
        const data = template.toJSON();
        const newTemplate = await MongoTemplate.create({
            name: data.name,
            waTemplateName: data.waTemplateName,
            languageCode: data.languageCode,
            bodyPreview: data.bodyPreview,
            components: data.components,
            status: data.status,
            createdBy: data.createdBy ? idMap.users.get(data.createdBy) : null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
        idMap.templates.set(data.id, newTemplate._id);
    }
    console.log(`  ✓ ${templates.length} templates migrated`);

    // 3. Migrate Contacts
    console.log('Migrating contacts...');
    const contacts = await sql.Contact.findAll();
    for (const contact of contacts) {
        const data = contact.toJSON();
        const newContact = await MongoContact.create({
            name: data.name,
            phone: data.phone,
            email: data.email,
            metadata: data.metadata,
            source: data.source,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
        idMap.contacts.set(data.id, newContact._id);
    }
    console.log(`  ✓ ${contacts.length} contacts migrated`);

    // 4. Migrate Campaigns
    console.log('Migrating campaigns...');
    const campaigns = await sql.Campaign.findAll();
    for (const campaign of campaigns) {
        const data = campaign.toJSON();
        const newCampaign = await MongoCampaign.create({
            name: data.name,
            description: data.description,
            templateId: data.templateId ? idMap.templates.get(data.templateId) : null,
            status: data.status,
            totalContacts: data.totalContacts,
            sentCount: data.sentCount,
            failedCount: data.failedCount,
            scheduledAt: data.scheduledAt,
            startedAt: data.startedAt,
            completedAt: data.completedAt,
            createdBy: data.createdBy ? idMap.users.get(data.createdBy) : null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
        idMap.campaigns.set(data.id, newCampaign._id);
    }
    console.log(`  ✓ ${campaigns.length} campaigns migrated`);

    // 5. Migrate CampaignContacts
    console.log('Migrating campaign contacts...');
    const campaignContacts = await sql.CampaignContact.findAll();
    for (const cc of campaignContacts) {
        const data = cc.toJSON();
        await MongoCampaignContact.create({
            campaignId: idMap.campaigns.get(data.campaignId),
            contactId: idMap.contacts.get(data.contactId),
            status: data.status,
            messageId: data.messageId,
            error: data.error,
            sentAt: data.sentAt,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
    }
    console.log(`  ✓ ${campaignContacts.length} campaign contacts migrated`);

    // 6. Migrate Audit Logs
    console.log('Migrating audit logs...');
    const auditLogs = await sql.AuditLog.findAll();
    for (const log of auditLogs) {
        const data = log.toJSON();
        await MongoAuditLog.create({
            userId: data.userId ? idMap.users.get(data.userId) : null,
            userEmail: data.userEmail,
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId,
            changes: data.changes,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            createdAt: data.createdAt
        });
    }
    console.log(`  ✓ ${auditLogs.length} audit logs migrated`);
}

async function migrateFromMongoDBToMySQL(sql) {
    console.log('\n📦 Starting MongoDB → MySQL migration...\n');

    // 1. Migrate Users
    console.log('Migrating users...');
    const users = await MongoUser.find();
    for (const user of users) {
        const newUser = await sql.User.create({
            email: user.email,
            passwordHash: user.passwordHash,
            name: user.name,
            role: user.role,
            refreshToken: user.refreshToken
        });
        idMap.users.set(user._id.toString(), newUser.id);
    }
    console.log(`  ✓ ${users.length} users migrated`);

    // 2. Migrate Templates
    console.log('Migrating templates...');
    const templates = await MongoTemplate.find();
    for (const template of templates) {
        const createdBy = template.createdBy ? idMap.users.get(template.createdBy.toString()) : null;
        const newTemplate = await sql.Template.create({
            name: template.name,
            waTemplateName: template.waTemplateName,
            languageCode: template.languageCode,
            bodyPreview: template.bodyPreview,
            components: template.components,
            status: template.status,
            createdBy
        });
        idMap.templates.set(template._id.toString(), newTemplate.id);
    }
    console.log(`  ✓ ${templates.length} templates migrated`);

    // 3. Migrate Contacts
    console.log('Migrating contacts...');
    const contacts = await MongoContact.find();
    for (const contact of contacts) {
        const newContact = await sql.Contact.create({
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            metadata: contact.metadata,
            source: contact.source
        });
        idMap.contacts.set(contact._id.toString(), newContact.id);
    }
    console.log(`  ✓ ${contacts.length} contacts migrated`);

    // 4. Migrate Campaigns
    console.log('Migrating campaigns...');
    const campaigns = await MongoCampaign.find();
    for (const campaign of campaigns) {
        const templateId = campaign.templateId ? idMap.templates.get(campaign.templateId.toString()) : null;
        const createdBy = campaign.createdBy ? idMap.users.get(campaign.createdBy.toString()) : null;
        const newCampaign = await sql.Campaign.create({
            name: campaign.name,
            description: campaign.description,
            templateId,
            status: campaign.status,
            totalContacts: campaign.totalContacts,
            sentCount: campaign.sentCount,
            failedCount: campaign.failedCount,
            scheduledAt: campaign.scheduledAt,
            startedAt: campaign.startedAt,
            completedAt: campaign.completedAt,
            createdBy
        });
        idMap.campaigns.set(campaign._id.toString(), newCampaign.id);
    }
    console.log(`  ✓ ${campaigns.length} campaigns migrated`);

    // 5. Migrate CampaignContacts
    console.log('Migrating campaign contacts...');
    const campaignContacts = await MongoCampaignContact.find();
    for (const cc of campaignContacts) {
        await sql.CampaignContact.create({
            campaignId: idMap.campaigns.get(cc.campaignId.toString()),
            contactId: idMap.contacts.get(cc.contactId.toString()),
            status: cc.status,
            messageId: cc.messageId,
            error: cc.error,
            sentAt: cc.sentAt
        });
    }
    console.log(`  ✓ ${campaignContacts.length} campaign contacts migrated`);

    // 6. Migrate Audit Logs
    console.log('Migrating audit logs...');
    const auditLogs = await MongoAuditLog.find();
    for (const log of auditLogs) {
        await sql.AuditLog.create({
            userId: log.userId ? idMap.users.get(log.userId.toString()) : null,
            userEmail: log.userEmail,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            changes: log.changes,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent
        });
    }
    console.log(`  ✓ ${auditLogs.length} audit logs migrated`);
}

async function main() {
    try {
        const sql = await getSequelizeModels();

        // Connect to both databases
        await connectMongoDB();
        await connectMySQL(sql.sequelize);

        if (fromDb === 'mysql' && toDb === 'mongodb') {
            await migrateFromMySQLToMongoDB(sql);
        } else if (fromDb === 'mongodb' && toDb === 'mysql') {
            await migrateFromMongoDBToMySQL(sql);
        }

        console.log('\n✅ Migration completed successfully!\n');

        // Print summary
        console.log('Summary:');
        console.log(`  Users: ${idMap.users.size}`);
        console.log(`  Templates: ${idMap.templates.size}`);
        console.log(`  Contacts: ${idMap.contacts.size}`);
        console.log(`  Campaigns: ${idMap.campaigns.size}`);

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
