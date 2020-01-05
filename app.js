const express = require('express')
const helmet = require('helmet')
const path = require('path')
const cookieSession = require('cookie-session')
const bodyParser = require('body-parser')

require('dotenv').config()

const userRouter = require('./routers/user')
const indexRouter = require('./routers/index')
const liddyRouter = require('./routers/liddycam')
const pingerRouter = require('./routers/pinger')

const app = express()

//app.use(helmet())

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true, limit: '100mb' }));

//get real ip address behind proxy
app.set('trust proxy', true)

var expiryDate = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
app.use(cookieSession({
  keys: ['key1', 'key2'], // todo replace with process.env
  cookie: {
  	/*
    secure: true,
    httpOnly: true,
    domain: 'example.com',
    */
    expires: expiryDate
  }
}))


app.use(express.static(path.join(__dirname, 'node_modules/vue-resource/dist')));
app.use(express.static(path.join(__dirname, 'node_modules/vue/dist')));
app.use(express.static(path.join(__dirname, 'node_modules/@fortawesome/fontawesome-free')));
app.use(express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));
app.use('/img', express.static(path.join(__dirname, 'public/img')));

app.set('view engine', 'pug')

app.use('/user', userRouter)
app.use('/liddycam', liddyRouter)
app.use('/pinger', pingerRouter)
app.use('/', indexRouter)



module.exports = app

/*
const createError = require('http-errors')
const express = require('express')
const cookieParser = require('cookie-parser')
const logger = require('morgan')

const indexRouter = require('./routes/index')
const usersRouter = require('./routes/users')

const app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', indexRouter)
app.use('/users', usersRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	next(createError(404))
})

// error handler
app.use(function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message
	res.locals.error = req.app.get('env') === 'development' ? err : {}

	// render the error page
	res.status(err.status || 500)
	res.render('error')
})

*/
