import Game, { GameOptions } from './game';

declare global {
	interface Window {
		initAmblyotris: (element: HTMLElement, options?: GameOptions) => void;
		amblyotris: Game;
	}
}

if (window.initAmblyotris) {
	console.error(
		"Can't initialize Amblyotris. initAmblyotris function already set."
	);
} else {
	window.initAmblyotris = (element: HTMLElement, options?: GameOptions) => {
		if (!element) {
			console.error("Can't initialize Amblyotris. Element not found.");
			return;
		}
		window.amblyotris = new Game(element, options);
	};
}
