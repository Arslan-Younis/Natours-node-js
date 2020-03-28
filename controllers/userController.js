const AppError = require('../utils/appError');
const CatchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

// const multerStorage = multer.diskStorage({
// 	destination: (req, file, cb) => {
// 		cb(null, 'public/img/users');
// 	},
// 	filename: (req, file, cb) => {
// 		const ext = file.mimetype.split('/').pop();
// 		cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
// 	}
// });
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
	if (file.mimetype.startsWith('image')) {
		cb(null, true);
	} else {
		cb(new AppError('Not an image! Please only upload images.', 400), false);
	}
};

const upload = multer({
	storage: multerStorage,
	fileFilter: multerFilter
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = CatchAsync(async (req, res, next) => {
	if (!req.file) return next();

	req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

	await sharp(req.file.buffer)
		.resize(500, 500)
		.toFormat('jpeg')
		.jpeg({ quality: 90 })
		.toFile(`public/img/users/${req.file.filename}`);

	next();
});

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
	const filteredBody = filterObj(req.body, 'name', 'email');
	if (req.file) filteredBody.photo = req.file.filename;
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
