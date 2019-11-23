'use strict'
const debug = require('debug')('auth');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../../config');
const authDb = require('../../models/auth');

function checkJwt (req, res, next) {
	console.log('checkJwt')
	res.locals.validUser = false
	if (!req.session.token || req.session.token === {}) {
		console.log('no req.session.token or empty')
		return next() // ok, just carry on
	}
	jwt.verify(req.session.token, config.jwt.secret, (error, decoded) => {
		if (error) {
			console.error('checkJwt():', error)
			return next() // ok, just carry on
		}
		console.log('jwt decoded')
		res.locals.token = decoded
		return next() // carry on but the token now exists
	})
	return next()
}

function checkUserSecret (req, res, next) {
	console.log('checkUserSecret')
	if (!res.locals.token) {
		return next() // ok, just carry on
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

module.exports = router