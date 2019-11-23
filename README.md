Updated to use newer express modules for cookies and body.

This is a your basic, complete user-management framework that handles UX, UI, frontend & backend for:

* signup
* login
* activation email & flow
* forgot password email & flow
* change password

It uses:

* Express
* Pug for rendering because screw HTML
* Bootstrap because its easy and makes things look good
* mysql for the database (schema included)
* bcrypt for passwords and salt (10 rounds)
* NodeJS crypto for login token and authentication token generation
* JWT for persistant browser storage of the login token
* RunBox for email

It's about 95% there.

TODO: Better UI error rendering w/o a JS framework.