import { db } from '@/db';
import { SendMessageValidator } from '@/lib/validators/SendMesssageValidator';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { NextRequest } from 'next/server';

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

	// AI answer our Question.
	
};
