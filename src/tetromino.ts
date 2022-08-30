import Point, { PointVariant } from './point';
import Utils from './utils';

export class Tetromino {
	rotations: Point[][];
	rotationIndex: number;
	points: Point[];

	/**
	 * Creates a new Tetromino instance
	 * @param rotations array of Point array with different ration options
	 */
	constructor(rotations: Point[][]) {
		this.rotations = rotations;
		this.rotationIndex = 0;
		this.points = this.rotations[this.rotationIndex];
		// Sets color and direction for each point if not already set
		this.rotations.forEach((rotation) => {
			rotation.forEach((point, i) => {
				point.color ??= '#000000';
				point.variant ??= 'fullColor';
				if (point.variant === 'veryHighContrast') {
					// One block vertical, one block horizontal
					point.direction ??= i % 2 === 0 ? 'vertical' : 'horizontal';
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

export function newTetrominoO(variant: PointVariant, color: string): Tetromino {
	return new Tetromino([
		[new Point({ x: 0, y: -1,variant, color }), new Point({ x: 1, y: -1,variant, color }), new Point({ x: 1, y: 0,variant, color }), new Point({ x: 0, y: 0,variant, color })]
	]);
}

export function newTetrominoI(variant: PointVariant, color: string): Tetromino {
	return new Tetromino([
		[new Point({ x: -1, y: 0,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 1, y: 0,variant, color }), new Point({ x: 2, y: 0,variant, color })],
		[new Point({ x: 0, y: -1,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 0, y: 1,variant, color }), new Point({ x: 0, y: 2,variant, color })],
		[new Point({ x: -1, y: 1,variant, color }), new Point({ x: 0, y: 1,variant, color }), new Point({ x: 1, y: 1,variant, color }), new Point({ x: 2, y: 1,variant, color })],
		[new Point({ x: 1, y: -1,variant, color }), new Point({ x: 1, y: 0,variant, color }), new Point({ x: 1, y: 1,variant, color }), new Point({ x: 1, y: 2,variant, color })]
	]);
}

export function newTetrominoL(variant: PointVariant, color: string): Tetromino {
	return new Tetromino([
		[new Point({ x: -1, y: 0,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 1, y: 0,variant, color }), new Point({ x: 1, y: -1,variant, color })],
		[new Point({ x: 0, y: -1,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 0, y: 1,variant, color }), new Point({ x: 1, y: 1,variant, color })],
		[new Point({ x: -1, y: 1,variant, color }), new Point({ x: -1, y: 0,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 1, y: 0,variant, color })],
		[new Point({ x: -1, y: -1,variant, color }), new Point({ x: 0, y: -1,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 0, y: 1,variant, color })]
	]);
}

export function newTetrominoJ(variant: PointVariant, color: string): Tetromino {
	return new Tetromino([
		[new Point({ x: -1, y: -1,variant, color }), new Point({ x: -1, y: 0,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 1, y: 0,variant, color })],
		[new Point({ x: 0, y: 1,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 0, y: -1,variant, color }), new Point({ x: 1, y: -1,variant, color })],
		[new Point({ x: -1, y: 0,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 1, y: 0,variant, color }), new Point({ x: 1, y: 1,variant, color })],
		[new Point({ x: -1, y: 1,variant, color }), new Point({ x: 0, y: 1,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 0, y: -1,variant, color })]
	]);
}

export function newTetrominoZ(variant: PointVariant, color: string): Tetromino {
	return new Tetromino([
		[new Point({ x: -1, y: -1,variant, color }), new Point({ x: 0, y: -1,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 1, y: 0,variant, color })],
		[new Point({ x: 0, y: 1,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 1, y: 0,variant, color }), new Point({ x: 1, y: -1,variant, color })],
		[new Point({ x: -1, y: 0,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 0, y: 1,variant, color }), new Point({ x: 1, y: 1,variant, color })],
		[new Point({ x: -1, y: 1,variant, color }), new Point({ x: -1, y: 0,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 0, y: -1,variant, color })]
	]);
}

export function newTetrominoS(variant: PointVariant, color: string): Tetromino {
	return new Tetromino([
		[new Point({ x: -1, y: 0,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 0, y: -1,variant, color }), new Point({ x: 1, y: -1,variant, color })],
		[new Point({ x: 0, y: -1,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 1, y: 0,variant, color }), new Point({ x: 1, y: 1,variant, color })],
		[new Point({ x: -1, y: 1,variant, color }), new Point({ x: 0, y: 1,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 1, y: 0,variant, color })],
		[new Point({ x: -1, y: -1,variant, color }), new Point({ x: -1, y: 0,variant, color }), new Point({ x: 0, y: 0,variant, color }), new Point({ x: 0, y: 1,variant, color })]
	]);
}

export function newTetrominoT(variant: PointVariant, color: string): Tetromino {
	return new Tetromino([
		[
			new Point({ x: -1, y: 0,variant, color, direction: 'vertical' }),
			new Point({ x: 0, y: 0,variant, color, direction: 'horizontal' }),
			new Point({ x: 1, y: 0,variant, color, direction: 'vertical' }),
			new Point({ x: 0, y: -1,variant, color, direction: 'vertical' })
		],
		[
			new Point({ x: 0, y: -1,variant, color, direction: 'horizontal' }),
			new Point({ x: 0, y: 0,variant, color, direction: 'vertical' }),
			new Point({ x: 0, y: 1,variant, color, direction: 'horizontal' }),
			new Point({ x: 1, y: 0,variant, color, direction: 'horizontal' })
		],
		[
			new Point({ x: -1, y: 0,variant, color, direction: 'vertical' }),
			new Point({ x: 0, y: 0,variant, color, direction: 'horizontal' }),
			new Point({ x: 1, y: 0,variant, color, direction: 'vertical' }),
			new Point({ x: 0, y: 1,variant, color, direction: 'vertical' })
		],
		[
			new Point({ x: 0, y: -1,variant, color, direction: 'horizontal' }),
			new Point({ x: 0, y: 0,variant, color, direction: 'vertical' }),
			new Point({ x: 0, y: 1,variant, color, direction: 'horizontal' }),
			new Point({ x: -1, y: 0,variant, color, direction: 'horizontal' })
		]
	]);
}
