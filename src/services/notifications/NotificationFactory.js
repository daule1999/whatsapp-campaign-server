const WhatsAppProvider = require('./providers/WhatsAppProvider');
const SmsProvider = require('./providers/SmsProvider');
const EmailProvider = require('./providers/EmailProvider');
const IvrProvider = require('./providers/IvrProvider');

/**
 * Notification Factory
 * Creates notification providers based on type
 * Supports: whatsapp, sms, email, ivr
 */
class NotificationFactory {
    static providers = {};

    /**
     * Get a notification provider by type
     * @param {string} type - Provider type (whatsapp, sms, email, ivr)
     * @returns {BaseNotificationProvider} The provider instance
     */
    static getProvider(type) {
        const normalizedType = type.toLowerCase();

        if (!NotificationFactory.providers[normalizedType]) {
            NotificationFactory.providers[normalizedType] = NotificationFactory.createProvider(normalizedType);
        }

        return NotificationFactory.providers[normalizedType];
    }

    /**
     * Create a new provider instance
     * @param {string} type - Provider type
     * @returns {BaseNotificationProvider}
     */
    static createProvider(type) {
        switch (type) {
            case 'whatsapp':
                return new WhatsAppProvider();
            case 'sms':
                return new SmsProvider();
            case 'email':
                return new EmailProvider();
            case 'ivr':
                return new IvrProvider();
            default:
                throw new Error(`Unknown notification provider type: ${type}`);
        }
    }

    /**
     * Get all available provider types
     * @returns {string[]}
     */
    static getAvailableTypes() {
        return ['whatsapp', 'sms', 'email', 'ivr'];
    }

    /**
     * Get all configured providers
     * @returns {object} Map of type -> isConfigured
     */
    static getConfiguredProviders() {
        const result = {};
        for (const type of NotificationFactory.getAvailableTypes()) {
            const provider = NotificationFactory.getProvider(type);
            result[type] = provider.isConfigured();
        }
        return result;
    }

    /**
     * Send notification through multiple channels
     * @param {string[]} channels - Array of channel types
     * @param {string} to - Recipient
     * @param {string} templateName - Template name
     * @param {string} languageCode - Language code
     * @param {object} variables - Template variables
     * @returns {Promise<object>} Results per channel
     */
    static async sendMultiChannel(channels, to, templateName, languageCode, variables) {
        const results = {};

        for (const channel of channels) {
            try {
                const provider = NotificationFactory.getProvider(channel);
                if (provider.isConfigured()) {
                    results[channel] = await provider.sendTemplateMessage(to, templateName, languageCode, variables);
                } else {
                    results[channel] = { success: false, error: `${channel} provider not configured` };
                }
            } catch (error) {
                results[channel] = { success: false, error: error.message };
            }
        }

        return results;
    }

    /**
     * Reset all cached providers (useful for testing)
     */
    static reset() {
        NotificationFactory.providers = {};
    }
}

module.exports = NotificationFactory;
