const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    waTemplateName: {
        type: String,
        required: true,
        trim: true
    },
    languageCode: {
        type: String,
        default: 'en',
        maxlength: 10
    },
    bodyPreview: {
        type: String,
        default: ''
    },
    components: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;
