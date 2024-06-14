import { z } from 'zod';

/* schema of the datat should be on our message endpoint */

export const SendMessageValidator = z.object({
	fileId: z.string(),
	message: z.string(),
});
