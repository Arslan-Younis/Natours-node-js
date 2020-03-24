const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
	// create transporter
	const transporter = nodemailer.createTransport({
		host: process.env.EMAIL_HOST,
		port: process.env.EMAIL_PORT,
		auth: {
			user: process.env.EMAIL_USERNAME,
			pass: process.env.EMAIL_PASSWORD
		}
	});

	//Define mail options

	const mailOptions = {
		from: 'Arslan Younis',
		to: options.email,
		subject: options.subject,
		text: options.message
		// html:
	};

	await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
