import { db } from '@/db';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { Document } from '@langchain/core/documents';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { pinecone } from '@/lib/pinecone';

const f = createUploadthing();

export const ourFileRouter = {
	pdfUploader: f({ pdf: { maxFileSize: '4MB' } })
		.middleware(async ({ req }) => {
			const { getUser } = getKindeServerSession();
			const user = await getUser();

			if (!user || !user.id) throw new Error('Unauthorized');
			return { userId: user.id };
		})
		.onUploadComplete(async ({ metadata, file }) => {
			const createdFile = await db.file.create({
				data: {
					key: file.key,
					name: file.name,
					userId: metadata.userId,
					url: `https://utfs.io/f/${file.key}`,
					uploadStatus: 'PROCESSING',
				},
			});

			/*  Index the pdf in our vector database  */
			try {
				/* fetching the url in memory  */
				const response = await fetch(`https://utfs.io/f/${file.key}`);
				/* we can use it to generate the index in our vector database, first we need to convert our pdf to a blob */
				const blob = await response.blob();

				// Load the pdf file in memory using a loader
				const loader = new PDFLoader(blob);

				// Extract page level text (document) of pdf
				const pageLevelDocs = await loader.load();

				// Amount of pages (pages amount), each document in array is one actual page of our pdf
				const pagesAmt = pageLevelDocs.length;

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
		}),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
