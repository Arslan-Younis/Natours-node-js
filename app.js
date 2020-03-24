const express = require('express');
const morgan = require('morgan');
const path = require('path');

const appError = require('./utils/appError');
const errorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const cookieParser = require('cookie-parser');

const xss = require('xss-clean');
const hpp = require('hpp');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1)GLOBAL MIDDLEWARES

//serving static files
app.use(express.static(path.join(__dirname, 'public')));

if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'));
}

const Limiter = rateLimit({
	max: 100,
	windowMs: 60 * 60 * 1000,
	message: 'Too many requests from this IP, Please try again after one hour'
});

app.use('/api', Limiter);

app.use(helmet());

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

//data sanitization aginst nosql query injection
app.use(mongoSanitize());

//data sanitize aginst XSS
app.use(xss());

app.use(
	hpp({
		whitelist: [ 'duration', 'ratingsAverage', 'ratingQuantity', 'maxGroupSize', 'difficulty', 'price' ]
	})
);

//Test middleware
app.use((req, res, next) => {
	req.requestTime = new Date().toISOString();
	console.log(req.cookies);

	next();
});

// 3) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('*', (req, res, next) => {
	// const err = new Error(`can't find ${req.originalUrl} on ths.server`);
	// err.status = 'fail';
	// err.statusCode = 500;

	next(new appError(`can't find ${req.originalUrl} on ths.server`, 400));
});

app.use(errorHandler);

module.exports = app;
