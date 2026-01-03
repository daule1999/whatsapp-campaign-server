const axios = require('axios');
const config = require('../../../config');
const BaseNotificationProvider = require('./BaseNotificationProvider');

/**
 * WhatsApp Provider using Meta Cloud API
 */
class WhatsAppProvider extends BaseNotificationProvider {
    constructor() {
        super();
        this.type = 'whatsapp';
        this.token = config.whatsapp?.token;
        this.phoneNumberId = config.whatsapp?.phoneNumberId;
        this.apiUrl = config.whatsapp?.apiUrl || 'https://graph.facebook.com/v17.0';
        this.businessAccountId = config.whatsapp?.businessAccountId;
    }

    isConfigured() {
        return !!(this.token && this.phoneNumberId);
    }

    formatRecipient(phone) {
        let cleaned = phone.toString().replace(/\D/g, '');
        if (cleaned.startsWith('0')) cleaned = '91' + cleaned.substring(1);
        if (cleaned.length === 10) cleaned = '91' + cleaned;
        return cleaned;
    }

    async sendTemplateMessage(to, templateName, languageCode = 'en', components = []) {
        try {
            const response = await axios.post(
                `${this.apiUrl}/${this.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: this.formatRecipient(to),
                    type: 'template',
                    template: {
                        name: templateName,
                        language: { code: languageCode },
                        components: components
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                messageId: response.data.messages?.[0]?.id,
                to
            };
        } catch (error) {
            console.error('WhatsApp API Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message,
                to
            };
        }
    }

    async sendMessage(to, message) {
        try {
            const response = await axios.post(
                `${this.apiUrl}/${this.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: this.formatRecipient(to),
                    type: 'text',
                    text: { preview_url: true, body: message }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                messageId: response.data.messages?.[0]?.id,
                to
            };
        } catch (error) {
            console.error('WhatsApp API Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message,
                to
            };
        }
    }

    async getTemplates() {
        try {
            const response = await axios.get(
                `${this.apiUrl}/${this.businessAccountId}/message_templates`,
                {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                }
            );

            return {
                success: true,
                templates: response.data.data || []
            };
        } catch (error) {
            console.error('Get templates error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }
}

module.exports = WhatsAppProvider;
