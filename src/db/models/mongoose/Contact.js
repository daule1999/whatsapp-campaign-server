const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        default: null,
        trim: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    source: {
        type: String,
        default: 'manual'
    }
}, {
    timestamps: true
});

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
