const express = require('express');
const router = express.Router();
const validUser = require('../middleware/valid-user');

router.use(validUser);

router.get('/', (req, res) => {
	if (res.locals.validUser === true) {
		if (res.locals.userProfile.active  === 1) {
			res.render('index', {
				logAction: 'logout',
			});
		} else {
			// TODO this should go to a page with logout or something
			next(new Error('Account not activated'));
		}
	} else {
		res.render('index', {
			logAction: 'login',
			warning: 'Not logged in.',
		});
	}
});

module.exports = router;
