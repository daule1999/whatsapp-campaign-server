/**
 * Base Notification Provider Interface
 * All notification providers must implement these methods
 */
class BaseNotificationProvider {
    constructor() {
        if (new.target === BaseNotificationProvider) {
            throw new Error('BaseNotificationProvider cannot be instantiated directly');
        }
        this.type = 'base';
    }

    /**
     * Get the provider type
     * @returns {string} Provider type (whatsapp, sms, email, ivr)
     */
    getType() {
        return this.type;
    }

    /**
     * Check if the provider is configured and ready
     * @returns {boolean}
     */
    isConfigured() {
        throw new Error('Method not implemented');
    }

    /**
     * Send a template message
     * @param {string} to - Recipient identifier (phone, email, etc.)
     * @param {string} templateName - Template name/identifier
     * @param {string} languageCode - Language code
     * @param {object} variables - Template variables
     * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
     */
    async sendTemplateMessage(to, templateName, languageCode, variables) {
        throw new Error('Method not implemented');
    }

    /**
     * Send a direct message (for user-initiated conversations)
     * @param {string} to - Recipient identifier
     * @param {string} message - Message content
     * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
     */
    async sendMessage(to, message) {
        throw new Error('Method not implemented');
    }

    /**
     * Send bulk messages
     * @param {Array<{to: string, templateName: string, languageCode: string, variables?: object}>} messages
     * @returns {Promise<{sent: number, failed: number, results: Array}>}
     */
    async sendBulk(messages) {
        const results = [];
        let sent = 0;
        let failed = 0;

        for (const msg of messages) {
            const result = await this.sendTemplateMessage(
                msg.to,
                msg.templateName,
                msg.languageCode,
                msg.variables || []
            );
            results.push(result);
            if (result.success) sent++;
            else failed++;
        }

        return { sent, failed, results };
    }

    /**
     * Get available templates
     * @returns {Promise<{success: boolean, templates?: Array, error?: string}>}
     */
    async getTemplates() {
        throw new Error('Method not implemented');
    }

    /**
     * Format recipient identifier
     * @param {string} identifier - Raw identifier
     * @returns {string} Formatted identifier
     */
    formatRecipient(identifier) {
        return identifier;
    }
}

module.exports = BaseNotificationProvider;
