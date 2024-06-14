import { db } from '@/db';
import { SendMessageValidator } from '@/lib/validators/SendMesssageValidator';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { OpenAIEmbeddings } from '@langchain/openai';
import { NextRequest } from 'next/server';
import { pinecone } from '@/lib/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { openai } from '@/lib/openai';

import { OpenAIStream, StreamingTextResponse } from 'ai';

export const POST = async (req: NextRequest) => {
	//end point for asking a question to our pdf file

	//get body form request
	const body = await req.json();

	const { getUser } = getKindeServerSession();
	const user = await getUser();

	if (!user || !user.id) {
		throw new Response('Unauthorized', { status: 401 });
	}

	//zod to enforce an validation on body we are getting
	const { fileId, message } = SendMessageValidator.parse(body);

	const file = await db.file.findFirst({
		where: {
			id: fileId,
			userId: user.id,
		},
	});

	if (!file) return new Response('Not found', { status: 404 });

	await db.message.create({
		data: {
			text: message,
			isUserMessage: true,
			userId: user.id,
			fileId,
		},
	});

	//1.vectorize user message
	const embeddings = new OpenAIEmbeddings({
		openAIApiKey: process.env.OPENAI_API_KEY,
	});

	const pineconeIndex = pinecone.Index('quill');
	const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
		pineconeIndex,
		namespace: file.id,
	});

	const results = await vectorStore.similaritySearch(message, 4);

	const prevMessages = await db.message.findMany({
		where: {
			fileId,
		},
		orderBy: {
			createAt: 'asc',
		},
		take: 6,
	});

	// send them to openAI to anwer there LLG model to anwer them

	const formattedPrevMessages = prevMessages.map((msg) => ({
		role: msg.isUserMessage ? ('user' as const) : ('assistant' as const),
		content: msg.text,
	}));

	const response = await openai.chat.completions.create({
		model: 'gpt-3.5-turbo',
		temperature: 0,
		stream: true,
		messages: [
			{
				role: 'system',
				content:
					'Use the following pieces of context (or previous conversation if needed ) to answer the users question in markdown format.',
			},
			{
				role: 'user',
				content: `Use the following pieces of context (or previous conversation if needed ) to answer the question in markdown format. \nIf you don't know the answer, just say that you don't know, don't try to make up an answer.
			  \n----------------\n
			  Previous Conversations:
			  ${formattedPrevMessages.map((message) => {
					if (message.role === 'user') return `User: ${message.content} \n`;
					return `Assistant: ${message.content} \n`;
				})}

			  \n----------------\n
			  
			  Context:
			  ${results.map((r) => r.pageContent).join('\n\n')}

			  USER INPUT:${message}`,
			},
		],
	});

	//vercel AI sdk library for stream response
	const stream = OpenAIStream(response, {
		async onCompletion(completion) {
			await db.message.create({
				data: {
					text: completion,
					isUserMessage: false,
					fileId,
					userId: user.id,
				},
			});
		},
	});

	return new StreamingTextResponse(stream);
};
