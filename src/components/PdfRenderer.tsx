'use client';

import { ChevronDown, ChevronUp, Loader2, RotateCw, Search, ZoomIn } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useToast } from './ui/use-toast';
import { useResizeDetector } from 'react-resize-detector';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from './ui/dropdown-menu';
import SimpleBar from 'simplebar-react';
import PdfFullScreen from './PdfFullScreen';

// this is a worker we need to render the pdf on our canvas.
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

interface pdfRendererProps {
	url: string;
}

const PdfRenderer = ({ url }: pdfRendererProps) => {
	const [numPages, setNumPages] = useState<number>();
	const [currPage, setCurrPage] = useState<number>(1);
	const [scale, setScale] = useState<number>(1);
	const [rotation, setRotation] = useState<number>(0);
	const [renderedScale, setRenderedScale] = useState<number | null>(null);
	const isLoading = renderedScale !== scale;
	const { toast } = useToast();
	const { width, ref } = useResizeDetector();

	const customPageValidator = z.object({
		page: z.string().refine((num) => Number(num) > 0 && Number(num) <= numPages!),
	});

	type TCustomPageValidator = z.infer<typeof customPageValidator>;
	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
	} = useForm<TCustomPageValidator>({
		defaultValues: {
			page: '1',
		},
		resolver: zodResolver(customPageValidator),
	});

	const handlePageSubmit = ({ page }: TCustomPageValidator) => {
		setCurrPage(Number(page));
		setValue('page', String(page));
	};

	return (
		<div className='w-full bg-white rounded-md shadow flex flex-col items-center'>
			{/* topbar */}
			<div className='h-14 w-full border-b border-zinc-200 flex items-center justify-between px-2'>
				{/* page input  */}
				<div className='flex items-center gap-1.5'>
					<Button
						disabled={currPage <= 1}
						onClick={() => {
							setCurrPage((prev) => {
								return prev - 1 > 1 ? prev - 1 : prev;
							});
							setValue('page', String(currPage - 1));
						}}
						variant='ghost'
						aria-label='previous page'
					>
						<ChevronDown className='h-4 w-4' />
					</Button>

					<div className='flex items-center gap-1.5'>
						<Input
							{...register('page')}
							className={cn(
								'h-8 w-12',
								errors.page && 'focus-visible:ring-red-500'
							)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									handleSubmit(handlePageSubmit)();
								}
							}}
						/>
						<p className='text-zinc-700 text-xs md:text-sm space-x-0'>
							<span>/</span>
							<span>{numPages ? numPages : 'x'}</span>
						</p>
					</div>

					<Button
						disabled={numPages === undefined || currPage === numPages}
						onClick={() => {
							setCurrPage((prev) => (prev + 1 > numPages! ? numPages! : prev + 1));
							setValue('page', String(currPage + 1));
						}}
						variant='ghost'
						aria-label='next page'
					>
						<ChevronUp className='h-4 w-4 ' />
					</Button>
				</div>

				<div className='space-x-0 md:space-x-2 '>
					{/* zooming states dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button className='gap-1.5' aria-label='zoom' variant='ghost'>
								<ZoomIn className='h-4 w-4' />
								<span className='hidden sm:block'>{scale * 100}%</span> <ChevronDown className='hidden sm:block w-3 h-3 opacity-50' />
							</Button>
						</DropdownMenuTrigger>

						<DropdownMenuContent>
							<DropdownMenuItem onSelect={() => setScale(0.5)}>50%</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => setScale(0.75)}>75%</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => setScale(1)}>100%</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => setScale(1.5)}>150%</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => setScale(2)}>200%</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => setScale(2.5)}>250%</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					{/* rotation button */}
					<Button
						onClick={() => setRotation((prev) => prev + 90)}
						variant='ghost'
						aria-label='rotate 90 degrees'
					>
						<RotateCw className='h-4 w-4' />
					</Button>

					{/* pdf full screen */}
					<PdfFullScreen fileUrl={url} />
				</div>
			</div>

			{/* Pdf document renderer */}
			<div className='flex-1 w-full max-h-screen'>
				<SimpleBar autoHide={false} className='max-h-[calc(100vh-10rem)] max-w-[46rem]'>
					<div ref={ref}>
						<Document
							loading={
								<div className='flex justify-center'>
									<Loader2 className='my-40 h-6 w-6 animate-spin' />
								</div>
							}
							onLoadSuccess={({ numPages }) => setNumPages(numPages!)}
							onLoadError={() => {
								toast({
									title: 'Error loading PDF.',
									description: 'Please try again later.',
									variant: 'destructive',
								});
							}}
							file={url}
							className='max-h-full'
						>
							{isLoading && renderedScale ? (
								<Page
									width={width || 640}
									pageNumber={currPage}
									scale={scale}
									rotate={rotation}
									key={'@' + renderedScale}
								/>
							) : null}

							<Page
								className={cn(isLoading ? 'hidden' : '')}
								width={width || 640}
								pageNumber={currPage}
								scale={scale}
								rotate={rotation}
								key={'@' + scale}
								loading={
									<div>
										<Loader2 className='my24 h-6 w-6 animate-spin' />
									</div>
								}
								onRenderSuccess={() => setRenderedScale(scale)}
							/>

							{/* Use container width or default */}
						</Document>
					</div>
				</SimpleBar>
			</div>
		</div>
	);
};

export default PdfRenderer;
