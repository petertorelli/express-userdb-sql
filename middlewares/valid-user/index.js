'use strict'
const debug = require('debug')('userapp:valid-user')
const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const config = require('../../config')
const authDb = require('../../models/auth')

function checkJwt (req, res, next) {
	debug('checkJwt')
	res.locals.validUser = false
	if (req.session.token == undefined) {
		debug('no req.session.token or empty')
		return next() // ok, just carry on
	}
	jwt.verify(req.session.token, config.jwt.secret, (error, decoded) => {
		if (error) {
			debug('jwt decode error')
			// E.g., if the server restarts this will fail (or if bad token)
			return next() // ok, just carry on
		}
		debug('jwt decoded')
		res.locals.token = decoded
		return next() // carry on but the token now exists
	})
}

function checkUserSecret (req, res, next) {
	debug('checkUserSecret')
	if (!res.locals.token) {
		debug('no local token')
		return next() // ok, just carry on
	}
	authDb.validateLoginToken(res.locals.token.username, res.locals.token.login_token)
	.then(results => {
		// why does validateLoginToken not return a promise we can catch?
		if (results.error) {
			res.locals.validUser = false
			res.locals.userProfile = null
			debug('error validating token, check console')
			console.error(results.error)
			next(new Error('The server encountered an error.'))
		}
		// valid user, obtain the profile for this session
		debug('valid user')
		res.locals.validUser = true
		res.locals.userProfile = results.profile
		next()
	})
	.catch(error => {
		res.locals.validUser = false
		res.locals.userProfile = null
		debug('error validating token in catch')
		console.error('checkUserSecret():', results.error)
		next(new Error('The server encountered an error.'))
	})
}

router.use(checkJwt, checkUserSecret)

module.exports = router
