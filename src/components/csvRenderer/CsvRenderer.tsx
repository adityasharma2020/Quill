'use client';

import { useState, useEffect } from 'react';
import { useToast } from '../ui/use-toast';
import { useResizeDetector } from 'react-resize-detector';
import SimpleBar from 'simplebar-react';
import Papa from 'papaparse'; // Library for CSV parsing
import * as XLSX from 'xlsx'; // Library for Excel parsing
import { Loader2 } from 'lucide-react';

interface CsvRendererProps {
	url: string;
}

const CsvRenderer = ({ url }: CsvRendererProps) => {
	const [data, setData] = useState<any[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const { toast } = useToast();
	const { ref } = useResizeDetector();

	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await fetch(url);
				if (!response.ok) {
					throw new Error('Network response was not ok');
				}

				const contentType = response.headers.get('content-type');
				let parsedData: any[] = [];

				if (contentType?.includes('text/csv')) {
					const text = await response.text();
					parsedData = Papa.parse(text, { header: true }).data;
				} else if (
					contentType?.includes(
						'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					)
				) {
					const buffer = await response.arrayBuffer();
					const workbook = XLSX.read(buffer, { type: 'buffer' });

					// Assume only one sheet for simplicity, you can iterate if needed
					const sheetName = workbook.SheetNames[0];
					const sheet = workbook.Sheets[sheetName];
					parsedData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
				} else {
					throw new Error('Unsupported file format');
				}

				setData(parsedData);
				setLoading(false);
			} catch (error) {
				toast({
					title: 'Error fetching data',
					description: "Error fetching data",
					variant: 'destructive',
				});
				setLoading(false);
			}
		};

		fetchData();
	}, [url, toast]);

	return (
		<div className='w-full bg-white rounded-md shadow flex flex-col items-center'>
			{/* Topbar or any other UI elements */}
			<div className='flex-1 w-full max-h-screen' ref={ref}>
				<SimpleBar autoHide={false} className='max-h-[calc(100vh-10rem)] max-w-[46rem]'>
					{loading ? (
						<div className='flex items-center justify-center h-full'>
							<Loader2 className='h-8 w-8 animate-spin text-zinc-500' />
						</div>
					) : (
						<table className='min-w-full divide-y divide-gray-200'>
							<thead className='bg-gray-50'>
								<tr>
									{data.length > 0 &&
										Object.keys(data[0]).map((header, index) => (
											<th
												key={index}
												className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
											>
												{header}
											</th>
										))}
								</tr>
							</thead>
							<tbody className='bg-white divide-y divide-gray-200'>
								{data.map((row, rowIndex) => (
									<tr key={rowIndex} className='hover:bg-gray-50'>
										{Object.values(row).map((cell, cellIndex) => (
											<td
												key={cellIndex}
												className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'
											>
												{cell}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					)}
				</SimpleBar>
			</div>
		</div>
	);
};

export default CsvRenderer;
