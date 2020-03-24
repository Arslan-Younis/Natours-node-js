const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const app = require('./app');
const mongoose = require('mongoose');

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

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
	console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
	console.log('unhandled Rejection! shutting down...');
	console.log(err.name, err.message);
	server.close(() => {
		process.exit(1);
	});
});

process.on('uncaughtException', (err) => {
	console.log('uncaught exception! shutting down...');
	console.log(err.name, err.message);
	server.close(() => {
		process.exit(1);
	});
});
