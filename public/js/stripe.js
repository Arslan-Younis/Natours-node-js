import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe('pk_test_QZkhF5dQEuKScNcGy3LOpzqt00mhxGwG4s');

export const bookTour = async (tourId) => {
	try {
		// get session from server
		const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

		// console.log(session);

		//create chechout form + charge credit card

		await stripe.redirectToCheckout({
			sessionId: session.data.session.id
		});
	} catch (err) {
		// console.log(err);

		showAlert('error', err);
	}
};
