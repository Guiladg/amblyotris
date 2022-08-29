export type PointVariant = 'fullColor' | 'highContrast' | 'veryHighContrast';
class Point {
	x: number;
	y: number;
	color?: string;
	direction?: 'vertical' | 'horizontal';
	variant?: PointVariant;

	/**
	 * Point can be initialized with object properties or just x/y
	 */
	constructor(o: { x: number; y: number; color?: string[]; direction?: 'vertical' | 'horizontal'; variant?: PointVariant });
	constructor(x: number, y: number);
	constructor(xo: any, y?: number) {
		if (isNaN(xo)) {
			this.x = xo.x;
			this.y = xo.y;
			this.color = xo.color;
			this.direction = xo.direction;
			this.variant = xo.variant;
		} else {
			this.x = xo;
			this.y = y;
		}
	}
}
export default Point;
