/* 
to manage spacing on all the pages acrross all pages to be the same.
so to apply our some default styles as well as some of the
clssnames that are coming from parent componet , we us our clasname
utility function which merge the both classes without any conflict.
*/

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

const MaxWidthWrapper = ({ className, children }: { className?: string; children: ReactNode }) => {
	return (
		<div className={cn('mx-auto w-full max-w-screen-xl px-2.5 md:px-20', className)}>
			{children}
		</div>
	);
};

export default MaxWidthWrapper;
