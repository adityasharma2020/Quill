import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { privateProcedure, publicProcedure, router } from './trpc';
import { TRPCError } from '@trpc/server';
import { db } from '@/db';

export const appRouter = router({
	authCallback: publicProcedure.query(async () => {
		const { getUser } = getKindeServerSession();
		const user = await getUser();
		if (!user || !user.email) {
			throw new TRPCError({ code: 'UNAUTHORIZED' });
		}

		//check if the user is in the database
		const dbUser = await db.user.findFirst({
			where: {
				id: user.id,
			},
		});

		if (!dbUser) {
			// not in database ,so it is first time user
			await db.user.create({
				data: {
					id: user.id,
					email: user.email,
				},
			});
		}

		return { success: true };
	}),
	getUserFiles: privateProcedure.query(async ({ ctx }) => {
		const { userId, user } = ctx;

		return await db.file.findMany({
			where: {
				userId: userId,
			},
		});
	}),
});

export type AppRouter = typeof appRouter;
