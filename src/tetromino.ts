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
		this.rotations.forEach((points) => {
			points.forEach((point) => {
				if (options.variant === 'highContrast') {
					// 3 lines
					// Gets true or false randomly, then will be converted to 0 or 1, to get color from array
					let colorPos = Boolean(Math.round(Math.random()));
					point.color = [
						Utils.COLORS[Number(colorPos)],
						Utils.COLORS[Number(!colorPos)],
						Utils.COLORS[Number(colorPos)],
					];
				} else if (options.variant === 'veryHighContrast') {
					// 5 lines
					// Gets true or false randomly, then will be converted to 0 or 1, to get color from array
					let colorPos = Boolean(Math.round(Math.random()));
					point.color = [
						Utils.COLORS[Number(!colorPos)],
						Utils.COLORS[Number(colorPos)],
						Utils.COLORS[Number(!colorPos)],
						Utils.COLORS[Number(colorPos)],
						Utils.COLORS[Number(!colorPos)],
					];
				} else if (options.variant === 'mixedColor') {
					// Each point different color
					point.color = [Utils.getRandomColor()];
				} else {
					// Same color figure
					point.color = [randomColor];
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
