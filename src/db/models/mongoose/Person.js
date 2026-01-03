const mongoose = require('mongoose');

/**
 * Person Model - Stores all person/contact information
 * Used for campaigns across all notification channels
 */
const personSchema = new mongoose.Schema({
    // Basic Info
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        default: '',
        trim: true
    },

    // Phone Numbers
    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },
    phoneCountryCode: {
        type: String,
        default: '91', // India
        trim: true
    },

    // WhatsApp (can be same as phone or different)
    whatsappNumber: {
        type: String,
        default: null,
        trim: true
    },
    whatsappCountryCode: {
        type: String,
        default: null,
        trim: true
    },
    whatsappSameAsPhone: {
        type: Boolean,
        default: true
    },

    // Email
    email: {
        type: String,
        default: null,
        trim: true,
        lowercase: true
    },

    // Additional Details
    company: {
        type: String,
        default: null,
        trim: true
    },
    designation: {
        type: String,
        default: null,
        trim: true
    },
    address: {
        street: { type: String, default: null },
        city: { type: String, default: null },
        state: { type: String, default: null },
        country: { type: String, default: 'India' },
        postalCode: { type: String, default: null }
    },

    // Custom Fields (for extensibility)
    customFields: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Tags for grouping
    tags: [{
        type: String,
        trim: true
    }],

    // Source tracking
    source: {
        type: String,
        default: 'manual',
        enum: ['manual', 'import', 'api', 'webhook', 'form']
    },

    // Communication preferences
    preferences: {
        whatsappOptIn: { type: Boolean, default: true },
        smsOptIn: { type: Boolean, default: true },
        emailOptIn: { type: Boolean, default: true },
        ivrOptIn: { type: Boolean, default: true }
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
    },

    // Metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },

    // Notes
    notes: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Virtual for full name
personSchema.virtual('name').get(function () {
    return `${this.firstName} ${this.lastName}`.trim();
});

// Virtual for formatted phone
personSchema.virtual('formattedPhone').get(function () {
    return `+${this.phoneCountryCode}${this.phoneNumber}`;
});

// Virtual for WhatsApp number (uses phone if same)
personSchema.virtual('whatsapp').get(function () {
    if (this.whatsappSameAsPhone) {
        return `+${this.phoneCountryCode}${this.phoneNumber}`;
    }
    return this.whatsappNumber ? `+${this.whatsappCountryCode || this.phoneCountryCode}${this.whatsappNumber}` : null;
});

// Index for searching
personSchema.index({ firstName: 'text', lastName: 'text', email: 'text', phoneNumber: 'text' });
personSchema.index({ phoneNumber: 1, phoneCountryCode: 1 }, { unique: true });
personSchema.index({ tags: 1 });
personSchema.index({ isActive: 1 });

// Ensure virtuals are included in JSON
personSchema.set('toJSON', { virtuals: true });
personSchema.set('toObject', { virtuals: true });

const Person = mongoose.model('Person', personSchema);

module.exports = Person;
