const Review = require('../models/reviewModel');
const CatchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

exports.getAllReview = factory.getAll(Review);
// exports.getAllReview = CatchAsync(async (req, res, next) => {
// 	let filter = {};
// 	if (req.params.tourId) filter = { tour: req.params.tourId };
// 	const reviews = await Review.find(filter);

// 	res.status(200).json({
// 		status: 'success',
// 		result: reviews.length,
// 		data: {
// 			reviews
// 		}
// 	});
// });

exports.setTourUserIds = (req, res, next) => {
	if (!req.body.tour) req.body.tour = req.params.tourId;
	if (!req.body.user) req.body.user = req.user.id;

	next();
};

exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);

exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
