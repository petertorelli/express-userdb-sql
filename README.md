Updated to use newer express modules for cookies and body.

This is a your basic, complete user-management framework that handles UX, UI, frontend & backend for:

* signup
* login
* activation email & flow
* forgot password email & flow
* change password

It uses:

* [Express](https://expressjs.com/) because its flexibility keeps the site small
* [VueJS](https://vuejs.org/) because VueJS finally figured out what ReactJS was trying to do
* [FontAwesome](https://fontawesome.com/) because its such a great service
* [Pug](https://pugjs.org/api/getting-started.html) because screw HTML
* [Bootstrap](https://getbootstrap.com/) because its easy and makes things look good
* [bcrypt](https://en.wikipedia.org/wiki/Bcrypt) because it seems to still be holding strong
* [JWT](https://jwt.io/) for persistant browser storage of the login token because I don't go crazy with them
* [RunBox](https://runbox.com/) for email because Norway understands privacy; this can be changed in the `models`
* [mysql](https://www.npmjs.com/package/mysql) for the database (schema included); this can be changed in the `models`
