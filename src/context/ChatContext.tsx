/* 
	To pass data from the message we write in the messages .
	  In the context we are sending the data to the abackned and 
	  storeing in db, and once that is done the message shown from here 
	  the context in the messgages component.
	
*/

import { useToast } from '@/components/ui/use-toast';
import { useMutation } from '@tanstack/react-query';
import { ReactNode, createContext, useState } from 'react';

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
	const { toast } = useToast();

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
