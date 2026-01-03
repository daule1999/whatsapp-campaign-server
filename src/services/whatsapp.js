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
        // Filter components - only include those with actual parameters (for dynamic values)
        // Components from template storage contain 'type', 'text', 'format' which are NOT for sending
        // When sending, we only need components with 'parameters' array
        const sendableComponents = Array.isArray(components)
            ? components.filter(c => c.parameters && c.parameters.length > 0)
            : [];

        const payload = {
            messaging_product: 'whatsapp',
            to: this.formatPhone(to),
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode }
            }
        };

        // Only add components if there are actual parameters
        if (sendableComponents.length > 0) {
            payload.template.components = sendableComponents;
        }

        const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

        try {
            const response = await axios.post(
                url,
                payload,
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
                to,
                request: { url, method: 'POST', data: payload }
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
        const url = `${this.apiUrl}/${config.whatsapp.businessAccountId}/message_templates`;
        console.log('Creating WhatsApp template:', { url, data: JSON.stringify(data, null, 2) });
        try {
            const response = await axios.post(
                url,
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
                rawError: rawError,
                request: { url, method: 'POST', data }
            };
        }
    }

    /**
     * Delete message template from WhatsApp
     */
    async deleteTemplate(templateName) {
        const url = `${this.apiUrl}/${config.whatsapp.businessAccountId}/message_templates?name=${encodeURIComponent(templateName)}`;
        console.log('Deleting WhatsApp template:', templateName);
        try {
            const response = await axios.delete(
                url,
                {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Delete template error:', error.response?.data || error.message);
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
     * Send interactive button message (for chatbot menus)
     */
    async sendInteractiveButtons(to, bodyText, buttons) {
        const payload = {
            messaging_product: 'whatsapp',
            to: this.formatPhone(to),
            type: 'interactive',
            interactive: {
                type: 'button',
                body: { text: bodyText },
                action: {
                    buttons: buttons.slice(0, 3).map((btn, idx) => ({
                        type: 'reply',
                        reply: {
                            id: btn.id || `btn_${idx}`,
                            title: btn.title.substring(0, 20) // Max 20 chars
                        }
                    }))
                }
            }
        };

        try {
            const response = await axios.post(
                `${this.apiUrl}/${this.phoneNumberId}/messages`,
                payload,
                { headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' } }
            );
            return { success: true, messageId: response.data.messages?.[0]?.id };
        } catch (error) {
            console.error('Send interactive error:', error.response?.data || error.message);
            return { success: false, error: error.response?.data?.error?.message || error.message };
        }
    }

    /**
     * Send image message
     */
    async sendImageMessage(to, imageUrl, caption = '') {
        const payload = {
            messaging_product: 'whatsapp',
            to: this.formatPhone(to),
            type: 'image',
            image: { link: imageUrl, caption }
        };

        try {
            const response = await axios.post(
                `${this.apiUrl}/${this.phoneNumberId}/messages`,
                payload,
                { headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' } }
            );
            return { success: true, messageId: response.data.messages?.[0]?.id };
        } catch (error) {
            console.error('Send image error:', error.response?.data || error.message);
            return { success: false, error: error.response?.data?.error?.message || error.message };
        }
    }

    /**
     * Send a simple text message (within 24-hour window)
     */
    async sendFreeTextMessage(to, text) {
        const payload = {
            messaging_product: 'whatsapp',
            to: this.formatPhone(to),
            type: 'text',
            text: { body: text }
        };

        try {
            const response = await axios.post(
                `${this.apiUrl}/${this.phoneNumberId}/messages`,
                payload,
                { headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' } }
            );
            return { success: true, messageId: response.data.messages?.[0]?.id };
        } catch (error) {
            console.error('Send text error:', error.response?.data || error.message);
            return { success: false, error: error.response?.data?.error?.message || error.message };
        }
    }

    /**
     * Check if API is configured
     */
    isConfigured() {
        return !!(this.token && this.phoneNumberId);
    }
}

module.exports = new WhatsAppService();
