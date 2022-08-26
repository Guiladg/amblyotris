import Point from './point';
import Tetromino from './tetromino';
import Utils from './utils';
import Swal from 'sweetalert2';

interface BoardPoint extends Point {
	taken: boolean;
}

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
	static CANVAS_WIDTH = Game.SQUARE_LENGTH * Game.COLUMNS;
	static CANVAS_HEIGHT = Game.SQUARE_LENGTH * Game.ROWS;

	static BACKGROUND_FILL = '#FFFFFF';
	static BACKGROUND_STROKE = '#F0F0F0';
	static BORDER_COLOR = '#FFFFFF';
	static DELETED_ROW_COLOR = ['#FF00FF', '#00FFFF', '#FF00FF', '#00FFFF', '#FF00FF', '#00FFFF', '#FF00FF', '#00FFFF'];

	// When a piece collapses with something at its bottom, how many time wait for putting another piece? (in ms)
	static TIMEOUT_LOCK_PUT_NEXT_PIECE = 300;
	// Speed of falling piece (in ms)
	static PIECE_SPEED = 900;
	// Animation time when a row is being deleted
	static DELETE_ROW_ANIMATION = 500;

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
	subNextFigure: Tetromino;
	sounds: {
		success: HTMLMediaElement;
		background: HTMLMediaElement;
		tap: HTMLMediaElement;
		denied: HTMLMediaElement;
	};
	canPlay: boolean;
	intervalId: NodeJS.Timeout;
	scorePoints: number;
	scoreRows: number;
	scoreLevel: number;

	$btnDown: HTMLElement[];
	$btnRight: HTMLElement[];
	$btnLeft: HTMLElement[];
	$btnRotate: HTMLElement[];
	$btnHardDrop: HTMLElement[];
	$btnPause: HTMLElement[];
	$btnResume: HTMLElement[];
	$txtScore: HTMLElement[];
	$txtRows: HTMLElement[];
	$txtLevel: HTMLElement[];
	$btnReset: HTMLElement[];

	$baseEl: HTMLElement;
	$gameBoard: HTMLElement;
	$cnvBack: HTMLCanvasElement;
	$cnvStack: HTMLCanvasElement;
	$cnvActive: HTMLCanvasElement;
	$cnvFront: HTMLCanvasElement;
	$nextFigure: HTMLElement;
	$subNextFigure: HTMLElement;
	$cnvNext: HTMLCanvasElement;
	$cnvSubNext: HTMLCanvasElement;
	$cnvMessage: HTMLCanvasElement;
	canvasBack: CanvasRenderingContext2D;
	canvasStack: CanvasRenderingContext2D;
	canvasActive: CanvasRenderingContext2D;
	canvasFront: CanvasRenderingContext2D;
	canvasNext: CanvasRenderingContext2D;
	canvasSubNext: CanvasRenderingContext2D;
	canvasMessage: CanvasRenderingContext2D;
	$msg: HTMLElement;

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
		this.scorePoints = 0;
		this.scoreRows = 0;
		this.scoreLevel = 1;
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
		Swal.fire({ title: 'Bienvenido', text: 'Versión del Tetris para personas com ambliopía. Para usar con anteojos rojos/azules.', heightAuto: false }).then(
			() => this.resumeGame()
		);
	};

	/**
	 * Initializes keyboard keys and screen buttons
	 * Pauses game on window blur
	 */
	initControls = () => {
		document.addEventListener('keydown', (e) => {
			const { code } = e;
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

		this.$btnDown.forEach((btn) =>
			btn.addEventListener('mousedown', () => {
				this.attemptMoveDown();
			})
		);
		this.$btnRight.forEach((btn) =>
			btn.addEventListener('mousedown', () => {
				this.attemptMoveRight();
			})
		);
		this.$btnLeft.forEach((btn) =>
			btn.addEventListener('mousedown', () => {
				this.attemptMoveLeft();
			})
		);
		this.$btnRotate.forEach((btn) =>
			btn.addEventListener('mousedown', () => {
				this.attemptRotate();
			})
		);
		this.$btnHardDrop.forEach((btn) =>
			btn.addEventListener('mousedown', () => {
				this.hardDrop();
			})
		);
		[...this.$btnPause, ...this.$btnResume].forEach(($btn) =>
			$btn.addEventListener('click', () => {
				this.pauseOrResumeGame();
			})
		);
		this.$btnReset.forEach((btn) =>
			btn.addEventListener('click', () => {
				this.askUserConfirmResetGame();
			})
		);

		// Pauses game when window loses focus
		window.addEventListener('blur', () => this.pauseGame());
	};

	/**
	 * Moves current figure right
	 */
	attemptMoveRight = () => {
		if (!this.canPlay) return;
		if (this.figureCanMoveRight()) {
			this.globalX++;
		}
	};

	/**
	 * Moves current figure left
	 */
	attemptMoveLeft = () => {
		if (!this.canPlay) return;
		if (this.figureCanMoveLeft()) {
			this.globalX--;
		}
	};

	/**
	 * Moves current figure down
	 */
	attemptMoveDown = () => {
		if (!this.canPlay) return;
		if (this.figureCanMoveDown()) {
			this.globalY++;
		}
	};

	/**
	 * Drops figure to the end
	 */
	hardDrop = () => {
		if (!this.canPlay) return;
		// Flags hard drop for mainloop
		this.flagHardDrop = true;
		// Downs figure till end
		while (this.figureCanMoveDown()) {
			this.globalY++;
			this.scorePoints++;
			this.refreshScore();
		}
		// Process positions
		this.endFallingProcess();
	};

	/**
	 * Rotates current figure
	 */
	attemptRotate = () => {
		if (!this.canPlay) return;
		this.rotateFigure();
	};

	/**
	 * Toggles pause or resume
	 */
	pauseOrResumeGame = () => {
		if (this.paused) {
			this.resumeGame();
			this.$btnResume.forEach((btn) => (btn.hidden = true));
			this.$btnPause.forEach((btn) => (btn.hidden = false));
		} else {
			this.pauseGame();
			this.$btnResume.forEach((btn) => (btn.hidden = false));
			this.$btnPause.forEach((btn) => (btn.hidden = true));
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
		this.setMessage('▐ ▌', { font: 'bold 30px Arial' });
	};

	/**
	 * Restarts mainLoop and sounds
	 */
	resumeGame = () => {
		this.setMessage('3');
		setTimeout(() => {
			this.setMessage('2');
		}, 350);
		setTimeout(() => {
			this.setMessage('1');
		}, 700);
		setTimeout(() => {
			this.hideMessage();
			this.refreshScore();
			//this.sounds.background.play();
			this.paused = false;
			this.canPlay = true;
			this.intervalId = setInterval(this.mainLoop.bind(this), Game.PIECE_SPEED);
		}, 1050);
	};

	moveFigurePointsToExistingPieces = () => {
		this.canPlay = false;
		for (const point of this.currentFigure.getPoints()) {
			point.x += this.globalX;
			point.y += this.globalY;
			this.existingPieces[point.y][point.x] = {
				taken: true,
				...point
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
		const deletableRows: number[] = [];
		this.existingPieces.forEach((row, y) => {
			// If every point in row is taken, push row number
			if (row.every((point) => point.taken)) {
				deletableRows.push(y);
			}
		});
		console.log('~ points', deletableRows);
		return deletableRows;
	};

	changeDeletedRowColor = (deletableRows: number[]) => {
		const wait = Game.DELETE_ROW_ANIMATION / 5;
		const drawDeletedRows = () => {
			this.clearCanvas(this.canvasFront);
			for (const y of deletableRows) {
				for (let x = 0; x < Game.COLUMNS; x++) {
					let drawingPoint: Point = {
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
		// 1 line 40, 2 lines 100, 3 lines 30, 4 lines 1200
		let score = [0, 40, 100, 300, 1200];
		this.scorePoints += score[rows.length];
		this.scoreRows += rows.length;
		this.refreshScore();
	};

	/**
	 * Returns an empty row
	 * @param y
	 * @returns
	 */
	emptyRow = (y: number): BoardPoint[] => {
		let row: BoardPoint[] = [];
		for (let x = 0; x < Game.COLUMNS; x++) {
			row.push({
				taken: false,
				x,
				y
			});
		}
		return row;
	};

	/**
	 * Removes the rows defined in the array from the existing pieces matrix
	 * @param {number[]} deletableRows
	 */
	removeRowsFromExistingPieces = (deletableRows: number[]) => {
		// Iterate through the deleted rows
		for (let yCoordinate of deletableRows) {
			// Iterate through every row in existing pieces matrix,
			// from botton to top, starting from the deleted row
			for (let y = yCoordinate; y >= 0; y--) {
				if (y > 0) {
					// Move row downwards
					this.existingPieces[y] = [...this.existingPieces[y - 1]];
					// Corrects the y position on every point
					this.existingPieces[y].forEach((row, x) => (this.existingPieces[y][x].y = y));
				} else {
					// Add an empty row to the top
					this.existingPieces[y] = this.emptyRow(y);
				}
			}
		}
	};

	verifyAndDeleteFullRows = () => {
		// Check deletable rows
		const deletableRows = this.getPointsToDelete();
		if (!deletableRows.length) return;

		// Stop and play sound
		this.addScore(deletableRows);
		this.sounds.success.pause();
		this.sounds.success.currentTime = 0;
		this.sounds.success.play();
		// Stop falling process
		this.canPlay = false;
		// Paint deletable rows
		this.changeDeletedRowColor(deletableRows);
		// Wait for the deletion animation
		setTimeout(() => {
			// Remove rows
			this.removeRowsFromExistingPieces(deletableRows);
			this.drawStack();
			// Restart falling process
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
			this.canPlay = false;
			Swal.fire({ title: 'Juego terminado', text: 'Inténtalo de nuevo.', heightAuto: false }).then(() => {
				this.resetGame();
				this.resumeGame();
			});
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
			let drawingPoint = { ...point };
			drawingPoint.x += this.globalX;
			drawingPoint.y += this.globalY;
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
		const draw = (figure: Tetromino, canvas: CanvasRenderingContext2D) => {
			if (!figure) return;
			this.clearCanvas(canvas);
			const points = figure.getPoints();
			let offsetX;
			let offsetY;
			if (points.find((p) => p.x === 2)) {
				// Figure I needs half block to center verticaly (the only one with a point at x=2)
				offsetX = 0;
				offsetY = -0.5;
			} else if (points.find((p) => p.x === -1)) {
				// The rest needs half block to center horizontaly (they have a point at x=-1)
				offsetX = 0.5;
				offsetY = 0;
			} else {
				// Figure O needs one block to center horizontaly and has no negative points
				offsetX = 0;
				offsetY = 0;
			}
			for (const point of points) {
				let drawingPoint = { ...point };
				drawingPoint.x += offsetX + 1; // +1 because tetrominos have negative positions to center rotation point
				drawingPoint.y += offsetY + 1; // +1 because tetrominos have negative positions to center rotation point
				this.drawPoint(canvas, drawingPoint);
			}
		};
		draw(this.nextFigure, this.canvasNext);
		draw(this.subNextFigure, this.canvasSubNext);
	};

	/**
	 * Draws onw point on the selected canvas
	 * @param {CanvasRenderingContext2D} canvasContext
	 * @param {BoardPoint | Point} point
	 */
	drawPoint = (canvasContext: CanvasRenderingContext2D, point: BoardPoint | Point, shade = false) => {
		let x = point.x * Game.SQUARE_LENGTH;
		let y = point.y * Game.SQUARE_LENGTH;

		// Background
		let colorItem = 0;
		let barLength = Game.SQUARE_LENGTH / point.color.length;
		for (const color of point.color) {
			canvasContext.fillStyle = color;
			if (point.direction === 'vertical') {
				canvasContext.fillRect(x + barLength * colorItem, y, Game.SQUARE_LENGTH / point.color.length, Game.SQUARE_LENGTH);
			} else {
				canvasContext.fillRect(x, y + barLength * colorItem, Game.SQUARE_LENGTH, Game.SQUARE_LENGTH / point.color.length);
			}
			colorItem++;
		}
		if (shade) {
			// Shade top
			canvasContext.fillStyle = '#FFFFFF44';
			canvasContext.beginPath();
			canvasContext.moveTo(x, y);
			canvasContext.lineTo(x + Game.SQUARE_LENGTH, y);
			canvasContext.lineTo(x + Game.SQUARE_LENGTH / 2, y + Game.SQUARE_LENGTH / 2);
			canvasContext.fill();
			// Shade right
			canvasContext.fillStyle = '#00000022';
			canvasContext.beginPath();
			canvasContext.moveTo(x + Game.SQUARE_LENGTH, y);
			canvasContext.lineTo(x + Game.SQUARE_LENGTH, y + Game.SQUARE_LENGTH);
			canvasContext.lineTo(x + Game.SQUARE_LENGTH / 2, y + Game.SQUARE_LENGTH / 2);
			canvasContext.fill();
			// Shade bottom
			canvasContext.fillStyle = '#00000044';
			canvasContext.beginPath();
			canvasContext.moveTo(x, y + Game.SQUARE_LENGTH);
			canvasContext.lineTo(x + Game.SQUARE_LENGTH, y + Game.SQUARE_LENGTH);
			canvasContext.lineTo(x + Game.SQUARE_LENGTH / 2, y + Game.SQUARE_LENGTH / 2);
			canvasContext.fill();
			// Shade left
			canvasContext.fillStyle = '#FFFFFF22';
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
		if (this.$txtScore?.length) {
			this.$txtScore.forEach((txt) => (txt.textContent = String(this.scorePoints)));
		}
		if (this.$txtRows?.length) {
			this.$txtRows.forEach((txt) => (txt.textContent = String(this.scoreRows)));
		}
		if (this.$txtLevel?.length) {
			this.$txtLevel.forEach((txt) => (txt.textContent = String(this.scoreLevel)));
		}
	};

	/**
	 * Sets the message label
	 */
	setMessage = (text: string, options?: { font?: string; fillStyle?: string }) => {
		this.clearCanvas(this.canvasMessage);
		this.canvasMessage.textAlign = 'center';
		this.canvasMessage.fillStyle = options?.fillStyle ?? '#000000';
		const font = options?.font ?? 'bold 50px Arial';
		this.canvasMessage.font = font;
		// Calculates veretical offset depending on font size (10 is for making it better)
		const offsetY = Number(font.match(/\d+/)?.[0] ?? 0) / 2 - 10;
		this.canvasMessage.fillText(text, Game.CANVAS_WIDTH / 2, Game.CANVAS_HEIGHT / 2 + offsetY);
		this.$cnvMessage.style.opacity = '1';
	};
	hideMessage = () => {
		this.$cnvMessage.style.opacity = '0';
		setTimeout(() => this.clearCanvas(this.canvasMessage), 300);
	};

	/**
	 * Initializes default sound file
	 */
	initSounds = () => {
		this.sounds = {
			background: Utils.loadSound('assets/theme.mp3', true),
			success: Utils.loadSound('assets/success.wav'),
			denied: Utils.loadSound('assets/denied.wav'),
			tap: Utils.loadSound('assets/tap.wav')
		};
	};

	/**
	 * Initializes DOM elements and creates canvases
	 */
	initDomElements = () => {
		this.$txtScore = Array.from(this.$baseEl.getElementsByClassName('txtScore') as HTMLCollectionOf<HTMLElement>);
		this.$txtRows = Array.from(this.$baseEl.getElementsByClassName('txtRows') as HTMLCollectionOf<HTMLElement>);
		this.$txtLevel = Array.from(this.$baseEl.getElementsByClassName('txtLevel') as HTMLCollectionOf<HTMLElement>);
		this.$btnPause = Array.from(this.$baseEl.getElementsByClassName('btnPause') as HTMLCollectionOf<HTMLElement>);
		this.$btnResume = Array.from(this.$baseEl.getElementsByClassName('btnPlay') as HTMLCollectionOf<HTMLElement>);
		this.$btnRotate = Array.from(this.$baseEl.getElementsByClassName('btnRotate') as HTMLCollectionOf<HTMLElement>);
		this.$btnDown = Array.from(this.$baseEl.getElementsByClassName('btnDown') as HTMLCollectionOf<HTMLElement>);
		this.$btnHardDrop = Array.from(this.$baseEl.getElementsByClassName('btnHardDrop') as HTMLCollectionOf<HTMLElement>);
		this.$btnRight = Array.from(this.$baseEl.getElementsByClassName('btnRight') as HTMLCollectionOf<HTMLElement>);
		this.$btnLeft = Array.from(this.$baseEl.getElementsByClassName('btnLeft') as HTMLCollectionOf<HTMLElement>);
		this.$btnReset = Array.from(this.$baseEl.getElementsByClassName('btnReset') as HTMLCollectionOf<HTMLElement>);

		// Creates canvases for board and current element falling
		const gameBoard = this.$baseEl.getElementsByClassName('gameBoard');

		if (!gameBoard.length) {
			console.error('An element with lcass gameBoard is mandatory to initialize.');
			return;
		}
		this.$gameBoard = gameBoard[0] as HTMLElement;
		this.$gameBoard.style.position = 'relative';

		this.$cnvBack = document.createElement('canvas');
		this.$cnvBack.setAttribute('width', Game.CANVAS_WIDTH + 'px');
		this.$cnvBack.setAttribute('height', Game.CANVAS_HEIGHT + 'px');
		this.$cnvBack.style.width = '100%';
		this.$cnvBack.style.height = '100%';
		this.$cnvBack.style.zIndex = '0';
		this.$cnvStack = document.createElement('canvas');
		this.$cnvStack.setAttribute('width', Game.CANVAS_WIDTH + 'px');
		this.$cnvStack.setAttribute('height', Game.CANVAS_HEIGHT + 'px');
		this.$cnvStack.style.position = 'absolute';
		this.$cnvStack.style.left = '0';
		this.$cnvStack.style.top = '0';
		this.$cnvStack.style.width = '100%';
		this.$cnvStack.style.height = '100%';
		this.$cnvStack.style.zIndex = '1';
		this.$cnvActive = document.createElement('canvas');
		this.$cnvActive.setAttribute('width', Game.CANVAS_WIDTH + 'px');
		this.$cnvActive.setAttribute('height', Game.CANVAS_HEIGHT + 'px');
		this.$cnvActive.style.position = 'absolute';
		this.$cnvActive.style.left = '0';
		this.$cnvActive.style.top = '0';
		this.$cnvActive.style.width = '100%';
		this.$cnvActive.style.height = '100%';
		this.$cnvActive.style.zIndex = '2';
		this.$cnvFront = document.createElement('canvas');
		this.$cnvFront.setAttribute('width', Game.CANVAS_WIDTH + 'px');
		this.$cnvFront.setAttribute('height', Game.CANVAS_HEIGHT + 'px');
		this.$cnvFront.style.position = 'absolute';
		this.$cnvFront.style.left = '0';
		this.$cnvFront.style.top = '0';
		this.$cnvFront.style.width = '100%';
		this.$cnvFront.style.height = '100%';
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
		this.$cnvNext = document.createElement('canvas');
		this.$cnvNext.setAttribute('width', Game.SQUARE_LENGTH * 4 + 'px');
		this.$cnvNext.setAttribute('height', Game.SQUARE_LENGTH * 2 + 'px');
		this.canvasNext = this.$cnvNext.getContext('2d');
		const nextFigure = this.$baseEl.getElementsByClassName('nextFigure');
		if (nextFigure.length) {
			this.$nextFigure = nextFigure[0] as HTMLElement;
			this.$nextFigure.appendChild(this.$cnvNext);
		}
		// Creates canvas for sub next figure
		this.$cnvSubNext = document.createElement('canvas');
		this.$cnvSubNext.setAttribute('width', Game.SQUARE_LENGTH * 4 + 'px');
		this.$cnvSubNext.setAttribute('height', Game.SQUARE_LENGTH * 2 + 'px');
		this.canvasSubNext = this.$cnvSubNext.getContext('2d');
		const subNextFigure = this.$baseEl.getElementsByClassName('subNextFigure');
		if (subNextFigure.length) {
			this.$subNextFigure = subNextFigure[0] as HTMLElement;
			this.$subNextFigure.appendChild(this.$cnvSubNext);
		}

		// Crates canvas for messages over canvases
		this.$cnvMessage = document.createElement('canvas');
		this.$cnvMessage.setAttribute('width', Game.CANVAS_WIDTH + 'px');
		this.$cnvMessage.setAttribute('height', Game.CANVAS_HEIGHT + 'px');
		this.$cnvMessage.style.position = 'absolute';
		this.$cnvMessage.style.left = '0';
		this.$cnvMessage.style.top = '0';
		this.$cnvMessage.style.width = '100%';
		this.$cnvMessage.style.height = '100%';
		this.$cnvMessage.style.zIndex = '4';
		this.$cnvMessage.style.opacity = '0';
		this.$cnvMessage.style.transition = 'opacity 0.3s ease';
		this.$gameBoard.appendChild(this.$cnvMessage);
		this.canvasMessage = this.$cnvMessage.getContext('2d');
	};

	/**
	 * Resets cursor position to top middle
	 */
	restartGlobalXAndY = () => {
		this.globalX = Math.floor(Game.COLUMNS / 2) - 1;
		// Pieces start on -1 so they are not visible before starting to fall
		this.globalY = -1;
	};

	/**
	 * Sets the currentfigure to a new instance of a random figure
	 * @returns Tetromino
	 */
	chooseRandomFigure = () => {
		//TODO probar cargando los puntos con valores negativos respecto del punto de giro, el 0,0
		let randomFigure: Tetromino;
		let randomOption = Utils.getRandomNumberInRange(1, 7);
		switch (randomOption) {
			case 1: // O (smashboy)
				randomFigure = new Tetromino([[new Point(0, -1), new Point(1, -1), new Point(1, 0), new Point(0, 0)]], this.options);
				break;
			case 2: // I (hero)
				randomFigure = new Tetromino(
					[
						[new Point(-1, 0), new Point(0, 0), new Point(1, 0), new Point(2, 0)],
						[new Point(0, -1), new Point(0, 0), new Point(0, 1), new Point(0, 2)],
						[new Point(-1, 1), new Point(0, 1), new Point(1, 1), new Point(2, 1)],
						[new Point(1, -1), new Point(1, 0), new Point(1, 1), new Point(1, 2)]
					],

					this.options
				);
				break;
			case 3: // L (orange ricky)
				randomFigure = new Tetromino(
					[
						[new Point(-1, 0), new Point(0, 0), new Point(1, 0), new Point(1, -1)],
						[new Point(0, -1), new Point(0, 0), new Point(0, 1), new Point(1, 1)],
						[new Point(-1, 1), new Point(-1, 0), new Point(0, 0), new Point(1, 0)],
						[new Point(-1, -1), new Point(0, -1), new Point(0, 0), new Point(0, 1)]
					],
					this.options
				);
				break;
			case 4: // J (blue ricky)
				randomFigure = new Tetromino(
					[
						[new Point(-1, -1), new Point(-1, 0), new Point(0, 0), new Point(1, 0)],
						[new Point(0, 1), new Point(0, 0), new Point(0, -1), new Point(1, -1)],
						[new Point(-1, 0), new Point(0, 0), new Point(1, 0), new Point(1, 1)],
						[new Point(-1, 1), new Point(0, 1), new Point(0, 0), new Point(0, -1)]
					],
					this.options
				);
				break;
			case 5: // Z (Cleveland Z)
				randomFigure = new Tetromino(
					[
						[new Point(-1, -1), new Point(0, -1), new Point(0, 0), new Point(1, 0)],
						[new Point(0, 1), new Point(0, 0), new Point(1, 0), new Point(1, -1)],
						[new Point(-1, 0), new Point(0, 0), new Point(0, 1), new Point(1, 1)],
						[new Point(-1, 1), new Point(-1, 0), new Point(0, 0), new Point(0, -1)]
					],
					this.options
				);
				break;
			case 6: // S (Rhode Island Z)
				randomFigure = new Tetromino(
					[
						[new Point(-1, 0), new Point(0, 0), new Point(0, -1), new Point(1, -1)],
						[new Point(0, -1), new Point(0, 0), new Point(1, 0), new Point(1, 1)],
						[new Point(-1, 1), new Point(0, 1), new Point(0, 0), new Point(1, 0)],
						[new Point(-1, -1), new Point(-1, 0), new Point(0, 0), new Point(0, 1)]
					],
					this.options
				);
				break;
			case 7: // T (Teewee)
				randomFigure = new Tetromino(
					[
						[
							new Point({ x: -1, y: 0, direction: 'vertical' }),
							new Point({ x: 0, y: 0, direction: 'horizontal' }),
							new Point({ x: 1, y: 0, direction: 'vertical' }),
							new Point({ x: 0, y: -1, direction: 'vertical' })
						],
						[
							new Point({ x: 0, y: -1, direction: 'horizontal' }),
							new Point({ x: 0, y: 0, direction: 'vertical' }),
							new Point({ x: 0, y: 1, direction: 'horizontal' }),
							new Point({ x: 1, y: 0, direction: 'horizontal' })
						],
						[
							new Point({ x: -1, y: 0, direction: 'vertical' }),
							new Point({ x: 0, y: 0, direction: 'horizontal' }),
							new Point({ x: 1, y: 0, direction: 'vertical' }),
							new Point({ x: 0, y: 1, direction: 'vertical' })
						],
						[
							new Point({ x: 0, y: -1, direction: 'horizontal' }),
							new Point({ x: 0, y: 0, direction: 'vertical' }),
							new Point({ x: 0, y: 1, direction: 'horizontal' }),
							new Point({ x: -1, y: 0, direction: 'horizontal' })
						]
					],
					this.options
				);
				break;
			default: // Isolated point
				randomFigure = new Tetromino([[new Point(0, 0)]], this.options);
				break;
		}
		this.currentFigure = this.nextFigure;
		this.nextFigure = this.subNextFigure;
		this.subNextFigure = randomFigure;
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
		// absoluteY can be < 0 because starting figures are outside the bounds due to rotating point
		return absoluteX < 0 || absoluteX > Game.COLUMNS - 1 || absoluteY < -1 || absoluteY > Game.ROWS - 1;
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

	figureCanRotate = (offsetX = 0) => {
		// Creates new array with next rotation point
		let newPointsAfterRotate = [...this.currentFigure.getNextRotation()];
		// Adds offset to new points
		if (offsetX !== 0) {
			newPointsAfterRotate = newPointsAfterRotate.map((point) => {
				const newPoint = { ...point };
				newPoint.x += offsetX;
				return newPoint;
			});
		}
		// Calculate if rotated figure crashes to existing point
		for (const rotatedPoint of newPointsAfterRotate) {
			if (!this.isValidPoint(rotatedPoint, this.currentFigure.getPoints())) {
				return false;
			}
		}
		return true;
	};

	rotateFigure = () => {
		// Checks if moving the piece to left or right and then rotating is possible
		// (4 spaces y the maximum size of a piece)
		// This solves the problem of a figure stucked to the walls
		for (let offset = 0; offset <= 4; offset++) {
			if (this.figureCanRotate(offset)) {
				this.currentFigure.points = this.currentFigure.getNextRotation();
				this.currentFigure.incrementRotationIndex();
				this.globalX += offset;
				return;
			} else if (this.figureCanRotate(offset * -1)) {
				this.currentFigure.points = this.currentFigure.getNextRotation();
				this.currentFigure.incrementRotationIndex();
				this.globalX -= offset;
				return;
			}
		}
		this.sounds.denied.pause();
		this.sounds.denied.currentTime = 0;
		this.sounds.denied.play();
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
			confirmButtonText: 'Sí',
			heightAuto: false
		});
		if (result.value) {
			this.resetGame();
		} else {
			this.resumeGame();
		}
	};
}
export default Game;
