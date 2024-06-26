'use client';
// 3:26:19
import { trpc } from '@/app/_trpc/client';
import MaxWidthWrapper from './MaxWidthWrapper';
import UploadButton from './UploadButton';
import { Ghost, Loader2, MessageSquare, MessageSquareShare, Plus, Trash } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { useState } from 'react';
import DeleteButton from './DeleteButton';
import { getUserSubscriptionPlan } from '@/lib/stripe';

interface PageProps {
	subscriptionPlan: Awaited<ReturnType<typeof getUserSubscriptionPlan>>;
}

const Dashboard = ({ subscriptionPlan }: PageProps) => {
	const [currentlyDeletingFile, setCurrentDeletingFile] = useState<string | null>(null);
	const utils = trpc.useContext(); //to invalidate some query value and refetch it or update it.

	const { data: files, isLoading } = trpc.getUserFiles.useQuery();
	const { mutate: deleteFile } = trpc.deleteFile.useMutation({
		onSuccess: () => {
			utils.getUserFiles.invalidate();
		},
		onMutate: ({ id }) => {
			setCurrentDeletingFile(id);
		},
		onSettled() {
			setCurrentDeletingFile(null);
		},
	});

	return (
		<MaxWidthWrapper>
			<main className='mx-auto max-w-7xl md:p-10'>
				<div className='mt-8 flex flex-col items-start justify-between gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:gap:1'>
					<h1 className='mb-3 font-bold text-5xl text-gray-900'>My files</h1>

					<UploadButton isSubscribed={subscriptionPlan.isSubscribed} />
				</div>

				{/* display all user files */}
				{files && files?.length !== 0 ? (
					<ul className='mt-8 grid grid-cols-1 divide-y gap-5 divide-zinc-200 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3'>
						{files
							.sort(
								(a, b) =>
									new Date(b.createdAt).getTime() -
									new Date(a.createdAt).getTime()
							)
							.map((file) => (
								<li
									key={file.id}
									className='col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow transition hover:shadow-lg'
								>
									<Link
										href={`/dashboard/${file.id}`}
										className='flex flex-col gap-2'
									>
										<div className='pt-6 px-6 flex w-full items-center justify-between space-x-6'>
											<div className='h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500'></div>
											<div className='flex-1 truncate'>
												<div className='flex items-center space-x-3'>
													<h3 className='truncate text-lg font-medium text-zinc-900'>
														{file.name}
													</h3>
												</div>
											</div>
										</div>
									</Link>

									<div className='px-6 mt-4 grid grid-cols-3 place-items-center py-2 gap-6 text-xs text-zinc-500'>
										<div className='flex items-center gap-2'>
											<Plus className='h-4 w-4' />
											{format(new Date(file.createdAt), 'MMM yyyy')}
										</div>

										<div className='flex items-center gap-2'>
											<MessageSquare className='h-4 w-4' />
											mocked
										</div>

										<DeleteButton
											deleteFile={deleteFile}
											file={file}
											currentlyDeletingFile={currentlyDeletingFile}
										/>
									</div>
								</li>
							))}
					</ul>
				) : isLoading ? (
					<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4'>
						{Array(6)
							.fill(0)
							.map((_, index) => (
								<Skeleton
									key={index}
									className='my-2 h-10 sm:h-10 md:h-16 lg:h-20'
								/>
							))}
					</div>
				) : (
					<div className='mt-16 flex flex-col items-center gap-2'>
						<Ghost className='h-8 w-8 text-zinc-800' />
						<h3 className='font-semibold text-xl'>Pretty empty around here</h3>
						<p>Let&apos;s upload your first File.</p>
					</div>
				)}
			</main>
		</MaxWidthWrapper>
	);
};

export default Dashboard;
