class Utils {
	// Possible figure or dot colors
	// blue, red, black
	static COLORS = ['#00FFFF', '#FF6666', '#000000'];

	/**
	 * Returns a random rumber from a range
	 * @param min minimum value for range to get a random number
	 * @param max maximum value for range to get a random number
	 * @returns number
	 */
	static getRandomNumberInRange = (min: number, max: number): number => {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	};

	/**
	 * Returns random color from the array of colors defined in Utils
	 * @returns string
	 */
	static getRandomColor(): string {
		return Utils.COLORS[Utils.getRandomNumberInRange(0, Utils.COLORS.length - 1)];
	}

	/**
	 *
	 * @param src URL string to load sound from
	 * @param loop Boolean to loop or not
	 * @returns HTMLMediaElement (sound)
	 */
	static loadSound(src: string, loop: boolean = false): HTMLMediaElement {
		const sound = document.createElement('audio');
		sound.src = src;
		sound.setAttribute('preload', 'auto');
		sound.setAttribute('controls', 'none');
		sound.loop = loop || false;
		sound.style.display = 'none';
		document.body.appendChild(sound);
		return sound;
	}
}

export default Utils;
