const AppError = require('../utils/appError');
const CatchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const factory = require('./handlerFactory');

const filterObj = (obj, ...allowedFileds) => {
	const newObj = {};

	Object.keys(obj).forEach((el) => {
		if (allowedFileds.includes(el)) newObj[el] = obj[el];
	});

	return newObj;
};

exports.getAllUsers = factory.getAll(User);

exports.getMe = (req, res, next) => {
	req.params.id = req.user.id;
	next();
};
exports.updateMe = CatchAsync(async (req, res, next) => {
	if (req.body.password || req.body.passwordConfirm) {
		return next(new AppError('this route is not to update password! please use /updatePassword', 400));
	}
	// filter out unwanted fields
	const filteredBody = filterObj(req, body, 'name', 'email');
	// update user data
	const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, { new: true, runValidators: true });

	res.status(200).json({
		status: 'success',
		data: {
			user: updatedUser
		}
	});
});

exports.deleteMe = CatchAsync(async (req, res, next) => {
	await User.findByIdAndUpdate(req.user.id, { active: false });

	res.status(204).json({
		status: 'success',
		data: null
	});
});

exports.getUser = factory.getOne(User);
exports.createUser = (req, res) => {
	res.status(500).json({
		status: 'error',
		message: 'This route is not yet defined!'
	});
};
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
