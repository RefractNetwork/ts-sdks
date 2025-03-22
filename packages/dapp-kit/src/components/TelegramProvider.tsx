/**
 * @fileoverview TelegramProvider Component
 *
 * This file provides a React context provider that initializes and manages the Telegram Mini App SDK.
 * It detects whether the application is running inside a Telegram Mini App environment and
 * provides access to the Telegram SDK throughout the component tree.
 *
 * I already wrapped WalletProvider with TelegramProvider, so that the dapp does not need to do anything
 */

// TODO: Fix TypeScript resolution-mode for ESM import in CommonJS module
// Current workaround is @ts-nocheck, but should be updated to use:

// @ts-nocheck
import type * as TelegramSDK from '@telegram-apps/sdk';
import { createContext, useContext, useEffect, useState } from 'react';

type TelegramContextType = {
	isTMA: boolean;
	Telegram: typeof TelegramSDK;
};

/**
 * Context for providing Telegram SDK functionality throughout the app
 */
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
	// Track if running inside Telegram Mini App
	const [isTMA, setIsTMA] = useState(false);
	// Store the Telegram SDK instance
	const [Telegram, setTelegram] = useState<typeof TelegramSDK | null>(null);

	// Initialize Telegram SDK on component mount
	useEffect(() => {
		/**
		 * Asynchronously initializes the Telegram SDK
		 */
		const initializeTelegram = async () => {
			try {
				// Import the Telegram bridge to check environment
				const bridge = await import('@telegram-apps/bridge');
				// Check if running in Telegram Mini App
				if (await bridge.isTMA()) {
					// Import and initialize the Telegram SDK
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

	// Prepare the context value to be provided
	const value: TelegramContextType = {
		isTMA,
		Telegram,
	};

	return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
};
