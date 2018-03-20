'use strict'
const debug = require('debug')('valid-user');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../config');
const authDb = require('../model/auth');

/**
 * This is a middleware that validates a peristant login cookie EVERY access.
 * The cookie is a JWT with a secret that is stored in the server. So there's
 * a database query every page hit that returns the user profile.
 */
 
function checkJwt (req, res, next) {
	res.locals.validUser = false;
	if (! req.cookies.token || req.cookies.token === {}) {
		return next(); // ok, just carry on
	}
	jwt.verify(req.cookies.token, config.jwt.secret, (error, decoded) => {
		if (error) {
			console.error('checkJwt():', error);
			return next(); // ok, just carry on
		}
		res.locals.token = decoded;
		return next(); // carry on but the token now exists
	});
}

function checkUserSecret (req, res, next) {
	if (! res.locals.token) {
		return next(); // ok, just carry on
	}
	authDb.validateLoginToken(res.locals.token.username, res.locals.token.login_token)
	.then(results => {
		if (results.error) {
			res.locals.validUser = false;
			res.locals.userProfile = null;
			console.error('checkUserSecret():', results.error);
			next(new Error('The server encountered an error.'));
		}
		// valid user, obtain the profile for this session
		res.locals.validUser = true;
		res.locals.userProfile = results.profile;
		next();
	})
	.catch(error => {
		res.locals.validUser = false;
		res.locals.userProfile = null;
		console.error('checkUserSecret():', results.error);
		next(new Error('The server encountered an error.'));
	});
}

router.use(checkJwt, checkUserSecret);

module.exports = router;
