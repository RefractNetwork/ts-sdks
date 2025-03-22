// @ts-nocheck
import type * as TelegramSDK from '@telegram-apps/sdk';
import { createContext, useContext, useEffect, useState } from 'react';

type TelegramContextType = {
	isTMA: boolean;
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
	const [isTMA, setIsTMA] = useState(false);
	const [Telegram, setTelegram] = useState<typeof TelegramSDK | null>(null);

	useEffect(() => {
		const initializeTelegram = async () => {
			try {
				const bridge = await import('@telegram-apps/bridge');
				if (await bridge.isTMA()) {
					const telegram = await import('@telegram-apps/sdk');
					telegram.init();
					console.log(telegram.retrieveRawInitData());
					setIsTMA(true);
					setTelegram(telegram);
					console.log('Telegram SDK initialized');
				} else {
					console.log('You are outside of Telegram, using Sui dapp-kit');
				}
			} catch (error) {
				console.error('Failed to initialize Telegram SDK:', error);
				setIsTMA(false);
			}
		};

		initializeTelegram();
	}, []);

	const value: TelegramContextType = {
		isTMA,
		Telegram,
	};

	return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
};
