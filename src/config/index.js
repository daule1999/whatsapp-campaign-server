require('dotenv').config();

module.exports = {
    app: {
        name: process.env.APP_NAME || 'WhatsApp Campaign Manager',
        port: parseInt(process.env.PORT) || 3000,
        env: process.env.NODE_ENV || 'development',
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-me',
        accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    },

    database: {
        type: process.env.DB_TYPE || 'mongodb', // 'mysql' or 'mongodb'
        // MongoDB config
        mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_campaign',
        // MySQL config
        mysql: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            name: process.env.DB_NAME || 'whatsapp_campaign',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
        },
    },

    whatsapp: {
        token: process.env.WHATSAPP_TOKEN,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
        apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
        apiUrl: `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v18.0'}`,
    },

    messaging: {
        delayMs: parseInt(process.env.MESSAGE_DELAY_MS) || 3000,
    },

    externalApi: {
        contactsUrl: process.env.EXTERNAL_CONTACTS_API_URL,
        contactsApiKey: process.env.EXTERNAL_CONTACTS_API_KEY,
    },
};
