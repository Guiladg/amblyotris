import Point, { PointVariant } from './point';
import { Tetromino, newTetrominoI, newTetrominoJ, newTetrominoL, newTetrominoO, newTetrominoS, newTetrominoT, newTetrominoZ } from './tetromino';
import Utils from './utils';
import Swal from 'sweetalert';

interface BoardPoint extends Point {
	taken: boolean;
}

interface GameSettings {
	colorAlternatives?: string[][];
	color: string[];
	opacity: string[];
	variantAlternatives?: PointVariant[];
	background?: string;
	variant?: PointVariant;
	pieceSpeed?: number;
	rows?: number;
	cols?: number;
	squareSize?: number;
	width?: number;
	height?: number;
}

export interface GameOptions extends GameSettings {
	baseElement?: HTMLElement;
	onInit?: () => void;
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
	options: GameOptions;
	settings: GameSettings;

	flagTimeout: boolean;
	flagHardDrop: boolean;
	board: BoardPoint[][];
	existingPieces: BoardPoint[][];
	globalX: number;
	globalY: number;
	paused: boolean;
	starting: boolean;
	currentFigure: Tetromino;
	nextFigure: Tetromino;
	subNextFigure: Tetromino;
	sounds: {
		mute: boolean;
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
	scoreRowsInLevel: number;

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
	$btnMenu: HTMLElement[];
	$btnSoundOn: HTMLElement[];
	$btnSoundOff: HTMLElement[];
	$btnSettings: HTMLElement[];
	$divMenu: HTMLElement;

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

	constructor(options?: GameOptions);
	constructor(baseEl: HTMLElement, options?: GameOptions);
	constructor(baseElOrOptions: any, options?: GameOptions) {
		const squareSize = Math.round(screen.width / 10);
		const cols = 10;
		const rows = 20;
		// First color is for background, then blue, red and black
		const colorAlternatives = [
			['#FFFFFF', '#00fee8', '#ff5500', '#000000'],
			['#81007f', '#04007d', '#800001', '#000000']
		];
		// Current opacity of each color. Background opacity is not used.
		const opacity = ['FF', 'FF', 'FF', 'FF'];
		let defaults: GameOptions = {
			colorAlternatives,
			variantAlternatives: ['fullColor', 'highContrast', 'veryHighContrast'],
			color: colorAlternatives[0],
			opacity,
			variant: 'fullColor',
			pieceSpeed: 950,
			cols,
			rows,
			squareSize,
			width: squareSize * cols,
			height: squareSize * rows
		};
		let baseEl: HTMLElement;
		let opts: GameOptions;
		if (baseElOrOptions?.baseElement) {
			baseEl = baseElOrOptions.baseElement;
			opts = baseElOrOptions;
		} else {
			baseEl = baseElOrOptions;
			opts = options;
		}
		this.$baseEl = baseEl;
		this.options = { ...defaults, ...opts };
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
		if (this.options.onInit) {
			this.options.onInit();
		}
	};

	/**
	 * Reinitializes game values
	 */
	resetGame = () => {
		this.scorePoints = 0;
		this.scoreRows = 0;
		this.scoreRowsInLevel = 0;
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
		this.drawBack(this.canvasBack);
		this.drawStack();
		this.drawActive();
	};

	/**
	 * Shows welcome message
	 */
	showWelcome = () => {
		Swal({ title: 'Bienvenido', text: 'Versión del Tetris para personas con ambliopía. Para usar con anteojos rojos/azules.', closeOnEsc: true }).then(() =>
			this.resumeGame()
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
				case 'Space':
					this.hardDrop();
					break;
			}
		});

		this.$btnDown?.forEach((btn) =>
			btn.addEventListener('mousedown', () => {
				this.attemptMoveDown();
			})
		);
		this.$btnRight?.forEach((btn) =>
			btn.addEventListener('mousedown', () => {
				this.attemptMoveRight();
			})
		);
		this.$btnLeft?.forEach((btn) =>
			btn.addEventListener('mousedown', () => {
				this.attemptMoveLeft();
			})
		);
		this.$btnRotate?.forEach((btn) =>
			btn.addEventListener('mousedown', () => {
				this.attemptRotate();
			})
		);
		this.$btnHardDrop?.forEach((btn) =>
			btn.addEventListener('mousedown', () => {
				this.hardDrop();
			})
		);
		[...this.$btnPause, ...this.$btnResume]?.forEach(($btn) =>
			$btn.addEventListener('click', () => {
				this.pauseOrResumeGame();
			})
		);
		this.$btnReset?.forEach((btn) =>
			btn.addEventListener('click', () => {
				this.askUserConfirmResetGame();
			})
		);
		this.$btnMenu?.forEach((btn) =>
			btn.addEventListener('click', () => {
				this.showMenu();
			})
		);
		this.$btnSoundOn?.forEach((btn) =>
			btn.addEventListener('click', () => {
				this.sounds.mute = false;
				btn.style.display = 'none';
				this.$btnSoundOff.forEach((b) => (b.style.display = 'block'));
			})
		);
		this.$btnSoundOff?.forEach((btn) =>
			btn.addEventListener('click', () => {
				this.sounds.mute = true;
				btn.style.display = 'none';
				this.$btnSoundOn.forEach((b) => (b.style.display = 'block'));
			})
		);
		this.$btnSettings?.forEach((btn) =>
			btn.addEventListener('click', () => {
				this.showSettings();
			})
		);
		// Every button inside the menu closes it
		Array.from(this.$divMenu.getElementsByTagName('button'))?.forEach((btn) =>
			btn.addEventListener('click', () => {
				Swal.close();
			})
		);

		// Pauses game when window loses focus
		window.addEventListener('blur', () => (!this.paused ? (this.$btnMenu?.length ? this.showMenu() : this.pauseGame()) : null));
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
			// Adds 1 point per square
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
		} else {
			this.pauseGame();
		}
	};

	/**
	 * Pauses mainLoop and sounds
	 */
	pauseGame = () => {
		this.paused = true;
		this.starting = false;
		// Pauses music
		this.sounds.background.pause();
		// Stop falling pieces
		this.canPlay = false;
		clearInterval(this.intervalId);
		this.setMessage('▐ ▌', { font: `bold ${this.options.squareSize * 1.5}px Arial` });
		// Hides pause buttons and shows play buttons
		this.$btnResume.forEach((btn) => (btn.style.display = 'block'));
		this.$btnPause.forEach((btn) => (btn.style.display = 'none'));
	};

	/**
	 * Restarts mainLoop and sounds
	 */
	resumeGame = () => {
		if (!this.paused || this.starting) return;

		this.paused = false;
		this.starting = true;

		// Makes 3-2-1 and start
		this.setMessage('3');
		setTimeout(() => {
			if (!this.starting) return;
			this.setMessage('2');
			setTimeout(() => {
				if (!this.starting) return;
				this.setMessage('1');
				setTimeout(() => {
					if (!this.starting) return;
					this.starting = false;
					this.hideMessage();
					// Plays music
					if (!this.sounds.mute) {
						this.sounds.background.play();
					}
					// Start falling pieces
					this.canPlay = true;
					this.intervalId = setInterval(this.mainLoop.bind(this), this.options.pieceSpeed);
					// Hides play buttons and shows pause buttons
					this.$btnResume.forEach((btn) => (btn.style.display = 'none'));
					this.$btnPause.forEach((btn) => (btn.style.display = 'block'));
				}, 350);
			}, 350);
		}, 350);
	};

	/**
	 * Moves the current figure points to the existing stack
	 */
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

	/**
	 * Returns true if player has lost the game
	 * @returns {boolean}
	 */
	playerLoses = (): boolean => {
		// Check if there's something at Y 1. Maybe it is not fair for the player, but it works
		for (const point of this.existingPieces[1]) {
			if (point.taken) {
				return true;
			}
		}
		return false;
	};

	/**
	 * Adds the number of deleted rows to the score and the corresponding points
	 * Adds one to current level if
	 * @param {number} rows rows recently deleted
	 */
	addScore = (rows: number[]) => {
		// 1 line 40, 2 lines 100, 3 lines 30, 4 lines 1200
		let score = [0, 40, 100, 300, 1200];
		this.scorePoints += score[rows.length];
		this.scoreRows += rows.length;
		this.scoreRowsInLevel += rows.length;
		// Changes level when needed
		if (this.scoreLevel <= 10) {
			// Until level 9, level up after 10 lines * level
			if (this.scoreRowsInLevel >= this.scoreLevel * 10) {
				this.scoreLevel++;
				this.scoreRowsInLevel = this.scoreRowsInLevel - this.scoreLevel * 10; // Keep extra lines
			}
		} else if (this.scoreLevel <= 15) {
			// Until level 15, level up after 100 lines
			if (this.scoreRowsInLevel >= 100) {
				this.scoreLevel++;
				this.scoreRowsInLevel = this.scoreRowsInLevel - 100; // Keep extra lines
			}
		} else {
			// After level 15, level up after 150
			if (this.scoreRowsInLevel >= 150) {
				this.scoreLevel++;
				this.scoreRowsInLevel = this.scoreRowsInLevel - 150; // Keep extra lines
			}
		}
		// Speed of pieces increases 50 ms per level
		this.options.pieceSpeed = 1000 - this.scoreLevel * 50;
		this.refreshScore();
	};

	/**
	 * Paints deletable rows
	 * @param {number[]} deletableRows rows to delete
	 */
	changeDeletedRowColor = (deletableRows: number[]) => {
		// This Fn  draws a line for each color set in array
		// over each deleted row
		const drawDeletedRows = () => {
			const colors = ['#FF00FF', '#888888', '#FF00FF', '#888888', '#FF00FF', '#888888', '#FF00FF', '#888888'];
			this.clearCanvas(this.canvasFront);
			for (const lineY of deletableRows) {
				let y = lineY * this.options.squareSize;
				let colorItem = 0;
				let barLength = this.options.squareSize / colors.length;
				for (const color of colors) {
					this.canvasFront.fillStyle = color;
					this.canvasFront.fillRect(0, y + barLength * colorItem, this.options.squareSize * this.options.cols, this.options.squareSize / colors.length);
					colorItem++;
				}
			}
		};
		// Blink effect
		drawDeletedRows();
		setTimeout(() => this.clearCanvas(this.canvasFront), 100);
		setTimeout(drawDeletedRows, 200);
		setTimeout(() => this.clearCanvas(this.canvasFront), 300);
		setTimeout(drawDeletedRows, 400);
		setTimeout(() => this.clearCanvas(this.canvasFront), 500);
	};

	/**
	 * Removes the rows defined in the array from the existing pieces matrix
	 * @param {number[]} deletableRows
	 */
	removeRowsFromExistingPieces = (deletableRows: number[]) => {
		// This Fn returns a full empty row to add at top
		const emptyRow = (y: number): BoardPoint[] => {
			let row: BoardPoint[] = [];
			for (let x = 0; x < this.options.cols; x++) {
				row.push({
					taken: false,
					x,
					y
				});
			}
			return row;
		};
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
					this.existingPieces[y] = emptyRow(y);
				}
			}
		}
	};

	/**
	 * Calculates if there are rows that must be deleted and then does it
	 */
	verifyAndDeleteFullRows = () => {
		// Check deletable rows
		const deletableRows: number[] = [];
		this.existingPieces.forEach((row, y) => {
			// If every point in row is taken, push row number
			if (row.every((point) => point.taken)) {
				deletableRows.push(y);
			}
		});

		if (deletableRows.length) {
			// Adds score
			this.addScore(deletableRows);
			// Stop and play sound
			if (!this.sounds.mute) {
				this.sounds.success.pause();
				this.sounds.success.currentTime = 0;
				this.sounds.success.play();
			}
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
			}, 500);
		}
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
			}, this.options.pieceSpeed / 3);
		}
	};

	endFallingProcess = () => {
		if (!this.sounds.mute) {
			this.sounds.tap.pause();
			this.sounds.tap.currentTime = 0;
			this.sounds.tap.play();
		}
		this.moveFigurePointsToExistingPieces();
		if (this.playerLoses()) {
			this.canPlay = false;
			Swal({ title: 'Juego terminado', text: 'Inténtalo de nuevo.' }).then(() => {
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
		canvasContext.clearRect(0, 0, this.options.width, this.options.height);
	};

	/**
	 * Draws the background of the board
	 */
	drawBack = (canvasContext: CanvasRenderingContext2D, color?: string) => {
		this.clearCanvas(canvasContext);
		canvasContext.fillStyle = color ?? this.options.color[0];
		canvasContext.fill();
		canvasContext.strokeStyle = '#CCCCCC33';
		canvasContext.lineWidth = this.options.squareSize / 30;
		for (let y = 0; y < this.options.rows; y++) {
			for (let x = 0; x < this.options.cols; x++) {
				canvasContext.fillRect(x * this.options.squareSize, y * this.options.squareSize, this.options.squareSize, this.options.squareSize);
				canvasContext.strokeRect(x * this.options.squareSize, y * this.options.squareSize, this.options.squareSize, this.options.squareSize);
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
			let offsetX = 0.5; // Half block padding left
			let offsetY = 0.5; // Half block padding top
			if (points.find((p: Point) => p.x === 2)) {
				// Figure I needs half block to center verticaly (the only one with a point at x=2)
				offsetX += 0;
				offsetY += -0.5;
			} else if (points.find((p: Point) => p.x === -1)) {
				// The rest needs half block to center horizontaly (they have a point at x=-1)
				offsetX += 0.5;
				offsetY += 0;
			} else {
				// Figure O needs one block to center horizontaly and has no negative points
				offsetX += 0;
				offsetY += 0;
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
	drawPoint = (canvasContext: CanvasRenderingContext2D, point: BoardPoint | Point) => {
		// Border between points
		const gap = this.options.squareSize / 30;

		// Size of a square minus borders
		let s = this.options.squareSize - gap * 2;

		// Absolute positions
		let x = point.x * this.options.squareSize + gap;
		let y = point.y * this.options.squareSize + gap;

		// Fill
		let colorItem = 0;
		canvasContext.fillStyle = point.color;
		canvasContext.fillRect(x, y, s, s);

		// Variants
		const borderWidth = s / 5;
		if (point.variant !== 'fullColor') {
			// Clears inside
			canvasContext.clearRect(x + borderWidth, y + borderWidth, s - borderWidth * 2, s - borderWidth * 2);
		}
		if (point.variant === 'veryHighContrast') {
			if (point.direction === 'vertical') {
				canvasContext.fillRect(x + borderWidth * 2, y + borderWidth, borderWidth, s - borderWidth * 2);
			} else {
				canvasContext.fillRect(x + borderWidth, y + borderWidth * 2, s - borderWidth * 2, borderWidth);
			}
			colorItem++;
		}
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
		this.canvasMessage.strokeStyle = '#FFFFFF';
		this.canvasMessage.lineWidth = this.options.squareSize / 8;
		const font = options?.font ?? `bold ${this.options.squareSize * 3}px Arial`;
		this.canvasMessage.font = font;
		// Calculates veretical offset depending on font size (10 is for making it better)
		const offsetY = Number(font.match(/\d+/)?.[0] ?? 0) / 2 - 10;
		// Prints on screen
		this.canvasMessage.strokeText(text, this.options.width / 2, this.options.height / 2 + offsetY);
		this.canvasMessage.fillText(text, this.options.width / 2, this.options.height / 2 + offsetY);
		// Shows canvas
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
			mute: false,
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
		this.$btnSoundOn = Array.from(this.$baseEl.getElementsByClassName('btnSoundOn') as HTMLCollectionOf<HTMLElement>);
		this.$btnSoundOff = Array.from(this.$baseEl.getElementsByClassName('btnSoundOff') as HTMLCollectionOf<HTMLElement>);
		this.$btnSettings = Array.from(this.$baseEl.getElementsByClassName('btnSettings') as HTMLCollectionOf<HTMLElement>);
		this.$btnMenu = Array.from(this.$baseEl.getElementsByClassName('btnMenu') as HTMLCollectionOf<HTMLElement>);
		this.$divMenu = this.$baseEl.querySelector('.menu');

		this.$gameBoard = this.$baseEl.querySelector('.gameBoard');
		if (!this.$gameBoard) {
			console.error('An element with lcass gameBoard is mandatory to initialize.');
			return;
		}
		this.$gameBoard.style.position = 'relative';

		// Creates canvases for board and current element falling
		this.$cnvBack = document.createElement('canvas');
		this.$cnvBack.setAttribute('width', this.options.width + 'px');
		this.$cnvBack.setAttribute('height', this.options.height + 'px');
		this.$cnvBack.style.zIndex = '0';
		this.$cnvStack = document.createElement('canvas');
		this.$cnvStack.setAttribute('width', this.options.width + 'px');
		this.$cnvStack.setAttribute('height', this.options.height + 'px');
		this.$cnvStack.style.position = 'absolute';
		this.$cnvStack.style.zIndex = '1';
		this.$cnvActive = document.createElement('canvas');
		this.$cnvActive.setAttribute('width', this.options.width + 'px');
		this.$cnvActive.setAttribute('height', this.options.height + 'px');
		this.$cnvActive.style.position = 'absolute';
		this.$cnvActive.style.zIndex = '2';

		// Creates canvases for deleting animation and messages
		this.$cnvFront = document.createElement('canvas');
		this.$cnvFront.setAttribute('width', this.options.width + 'px');
		this.$cnvFront.setAttribute('height', this.options.height + 'px');
		this.$cnvFront.style.position = 'absolute';
		this.$cnvFront.style.zIndex = '3';
		this.$cnvMessage = document.createElement('canvas');
		this.$cnvMessage.setAttribute('width', this.options.width + 'px');
		this.$cnvMessage.setAttribute('height', this.options.height + 'px');
		this.$cnvMessage.style.position = 'absolute';
		this.$cnvMessage.style.zIndex = '4';
		this.$cnvMessage.style.opacity = '0';
		this.$cnvMessage.style.transition = 'opacity 0.3s ease';
		this.canvasMessage = this.$cnvMessage.getContext('2d');

		// Append canvases to DOM
		this.$gameBoard.appendChild(this.$cnvMessage);
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
		this.$cnvNext.setAttribute('width', this.options.squareSize * 5 + 'px'); // One block padding + 4 blocks Width
		this.$cnvNext.setAttribute('height', this.options.squareSize * 3 + 'px'); // One block padding + 2 blocks height
		this.$cnvNext.style.background = this.options.color[0];
		this.canvasNext = this.$cnvNext.getContext('2d');
		const nextFigure = this.$baseEl.getElementsByClassName('nextFigure');
		if (nextFigure.length) {
			this.$nextFigure = nextFigure[0] as HTMLElement;
			this.$nextFigure.appendChild(this.$cnvNext);
		}
		// Creates canvas for sub next figure
		this.$cnvSubNext = document.createElement('canvas');
		this.$cnvSubNext.setAttribute('width', this.options.squareSize * 5 + 'px'); // One block padding + 4 blocks Width
		this.$cnvSubNext.setAttribute('height', this.options.squareSize * 3 + 'px'); // One block padding + 2 blocks height
		this.$cnvSubNext.style.background = this.options.color[0];
		this.canvasSubNext = this.$cnvSubNext.getContext('2d');
		const subNextFigure = this.$baseEl.getElementsByClassName('subNextFigure');
		if (subNextFigure.length) {
			this.$subNextFigure = subNextFigure[0] as HTMLElement;
			this.$subNextFigure.appendChild(this.$cnvSubNext);
		}

		// Makes sound on button hidden
		this.$btnSoundOn?.forEach((b) => (b.style.display = 'none'));
	};

	/**
	 * Resets cursor position to top middle
	 */
	restartGlobalXAndY = () => {
		this.globalX = Math.floor(this.options.cols / 2) - 1;
		// Pieces start on -1 so they are not visible before starting to fall
		this.globalY = -1;
	};

	/**
	 * Sets the currentfigure to a new instance of a random figure
	 * @returns Tetromino
	 */
	chooseRandomFigure = () => {
		let randomFigure: Tetromino;
		const randomOption = Utils.getRandomNumberInRange(1, 7);
		// this.options.color[0] is bg, then figures
		const randomColor = Utils.getRandomNumberInRange(1, 3);
		const color = this.options.color[randomColor] + this.options.opacity[randomColor];
		const variant = this.options.variant;
		switch (randomOption) {
			case 1: // O (smashboy)
				randomFigure = newTetrominoO(variant, color);
				break;
			case 2: // I (hero)
				randomFigure = newTetrominoI(variant, color);
				break;
			case 3: // L (orange ricky)
				randomFigure = newTetrominoL(variant, color);
				break;
			case 4: // J (blue ricky)
				randomFigure = newTetrominoJ(variant, color);
				break;
			case 5: // Z (Cleveland Z)
				randomFigure = newTetrominoZ(variant, color);
				break;
			case 6: // S (Rhode Island Z)
				randomFigure = newTetrominoS(variant, color);
				break;
			case 7: // T (Teewee)
				randomFigure = newTetrominoT(variant, color);
				break;
			default: // Isolated point
				randomFigure = new Tetromino([[new Point({ x: 0, y: 0, variant })]]);
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
		for (let y = 0; y < this.options.rows; y++) {
			this.existingPieces.push([]);
			for (let x = 0; x < this.options.cols; x++) {
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
		return absoluteX < 0 || absoluteX > this.options.cols - 1 || absoluteY < -2 || absoluteY > this.options.rows - 1;
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

	/**
	 * Returns if current figure has room to rotate
	 * @returns {boolean} true if can rotate
	 */
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

	/**
	 * Returns if current figure has room to move leftwards
	 * @returns {boolean} true if can move
	 */
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

	/**
	 * Returns if current figure has room to move downwards
	 * @returns {boolean} true if can move
	 */
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

	/**
	 * Returns if current figure has room to move rightwards
	 * @returns {boolean} true if can move
	 */
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

	/**
	 * Rotates current figure if it is possible
	 */
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
		if (!this.sounds.mute) {
			this.sounds.denied.pause();
			this.sounds.denied.currentTime = 0;
			this.sounds.denied.play();
		}
	};

	/**
	 * Confirms restart game
	 */
	askUserConfirmResetGame = () => {
		// If restart game alert is opened from game menu, a minimum difference
		// in time is necessary for this modal open after menu's closes
		setTimeout(() => {
			this.pauseGame();
			Swal({
				title: 'Reiniciar',
				text: '¿Terminar el juego actual e iniciar uno nuevo desde el principio?',
				closeOnEsc: true,
				dangerMode: true,
				buttons: {
					cancel: {
						text: 'No',
						value: null,
						visible: true
					},
					confirm: {
						text: 'Sí',
						value: true
					}
				}
			}).then((val) => {
				if (val) {
					this.resetGame();
				}
				this.resumeGame();
			});
		});
	};

	/**
	 * Shows game menu
	 */
	showMenu = () => {
		this.pauseGame();
		this.$divMenu.style.display = 'block';
		Swal({ content: { element: this.$divMenu }, buttons: {}, closeOnEsc: true }).finally(() => this.resumeGame());
	};

	/**
	 * Shows settings menu
	 */
	showSettings = () => {
		// If settings menu is opened from game menu, a minimum difference
		// in time is necessary for this modal open after menu's closes
		setTimeout(() => {
			this.pauseGame();
			const newSettings = {
				color: this.options.color,
				variant: this.options.variant,
				opacity: this.options.opacity
			};
			const settingsContent = document.createElement('div');
			const settingsContentBackground = document.createElement('div');
			const settingsContentVariant = document.createElement('div');
			const settingsContentOpacity = [document.createElement('div'), document.createElement('div')];
			settingsContent.style.display = 'flex';
			settingsContent.style.flexDirection = 'column';
			settingsContent.style.gap = '10px';
			settingsContent.style.margin = '20px';
			settingsContentBackground.style.display = 'flex';
			settingsContentBackground.style.justifyContent = 'space-around';
			settingsContentVariant.style.display = 'flex';
			settingsContentVariant.style.justifyContent = 'space-around';
			settingsContentOpacity[0].style.display = 'flex';
			settingsContentOpacity[0].style.justifyContent = 'space-around';
			settingsContentOpacity[1].style.display = 'flex';
			settingsContentOpacity[1].style.justifyContent = 'space-around';

			const offStyle = '2px solid transparent';
			const onStyle = '2px solid #AAAAAA';

			const btnBack = [0, 1].map((i) => {
				const btn = document.createElement('button');
				btn.style.borderRadius = '10px';
				btn.style.background = 'transparent';
				btn.style.padding = '5px';
				if (newSettings.color === this.options.colorAlternatives[i]) {
					btn.style.border = onStyle;
				} else {
					btn.style.border = offStyle;
				}
				const btnCanvas = document.createElement('canvas');
				btnCanvas.setAttribute('width', this.options.squareSize * 7 + 'px');
				btnCanvas.setAttribute('height', this.options.squareSize * 4 + 'px');
				btnCanvas.style.display = 'block';
				btnCanvas.style.width = '130px';
				btnCanvas.style.height = 'auto';
				btnCanvas.style.borderRadius = '6px';
				btnCanvas.style.border = '1px solid #CCCCCC';
				btnCanvas.style.background = this.options.colorAlternatives[i][0];
				const btnCanvasCtx = btnCanvas.getContext('2d');
				this.drawBack(btnCanvasCtx, this.options.colorAlternatives[i][0]);
				let exampleTetromino = newTetrominoT(this.options.variantAlternatives[i], this.options.colorAlternatives[i][1]).getPoints();
				for (const point of exampleTetromino) {
					point.x += 2;
					point.y += 2;
					point.variant = 'fullColor';
					this.drawPoint(btnCanvasCtx, point);
				}
				exampleTetromino = newTetrominoZ(this.options.variantAlternatives[i], this.options.colorAlternatives[i][2]).getPoints();
				for (const point of exampleTetromino) {
					point.x += 4;
					point.y += 2;
					point.variant = 'fullColor';
					this.drawPoint(btnCanvasCtx, point);
				}
				btn.appendChild(btnCanvas);
				btn.addEventListener('click', () => {
					newSettings.color = this.options.colorAlternatives[i];
					btnBack.forEach((b) => (b.style.border = offStyle));
					btn.style.border = onStyle;
				});
				settingsContentBackground.appendChild(btn);
				return btn;
			});
			const btnVar = [0, 1, 2].map((i) => {
				const btn = document.createElement('button');
				btn.style.borderRadius = '10px';
				btn.style.background = 'transparent';
				btn.style.padding = '5px';
				if (newSettings.variant === this.options.variantAlternatives[i]) {
					btn.style.border = onStyle;
				} else {
					btn.style.border = offStyle;
				}
				const btnCanvas = document.createElement('canvas');
				btnCanvas.setAttribute('width', this.options.squareSize * 4 + 'px');
				btnCanvas.setAttribute('height', this.options.squareSize * 3 + 'px');
				btnCanvas.style.display = 'block';
				btnCanvas.style.width = '80px';
				btnCanvas.style.height = 'auto';
				btnCanvas.style.borderRadius = '6px';
				btnCanvas.style.background = '#EEEEEE';
				btnCanvas.style.border = '1px solid transparent';
				const exampleTetromino = newTetrominoT(this.options.variantAlternatives[i], '#000000').getPoints();
				const btnCanvasCtx = btnCanvas.getContext('2d');
				for (const point of exampleTetromino) {
					point.x += 1.5;
					point.y += 1.5;
					this.drawPoint(btnCanvasCtx, point);
				}
				btn.appendChild(btnCanvas);
				btn.addEventListener('click', () => {
					newSettings.variant = this.options.variantAlternatives[i];
					btnVar.forEach((b) => (b.style.border = offStyle));
					btn.style.border = onStyle;
				});
				settingsContentVariant.appendChild(btn);
				return btn;
			});
			const btnOpac = [0, 1].map((j) =>
				['FF', 'CC', '99', '66', '33'].map((i) => {
					const btn = document.createElement('button');
					btn.style.borderRadius = '10px';
					btn.style.background = 'transparent';
					btn.style.padding = '5px';
					if (newSettings.opacity[j + 1] === i) {
						btn.style.border = onStyle;
					} else {
						btn.style.border = offStyle;
					}
					const btnCanvas = document.createElement('canvas');
					btnCanvas.setAttribute('width', this.options.squareSize * 3 + 'px');
					btnCanvas.setAttribute('height', this.options.squareSize * 3 + 'px');
					btnCanvas.style.display = 'block';
					btnCanvas.style.width = '45px';
					btnCanvas.style.height = 'auto';
					btnCanvas.style.borderRadius = '6px';
					btnCanvas.style.background = '#EEEEEE';
					btnCanvas.style.border = '1px solid transparent';
					const color = (j === 0 ? '#0000FF' : j === 1 ? '#FF0000' : '#000000') + i;
					const exampleTetromino = newTetrominoO('fullColor', color).getPoints();
					const btnCanvasCtx = btnCanvas.getContext('2d');
					for (const point of exampleTetromino) {
						point.x += 0.5;
						point.y += 1.5;
						this.drawPoint(btnCanvasCtx, point);
					}
					btn.appendChild(btnCanvas);
					btn.addEventListener('click', () => {
						newSettings.opacity[j + 1] = i;
						btnOpac[j].forEach((b) => (b.style.border = offStyle));
						btn.style.border = onStyle;
					});
					settingsContentOpacity[j].appendChild(btn);
					return btn;
				})
			);

			settingsContent.appendChild(settingsContentBackground);
			settingsContent.appendChild(settingsContentVariant);
			settingsContent.appendChild(settingsContentOpacity[0]);
			settingsContent.appendChild(settingsContentOpacity[1]);

			Swal({
				title: 'Configuraciones',
				content: { element: settingsContent },
				closeOnEsc: true,
				buttons: {
					cancel: {
						text: 'Cancelar',
						value: null,
						visible: true
					},
					confirm: {
						text: 'Aceptar',
						value: true
					}
				}
			}).then((val) => {
				if (val) {
					this.options.variant = newSettings.variant;
					this.options.color = newSettings.color;
					this.options.opacity = newSettings.opacity;
					this.drawBack(this.canvasBack);
					if (this.$cnvNext) {
						this.$cnvNext.style.background = this.options.color[0];
						this.$cnvSubNext.style.background = this.options.color[0];
					}
					this.chooseRandomFigure();
					this.chooseRandomFigure();
					this.chooseRandomFigure();
				}
				this.resumeGame();
			});
		});
	};
}
export default Game;
