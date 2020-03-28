const AppError = require('../utils/appError');

handleValidationErrorBD = (err) => {
	const errors = Object.values(err.errors).map((el) => el.message);

	const message = `invalid input data ${errors.join('.')}`;

	return new AppError(message, 4044);
};

handleDeuplicateFieldDB = (err) => {
	const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/);
	// console.log(value);

	const message = `Duplicate field value: ${value}. Please use another value`;
};
handleCastErrorDB = (err) => {
	const emessage = `invalid ${err.path}: ${err.value}`;

	return new AppError(message, 400);
};
handleJWTError = () => {
	return new AppError('invalid token! please log in again.', 401);
};

handleJWTExpiredError = () => {
	return new AppError('your token has been expired! please log in again', 401);
};

sendErrorDev = (err, req, res) => {
	if (req.originalUrl.startsWith('/api')) {
		res.status(err.statusCode).json({
			status: err.status,
			error: err,
			message: err.message,
			stack: err.stack
		});
	} else {
		console.log('Error', err);

		res.status(err.statusCode).render('error', {
			title: 'something went wrong!',
			msg: err.messages
		});
	}
};

sendErrorPro = (err, req, res) => {
	if (req.originalUrl.startsWith('/api')) {
		if (err.isOperational) {
			return res.status(err.statusCode).json({
				status: err.status,
				message: err.message
			});
		}

		console.error('error', err);
		return res.status(500).json({
			status: 'error',
			message: 'something went very wrong!'
		});
	}

	if (err.isOperational) {
		return res.status(err.statusCode).render('error', {
			title: 'something went wrong!',
			msg: err.message
		});
	}

	return res.status(err.statusCode).render('error', {
		title: 'something went wrong!',
		msg: 'Please try agin later.'
	});
};

module.exports = (err, req, res, next) => {
	err.statusCode = err.statusCode || 500;
	err.status = err.status || 'fail';

	if (process.env.NODE_ENV === 'development') {
		sendErrorDev(err, req, res);
	} else if (process.env.NODE_ENV === 'production') {
		let error = { ...err };
		error.message = err.message;

		if (error.name === 'CastError') error = handleCastErrorDB(error);
		if (error.code === 11000) error = handleDeuplicateFieldDB(error);
		if (error.name === 'validationError') error = handleValidationErrorBD(erros);
		if (error.name === 'JsonWebTokenError') error = handleJWTError();
		if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

		sendErrorPro(error, req, res);
	}
};
