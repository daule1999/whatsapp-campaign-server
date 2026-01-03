const config = require('../../config');

// Get models based on database type
function getModels() {
    if (config.database.type === 'mysql') {
        return require('./sequelize');
    } else {
        return require('./mongoose');
    }
}

module.exports = getModels();
