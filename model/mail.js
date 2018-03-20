'use strict';
const nodemailer = require('nodemailer');
const config = require('../config');

module.exports.send = function (envelope) {
	return new Promise((resolve, reject) => {
	    let transporter = nodemailer.createTransport({
	        host: config.mail.host,
	        port: config.mail.port,
	        secure: true,
	        auth: {
	            user: config.mail.user,
	            pass: config.mail.password,
	        },
	    });
	    // send mail with defined transport object
	    transporter.sendMail(envelope, (error, info) => {
	        if (error) {
	        	return reject(new Error(error));
	        }
	        resolve({});
	    });
	});
};
