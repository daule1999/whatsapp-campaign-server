const NotificationFactory = require('./NotificationFactory');

module.exports = {
    NotificationFactory,
    // Convenience exports
    getProvider: (type) => NotificationFactory.getProvider(type),
    getWhatsApp: () => NotificationFactory.getProvider('whatsapp'),
    getSms: () => NotificationFactory.getProvider('sms'),
    getEmail: () => NotificationFactory.getProvider('email'),
    getIvr: () => NotificationFactory.getProvider('ivr'),
};
