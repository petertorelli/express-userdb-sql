const mysql = require('mysql');
const config = require('../config');

function handleDisconnect () {
	exports.sql = mysql.createConnection(config.sql);

	exports.sql.connect(error => {
		if (error) {
			console.error('Failed to start SQL:', error);
			console.log('Attempting to reconnect in 2s...');
			setTimeout(handleDisconnect, 2000);
		} else {
			console.log('Connection established to database');
		}
	});

	exports.sql.on('error', error => {
		console.error('SQL error:', error);
		if (error.code === 'PROTOCOL_CONNECTION_LOST') {
			handleDisconnect();
		} else {
			throw error;
		}
	});
}

handleDisconnect();

// TODO: Add a MySQL close connection on process exit
