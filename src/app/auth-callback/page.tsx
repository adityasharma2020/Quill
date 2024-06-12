'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '../_trpc/client';
import { Loader2 } from 'lucide-react';

const Page = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const origin = searchParams.get('origin');

	const { data, isLoading, error } = trpc.authCallback.useQuery();



	if (isLoading) {
		return (
			<div className='w-full mt-24 flex justify-center '>
				<div className='flex flex-col items-center gap-2'>
					<Loader2 className='h-8 w-8 animate-spin text-zinc-800' />
					<h3 className='font-semibold text-xl'>Setting up your account...</h3>
					<p>You will be redirected automatically.</p>
				</div>
			</div>
		);
	}

	if (error && error.data) {
		// Handle the error, for example, redirect to the sign-in page for unauthorized errors
		if (error.data.code === 'UNAUTHORIZED') {
			router.push('/sign-in');
		}
		return null;
	}

	// If data is available and there are no errors, handle the successful response
	if (data && data.success) {
		router.push(origin ? `/${origin}` : `/dashboard`);
		return null;
	}

	// Render a fallback UI if none of the above conditions are met
	return (
		<div>
			<p>An unexpected error occurred.</p>
		</div>
	);
};

export default Page;
