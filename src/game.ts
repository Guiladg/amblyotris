import Point from './point';
import Tetromino from './tetromino';
import Utils from './utils';
import Swal from 'sweetalert2';

type BoardPoint = { taken: boolean; color: string[]; x: number; y: number };

export interface GameOptions {
	variant: 'fullColor' | 'mixedColor' | 'highContrast' | 'highContrast';
}

const requestAnimFrame = (function () {
	return (
		window.requestAnimationFrame ||
		function (callback) {
			window.setTimeout(callback, 1000 / 60);
		}
	);
})();

class Game {
	// Square length in pixels
	static SQUARE_LENGTH = screen.width > 420 ? 30 : 20;
	static COLUMNS = 10;
	static ROWS = 20;
	static CANVAS_WIDTH = this.SQUARE_LENGTH * this.COLUMNS;
	static CANVAS_HEIGHT = this.SQUARE_LENGTH * this.ROWS;

	static BACKGROUND_COLOR = '#eaeaea';
	static BACKGROUND_FILL = '#eaeaea';
	static BACKGROUND_STROKE = '#ffffff';
	static BORDER_COLOR = '#ffffff';
	static DELETED_ROW_COLOR = ['#FF00FF', '#00FFFF', '#FF00FF', '#00FFFF', '#FF00FF', '#00FFFF', '#FF00FF', '#00FFFF'];

	// When a piece collapses with something at its bottom, how many time wait for putting another piece? (in ms)
	static TIMEOUT_LOCK_PUT_NEXT_PIECE = 300;
	// Speed of falling piece (in ms)
	static PIECE_SPEED = 400;
	// Animation time when a row is being deleted
	static DELETE_ROW_ANIMATION = 500;
	// Score to add when a square dissapears (for each square)
	static PER_SQUARE_SCORE = 1;

	options: GameOptions;
	flagTimeout: boolean;
	flagHardDrop: boolean;
	board: BoardPoint[][];
	existingPieces: BoardPoint[][];
	globalX: number;
	globalY: number;
	paused: boolean;
	currentFigure: Tetromino;
	nextFigure: Tetromino;
	sounds: {
		success: HTMLMediaElement;
		background: HTMLMediaElement;
		tap: HTMLMediaElement;
		denied: HTMLMediaElement;
	};
	canPlay: boolean;
	intervalId: NodeJS.Timeout;
	score: number;

	$btnDown: HTMLElement;
	$btnRight: HTMLElement;
	$btnLeft: HTMLElement;
	$btnRotate: HTMLElement;
	$btnHardDrop: HTMLElement;
	$btnPause: HTMLElement;
	$btnResume: HTMLElement;
	$txtScore: HTMLElement;
	$btnReset: HTMLElement;

	$baseEl: HTMLElement;
	$gameBoard: HTMLElement;
	$cnvBack: HTMLCanvasElement;
	$cnvStack: HTMLCanvasElement;
	$cnvActive: HTMLCanvasElement;
	$cnvFront: HTMLCanvasElement;
	$nextFigure: HTMLElement;
	$cnvNext: HTMLCanvasElement;
	canvasBack: CanvasRenderingContext2D;
	canvasStack: CanvasRenderingContext2D;
	canvasActive: CanvasRenderingContext2D;
	canvasFront: CanvasRenderingContext2D;
	canvasNext: CanvasRenderingContext2D;

	constructor(baseEl: any, options?: GameOptions) {
		let defaults: GameOptions = { variant: 'fullColor' };
		this.$baseEl = baseEl;
		this.options = { ...defaults, ...options };
		this.init();
	}

	/**
	 * Initializes game values
	 */
	init = () => {
		this.showWelcome();
		this.initDomElements();
		this.initSounds();
		this.resetGame();
		this.initControls();
	};

	/**
	 * Reinitializes game values
	 */
	resetGame = () => {
		this.score = 0;
		this.sounds.success.currentTime = 0;
		this.sounds.success.pause();
		this.sounds.background.currentTime = 0;
		this.sounds.background.pause();
		this.initExistingPieces();
		this.chooseRandomFigure();
		this.restartGlobalXAndY();
		this.refreshScore();
		this.pauseGame();
		this.drawBack();
		this.drawStack();
		this.drawActive();
	};

	/**
	 * Shows welcome message
	 */
	showWelcome = () => {
		Swal.fire(
			'Bienvenido',
			`Port casi perfecto del juego de Tetris en JavaScript.
<br>
<strong>Controles:</strong>
<ul class="list-group">
<li class="list-group-item"> <kbd>P</kbd><br>Pausar o reanudar </li>
<li class="list-group-item"> <kbd>R</kbd><br>Rotar</li>
<li class="list-group-item"> <kbd>Flechas de dirección</kbd><br>Mover figura hacia esa dirección</li>
<li class="list-group-item"><strong>También puedes usar los botones si estás en móvil</strong></li>
</ul>
<strong>Creado por <a href="https://parzibyte.me/blog">Parzibyte</a></strong>
<br>
Gracias a <a target="_blank" href="https://www.youtube.com/channel/UCz6zvgkf6eKpgqlUZQstOtQ">Bulby</a> por la música de fondo
y a <a href="https://freesound.org/people/grunz/sounds/109662/">Freesound.org</a> por el sonido al completar una línea
`
		);
	};

	/**
	 * Initializes keyboard keys and screen buttons
	 */
	initControls = () => {
		document.addEventListener('keydown', (e) => {
			const { code } = e;
			if (!this.canPlay && code !== 'KeyP') {
				return;
			}
			switch (code) {
				case 'ArrowRight':
					this.attemptMoveRight();
					break;
				case 'ArrowLeft':
					this.attemptMoveLeft();
					break;
				case 'ArrowDown':
					this.attemptMoveDown();
					break;
				case 'ArrowUp':
					this.attemptRotate();
					break;
				case 'KeyP':
					this.pauseOrResumeGame();
					break;
				case 'Space':
					this.hardDrop();
					break;
			}
		});

		this.$btnDown.addEventListener('mousedown', () => {
			this.attemptMoveDown();
		});
		this.$btnRight.addEventListener('mousedown', () => {
			this.attemptMoveRight();
		});
		this.$btnLeft.addEventListener('mousedown', () => {
			this.attemptMoveLeft();
		});
		this.$btnRotate.addEventListener('mousedown', () => {
			this.attemptRotate();
		});
		this.$btnHardDrop.addEventListener('mousedown', () => {
			this.hardDrop();
		});
		[this.$btnPause, this.$btnResume].forEach(($btn) =>
			$btn.addEventListener('click', () => {
				this.pauseOrResumeGame();
			})
		);
		this.$btnReset.addEventListener('click', () => {
			this.askUserConfirmResetGame();
		});
	};

	/**
	 * Moves current figure right
	 */
	attemptMoveRight = () => {
		if (this.figureCanMoveRight()) {
			this.globalX++;
		}
	};

	/**
	 * Moves current figure left
	 */
	attemptMoveLeft = () => {
		if (this.figureCanMoveLeft()) {
			this.globalX--;
		}
	};

	/**
	 * Moves current figure down
	 */
	attemptMoveDown = () => {
		if (this.figureCanMoveDown()) {
			this.globalY++;
			this.score++;
		}
	};

	/**
	 * Drops figure to the end
	 */
	hardDrop = () => {
		// Flags hard drop for mainloop
		this.flagHardDrop = true;
		// Downs figure till end
		while (this.figureCanMoveDown()) {
			this.globalY++;
			this.score++;
		}
		// Process positions
		this.endFallingProcess();
	};

	/**
	 * Rotates current figure
	 */
	attemptRotate = () => {
		this.rotateFigure();
	};

	/**
	 * Toggles pause or resume
	 */
	pauseOrResumeGame = () => {
		if (this.paused) {
			this.resumeGame();
			this.$btnResume.hidden = true;
			this.$btnPause.hidden = false;
		} else {
			this.pauseGame();
			this.$btnResume.hidden = false;
			this.$btnPause.hidden = true;
		}
	};

	/**
	 * Pauses mainLoop and sounds
	 */
	pauseGame = () => {
		this.sounds.background.pause();
		this.paused = true;
		this.canPlay = false;
		clearInterval(this.intervalId);
	};

	/**
	 * Restarts mainLoop and sounds
	 */
	resumeGame = () => {
		//this.sounds.background.play();
		this.refreshScore();
		this.paused = false;
		this.canPlay = true;
		this.intervalId = setInterval(this.mainLoop.bind(this), Game.PIECE_SPEED);
	};

	moveFigurePointsToExistingPieces = () => {
		this.canPlay = false;
		for (const point of this.currentFigure.getPoints()) {
			point.x += this.globalX;
			point.y += this.globalY;
			this.existingPieces[point.y][point.x] = {
				taken: true,
				color: point.color,
				x: point.x,
				y: point.y
			};
		}
		this.restartGlobalXAndY();
		this.canPlay = true;
		this.drawStack();
	};

	playerLoses = (): boolean => {
		// Check if there's something at Y 1. Maybe it is not fair for the player, but it works
		for (const point of this.existingPieces[1]) {
			if (point.taken) {
				return true;
			}
		}
		return false;
	};

	getPointsToDelete = (): number[] => {
		const points: number[] = [];
		let y = 0;
		for (const row of this.existingPieces) {
			const isRowFull = row.every((point) => point.taken);
			if (isRowFull) {
				// We only need the Y coordinate
				points.push(y);
			}
			y++;
		}
		return points;
	};

	changeDeletedRowColor = (yCoordinates: number[]) => {
		const wait = Game.DELETE_ROW_ANIMATION / 5;
		const drawDeletedRows = () => {
			this.clearCanvas(this.canvasFront);
			for (const y of yCoordinates) {
				for (let x = 0; x < Game.COLUMNS; x++) {
					let drawingPoint: BoardPoint = {
						taken: true,
						color: Game.DELETED_ROW_COLOR,
						x: x,
						y: y
					};
					this.drawPoint(this.canvasFront, drawingPoint, false);
				}
			}
		};
		setTimeout(() => this.clearCanvas(this.canvasFront), wait * 1);
		setTimeout(drawDeletedRows, wait * 2);
		setTimeout(() => this.clearCanvas(this.canvasFront), wait * 3);
		setTimeout(drawDeletedRows, wait * 4);
		setTimeout(() => this.clearCanvas(this.canvasFront), wait * 5);
	};

	addScore = (rows: number[]) => {
		this.score += Game.PER_SQUARE_SCORE * Game.COLUMNS * rows.length;
		this.refreshScore();
	};

	/**
	 * Returns aan empty row
	 * @param x
	 * @param y
	 * @returns
	 */
	emptyRow = (y: number): BoardPoint[] => {
		let row: BoardPoint[] = [];
		for (let x = 0; x < Game.COLUMNS; x++) {
			row.push({
				taken: false,
				color: [Game.BACKGROUND_COLOR],
				x,
				y
			});
		}
		return row;
	};

	/**
	 * Removes the rows defined in the array from the existing pieces matrix
	 * @param yCoordinates
	 */
	removeRowsFromExistingPieces = (yCoordinates: number[]) => {
		// Creates an array with the inverted list of rows to delete
		const invertedCoordinates = [...yCoordinates].reverse();
		// Iterate through the deleted rows
		for (let yCoordinate of invertedCoordinates) {
			// Iterate through every row in existing pieces matrix from botton to top
			// starting on the deleted row
			for (let y = yCoordinate; y >= 0; y--) {
				if (y > 0) {
					// Creates a copy of the previous row one on the deleted row
					this.existingPieces[y] = [...this.existingPieces[y - 1]];
					// Corrects the y position
					this.existingPieces[y].forEach((row, x) => (this.existingPieces[y][x].y = y));
				} else {
					// Add an empty row to the top
					this.existingPieces[y] = this.emptyRow(y);
				}
			}
		}
	};

	verifyAndDeleteFullRows = () => {
		// Here be dragons
		const yCoordinates = this.getPointsToDelete();
		if (yCoordinates.length <= 0) return;
		this.addScore(yCoordinates);
		this.sounds.success.currentTime = 0;
		this.sounds.success.play();
		this.canPlay = false;
		this.changeDeletedRowColor(yCoordinates);
		setTimeout(() => {
			this.removeRowsFromExistingPieces(yCoordinates);
			this.drawStack();
			this.canPlay = true;
		}, Game.DELETE_ROW_ANIMATION);
	};

	mainLoop = () => {
		if (!this.canPlay) {
			return;
		}
		// If figure can move down, move down
		if (this.figureCanMoveDown()) {
			this.globalY++;
		} else {
			// If figure cannot, then we start a timeout because
			// player can move figure to keep it going down
			// for example when the figure collapses with another points but there's remaining
			// space at the left or right and the player moves there so the figure can keep going down
			if (this.flagTimeout) return;
			this.flagTimeout = true;
			// If figure was hard dropped, play tap sound immediately
			// otherwise, wait to end moves
			setTimeout(() => {
				this.flagTimeout = false;
				// If the time expires, we re-check if figure cannot keep going down. If it can
				// (because player moved it) then we return and keep the loop
				if (this.figureCanMoveDown()) {
					return;
				}
				// At this point, we know that the figure collapsed either with the floor
				// or with another point. So we move all the figure to the existing pieces array
				this.endFallingProcess();
			}, Game.TIMEOUT_LOCK_PUT_NEXT_PIECE);
		}
	};

	endFallingProcess = () => {
		this.sounds.tap.play();
		this.moveFigurePointsToExistingPieces();
		if (this.playerLoses()) {
			Swal.fire('Juego terminado', 'Inténtalo de nuevo');
			this.canPlay = false;
			this.resetGame();
			return;
		}
		this.verifyAndDeleteFullRows();
		this.chooseRandomFigure();
		this.flagHardDrop = false;
	};

	/**
	 * Clears the canvas
	 * @param canvasContext
	 */
	clearCanvas = (canvasContext: CanvasRenderingContext2D) => {
		canvasContext.clearRect(0, 0, Game.CANVAS_WIDTH, Game.CANVAS_HEIGHT);
	};

	/**
	 * Draws the background of the board
	 */
	drawBack = () => {
		this.clearCanvas(this.canvasBack);
		this.canvasBack.fillStyle = Game.BACKGROUND_FILL;
		this.canvasBack.strokeStyle = Game.BACKGROUND_STROKE;
		for (let y = 0; y < Game.ROWS; y++) {
			for (let x = 0; x < Game.COLUMNS; x++) {
				this.canvasBack.fillRect(x * Game.SQUARE_LENGTH, y * Game.SQUARE_LENGTH, Game.SQUARE_LENGTH, Game.SQUARE_LENGTH);
				this.canvasBack.strokeRect(x * Game.SQUARE_LENGTH, y * Game.SQUARE_LENGTH, Game.SQUARE_LENGTH, Game.SQUARE_LENGTH);
			}
		}
	};

	/**
	 * Draws current figure on the board
	 */
	drawActive = () => {
		requestAnimFrame(this.drawActive);
		if (!this.currentFigure) return;
		this.clearCanvas(this.canvasActive);
		for (const point of this.currentFigure.getPoints()) {
			let drawingPoint: BoardPoint = {
				taken: true,
				color: point.color,
				x: point.x + this.globalX,
				y: point.y + this.globalY
			};
			this.drawPoint(this.canvasActive, drawingPoint);
		}
	};

	/**
	 * Draws the stack of figures
	 */
	drawStack = () => {
		this.clearCanvas(this.canvasStack);
		// Iterate over all every point on the existingPieces matrix
		for (const row of this.existingPieces) {
			for (const point of row) {
				// Draw ocupied points
				if (point.taken) {
					this.drawPoint(this.canvasStack, point);
				}
			}
		}
	};

	/**
	 * Draws the stack of figures
	 */
	drawNext = () => {
		if (!this.nextFigure) return;
		this.clearCanvas(this.canvasNext);
		const points = this.nextFigure.getPoints();
		let offsetX = 0;
		let offsetY = 0;
		if (points.find((p) => p.x === 3)) {
			offsetX = 0;
			offsetY = 0.5;
		} else if (points.find((p) => p.x === 2)) {
			offsetX = 0.5;
			offsetY = 0;
		} else {
			offsetX = 1;
			offsetY = 0;
		}
		for (const point of points) {
			let drawingPoint: Point = {
				color: point.color,
				x: point.x + offsetX,
				y: point.y + offsetY
			};
			this.drawPoint(this.canvasNext, drawingPoint);
		}
	};

	/**
	 * Draws onw point on the selected canvas
	 * @param {CanvasRenderingContext2D} canvasContext
	 * @param {BoardPoint} point
	 */
	drawPoint = (canvasContext: CanvasRenderingContext2D, point: BoardPoint | Point, shade = true) => {
		let x = point.x * Game.SQUARE_LENGTH;
		let y = point.y * Game.SQUARE_LENGTH;

		// Background
		let colorItem = 0;
		let barHeight = Game.SQUARE_LENGTH / point.color.length;
		for (const color of point.color) {
			canvasContext.fillStyle = color;
			canvasContext.fillRect(x, y + barHeight * colorItem, Game.SQUARE_LENGTH, Game.SQUARE_LENGTH / point.color.length);
			colorItem++;
		}
		if (shade) {
			// Shade top
			canvasContext.fillStyle = '#FFFFFF66';
			canvasContext.beginPath();
			canvasContext.moveTo(x, y);
			canvasContext.lineTo(x + Game.SQUARE_LENGTH, y);
			canvasContext.lineTo(x + Game.SQUARE_LENGTH / 2, y + Game.SQUARE_LENGTH / 2);
			canvasContext.fill();
			// Shade right
			canvasContext.fillStyle = '#00000033';
			canvasContext.beginPath();
			canvasContext.moveTo(x + Game.SQUARE_LENGTH, y);
			canvasContext.lineTo(x + Game.SQUARE_LENGTH, y + Game.SQUARE_LENGTH);
			canvasContext.lineTo(x + Game.SQUARE_LENGTH / 2, y + Game.SQUARE_LENGTH / 2);
			canvasContext.fill();
			// Shade bottom
			canvasContext.fillStyle = '#00000066';
			canvasContext.beginPath();
			canvasContext.moveTo(x, y + Game.SQUARE_LENGTH);
			canvasContext.lineTo(x + Game.SQUARE_LENGTH, y + Game.SQUARE_LENGTH);
			canvasContext.lineTo(x + Game.SQUARE_LENGTH / 2, y + Game.SQUARE_LENGTH / 2);
			canvasContext.fill();
			// Shade left
			canvasContext.fillStyle = '#FFFFFF33';
			canvasContext.beginPath();
			canvasContext.moveTo(x, y);
			canvasContext.lineTo(x + Game.SQUARE_LENGTH, y);
			canvasContext.lineTo(x + Game.SQUARE_LENGTH / 2, y + Game.SQUARE_LENGTH / 2);
			canvasContext.fill();
		}
		// Border
		canvasContext.strokeStyle = Game.BORDER_COLOR;
		canvasContext.strokeRect(x, y, Game.SQUARE_LENGTH, Game.SQUARE_LENGTH);
	};

	/**
	 * Sets the score label from the variable
	 */
	refreshScore = () => {
		if (!this.$txtScore) return;
		this.$txtScore.textContent = String(this.score);
	};

	/**
	 * Initializes default sound file
	 */
	initSounds = () => {
		this.sounds = {
			background: Utils.loadSound('assets/New Donk City_ Daytime 8 Bit.mp3', true),
			success: Utils.loadSound('assets/success.wav'),
			denied: Utils.loadSound('assets/denied.wav'),
			tap: Utils.loadSound('assets/tap.wav')
		};
	};

	/**
	 * Initializes DOM elements and creates canvases
	 */
	initDomElements = () => {
		this.$txtScore = this.$baseEl.querySelector('#txtScore');
		this.$btnPause = this.$baseEl.querySelector('#btnPause');
		this.$btnResume = this.$baseEl.querySelector('#btnPlay');
		this.$btnRotate = this.$baseEl.querySelector('#btnRotate');
		this.$btnDown = this.$baseEl.querySelector('#btnDown');
		this.$btnHardDrop = this.$baseEl.querySelector('#btnHardDrop');
		this.$btnRight = this.$baseEl.querySelector('#btnRight');
		this.$btnLeft = this.$baseEl.querySelector('#btnLeft');
		this.$btnReset = this.$baseEl.querySelector('#btnReset');

		// Creates canvases for board and current element falling
		this.$gameBoard = this.$baseEl.querySelector('#gameBoard');

		this.$cnvBack = document.createElement('canvas');
		this.$cnvBack.setAttribute('width', Game.CANVAS_WIDTH + 'px');
		this.$cnvBack.setAttribute('height', Game.CANVAS_HEIGHT + 'px');
		this.$cnvBack.style.zIndex = '0';
		this.$cnvStack = document.createElement('canvas');
		this.$cnvStack.setAttribute('width', Game.CANVAS_WIDTH + 'px');
		this.$cnvStack.setAttribute('height', Game.CANVAS_HEIGHT + 'px');
		this.$cnvStack.style.position = 'absolute';
		this.$cnvStack.style.zIndex = '1';
		this.$cnvActive = document.createElement('canvas');
		this.$cnvActive.setAttribute('width', Game.CANVAS_WIDTH + 'px');
		this.$cnvActive.setAttribute('height', Game.CANVAS_HEIGHT + 'px');
		this.$cnvActive.style.position = 'absolute';
		this.$cnvActive.style.zIndex = '2';
		this.$cnvFront = document.createElement('canvas');
		this.$cnvFront.setAttribute('width', Game.CANVAS_WIDTH + 'px');
		this.$cnvFront.setAttribute('height', Game.CANVAS_HEIGHT + 'px');
		this.$cnvFront.style.position = 'absolute';
		this.$cnvFront.style.zIndex = '3';

		this.$gameBoard.appendChild(this.$cnvStack);
		this.$gameBoard.appendChild(this.$cnvActive);
		this.$gameBoard.appendChild(this.$cnvFront);
		this.$gameBoard.appendChild(this.$cnvBack);

		this.canvasBack = this.$cnvBack.getContext('2d');
		this.canvasStack = this.$cnvStack.getContext('2d');
		this.canvasActive = this.$cnvActive.getContext('2d');
		this.canvasFront = this.$cnvFront.getContext('2d');

		// Creates canvas for next figure
		this.$nextFigure = this.$baseEl.querySelector('#nextFigure');
		this.$cnvNext = document.createElement('canvas');
		this.$cnvNext.setAttribute('width', Game.SQUARE_LENGTH * 4 + 'px');
		this.$cnvNext.setAttribute('height', Game.SQUARE_LENGTH * 2 + 'px');
		this.$nextFigure.appendChild(this.$cnvNext);

		this.canvasNext = this.$cnvNext.getContext('2d');
	};

	/**
	 * Resets cursor position to top middle
	 */
	restartGlobalXAndY = () => {
		this.globalX = Math.floor(Game.COLUMNS / 2) - 1;
		this.globalY = 0;
	};

	/**
	 * Sets the currentfigure to a new instance of a random figure
	 * @returns Tetromino
	 */
	chooseRandomFigure = () => {
		let randomFigure: Tetromino;
		let randomOption = Utils.getRandomNumberInRange(1, 7);
		switch (randomOption) {
			case 1: // O (smashboy)
				randomFigure = new Tetromino([[new Point(0, 0), new Point(1, 0), new Point(0, 1), new Point(1, 1)]], this.options);
				break;
			case 2: // I (hero)
				randomFigure = new Tetromino(
					[
						[new Point(0, 0), new Point(1, 0), new Point(2, 0), new Point(3, 0)],
						[new Point(0, 0), new Point(0, 1), new Point(0, 2), new Point(0, 3)]
					],
					this.options
				);
				break;
			case 3: // L (orange ricky)
				randomFigure = new Tetromino(
					[
						[new Point(0, 1), new Point(1, 1), new Point(2, 1), new Point(2, 0)],
						[new Point(0, 0), new Point(0, 1), new Point(0, 2), new Point(1, 2)],
						[new Point(0, 0), new Point(0, 1), new Point(1, 0), new Point(2, 0)],
						[new Point(0, 0), new Point(1, 0), new Point(1, 1), new Point(1, 2)]
					],
					this.options
				);
				break;
			case 4: // J (blue ricky)
				randomFigure = new Tetromino(
					[
						[new Point(0, 0), new Point(0, 1), new Point(1, 1), new Point(2, 1)],
						[new Point(0, 0), new Point(1, 0), new Point(0, 1), new Point(0, 2)],
						[new Point(0, 0), new Point(1, 0), new Point(2, 0), new Point(2, 1)],
						[new Point(0, 2), new Point(1, 2), new Point(1, 1), new Point(1, 0)]
					],
					this.options
				);
				break;
			case 5: // Z (Cleveland Z)
				randomFigure = new Tetromino(
					[
						[new Point(0, 0), new Point(1, 0), new Point(1, 1), new Point(2, 1)],
						[new Point(0, 1), new Point(1, 1), new Point(1, 0), new Point(0, 2)]
					],
					this.options
				);
				break;
			case 6: // S (Rhode Island Z)
				randomFigure = new Tetromino(
					[
						[new Point(0, 1), new Point(1, 1), new Point(1, 0), new Point(2, 0)],
						[new Point(0, 0), new Point(0, 1), new Point(1, 1), new Point(1, 2)]
					],
					this.options
				);
				break;
			case 7: // T (Teewee)
				randomFigure = new Tetromino(
					[
						[new Point(0, 1), new Point(1, 1), new Point(1, 0), new Point(2, 1)],
						[new Point(0, 0), new Point(0, 1), new Point(0, 2), new Point(1, 1)],
						[new Point(0, 0), new Point(1, 0), new Point(2, 0), new Point(1, 1)],
						[new Point(0, 1), new Point(1, 0), new Point(1, 1), new Point(1, 2)]
					],
					this.options
				);
				break;
			default: // Isolated point
				randomFigure = new Tetromino([[new Point(0, 0)]], this.options);
				break;
		}
		this.currentFigure = this.nextFigure;
		this.nextFigure = randomFigure;
		// Only for the first time, recall the Fn to have current and next
		if (!this.currentFigure) {
			this.chooseRandomFigure();
		}
		this.drawNext();
	};

	/**
	 * Initiates the matrix of existing pieces
	 */
	initExistingPieces = () => {
		this.existingPieces = [];
		for (let y = 0; y < Game.ROWS; y++) {
			this.existingPieces.push([]);
			for (let x = 0; x < Game.COLUMNS; x++) {
				this.existingPieces[y].push({
					taken: false,
					color: [Game.BACKGROUND_COLOR],
					x,
					y
				});
			}
		}
	};

	/**
	 * Returns true or false depending on the position of the point inside the limits of the board.
	 * @param relativeX
	 * @param relativeY
	 * @returns {boolean}
	 */
	relativePointOutOfLimits = (relativeX: number, relativeY: number): boolean => {
		const absoluteX = relativeX + this.globalX;
		const absoluteY = relativeY + this.globalY;
		return this.absolutePointOutOfLimits(absoluteX, absoluteY);
	};

	/**
	 * Returns true or false depending on the position of the point inside the limits of the board.
	 * @param absoluteX
	 * @param absoluteY
	 * @returns {boolean}
	 */
	absolutePointOutOfLimits = (absoluteX: number, absoluteY: number): boolean => {
		return absoluteX < 0 || absoluteX > Game.COLUMNS - 1 || absoluteY < 0 || absoluteY > Game.ROWS - 1;
	};

	/**
	 * Returns true or false depending on the possibility of a point to be occupied.
	 * @param x number
	 * @param y number
	 * @returns boolean
	 */
	isEmptyPoint = (x: number, y: number) => {
		// It returns true even if the point is not valid (for example if it is out of limit, because it is not the function's responsibility)
		if (!this.existingPieces[y]) return true;
		if (!this.existingPieces[y][x]) return true;
		return !this.existingPieces[y][x].taken;
	};

	/**
	 * Checks if a point (in the game board) is valid to put another point there.
	 * @param point the point to check, with relative coordinates
	 * @param points an array of points that conforms a figure
	 */
	isValidPoint = (point: Point, points: Point[]) => {
		const emptyPoint = this.isEmptyPoint(this.globalX + point.x, this.globalY + point.y);
		const hasSameCoordinateOfFigurePoint =
			points.findIndex((p) => {
				return p.x === point.x && p.y === point.y;
			}) !== -1;
		const outOfLimits = this.relativePointOutOfLimits(point.x, point.y);
		return Boolean(emptyPoint || hasSameCoordinateOfFigurePoint) && !outOfLimits;
	};

	figureCanMoveRight = () => {
		if (!this.currentFigure) return false;
		for (const point of this.currentFigure.getPoints()) {
			const newPoint = new Point(point.x + 1, point.y);
			if (!this.isValidPoint(newPoint, this.currentFigure.getPoints())) {
				return false;
			}
		}
		return true;
	};

	figureCanMoveLeft = () => {
		if (!this.currentFigure) return false;
		for (const point of this.currentFigure.getPoints()) {
			const newPoint = new Point(point.x - 1, point.y);
			if (!this.isValidPoint(newPoint, this.currentFigure.getPoints())) {
				return false;
			}
		}
		return true;
	};

	figureCanMoveDown = () => {
		if (!this.currentFigure) return false;
		for (const point of this.currentFigure.getPoints()) {
			const newPoint = new Point(point.x, point.y + 1);
			if (!this.isValidPoint(newPoint, this.currentFigure.getPoints())) {
				return false;
			}
		}
		return true;
	};

	figureCanRotate = () => {
		const newPointsAfterRotate = this.currentFigure.getNextRotation();
		for (const rotatedPoint of newPointsAfterRotate) {
			if (!this.isValidPoint(rotatedPoint, this.currentFigure.getPoints())) {
				return false;
			}
		}
		return true;
	};

	rotateFigure = () => {
		if (!this.figureCanRotate()) {
			this.sounds.denied.currentTime = 0;
			this.sounds.denied.play();
			return;
		}
		this.currentFigure.points = this.currentFigure.getNextRotation();
		this.currentFigure.incrementRotationIndex();
	};

	askUserConfirmResetGame = async () => {
		this.pauseGame();
		const result = await Swal.fire({
			title: 'Reiniciar',
			text: '¿Quieres reiniciar el juego?',
			icon: 'question',
			showCancelButton: true,
			confirmButtonColor: '#fdbf9c',
			cancelButtonColor: '#4A42F3',
			cancelButtonText: 'No',
			confirmButtonText: 'Sí'
		});
		if (result.value) {
			this.resetGame();
		} else {
			this.resumeGame();
		}
	};
}
export default Game;
