const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const mongoose = require('mongoose');
const Tour = require('../../models/tourModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose
	.connect(DB, {
		useUnifiedTopology: true,
		useNewUrlParser: true,
		useCreateIndex: true,
		useFindAndModify: false
	})
	.then((res) => {
		console.log('DB connection successful');
	});

//Read json file

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const review = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'));
const user = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));

//import data in database

const importData = async () => {
	try {
		await Tour.create(tours);
		await Review.create(review);
		await User.create(user, { validateBeforeSave: false });
		console.log('Data successfully loaded');
		process.exit();
	} catch (err) {
		console.log(err);
	}
};

const deleteData = async () => {
	try {
		await Tour.deleteMany();
		await Review.deleteMany();
		await User.deleteMany();
		console.log('Data deleted successfully');
		process.exit();
	} catch (err) {
		console.log(err);
	}
};

if (process.argv[2] === '--import') {
	importData();
} else if (process.argv[2] === '--delete') {
	deleteData();
}
