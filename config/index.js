const mysql = require('./components/mysql')
const jwt = require('./components/jwt')
const runbox = require('./components/runbox')

module.exports = { sql: mysql, jwt, mail: runbox };
