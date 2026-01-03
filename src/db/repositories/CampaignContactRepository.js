/**
 * CampaignContact Repository - MySQL only
 */
class CampaignContactRepository {
    getModel() {
        const { CampaignContact } = require('../models/sequelize');
        return CampaignContact;
    }

    getContactModel() {
        const { Person } = require('../models/sequelize');
        return Person;
    }

    async findById(id) {
        const CampaignContact = this.getModel();
        return await CampaignContact.findByPk(id);
    }

    async findAll(filter = {}, options = {}) {
        const CampaignContact = this.getModel();
        const include = [];
        if (options.includeContact) {
            include.push({
                model: this.getContactModel(),
                attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'email']
            });
        }
        return await CampaignContact.findAll({ where: filter, include });
    }

    async findByCampaignWithContacts(campaignId) {
        const CampaignContact = this.getModel();
        const results = await CampaignContact.findAll({
            where: { campaignId },
            include: [{
                model: this.getContactModel(),
                attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'email']
            }]
        });

        return results.map(cc => {
            const person = cc.Person || {};
            const name = `${person.firstName || ''} ${person.lastName || ''}`.trim();

            return {
                ...cc.toJSON(),
                contact_id: cc.contactId,
                name: name || 'Unknown',
                phone: person.phoneNumber,
                email: person.email
            };
        });
    }

    async findPendingByCampaign(campaignId) {
        const CampaignContact = this.getModel();
        return await CampaignContact.findAll({
            where: { campaignId, status: 'pending' },
            include: [{ model: this.getContactModel() }]
        });
    }

    async findOrCreate(filter, defaults) {
        const CampaignContact = this.getModel();
        const [cc, created] = await CampaignContact.findOrCreate({
            where: filter,
            defaults
        });
        return { record: cc, created };
    }

    async updateById(id, data) {
        const CampaignContact = this.getModel();
        const cc = await CampaignContact.findByPk(id);
        if (!cc) return null;
        Object.assign(cc, data);
        await cc.save();
        return cc;
    }

    async updateByMessageId(messageId, data) {
        const CampaignContact = this.getModel();
        await CampaignContact.update(data, { where: { messageId } });
    }

    async deleteMany(filter) {
        const CampaignContact = this.getModel();
        return await CampaignContact.destroy({ where: filter });
    }

    async deleteByCampaignAndContacts(campaignId, contactIds) {
        const CampaignContact = this.getModel();
        return await CampaignContact.destroy({
            where: { campaignId, contactId: contactIds }
        });
    }

    async count(filter = {}) {
        const CampaignContact = this.getModel();
        return await CampaignContact.count({ where: filter });
    }
}

module.exports = new CampaignContactRepository();
