const crypto = require('crypto');
// Force the secret to reset every server reboot
//let secret = process.env.JWT_SECRET;
let secret = crypto.randomBytes(16).toString('hex');
module.exports = { secret };
