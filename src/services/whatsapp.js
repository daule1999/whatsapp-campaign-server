const axios = require('axios');
const config = require('../config');

class WhatsAppService {
    constructor() {
        this.token = config.whatsapp.token;
        this.phoneNumberId = config.whatsapp.phoneNumberId;
        this.apiUrl = config.whatsapp.apiUrl;
    }

    /**
     * Send a template message
     */
    async sendTemplateMessage(to, templateName, languageCode = 'en', components = []) {
        try {
            const response = await axios.post(
                `${this.apiUrl}/${this.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: this.formatPhone(to),
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
            const rawError = error.response?.data?.error;
            return {
                success: false,
                error: rawError?.message || error.message,
                rawError: rawError,
                to
            };
        }
    }

    /**
     * Send a text message (for user-initiated conversations)
     */
    async sendTextMessage(to, message) {
        try {
            const response = await axios.post(
                `${this.apiUrl}/${this.phoneNumberId}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: this.formatPhone(to),
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
            const rawError = error.response?.data?.error;
            return {
                success: false,
                error: rawError?.message || error.message,
                rawError: rawError,
                to
            };
        }
    }

    /**
     * Create message template on WhatsApp
     */
    async createTemplate(data) {
        try {
            const response = await axios.post(
                `${this.apiUrl}/${config.whatsapp.businessAccountId}/message_templates`,
                data,
                {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Create template error:', error.response?.data || error.message);
            const rawError = error.response?.data?.error;
            return {
                success: false,
                error: rawError?.message || error.message,
                rawError: rawError
            };
        }
    }

    /**
     * Get message templates from WhatsApp
     */
    async getTemplates() {
        try {
            const response = await axios.get(
                `${this.apiUrl}/${config.whatsapp.businessAccountId}/message_templates`,
                {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                }
            );

            return {
                success: true,
                templates: response.data.data || []
            };
        } catch (error) {
            console.error('WhatsApp API Error:', error.response?.data || error.message);
            const rawError = error.response?.data?.error;
            return {
                success: false,
                error: rawError?.message || error.message,
                rawError: rawError
            };
        }
    }

    /**
     * Format phone number
     */
    formatPhone(phone) {
        let cleaned = phone.toString().replace(/\D/g, '');
        if (cleaned.startsWith('0')) cleaned = '91' + cleaned.substring(1);
        if (cleaned.length === 10) cleaned = '91' + cleaned;
        return cleaned;
    }

    /**
     * Check if API is configured
     */
    isConfigured() {
        return !!(this.token && this.phoneNumberId);
    }
}

module.exports = new WhatsAppService();
