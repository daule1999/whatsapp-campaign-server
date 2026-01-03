const userRepository = require('./UserRepository');
const templateRepository = require('./TemplateRepository');
const contactRepository = require('./ContactRepository');
const personRepository = require('./PersonRepository');
const campaignRepository = require('./CampaignRepository');
const campaignContactRepository = require('./CampaignContactRepository');
const auditLogRepository = require('./AuditLogRepository');
const autoresponderRepository = require('./AutoresponderRepository');

module.exports = {
    userRepository,
    templateRepository,
    contactRepository,
    personRepository,
    campaignRepository,
    campaignContactRepository,
    auditLogRepository,
    errorLogRepository: require('./ErrorLogRepository'),
    autoresponderRepository
};
