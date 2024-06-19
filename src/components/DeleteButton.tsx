'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Loader2, Trash } from 'lucide-react';

const DeleteButton = ({ currentlyDeletingFile, file, deleteFile }: any) => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(v) => {
				if (!v) {
					setIsOpen(v);
				}
			}}
		>
			<DialogTrigger onClick={() => setIsOpen(true)} asChild>
				<Button size={'sm'} className='w-full' variant='destructive'>
					{currentlyDeletingFile === file.id ? (
						<Loader2 className='h-4 w-4 animate-spin' />
					) : (
						<Trash className='h-4 w-4' />
					)}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<div className='flex flex-col items-center gap-2'>
					<h3 className='font-semibold text-xl mb-4'>
						Are you sure you want to Delete File ?
					</h3>

					<div className='flex items-center w-full gap-4 justify-center'>
						<Button
							onClick={() => setIsOpen(false)}
							size={'sm'}
							className='w-1/4'
							variant='secondary'
						>
							Cancel
						</Button>

						<Button
							onClick={() => deleteFile({ id: file.id })}
							size={'sm'}
							className='w-1/4'
							variant='destructive'
						>
							{currentlyDeletingFile === file.id ? (
								<Loader2 className='h-4 w-4 animate-spin' />
							) : (
								<Trash className='h-4 w-4' />
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default DeleteButton;
