// @ts-nocheck
import type * as TelegramSDK from '@telegram-apps/sdk';
import { createContext, useContext, useEffect, useState } from 'react';

type TelegramContextType = {
	isTelegramInitialized: boolean;
	Telegram: typeof TelegramSDK;
};

const TelegramContext = createContext<TelegramContextType | null>(null);

export const useTelegram = () => {
	const context = useContext(TelegramContext);
	if (!context) {
		throw new Error('useTelegram must be used within a TelegramProvider');
	}
	return context;
};

type TelegramProviderProps = {
	children: React.ReactNode;
};

export const TelegramProvider = ({ children }: TelegramProviderProps) => {
	const [isTelegramInitialized, setTelegramInitialized] = useState(false);
	const [Telegram, setTelegram] = useState<typeof TelegramSDK | null>(null);

	useEffect(() => {
		const initializeTelegram = async () => {
			try {
				const telegram = await import('@telegram-apps/sdk');
				telegram.init();
				setTelegramInitialized(true);
				setTelegram(telegram);
				console.log('Telegram SDK initialized');
			} catch (error) {
				console.error('Failed to initialize Telegram SDK:', error);
				setTelegramInitialized(false);
			}
		};

		initializeTelegram();
	}, []);

	const value: TelegramContextType = {
		isTelegramInitialized,
		Telegram,
	};

	return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
};
