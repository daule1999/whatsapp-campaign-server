const config = require('../../config');

/**
 * CampaignContact Repository - abstracts database operations for CampaignContact model
 */
class CampaignContactRepository {
    constructor() {
        this.dbType = config.database.type;
    }

    getModel() {
        const models = require('../models');
        return models.CampaignContact;
    }

    getContactModel() {
        const models = require('../models');
        return models.Person;
    }

    async findById(id) {
        const CampaignContact = this.getModel();
        if (this.dbType === 'mysql') {
            return await CampaignContact.findByPk(id);
        } else {
            return await CampaignContact.findById(id);
        }
    }

    async findAll(filter = {}, options = {}) {
        const CampaignContact = this.getModel();
        if (this.dbType === 'mysql') {
            const include = [];
            if (options.includeContact) {
                include.push({
                    model: this.getContactModel(),
                    attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'email']
                });
            }
            return await CampaignContact.findAll({ where: filter, include });
        } else {
            let query = CampaignContact.find(filter);
            if (options.includeContact) {
                query = query.populate('contactId', 'firstName lastName phoneNumber email');
            }
            return await query;
        }
    }

    async findByCampaignWithContacts(campaignId) {
        const CampaignContact = this.getModel();
        if (this.dbType === 'mysql') {
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
        } else {
            const results = await CampaignContact.find({ campaignId })
                .populate('contactId', 'firstName lastName phoneNumber email');

            return results.map(cc => {
                const obj = cc.toObject();
                const person = cc.contactId || {};
                const name = `${person.firstName || ''} ${person.lastName || ''}`.trim();

                return {
                    ...obj,
                    id: obj._id,
                    contact_id: cc.contactId?._id,
                    name: name || 'Unknown',
                    phone: person.phoneNumber,
                    email: person.email
                };
            });
        }
    }

    async findPendingByCampaign(campaignId) {
        const CampaignContact = this.getModel();
        if (this.dbType === 'mysql') {
            return await CampaignContact.findAll({
                where: { campaignId, status: 'pending' },
                include: [{ model: this.getContactModel() }]
            });
        } else {
            return await CampaignContact.find({ campaignId, status: 'pending' })
                .populate('contactId');
        }
    }

    async findOrCreate(filter, defaults) {
        const CampaignContact = this.getModel();
        if (this.dbType === 'mysql') {
            const [cc, created] = await CampaignContact.findOrCreate({
                where: filter,
                defaults
            });
            return { record: cc, created };
        } else {
            const existing = await CampaignContact.findOne(filter);
            if (existing) {
                return { record: existing, created: false };
            }
            const cc = await CampaignContact.create({ ...filter, ...defaults });
            return { record: cc, created: true };
        }
    }

    async updateById(id, data) {
        const CampaignContact = this.getModel();
        if (this.dbType === 'mysql') {
            const cc = await CampaignContact.findByPk(id);
            if (!cc) return null;
            Object.assign(cc, data);
            await cc.save();
            return cc;
        } else {
            const cc = await CampaignContact.findById(id);
            if (!cc) return null;
            Object.assign(cc, data);
            await cc.save();
            return cc;
        }
    }

    async updateByMessageId(messageId, data) {
        const CampaignContact = this.getModel();
        if (this.dbType === 'mysql') {
            await CampaignContact.update(data, { where: { messageId } });
        } else {
            await CampaignContact.updateOne({ messageId }, data);
        }
    }

    async deleteMany(filter) {
        const CampaignContact = this.getModel();
        if (this.dbType === 'mysql') {
            return await CampaignContact.destroy({ where: filter });
        } else {
            const result = await CampaignContact.deleteMany(filter);
            return result.deletedCount;
        }
    }

    async deleteByCampaignAndContacts(campaignId, contactIds) {
        const CampaignContact = this.getModel();
        if (this.dbType === 'mysql') {
            return await CampaignContact.destroy({
                where: { campaignId, contactId: contactIds }
            });
        } else {
            const result = await CampaignContact.deleteMany({
                campaignId,
                contactId: { $in: contactIds }
            });
            return result.deletedCount;
        }
    }

    async count(filter = {}) {
        const CampaignContact = this.getModel();
        if (this.dbType === 'mysql') {
            return await CampaignContact.count({ where: filter });
        } else {
            return await CampaignContact.countDocuments(filter);
        }
    }
}

module.exports = new CampaignContactRepository();
