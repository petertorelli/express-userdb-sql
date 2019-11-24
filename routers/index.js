const express = require('express')
const router = express.Router()
const validUser = require('../middlewares/valid-user')


router.get('/', validUser, (req, res) => {
	if (res.locals.validUser === true) {
		// This check is here in case the user is deactivated while logged on
		if (res.locals.userProfile.active === 1) {
			return res.render(__dirname + '/pug/index', {
				logAction: 'logout',
			})
		} else {
			// TODO this should go to a page with logout or something
			return next(new Error('Account not activated'))
		}
	} else {
		return res.redirect('/user/login')
	}
})

module.exports = router

