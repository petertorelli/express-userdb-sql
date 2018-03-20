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
* A tiny bit of jQuery, simply to handle error messages in a tidy manner (todo: remove)
* mysql for the database (schema included)
* bcrypt for passwords and salt (10 rounds)
* NodeJS crypto for login token and authentication token generation
* JWT for persistant browser storage of the login token
* RunBox for email

I'd really like to make this easier to deploy like the way Stormpath (RIP) used to deploy its node API.

It's about 95% there.
