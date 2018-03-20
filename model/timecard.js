const db = require('../db');

/**
 * Every function returns a promise with both descriptive resolution text
 * and a console.error() for DB errors.
 */

/**
 * Since these will all be requested by an AJAX call, and they aren't 
 * directly impacted by the user (e.g., a user isn't going to ask for 
 * segment #x), it is pointless to send errors back via reject.
 */

/**
 * This function handles the age-old problem of "What ID did I just insert?"
 * The MySQL docs indicate this is per session, and since this node app is
 * single threaded, then there should be no risks, right?
 */
module.exports.selectLastInsertId = function () {
	return new Promise((resolve, reject) => {
		const Q
			= 'SELECT LAST_INSERT_ID()'
			;
		db.sql.query({ sql: Q, timeout: 5000 }, (error, results) => {
			if (error) {
				console.error('selectLastInsertId(): ' + error);
				return reject();
			}
			let id = results[0]['LAST_INSERT_ID()'];
			resolve(id);
		});
	});
}

module.exports.getItems = function (user_id) {
	return new Promise((resolve, reject) => { 
		const params = [ user_id ];
		const Q
			= 'SELECT * FROM items '
			+ 'WHERE user_id=? '
			;
		db.sql.query({ sql: Q, timeout: 5000 }, params, (error, results) => {
			if (error) {
				console.error('getItems(): ' + error);
				return reject();
			}
			resolve(results);
		});
	});
}

module.exports.deleteItem = function (user_id, item_id) {
	return new Promise((resolve, reject) => { 
		const params = [ user_id, item_id ];
		const Q
			= 'DELETE FROM items '
			+ 'WHERE user_id=? AND id=? '
			;
		db.sql.query({ sql: Q, timeout: 5000 }, params, (error, results) => {
			if (error) {
				console.error('deleteItem(): ' + error);
				return reject();
			}
			resolve(results);
		});
	});
}

module.exports.addItem = function (user_id, name, start_date) {
	return new Promise((resolve, reject) => { 
		const params = [ user_id, name, start_date ];
		const Q
			= 'INSERT INTO items (user_id, name, start_date, active) ' 
			+ 'VALUES (?, ?, ?, 1)'
			;
		db.sql.query({ sql: Q, timeout: 5000 }, params, (error, results) => {
			if (error) {
				console.error('addItem(): ' + error);
				return reject();
			}
			resolve(results);
		});
	});
}

module.exports.activateItem = function (user_id, item_id, action) {
	return new Promise((resolve, reject) => { 
		let params = [ action, item_id, user_id ];
		let Q 
			= 'UPDATE items '
			+ 'SET active=? '
			+ 'WHERE id=? and user_id=?'; 
		db.sql.query({ sql: Q, timeout: 5000 }, params, (error, results) => {
			if (error) {
				console.error('activateItem(): ' + error);
				return reject();
			}
			resolve(results);
		});
	});
}

module.exports.getSegments = function (user_id, item_id) {
	return new Promise((resolve, reject) => { 
		let params = [ item_id, user_id ];
		let Q = 'SELECT * FROM segments WHERE item_id=? and user_id=?';
		db.sql.query({ sql: Q, timeout: 5000 }, params, (error, results) => {
			if (error) {
				console.error('getSegments(): ' + error);
				return reject();
			}
			resolve(results);
		});
	});
}

module.exports.createSegment = function (user_id, item_id, t0) {
	return new Promise((resolve, reject) => { 
		let params = [ t0, item_id, user_id ];
		let Q 
			= 'INSERT INTO segments (t0, item_id, user_id) ' 
			+ 'VALUES (?, ?, ?)'
		db.sql.query({ sql: Q, timeout: 5000 }, params, (error, results) => {
			if (error) {
				console.error('createSegment(): ' + error);
				return reject();
			}
			resolve(results);
		});
	});
}

module.exports.endSegment = function (user_id, segment_id, tn) {
	return new Promise((resolve, reject) => { 
		let params = [ tn, segment_id, user_id ];
		let Q  = 'UPDATE segments SET tn=? WHERE id=? AND user_id=?'; 
		db.sql.query({ sql: Q, timeout: 5000 }, params, (error, results) => {
			if (error) {
				console.error('endSegment(): ' + error);
				return reject();
			}
			resolve(results);
		});
	});
}
