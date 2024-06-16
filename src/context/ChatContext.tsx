/* 
	To pass data from the message we write in the messages .
	  In the context we are sending the data to the abackned and 
	  storeing in db, and once that is done the message shown from here 
	  the context in the messgages component.
	
*/

import { trpc } from '@/app/_trpc/client';
import { useToast } from '@/components/ui/use-toast';
import { INFINITE_QUERY_LIMIT } from '@/config/infinite-query';
import { useMutation } from '@tanstack/react-query';
import { ReactNode, createContext, useRef, useState } from 'react';


type StreamResponse = {
	addMessage: () => void;
	message: string;
	handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
	isLoading: boolean;
};

export const ChatContext = createContext<StreamResponse>({
	addMessage: () => {},
	message: '',
	handleInputChange: () => {},
	isLoading: false,
});

interface Props {
	fileId: string;
	children: ReactNode;
}

/* chat context is responsible for all logic  */
export const ChatContextProvider = ({ fileId, children }: Props) => {
	const [message, setMessage] = useState<string>('');
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const utils = trpc.useContext();
	const { toast } = useToast();

	const backupMessage = useRef('');

	// here we are not using TRPC for api route as the
	// we need to stream  back response back from our client side
	const { mutate: sendMessage } = useMutation({
		mutationFn: async ({ message }: { message: string }) => {
			const response = await fetch('/api/message', {
				method: 'POST',
				body: JSON.stringify({ fileId, message }),
			});

			if (!response.ok) {
				throw new Error('Failed to send message');
			}

			return response.body;
		},
		onMutate: async ({ message }) => {
			backupMessage.current = message;
			setMessage('');

			//1. cancel any outgoing refetches so that they wont override our optimistic update
			await utils.getFileMessages.cancel();

			//2  snapshot the previous value
			const previousMessages = utils.getFileMessages.getInfiniteData();

			//3. optimistically insert the new value as we send it
			utils.getFileMessages.setInfiniteData(
				{
					fileId,
					limit: INFINITE_QUERY_LIMIT,
				},
				(old) => {
					if (!old) {
						// this is because react query handle the infinite query this way only.
						return {
							pages: [],
							pageParams: [],
						};
					}
					let newPages = [...old.pages];

					let latestPage = newPages[0]!;

					latestPage.messages = [
						{
							createdAt: new Date().toISOString(),
							id: crypto.randomUUID(),
							text: message,
							isUserMessage: true,
						},
						...latestPage.messages,
					];

					newPages[0] = latestPage;

					return {
						...old,
						pages: newPages,
					};
				}
			);

			setIsLoading(true);
			return {
				previousMessages: previousMessages?.pages.flatMap((page) => page.messages) ?? [],
			};
		},
		onSuccess: async (stream) => {
			//get the stream
			setIsLoading(false);
			if (!stream) {
				return toast({
					title: 'Their is an error while sending this message.',
					description: 'Please refresh this page and try again.',
					variant: 'destructive',
				});
			}

			const reader = stream.getReader();
			const decoder = new TextDecoder();

			let done = false;
			// accumulated response
			let accResponse = '';

			while (!done) {
				const { value, done: doneReading } = await reader.read();
				done = doneReading;
				const chunkValue = decoder.decode(value);
				accResponse += chunkValue;
				//append the chunk to the actual message
				utils.getFileMessages.setInfiniteData(
					{ fileId, limit: INFINITE_QUERY_LIMIT },
					(old) => {
						if (!old) return { pages: [], pageParams: [] };

						let isAiResponseCreated = old.pages.some((page) =>
							page.messages.some((message) => message.id === 'ai-response')
						);

						let updatedPages = old.pages.map((page) => {
							if (page === old.pages[0]) {
								let updatedMessages;

								if (!isAiResponseCreated) {
									updatedMessages = [
										{
											createdAt: new Date().toISOString(),
											id: 'ai-response',
											text: accResponse,
											isUserMessage: false,
										},
										...page.messages,
									];
								} else {
									updatedMessages = page.messages.map((message) => {
										if (message.id === 'ai-response') {
											return {
												...message,
												text: accResponse,
											};
										}

										return message;
									});
								}

								return {
									...page,
									messages: updatedMessages,
								};
							}

							return page;
						});

						return { ...old, pages: updatedPages };
					}
				);
			}
		},
		onError: (__, _, context) => {
			setMessage(backupMessage.current);
			utils.getFileMessages.setData(
				{ fileId },
				{ messages: context?.previousMessages ?? [] }
			);
			return toast({
				title: 'Their is an error while sending this message.',
				description: 'Please refresh this page and try again.',
				variant: 'destructive',
			});
		},
		onSettled: async () => {
			setIsLoading(false);
			await utils.getFileMessages.invalidate({
				fileId,
			});
		},
	});

	const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setMessage(e.target.value);
	};
	const addMessage = () => sendMessage({ message });

	return (
		<ChatContext.Provider
			value={{
				addMessage,
				message,
				handleInputChange,
				isLoading,
			}}
		>
			{children}
		</ChatContext.Provider>
	);
};
