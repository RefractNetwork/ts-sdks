// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { InferOutput } from 'valibot';
import { parse, safeParse } from 'valibot';

import { promiseWithResolvers } from '@mysten/utils';
import type { StashedRequestData, StashedResponsePayload, StashedResponseTypes } from './events.js';
import { StashedRequest, StashedResponse } from './events.js';

export const DEFAULT_STASHED_ORIGIN = 'https://getstashed.com';

export { StashedRequest, StashedResponse };

const getClientMetadata = () => {
	return {
		version: 'v1',
		originUrl: window.location.href,
		userAgent: navigator.userAgent,
		screenResolution: `${window.screen.width}x${window.screen.height}`,
		language: navigator.language,
		platform: navigator.platform,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		timestamp: Date.now(),
	};
};

export class StashedPopup {
	#popup: Window;

	#version: string;
	#id: string;
	#origin: string;
	#name: string;
	#chain: string | undefined;

	#promise: Promise<unknown>;
	#resolve: (data: unknown) => void;
	#reject: (error: Error) => void;

	#interval: ReturnType<typeof setInterval> | null = null;

	constructor({
		name,
		origin = DEFAULT_STASHED_ORIGIN,
		chain,
	}: {
		name: string;
		origin?: string;
		chain?: string;
	}) {
		const popup = window.open('about:blank', '_blank');

		if (!popup) {
			throw new Error('Failed to open new window');
		}
		this.#popup = popup;

		this.#id = crypto.randomUUID();
		this.#origin = origin;
		this.#name = name;
		this.#version = 'v1';
		this.#chain = chain;
		const { promise, resolve, reject } = promiseWithResolvers();
		this.#promise = promise;
		this.#resolve = resolve;
		this.#reject = reject;

		this.#interval = setInterval(() => {
			try {
				if (this.#popup.closed) {
					this.#cleanup();
					reject(new Error('User closed the Stashed window'));
				}
			} catch {
				// This can error during the login flow, but that's fine.
			}
		}, 1000);
	}

	send<T extends StashedRequestData['type']>({
		type,
		...data
	}: {
		type: T;
	} & Extract<StashedRequestData, { type: T }>): Promise<StashedResponseTypes[T]> {
		window.addEventListener('message', this.#listener);

		const requestData = {
			version: this.#version,
			requestId: this.#id,
			appUrl: window.location.href.split('#')[0],
			appName: this.#name,
			payload: {
				type,
				chain: this.#chain,
				...data,
			},
			metadata: getClientMetadata(),
		};
		const encodedRequestData = btoa(JSON.stringify(requestData));

		this.#popup.location.assign(
			`${this.#origin}/dapp-request${data ? `#${encodedRequestData}` : ''}`,
		);

		return this.#promise as Promise<StashedResponseTypes[T]>;
	}

	close() {
		this.#cleanup();
		this.#popup.close();
	}

	#listener = (event: MessageEvent) => {
		if (event.origin !== this.#origin) {
			return;
		}
		const { success, output } = safeParse(StashedResponse, event.data);
		if (!success || output.id !== this.#id) return;

		this.#cleanup();

		if (output.payload.type === 'reject') {
			this.#reject(new Error('User rejected the request'));
		} else if (output.payload.type === 'resolve') {
			this.#resolve(output.payload.data);
		}
	};

	#cleanup() {
		if (this.#interval) {
			clearInterval(this.#interval);
			this.#interval = null;
		}
		window.removeEventListener('message', this.#listener);
	}
}

export class StashedHost {
	#request: InferOutput<typeof StashedRequest>;

	constructor(request: InferOutput<typeof StashedRequest>) {
		if (typeof window === 'undefined' || !window.opener) {
			throw new Error(
				'StashedHost can only be used in a window opened through `window.open`. `window.opener` is not available.',
			);
		}

		this.#request = request;
	}

	static fromPayload(payload: StashedRequest) {
		const { requestId, appUrl, appName, version, ...rest } = payload;

		const request = parse(StashedRequest, {
			version,
			requestId,
			appUrl,
			appName,
			...rest,
		});

		return new StashedHost(request);
	}

	getRequestData() {
		return this.#request;
	}

	sendMessage(payload: StashedResponsePayload) {
		window.opener.postMessage(
			{
				id: this.#request.requestId,
				source: 'stashed-channel',
				payload,
				version: this.#request.version,
			} satisfies StashedResponse,
			this.#request.appUrl,
		);
	}

	close(payload?: StashedResponsePayload) {
		if (payload) {
			this.sendMessage(payload);
		}
		window.close();
	}
}
