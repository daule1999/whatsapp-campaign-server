const mongoose = require('mongoose');

const campaignContactSchema = new mongoose.Schema({
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: true
    },
    contactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
        default: 'pending'
    },
    messageId: {
        type: String,
        default: null
    },
    error: {
        type: String,
        default: null
    },
    sentAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Compound unique index to prevent duplicate campaign-contact pairs
campaignContactSchema.index({ campaignId: 1, contactId: 1 }, { unique: true });

const CampaignContact = mongoose.model('CampaignContact', campaignContactSchema);

module.exports = CampaignContact;
