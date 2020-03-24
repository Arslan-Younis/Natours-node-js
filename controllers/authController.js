const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = (id) => {
	return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

const createSendToken = (user, statusCode, res) => {
	const token = signToken(user._id);

	const cookieOptions = {
		expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
		httpOnly: true
	};

	if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

	res.cookie('jwt', token, cookieOptions);

	user.password = undefined;

	res.status(statusCode).json({
		status: 'success',
		token,
		data: {
			user
		}
	});
};

exports.signup = catchAsync(async (req, res, next) => {
	const newUser = await User.create({
		name: req.body.name,
		email: req.body.email,
		password: req.body.password,
		passwordConfirm: req.body.passwordConfirm
	});
	createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return next(new AppError('Please enter correct email and password!', 400));
	}

	const user = await User.findOne({ email }).select('+password');

	if (!user || !await user.correctPassword(password, user.password)) {
		return next(new AppError('Incorrect email or password', 401));
	}

	createSendToken(user, 200, res);
});

exports.logOut = (req, res) => {
	res.cookie('jwt', 'loggedout', {
		expires: new Date(Date.now() + 10 * 1000),
		httpOnly: true
	});
	res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
	//check token in header
	let token;
	if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
		token = req.headers.authorization.split(' ')[1];
	} else if (req.cookies.jwt) {
		token = req.cookies.jwt;
	}
	if (!token) {
		return next(new AppError('you are not logged in! please log in to get access,', 401));
	}
	//verification token
	const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

	// check user still exists
	const currentUser = await User.findById(decoded.id);

	if (!currentUser) {
		return next(new AppError('the user belonging to this token no longer exists', 401));
	}

	// check if user changed password after jwt token issued
	if (currentUser.changedPasswordAfter(decoded.iat)) {
		return next(new AppError('user recently changed password! please log in again', 401));
	}
	req.user = currentUser;
	res.locals.user = currentUser;
	next();
});

exports.isLoggedIn = async (req, res, next) => {
	if (req.cookies.jwt) {
		try {
			//verification token
			const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

			// check user still exists
			const currentUser = await User.findById(decoded.id);

			if (!currentUser) {
				return next();
			}

			// check if user changed password after jwt token issued
			if (currentUser.changedPasswordAfter(decoded.iat)) {
				return next();
			}

			res.locals.user = currentUser;
			return next();
		} catch (err) {
			return next();
		}
	}
	next();
};

exports.restrictTo = (...roles) => {
	return (req, res, next) => {
		if (!roles.includes(req.user.role)) {
			return next(new AppError('you do not have permission to perform this action', 403));
		}
		next();
	};
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
	const user = await User.findOne({ email: req.body.email });

	if (!user) {
		return next(new AppError('There is no user with this email address', 404));
	}

	const resetToken = user.createPasswordResetToken();
	await user.save({ validateBeforeSave: false });

	const resetURL = `${req.protocol}//${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

	const message = `forgot your password? submit a patch request with your new password and passwordConfirm to: ${resetURL}.\nIf you did not forget your password, please ignore this email!`;
	try {
		await sendEmail({
			email: user.email,
			subject: 'your password reset token (valid for 10 min)',
			message
		});

		res.status(200).json({
			status: 'success',
			message: 'token sent to your email'
		});
	} catch (err) {
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;
		user.save({ validateBeforeSave: false });

		return next(new AppError('there was an error while sending the email! try again later!', 500));
	}
});

exports.resetPassword = catchAsync(async (req, res, next) => {
	// Get user based on token
	const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

	const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } });
	//Token not expired? update password
	if (!user) {
		return next(new AppError('Token is invalid or has expired', 400));
	}

	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;
	user.passwordResetToken = undefined;
	user.passwordResetExpires = undefined;

	await user.save();
	//update changedPasswordAt property
	//send JWT
	createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
	//Get user from collection
	const user = await User.findById(req.user._id).select('+password');

	// check password is correct?

	if (!await user.correctPassword(req.body.passwordCurrent, user.password)) {
		return next(new AppError('Your current password is wrong!', 401));
	}

	//if so.. update password
	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;

	await user.save();

	createSendToken(user, 200, res);
});
