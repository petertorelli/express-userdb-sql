'use strict'
const debug = require('debug')('user');
const express = require('express');
const router = express.Router();
const config = require('../../config');
const jwt = require('jsonwebtoken');
const authDb = require('../../models/auth');
const mail = require('../../models/mail');
const validUser = require('../../middlewares/valid-user');
const path = require('path')

// Used for all catch runtime errors, but send the failure to console.error().
const genericError = {
	serverClass: 'alert alert-danger',
	error: 'The server encountered an error.'
}

// Views are stored per router
const pugdir = path.resolve(__dirname, 'pug')

/** TODO
 * Google captcha.
 * Standardize:
 * https://www.chromium.org/developers/design-documents/create-amazing-password-forms
 */

// 100ms debounce on user route to alleviate spamming (smart or not?)
router.use((req, res, next) => {
	setTimeout(() => {
		next();
	}, 100);
})

const sendActivationEmail = function (email, auth_token) {
	debug('sendActivationEmail(', email, auth_token, ')');
	let url = 'https://repete.io/user/activate?x=' + auth_token;
	return mail.send({
		subject: 'Activate your account at repete.io',
		to: email,
		from: '"info@repete.io" <info@repete.io>',
		text: 
			'Someone used this email to create an account at repete.io.\n' +
			'Follow this link to activate your account within one hour:\n'
				+ url + '\n' +
			'...or simply disregard this email if it wasn\'t you.\n\n' +
			'Thanks,\nrepete.io',
	});
}

const sendPasswordResetEmail = function (email, auth_token) {
	debug('sendPasswordResetEmail(', email, auth_token, ')');
	let url = 'https://repete.io/user/change-password?x=' + auth_token;
	return mail.send({
		subject: 'Reset your account password at repete.io',
		to: email,
		from: '"info@repete.io" <info@repete.io>',
		text: 
			'Someone requested a password reset at repete.io.\n' +
			'Follow this link to reset it with within one hour:\n'
				+ url + '\n' +
			'...or simply disregard this email if it wasn\'t you.\n\n' +
			'Thanks,\nrepete.io',
	});
}

/**
 * Sets a browser cookie for the site with a JWT containing the server's
 * login_token for the account.
 *
 * Used by password login and login via token.
 */
const setLoginCookie = function (username, login_token, req, res) {
	let payload = { username, login_token };
	// BUGBUG If the JWT expires, local changes aren't saved!!!!
	let token = jwt.sign(payload, config.jwt.secret, { expiresIn: '14d' });
	let cookie_opts = { httpOnly: true };
	if (req.body.remember === 'on') {
		cookie_opts.maxAge = 900000;
	} else {
		// expire after browser closes
	}
	req.session.token = token
	//res.session('token', token, cookie_opts);
}

/**
 * This checks a password creation for a match, but should also apply a 
 * policy. (Should the server 'really' own the policy?)
 */
const doesPasswordSuck = function (a, b) {
	if (a !== b) {
		return 'Passwords do not match.'
	}
	// Put password policy here
}

router.get('/', (req, res) => {
	return res.render(path.resolve(pugdir, 'user'))
})

router.get('/login', (req, res) => {
	return res.render(path.resolve(pugdir, 'login'))
})

router.post('/login', (req, res) => {
	debug('POST/login')
	authDb.login(req.body.email, req.body.password)
	.then(results => {
		if (results.error) {
			return res.render(path.resolve(pugdir, 'login'), {
				serverClass: 'alert alert-danger',
				error: results.error
			})
		}
		setLoginCookie(results.username, results.login_token, req, res)
		return res.redirect('/')
	})
	.catch(error => {
		console.error('RT-ERROR(POST/login):', error)
		return res.render(path.resolve(pugdir, 'login'), genericError)
	})
})

router.get('/signup', (req, res) => {
	return res.render(path.resolve(pugdir, 'signup'))
})

router.post('/signup', (req, res) => {
	const sucks = doesPasswordSuck(req.body.password, req.body.repassword)
	if (sucks) {
		return res.render(path.resolve(pugdir, 'signup'), {
			error: error,
			email: req.body.email,
		})
	}
	authDb.signup(req.body.email, req.body.password)
	.then(results => {
		if (results.error) {
			return res.render(path.resolve(pugdir, 'signup'), {
				error: results.error
			})
		}
		return sendActivationEmail(req.body.email, results.auth_token)
		.then(results => {
			return res.render(path.resolve(pugdir, 'wait-for-activate'))
		})
		// test that a throw goes to the catch below TODO
	})
	.catch(error => {
		console.error('RT-ERROR(POST/signup):', error);
		return res.render(path.resolve(pugdir, 'signup'), genericError)
	})
})

router.get('/reset-password', (req, res) => {
	return res.render(path.resolve(pugdir, 'reset-password'))
})

/**
 * Post from the reset-password page that sends a token to the email.
 */
router.post('/request-reset-password', (req, res) => {
	authDb.requestPasswordResetToken(req.body.email)
	.then(results => {
		if (results.error) {
			return res.render(path.resolve(pugdir, 'reset-password'), {
				error: results.error,
			})
		}
		return sendPasswordResetEmail(req.body.email, results.auth_token)
		.then(results => {
			return res.render(path.resolve(pugdir, 'wait-for-reset'))
		})
		// test that a throw goes to the catch below TODO
	})
	.catch(error => {
		console.error('RT-ERROR(POST/request-reset-password):', error)
		return res.render(path.resolve(pugdir, 'reset-password'), genericError)
	})
})

/**
 * Render the change-password form, but either the user is logged in, or 
 * they present an authentication token that logs them in.
 *
 * In one path below, when the user is logged in, a change password form
 * appears, but in order to determine that we need validUser middleware. 
 * Caution: using validUser middleware on other routes here may cause loops.
 */
router.get('/change-password', validUser, (req, res) => {
	if (req.query.x) {
		// Visitor trying to reset password with auth_token
		authDb.loginViaToken(req.query.x)
		.then(results => {
			if (results.error) {
				return res.render(path.resolve(pugdir, 'reset-password'), {
					error: results.error
				})
			}
			setLoginCookie(results.username, results.login_token, req, res);
			return res.render(path.resolve(pugdir, 'change-password'))
		})
		.catch(error => {
			console.error('RT-ERROR(GET/change-password):', error)
			return res.render('user/reset-password', genericError)
		})
	} else {
		// Visitor tried to view this endpoint without an auth_token
		if (res.locals.validUser) {
			return res.render(path.resolve(pugdir, 'change-password'))
		}
		// Not logged in, so send to login page
		return res.redirect(path.resolve(pugdir, 'login'))
	}
})

/**
 * This is the endpoint that actually changes the password using the results
 * from the change-password view's form.
 */
router.post('/change-password', validUser, (req, res) => {
	const sucks = doesPasswordSuck(req.body.password, req.body.repassword)
	if (sucks) {
		return res.render(path.resolve(pugdir, 'change-password'), { error, serverClass: 'alert alert-danger' })
	}
	authDb.changePassword(res.locals.userProfile.username, req.body.password)
	.then(results => {
		if (results.error) {
			return res.render(path.resolve(pugdir, 'change-password'), {
				error: results.error
			})
		}
		// Not logged in, so send to login page
		return res.redirect('/')
	})
	.catch(error => {
		console.error('RT-ERROR(POST/change-password):', error)
		return res.render(path.resolve(pugdir, 'change-password'), genericError)
	})
})

router.get('/resend-activation', (req, res) => {
	return res.render(path.resolve(pugdir, 'resend-activation'))
})

router.post('/resend-activation', (req, res, next) => {
	authDb.requestActivationToken(req.body.email)
	.then(results => {
		if (results.error) {
			return res.render(path.resolve(pugdir, 'wait-for-activate'), {
				error: results.error,
			});
		}
		return sendActivationEmail(req.body.email, results.auth_token)
		.then(results => {
			return res.render(path.resolve(pugdir, 'wait-for-activate'))
		});
		// test that a throw goes to the catch below TODO
	})
	.catch(error => {
		console.error('RT-ERROR(POST/resend-activation):', error)
		return res.render(path.resolve(pugdir, 'resend-activation'), genericError)
	})
})

/**
 * Activate the account if the token is valid, otherwise just go back to the
 * main endpoint.
 */
router.get('/activate', (req, res) => {
	if (req.query.x) {
		authDb.activateAccount(req.query.x)
		.then(results => {
			if (results.error) {
				return res.render(path.resolve(pugdir, 'wait-for-activate'), {
					error: results.error,
					email: req.body.email,
				})
			}
			// This renders the login page under the activate page, is OK?
			return res.render(path.resolve(pugdir, 'login'), {
				error: 'Your account is activated but you need to log in.',
				email: req.body.email,
			})
			// test that a throw goes to the catch below TODO
		})
		.catch(error => {
			console.error('RT-ERROR(GET/activate):', error);
			return res.render(path.resolve(pugdir, 'wait-for-activate'), genericError)
		})
	} else {
		// Visitor tried to activate without a token.
		return res.redirect('/')
	}
})

router.get('/logout', (req, res) => {
	req.session.token = {}
	res.redirect('/')
});

module.exports = router;
