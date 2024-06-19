import ChatWrapper from '@/components/chat/ChatWrapper';
import CsvRenderer from '@/components/csvRenderer/CsvRenderer';
import ExcelRenderer from '@/components/ExcelRenderer';
import PdfRenderer from '@/components/PdfRenderer';
import { db } from '@/db';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { notFound, redirect } from 'next/navigation';

interface pageProps {
	params: {
		fileid: string;
	};
}

const Page = async ({ params }: pageProps) => {
	//retreive the file id
	const { fileid } = params;
	const { getUser } = getKindeServerSession();

	//get loggedin user details
	const user = await getUser();
	if (!user || !user.id) redirect(`/auth-callback?origin=dashboard/${fileid}`);

	//make database call
	const file = await db.file.findFirst({
		where: {
			id: fileid,
			userId: user.id,
		},
	});

	if (!file) notFound();
	const fileType = file.url.split('.').pop();

	const renderFileComponent = () => {
		switch (fileType) {
			case 'pdf':
				return <PdfRenderer url={file.url} />;
			case 'csv':
			case 'xls':
			case 'xlsx':
				return <CsvRenderer url={file.url} />;
			default:
				return <div>Unsupported file type</div>;
		}
	};

	return (
		<div className='flex-1 justify-between flex flex-col h-[calc(100vh-3.5rem)]'>
			<div className='mx-auto w-full max-w-8xl grow lg:flex xl:px-2'>
				{/* Left sidebar & main wrapper */}
				<div className='flex-1 xl:flex'>
					<div className='px-4 py-6 sm:px-6 lg:pl-8 xl:flex-1 xl:pl-6'>
						{/* Main area */}
						{renderFileComponent()}
					</div>
				</div>

				<div className='shrink-0 flex-[0.75] border-t border-gray-200 lg:w-96 lg:border-l lg:border-t-0'>
					<ChatWrapper fileId={file.id} />
				</div>
			</div>
		</div>
	);
};

export default Page;
