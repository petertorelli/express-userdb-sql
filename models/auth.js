'use strict'
const debug = require('debug')('userapp:auth');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('./db');

// bcrypt
const SALT_ROUNDS = 10;

/**
 * When the code catches an error I always want to let the use know there
 * was an error, but sometimes I don't want to tell them EXACTLY what happened,
 * like if I have a typo in a callback, or a database failure. Instead, print
 * the real error to console.error and resolve with this message.
 */
const generic_error = { error: 'The server encountered an error.' };

/**
 * All of these promises resolve, none reject. If there is an operational 
 * error, the resolution parameter will have an 'error' field. This error 
 * message is the one printed by the server. Programmatic errors are handled 
 * by the promise chain's catch.
 */

/**
 * An internal unique 'username' is created by lower-casing (locale) the email
 * address. However the email is stored with the user-specified case because
 * standards state the local part of an email address IS case sensitive (for
 * real, look it up). I use 'username' as the primary key because ID is so
 * redundant: you end up having to resolve username<>ID too often, not to 
 * mention the need for 'select last insert id' flow in MySQl.
 */

/**
 * Returns the entire 'users' entry from the database.
 */
const getUserFromEmail = function (email) {
	debug('getUserFromEmail(', email, ')');
	return new Promise((resolve, reject) => {
		const username = email.toLocaleLowerCase();
		const params = [ username ];
		const Q = 'SELECT * FROM users WHERE username=? ';
		db.sql.query({ sql: Q, timeout: 5000 }, params, (error, results) => {
			if (error) {
				console.error(error);
				return resolve(generic_error);
			}
			// TODO: I don't like revealing if an email is registered.
			if (results.length === 0) {
				return resolve({ error: 'Email not found.'});
			}
			resolve({ profile: results[0] });
		});
	});
}

/**
 * Inserts a new user into the database, password is already hashed.
 *
 * Returns 'username'.
 */
const insertNewUser = function (email, hash) {
	debug('insertNewUser(', email, hash, ')');
	return new Promise((resolve, reject) => {
		const username = email.toLocaleLowerCase();
		const params = [ username, email, hash ];
		const Q
			= 'INSERT INTO users '
			+ '(username, email, password, active, security_level) '
			+ 'VALUES (?, ?, ?, 0, 0) '
			;
		db.sql.query({ sql: Q, timeout: 5000 }, params, (error, results) => {
			if (error) {
				if (error.code && error.code === 'ER_DUP_ENTRY') {
					return resolve({ error: 'That email address is in use.' });
				} else {
					console.error(error);
					return resolve(generic_error);
				}
			}
			return resolve({ username });
		});
	});
}

/**
 * Not sure how to create an authorization token, so for now I'm fudging.
 * It is 16B (32 char) + 16 chars of Date.now() = 48 chars.
 * Mail the actual token, but store the SHA256 hash of it.
 * 
 * Returns 'auth_token'.
 */
const createAuthToken = function (username) {
	debug('createAuthToken(', username, ')');
	return new Promise((resolve, reject) => {
		const randomBytes = crypto.randomBytes(16).toString('hex');
		const now = Date.now().toString(16);
		const auth_token = randomBytes + now;
		const hash = crypto.createHash('sha256').update(auth_token).digest('hex');
		const params = [ hash, username ];
		const Q
			= 'UPDATE users ' 
			+ 'SET auth_token=? '
			+ 'WHERE username=? '
			;
		db.sql.query({ sql: Q, timeout: 5000 }, params, (error, results) => {
			if (error) {
				console.error(error);
				return resolve(generic_error);
			}
			return resolve({ auth_token });
		});
	});
}

/**
 * The auth_token in the schema is used for email-based link auth codes by
 * activation and login-via-token. The token contains a date which is broken
 * out and compared to the current time to see if it expired. Then the 
 * account is looked up via the hash of the token.
 *
 * Returns the entire 'users' entry from the database. Yep.
 */
const validateAuthToken = function (auth_token) {
	debug('validateAuthToken(', auth_token, ')');
	return new Promise((resolve, reject) => {
		// 32 chars of random, 16 chars of date.
		const randomBytes = auth_token.slice(0, 32);
		const date = auth_token.slice(16);
		const tokenBirth = new Date(parseInt(date, 16));
		const now = Date.now();
		const diffMs = now - tokenBirth;
		// 1 hour life expectnecy
		const expire = 1 * 60 * 60 * 1000;
		if (diffMs > expire) {
			return resolve({ error: 'This code has expired.'});
		}
		const hash = crypto.createHash('sha256').update(auth_token).digest('hex');
		const params = [ hash ];
		const Q
			= 'SELECT * ' 
			+ 'FROM users '
			+ 'WHERE auth_token=? '
			;
		debug('time for query');
		db.sql.query({ sql: Q, timeout: 5000 }, params, (error, results) => {
			if (error) {
				console.error(error);
				return resolve(generic_error);
			}
			if (results.length === 0) {
				return resolve({ error: 'Invalid code.'})
			}
			return resolve({ profile: results[0] });
		});
	});
}

/**
 * Clears the 'auth_token'.
 *
 * Returns 'username'.
 */
const clearAuthToken =  function (username) {
	debug('clearAuthToken(', username, ')');
	return new Promise((resolve, reject) => {
		const params = [ username ];
		const Q
			= 'UPDATE users ' 
			+ 'SET auth_token=NULL '
			+ 'WHERE username=? '
			;
		db.sql.query({ sql: Q, timeout: 5000 }, params, (error, results) => {
			if (error) {
				console.error(error);
				return resolve(generic_error);
			}
			return resolve({ username });
		});
	});
}

/**
 * Once a valid token is parsed, activate the user and null out the activation
 * token so that it cannot be used again.
 *
 * Returns 'username'.
 */
const activateAccount =  function (username) {
	debug('activateAccount(', username, ')');
	return new Promise((resolve, reject) => {
		const params = [ username ];
		const Q
			= 'UPDATE users ' 
			+ 'SET active=1 '
			+ 'WHERE username=? '
			;
		db.sql.query({ sql: Q, timeout: 5000 }, params, (error, results) => {
			if (error) {
				console.error(error);
				return resolve(generic_error);
			}
			return resolve({ username });
		});
	});
}

/**
 * The login_token is sync'd to the browser and used for 'remember me' style
 * authentication session-to-session.
 *
 * Returns 'login_token' and 'username'.
 */
const updateLoginToken = function (username) {
	debug('updateLoginToken(', username, ')');
	return new Promise((resolve, reject) => {
		const randomBytes = crypto.randomBytes(32).toString('hex');
		const pt = randomBytes + username;
		const login_token = crypto.createHash('sha256').update(pt).digest('hex');
		const params = [ login_token, username ];
		const Q
			= 'UPDATE users ' 
			+ 'SET login_token=? '
			+ 'WHERE username=? '
			;
		db.sql.query({ sql: Q, timeout: 5000 }, params, (error, results) => {
			if (error) {
				console.error(error);
				return resolve(generic_error);
			}
			// The token is placed in the JWT, as is the username
			return resolve({ login_token, username });
		});
	});
}

/**
 * Update a hashsed password for a username.
 *
 * Returns 'username'.
 */
const changePassword = function (username, hash) {
 	return new Promise((resolve, reject) => {
		const params = [ hash, username ];
		const Q
			= 'UPDATE users '
			+ 'SET password=? '
			+ 'WHERE username=? '
			;
		db.sql.query({ sql: Q, timeout: 5000 }, params, (error, results) => {
			if (error) {
				if (error.code && error.code === 'ER_DUP_ENTRY') {
					return resolve({ error: 'That email address is in use.' });
				} else {
					console.error(error);
					return resolve(generic_error);
				}
			}
			return resolve({ username });
		});
 	});
}

/**
 * Perform the password check flow and update the login token.
 *
 * Returns 'login_token' and 'username'.
 */
module.exports.login = function (email, plaintext_password) {
	debug('login(', email, '<plaintext_password>', ')');
	return getUserFromEmail(email, plaintext_password)
	.then(results => {
		if (results.error) {
			return Promise.resolve(results);
		}
		if (results.profile.active === 0) {
			return Promise.resolve({ error: 'Account has not been activated.'});
		}
		if (results.profile.security_level === 0) {
			return Promise.resolve({ error: `Active account does not have high enough security level. Please email ${process.env.ADMIN_EMAIL} for approval.`});
		}
		return bcrypt.compare(plaintext_password, results.profile.password)
		.then(res => {
			if (res === false) {
				return Promise.resolve({ error: 'The password is incorrect.' });
			}
			return updateLoginToken(results.profile.username);
		})
	});
}

/**
 * Checks to see if the 128b login_token exists in the user database.
 * This hash is NULL'd when a user is deactivated or changed.
 *
 * Returns the entire 'users' entry from the database.
 */
module.exports.validateLoginToken = function (username, login_token) {
	debug('validateLoginToken(', username, login_token, ')');
	return getUserFromEmail(username /* ok since username = lowercase email */)
	.then(results => {
		if (results.error) {
			return Promise.resolve(results);
		}
		if (results.profile.login_token != login_token) {
			// TODO: Fix this, can't leave the user hanging!
			return Promise.resolve(generic_error);
		}
		return Promise.resolve(results);
	});
}

/**
 * Creates a new user that is not ACTIVE ('active'=0). Needs auth token verify.
 *
 * Returns 'auth_token'.
 */
module.exports.signup = function (email, plaintext_password) {
	debug('signup(', email, plaintext_password, ')');
	return bcrypt.hash(plaintext_password, SALT_ROUNDS)
	.then(hash => insertNewUser(email, hash))
	.then(results => {
		if (results.error) {
			return Promise.resolve(results);
		}
		return createAuthToken(results.username);
	});
}

/**
 * If the user loses their activation code, do it again.
 *
 * Returns 'auth_token'.
 */
module.exports.requestActivationToken = function (email) {
	debug('requestActivationToken(', email, ')');
	return getUserFromEmail(email)
	.then(results => {
		if (results.error) {
			return Promise.resolve(results);
		}
		if (results.profile.active !== 0) {
			return Promise.resolve({ error: 'Account is already active' });
		}
		return createAuthToken(results.username);
	});
};

/**
 * Similar to account activation, password reset uses the generic token to
 * verify the operation is allowed.
 *
 * Returns 'auth_token'.
 */
module.exports.requestPasswordResetToken = function (email) {
	debug('requestPasswordResetToken(', email, ')');
	return getUserFromEmail(email)
	.then(results => {
		if (results.error) {
			return Promise.resolve(results);
		}
		if (results.profile.active === 0) {
			return Promise.resolve({ error: 'Account has not been activated.' });
		}
		return createAuthToken(results.profile.username);
	});
}

/**
 * Calls the change password flow.
 *
 * Returns 'username'.
 */
module.exports.changePassword = function (username, plaintext_password) {
	debug('changePassword(', username, '<plaintext_password>', ')');
 	return bcrypt.hash(plaintext_password, SALT_ROUNDS)
 	.then(hash => changePassword(username, hash));
}

/**
 * DANGER ZONE
 * DANGER ZONE -- These functions allow token-based access.
 * DANGER ZONE
 */

/**
 * The temporary token created by the signup flow is passed to this function to 
 * activate the account.
 * 
 * Returns 'username'.
 */
module.exports.activateAccount = function (auth_token) {
	debug('activateAccount(', auth_token, ')');
	return validateAuthToken(auth_token)
	.then(results => {
		if (results.error) {
			return Promise.resolve(results);
		}
		return clearAuthToken(results.profile.username)
	})
	.then(results => {
		if (results.error) {
			return Promise.resolve(results);
		}
		return activateAccount(results.username)
	});
}

/**
 * Login via the temporary 'auth_token' created at some earlier time.
 *
 * Returns 'login_token' and 'username'.
 */
module.exports.loginViaToken = function (auth_token) {
	debug('loginViaToken(', auth_token, ')');
	return validateAuthToken(auth_token)
	.then(results => {
		if (results.error) {
			return Promise.resolve(results);
		}
		return clearAuthToken(results.profile.username)
	})
	.then(results => {
		if (results.error) {
			return Promise.resolve(results);
		}
		return updateLoginToken(results.username)
	});
}
