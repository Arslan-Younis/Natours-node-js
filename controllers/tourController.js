const fs = require('fs');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

const Tour = require('../models/tourModel');

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

exports.uploadTourImages = upload.fields([ { name: 'imageCover', maxCount: 1 }, { name: 'images', maxCount: 3 } ]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
	// console.log(req.files);

	if (!req.files.imageCover || req.files.images) return next();

	//Process cover-image
	req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
	await sharp(req.files.imageCover[0].buffer)
		.resize(2000, 1333)
		.toFormat('jpeg')
		.jpeg({ quality: 90 })
		.toFile(`public/img/users/${req.body.imageCover}`);

	//process images
	req.body.images = [];
	await Promise.all(
		req.files.images.map(async (file, i) => {
			const fileName = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
			await sharp(file.buffer)
				.resize(2000, 1333)
				.toFormat('jpeg')
				.jpeg({ quality: 90 })
				.toFile(`public/img/users/${fileName}`);

			req.body.images.push(fileName);
		})
	);

	next();
});

exports.aliasTopTours = (req, res, next) => {
	req.query.limit = '5';
	req.query.sort = '-ratingsAverage,price';
	req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
	next();
};

exports.getAllTours = factory.getAll(Tour);
// exports.getAllTours = catchAsync(async (req, res) => {
// 	//filtring
// 	// const queryObj = { ...req.query };
// 	// const excludedFields = [ 'page', 'sort', 'limit', 'fields' ];
// 	// excludedFields.forEach((el) => delete queryObj[el]);

// 	// //advance filtring
// 	// let queryStr = JSON.stringify(queryObj);
// 	// queryStr = queryStr.replace(/\b(lte|lt|gte|gt)\b/g, (match) => `$${match}`);

// 	// let query = Tour.find(JSON.parse(queryStr));

// 	//sorting
// 	// if (req.query.sort) {
// 	// 	const sortBy = req.query.sort.split(',').join(' ');

// 	// 	query = query.sort(sortBy);
// 	// } else {
// 	// 	query = query.sort('-createdAt');
// 	// }

// 	//fields
// 	// if (req.query.fields) {
// 	// 	const fields = req.query.fields.split(',').join(' ');
// 	// 	query = query.select(fields);
// 	// } else {
// 	// 	query = query.select('-__v');
// 	// }

// 	//paginaton
// 	// const page = req.query.page * 1 || 1;
// 	// const limit = req.query.limit * 1 || 100;
// 	// const skip = (page - 1) * limit;

// 	// query = query.skip(skip).limit(limit);
// 	const features = new ApiFeatures(Tour.find(), req.query).filter().sort().limitFields().paginate();

// 	const tours = await features.query;

// 	res.status(200).json({
// 		status: 'success',
// 		results: tours.length,
// 		data: {
// 			tours
// 		}
// 	});
// });

exports.getTour = factory.getOne(Tour, { path: 'reviews' });
// exports.getTour = catchAsync(async (req, res, next) => {
// 	const tour = await Tour.findById(req.params.id).populate({
// 		path: 'reviews'
// 	});
// 	if (!tour) {
// 		return next(new AppError('No tour found for that ID', 404));
// 	}
// 	res.status(200).json({
// 		status: 'success',
// 		data: {
// 			tour
// 		}
// 	});
// });

exports.createTour = factory.createOne(Tour);
// exports.createTour = catchAsync(async (req, res, next) => {
// 	// console.log(req.body);

// 	const newTour = await Tour.create(req.body);

// 	res.status(201).json({
// 		status: 'success',
// 		data: {
// 			tour: newTour
// 		}
// 	});
// });

exports.updateTour = factory.updateOne(Tour);
// exports.updateTour = catchAsync(async (req, res, next) => {
// 	const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

// 	if (!tour) {
// 		return next(new AppError('No tour found for that ID', 404));
// 	}
// 	res.status(200).json({
// 		status: 'success',
// 		data: {
// 			tour: tour
// 		}
// 	});
// });

exports.deleteTour = factory.deleteOne(Tour);
// exports.deleteTour = catchAsync(async (req, res, next) => {
// 	const tour = await Tour.findByIdAndDelete(req.params.id);

// 	if (!tour) {
// 		return next(new AppError('No tour found for that ID', 404));
// 	}
// 	res.status(204).json({
// 		status: 'success',
// 		data: null
// 	});
// });

exports.getTourStats = catchAsync(async (req, res) => {
	const stats = await Tour.aggregate([
		{ $match: { ratingsAverage: { $gte: 4.5 } } },
		{
			$group: {
				_id: '$difficulty',
				avgRating: { $avg: '$ratingsAverage' },
				avgPrice: { $avg: '$price' },
				minPrice: { $min: '$price' },
				maxPrice: { $max: '$price' }
			}
		},
		{
			$sort: { avgPrice: 1 }
		}
	]);

	res.status(200).json({
		status: 'success',
		data: {
			stats
		}
	});
});

exports.getMonthlyPlan = catchAsync(async (req, res) => {
	const year = req.params.year * 1;
	const plan = await Tour.aggregate([
		{
			$unwind: '$startDates'
		},
		{
			$match: {
				startDates: {
					$gte: new Date(`${year}-01-01`),
					$lte: new Date(`${year}-12-31`)
				}
			}
		},
		{
			$group: {
				_id: { $month: '$startDates' },
				numTourStarts: { $sum: 1 },
				tours: { $push: '$name' }
			}
		},
		{
			$addFields: { month: '$_id' }
		},
		{
			$project: {
				_id: 0
			}
		},
		{
			$sort: { numTourStarts: -1 }
		},
		{
			$limit: 6
		}
	]);
	res.status(200).json({
		status: 'success',
		data: {
			plan
		}
	});
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
	const { distance, latlng, unit } = req.params;

	const [ lat, lng ] = latlng.split(',');

	const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

	if ((!lat, !lng)) {
		next(new AppError('Please provide latitude and longitude in the formate lat,lng', 400));
	}

	const tours = await Tour.find({
		startLocation: { $geoWithin: { $centerSphere: [ [ lng, lat ], radius ] } }
	});

	res.status(200).json({
		status: 'success',
		results: tours.length,
		data: {
			data: tours
		}
	});
});

exports.getDistances = catchAsync(async (req, res, next) => {
	const { latlng, unit } = req.params;
	const [ lat, lng ] = latlng.split(',');

	const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

	if ((!lat, !lng)) {
		next(new AppError('Please provide latitude and longitude in the formate lat,lng', 400));
	}

	const distances = await Tour.aggregate([
		{
			$geoNear: {
				near: {
					type: 'Point',
					coordinates: [ lng * 1, lat * 1 ]
				},
				distanceField: 'distance',
				distanceMultiplier: multiplier
			}
		},
		{
			$project: {
				distance: 1,
				name: 1
			}
		}
	]);

	res.status(200).json({
		status: 'success',
		data: {
			data: distances
		}
	});
});
