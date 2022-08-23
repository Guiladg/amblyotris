class Point {
	x: number;
	y: number;
	color?: string[];
	direction?: 'vertical' | 'horizontal';

	/**
	 * Point can be initialized with object properties or just x/y
	 */
	constructor(o: { x: number; y: number; color?: string[]; direction?: 'vertical' | 'horizontal' });
	constructor(x: number, y: number);
	constructor(xo: any, y?: number) {
		if (isNaN(xo)) {
			this.x = xo.x;
			this.y = xo.y;
			this.color = xo.color;
			this.direction = xo.direction;
		} else {
			this.x = xo;
			this.y = y;
		}
	}
}
export default Point;
