export const PLANS = [
	{
		name: 'Free',
		slug: 'free',
		quota: 10,
		pagesPerPDF: 5,
		price: {
			amount: 0,
			priceIds: {
				test: '',
				production: '',
			},
		},
	},
	{
		name: 'Pro',
		slug: 'pro',
		quota: 50,
		pagesPerPDF: 25,
		price: {
			amount: 100,
			priceIds: {
				test: 'price_1PSGEKSDJMxo6tEq42lfB5JP',
				production: '',
			},
		},
	},
];
