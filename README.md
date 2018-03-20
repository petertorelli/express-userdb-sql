This is a your basic, complete user-management framework that handles UX for:

* signup
* login
* activation email & flow
* forgot password email & flow
* change password

It uses:

* mysql for the database (schema included)
* bcrypt for passwords and salt
* crypto for login token and authentication token generation
* JWT for persistant browser storage of the login token

I'd really like to make this easier to deploy like the way Stormpath (RIP) used to deploy its node API.

It's about 95% there.
