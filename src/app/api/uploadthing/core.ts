import { db } from '@/db';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { CSVLoader } from 'langchain/document_loaders/fs/csv';
import { Document } from '@langchain/core/documents';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { pinecone } from '@/lib/pinecone';
import { getUserSubscriptionPlan } from '@/lib/stripe';
import { PLANS } from '@/config/stripe';



const f = createUploadthing();

const middleware = async () => {
	const { getUser } = getKindeServerSession();
	const user = await getUser();
	

	if (!user || !user?.id) throw new Error('Unauthorized');

	const subscriptionPlan = await getUserSubscriptionPlan();

	return { subscriptionPlan, userId: user.id };
};



/* file  processing */
const processFile = async (fileUrl: string, fileType: string) => {
	const response = await fetch(fileUrl);
	const blob = await response.blob();
	let pageLevelDocs: Document[];

	switch (fileType) {
		case 'pdf':
			const pdfLoader = new PDFLoader(blob);
			pageLevelDocs = await pdfLoader.load();
			break;
		case 'csv':
			const csvLoader = new CSVLoader(blob);
			pageLevelDocs = await csvLoader.load();
			break;
		default:
			throw new Error('Unsupported file type');
	}

	return pageLevelDocs;
};

const onUploadComplete = async ({
	metadata,
	file,
}: {
	metadata: Awaited<ReturnType<typeof middleware>>;
	file: {
		key: string;
		name: string;
		url: string;
	};
}) => {

	const isFileExist = await db.file.findFirst({
		where: {
			key: file.key,
		},
	});

	if (isFileExist) return;
	const fileType = file.name.split('.').pop();

	const createdFile = await db.file.create({
		data: {
			key: file.key,
			name: file.name,
			userId: metadata.userId,
			url: `https://utfs.io/f/${file.key}`,
			uploadStatus: 'PROCESSING',
			fileType: fileType!,
		},
	});

	/*  Index the file in our vector database  */
	try {
		/* Processing the file based on its type */
		const pageLevelDocs = await processFile(`https://utfs.io/f/${file.key}`, fileType!);

		// Amount of pages (pages amount), each document in array is one actual page of our PDF or row of our CSV
		const pagesAmt = pageLevelDocs.length;
		const { subscriptionPlan } = metadata;
		const { isSubscribed } = subscriptionPlan;
	

		// Check if pro limit is exceeded
		const isProExceeded = pagesAmt > PLANS.find((plan) => plan.name === 'Pro')!.pagesPerPDF;
		const isFreeExceeded = pagesAmt > PLANS.find((plan) => plan.name === 'Free')!.pagesPerPDF;

		if (
			fileType === 'pdf' &&
			((isSubscribed && isProExceeded) || (!isSubscribed && isFreeExceeded))
		) {
			

			await db.file.update({
				data: {
					uploadStatus: 'FAILED',
				},
				where: {
					id: createdFile.id,
				},
			});
			return;
		}

		// Vectorize and index entire document
		const pineconeIndex = pinecone.Index('quill');

		// Use OpenAI model for embeddings
		const embeddings = new OpenAIEmbeddings({
			openAIApiKey: process.env.OPENAI_API_KEY,
		});

		// Pass the transformed documents and embeddings to generate embeddings and index them in Pinecone
		await PineconeStore.fromDocuments(pageLevelDocs, embeddings, {
			pineconeIndex,
			namespace: createdFile.id,
			maxConcurrency: 5,
		});

		await db.file.update({
			data: {
				uploadStatus: 'SUCCESS',
			},
			where: {
				id: createdFile.id,
			},
		});
		console.log('success');
	} catch (err) {
		console.error('error:', err);
		await db.file.update({
			data: {
				uploadStatus: 'FAILED',
			},
			where: {
				id: createdFile.id,
			},
		});
	}
};

export const ourFileRouter = {
	freePlanCSVloader: f({ text: { maxFileSize: '4MB' } })
		.middleware(middleware)
		.onUploadComplete(onUploadComplete),
	freePlanPDFloader: f({ pdf: { maxFileSize: '4MB' } })
		.middleware(middleware)
		.onUploadComplete(onUploadComplete),
	proPlanCSVloader: f({ text: { maxFileSize: '16MB' } })
		.middleware(middleware)
		.onUploadComplete(onUploadComplete),
	proPlanPDFloader: f({ pdf: { maxFileSize: '16MB' } })
		.middleware(middleware)
		.onUploadComplete(onUploadComplete),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
