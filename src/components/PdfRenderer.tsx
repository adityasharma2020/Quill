'use client';

import { Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useToast } from './ui/use-toast';
import { useResizeDetector } from 'react-resize-detector';

// this is a worker we need to render the pdf on our canvas.
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

interface pdfRendererProps {
	url: string;
}

const PdfRenderer = ({ url }: pdfRendererProps) => {
	const { toast } = useToast();
	const { width, ref } = useResizeDetector();

	return (
		<div className='w-full bg-white rounded-md shadow flex flex-col items-center'>
			{/* topbar */}
			<div className='h-14 w-full border-b border-zinc-200 flex items-center justify-between px-2'>
				<div className='flex items-center gap-1.5'>top bar</div>
			</div>

			<div className='flex-1 w-full max-h-screen'>
				<div ref={ref} className='max-w-[44rem]'>
					<Document
						loading={
							<div className='flex justify-center'>
								<Loader2 className='my-40 h-6 w-6 animate-spin' />
							</div>
						}
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
						<Page width={width || 640} pageNumber={1} />{' '}
						{/* Use container width or default */}
					</Document>
				</div>
			</div>
		</div>
	);
};

export default PdfRenderer;
