import Point from './point';
import Utils from './utils';

interface TetrominoOptions {
	variant: 'fullColor' | 'mixedColor' | 'highContrast' | 'veryHighContrast';
}

class Tetromino {
	rotations: Point[][];
	rotationIndex: number;
	points: Point[];

	/**
	 * Creates a new Tetromino instance
	 * @param rotations array of Point array with different ration options
	 * @param options
	 */
	constructor(rotations: Point[][], options: TetrominoOptions) {
		this.rotations = rotations;
		this.rotationIndex = 0;
		this.points = this.rotations[this.rotationIndex];
		const randomColor = Utils.getRandomColor();
		// Sets color and direction for each point if not already set
		this.rotations.forEach((rotation) => {
			rotation.forEach((point, i) => {
				if (options.variant === 'highContrast') {
					// 3 lines
					point.color ??= [Utils.COLORS[1], Utils.COLORS[2], Utils.COLORS[3]];
					// One block vertical, one block horizontal
					point.direction ??= i % 2 === 0 ? 'vertical' : 'horizontal';
				} else if (options.variant === 'veryHighContrast') {
					// 5 lines
					point.color ??= [Utils.COLORS[0], Utils.COLORS[1], Utils.COLORS[2], Utils.COLORS[3], Utils.COLORS[4]];
					// One block vertical, one block horizontal
					point.direction ??= i % 2 === 0 ? 'vertical' : 'horizontal';
				} else {
					// Same color figure
					point.color ??= [randomColor];
				}
			});
		});
		this.incrementRotationIndex();
	}

	/**
	 * Returns the array of points of the figure
	 * @returns Point array
	 */
	getPoints(): Point[] {
		return this.points;
	}

	/**
	 * Rotates the figure, moving to next rotation
	 */
	incrementRotationIndex() {
		if (this.rotations.length <= 0) {
			this.rotationIndex = 0;
		} else {
			if (this.rotationIndex + 1 >= this.rotations.length) {
				this.rotationIndex = 0;
			} else {
				this.rotationIndex++;
			}
		}
	}

	/**
	 * Returns the next possible rotation of the figure
	 * @returns Point array
	 */
	getNextRotation(): Point[] {
		return this.rotations[this.rotationIndex];
	}
}
export default Tetromino;
