import Point from './point';
import Tetromino from './tetromino';
import Utils from './utils';
import Swal from 'sweetalert2';

type BoardPoint = { taken: boolean; color: string[] };
type CartesianPoint = { x: number; y: number };

export interface GameOptions {
	variant: 'fullColor' | 'mixedColor' | 'highContrast' | 'highContrast';
}

class Game {
	// Square length in pixels
	static SQUARE_LENGTH = screen.width > 420 ? 30 : 20;
	static COLUMNS = 10;
	static ROWS = 20;
	static CANVAS_WIDTH = this.SQUARE_LENGTH * this.COLUMNS;
	static CANVAS_HEIGHT = this.SQUARE_LENGTH * this.ROWS;
	static EMPTY_COLOR = '#eaeaea';
	static BORDER_COLOR = '#ffffff';
	static DELETED_ROW_COLOR = [
		'#FF00FF',
		'#00FFFF',
		'#FF00FF',
		'#00FFFF',
		'#FF00FF',
		'#00FFFF',
		'#FF00FF',
		'#00FFFF',
		'#FF00FF',
	];
	// When a piece collapses with something at its bottom, how many time wait for putting another piece? (in ms)
	static TIMEOUT_LOCK_PUT_NEXT_PIECE = 300;
	// Speed of falling piece (in ms)
	static PIECE_SPEED = 300;
	// Animation time when a row is being deleted
	static DELETE_ROW_ANIMATION = 500;
	// Score to add when a square dissapears (for each square)
	static PER_SQUARE_SCORE = 1;

	options: GameOptions;
	timeoutFlag: boolean;
	board: BoardPoint[][];
	existingPieces: BoardPoint[][];
	globalX: number;
	globalY: number;
	paused: boolean;
	currentFigure: Tetromino;
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
	$btnPause: HTMLElement;
	$btnResume: HTMLElement;
	canvasContext: CanvasRenderingContext2D;
	$txtScore: HTMLElement;
	$cnvBoard: HTMLCanvasElement;
	$baseEl: HTMLElement;
	$btnReset: HTMLElement;

	constructor(baseEl: any, options?: GameOptions) {
		let defaults: GameOptions = { variant: 'fullColor' };
		this.$baseEl = baseEl;
		this.options = { ...defaults, ...options };
		console.log(this.options);
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
		this.draw();
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
		this.initBoardAndExistingPieces();
		this.chooseRandomFigure();
		this.restartGlobalXAndY();
		this.syncExistingPiecesWithBoard();
		this.refreshScore();
		this.pauseGame();
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
			}
			this.syncExistingPiecesWithBoard();
		});

		this.$btnDown.addEventListener('click', () => {
			this.attemptMoveDown();
		});
		this.$btnRight.addEventListener('click', () => {
			this.attemptMoveRight();
		});
		this.$btnLeft.addEventListener('click', () => {
			this.attemptMoveLeft();
		});
		this.$btnRotate.addEventListener('click', () => {
			this.attemptRotate();
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
	attemptMoveRight() {
		if (this.figureCanMoveRight()) {
			this.globalX++;
		}
	}

	/**
	 * Moves current figure left
	 */
	attemptMoveLeft() {
		if (this.figureCanMoveLeft()) {
			this.globalX--;
		}
	}

	/**
	 * Moves current figure down
	 */
	attemptMoveDown() {
		if (this.figureCanMoveDown()) {
			this.globalY++;
		}
	}

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
	pauseGame() {
		this.sounds.background.pause();
		this.paused = true;
		this.canPlay = false;
		clearInterval(this.intervalId);
	}

	/**
	 * Restarts mainLoop and sounds
	 */
	resumeGame = () => {
		this.sounds.background.play();
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
			};
		}
		this.restartGlobalXAndY();
		this.canPlay = true;
	};

	playerLoses = () => {
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
		for (let y of yCoordinates) {
			for (const point of this.existingPieces[y]) {
				point.color = Game.DELETED_ROW_COLOR;
			}
		}
	};

	addScore = (rows: number[]) => {
		this.score += Game.PER_SQUARE_SCORE * Game.COLUMNS * rows.length;
		this.refreshScore();
	};

	removeRowsFromExistingPieces = (yCoordinates: number[]) => {
		for (let y of yCoordinates) {
			for (const point of this.existingPieces[y]) {
				point.color = [Game.EMPTY_COLOR];
				point.taken = false;
			}
		}
	};

	verifyAndDeleteFullRows() {
		// Here be dragons
		const yCoordinates = this.getPointsToDelete();
		if (yCoordinates.length <= 0) return;
		this.addScore(yCoordinates);
		this.sounds.success.currentTime = 0;
		this.sounds.success.play();
		this.changeDeletedRowColor(yCoordinates);
		this.canPlay = false;
		setTimeout(() => {
			this.sounds.success.pause();
			this.removeRowsFromExistingPieces(yCoordinates);
			this.syncExistingPiecesWithBoard();
			const invertedCoordinates = Array.from(yCoordinates);
			// Now the coordinates are in descending order
			invertedCoordinates.reverse();

			for (let yCoordinate of invertedCoordinates) {
				for (let y = Game.ROWS - 1; y >= 0; y--) {
					for (let x = 0; x < this.existingPieces[y].length; x++) {
						if (y < yCoordinate) {
							let counter = 0;
							let auxiliarY = y;
							while (
								this.isEmptyPoint(x, auxiliarY + 1) &&
								!this.absolutePointOutOfLimits(x, auxiliarY + 1) &&
								counter < yCoordinates.length
							) {
								this.existingPieces[auxiliarY + 1][x] =
									this.existingPieces[auxiliarY][x];
								this.existingPieces[auxiliarY][x] = {
									color: [Game.EMPTY_COLOR],
									taken: false,
								};

								this.syncExistingPiecesWithBoard();
								counter++;
								auxiliarY++;
							}
						}
					}
				}
			}

			this.syncExistingPiecesWithBoard();
			this.canPlay = true;
		}, Game.DELETE_ROW_ANIMATION);
	}

	mainLoop() {
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
			if (this.timeoutFlag) return;
			this.timeoutFlag = true;
			setTimeout(() => {
				this.timeoutFlag = false;
				// If the time expires, we re-check if figure cannot keep going down. If it can
				// (because player moved it) then we return and keep the loop
				if (this.figureCanMoveDown()) {
					return;
				}
				// At this point, we know that the figure collapsed either with the floor
				// or with another point. So we move all the figure to the existing pieces array
				this.sounds.tap.currentTime = 0;
				this.sounds.tap.play();
				this.moveFigurePointsToExistingPieces();
				if (this.playerLoses()) {
					Swal.fire('Juego terminado', 'Inténtalo de nuevo');
					this.sounds.background.pause();
					this.canPlay = false;
					this.resetGame();
					return;
				}
				this.verifyAndDeleteFullRows();
				this.chooseRandomFigure();
				this.syncExistingPiecesWithBoard();
			}, Game.TIMEOUT_LOCK_PUT_NEXT_PIECE);
		}
		this.syncExistingPiecesWithBoard();
	}

	cleanGameBoardAndOverlapExistingPieces() {
		for (let y = 0; y < Game.ROWS; y++) {
			for (let x = 0; x < Game.COLUMNS; x++) {
				this.board[y][x] = {
					color: [Game.EMPTY_COLOR],
					taken: false,
				};
				// Overlap existing piece if any
				if (this.existingPieces[y][x].taken) {
					this.board[y][x].color = this.existingPieces[y][x].color;
				}
			}
		}
	}

	overlapCurrentFigureOnGameBoard() {
		if (!this.currentFigure) return;
		for (const point of this.currentFigure.getPoints()) {
			this.board[point.y + this.globalY][point.x + this.globalX].color =
				point.color;
		}
	}

	syncExistingPiecesWithBoard() {
		this.cleanGameBoardAndOverlapExistingPieces();
		this.overlapCurrentFigureOnGameBoard();
	}

	draw() {
		let x = 0;
		let y = 0;
		for (const row of this.board) {
			x = 0;
			for (const point of row) {
				let colorItem = 0;
				let barHeight = Game.SQUARE_LENGTH / point.color.length;
				for (const color of point.color) {
					this.canvasContext.fillStyle = color;
					this.canvasContext.fillRect(
						x,
						y + barHeight * colorItem,
						Game.SQUARE_LENGTH,
						Game.SQUARE_LENGTH / point.color.length
					);
					colorItem++;
				}
				this.canvasContext.restore();
				this.canvasContext.strokeStyle = Game.BORDER_COLOR;
				this.canvasContext.strokeRect(
					x,
					y,
					Game.SQUARE_LENGTH,
					Game.SQUARE_LENGTH
				);
				x += Game.SQUARE_LENGTH;
			}
			y += Game.SQUARE_LENGTH;
		}
		setTimeout(() => {
			requestAnimationFrame(this.draw.bind(this));
		}, 17);
	}

	/**
	 * Sets the score label from the variable
	 */
	refreshScore() {
		if (!this.$txtScore) return;
		this.$txtScore.textContent = String(this.score);
	}

	/**
	 * Initializes default sound file
	 */
	initSounds() {
		this.sounds = {
			background: Utils.loadSound(
				'assets/New Donk City_ Daytime 8 Bit.mp3',
				true
			),
			success: Utils.loadSound('assets/success.wav'),
			denied: Utils.loadSound('assets/denied.wav'),
			tap: Utils.loadSound('assets/tap.wav'),
		};
	}

	initDomElements() {
		this.$cnvBoard = this.$baseEl.querySelector('canvas#cnvBoard');
		this.$txtScore = this.$baseEl.querySelector('#txtScore');
		this.$btnPause = this.$baseEl.querySelector('#btnPause');
		this.$btnResume = this.$baseEl.querySelector('#btnPlay');
		this.$btnRotate = this.$baseEl.querySelector('#btnRotate');
		this.$btnDown = this.$baseEl.querySelector('#btnDown');
		this.$btnRight = this.$baseEl.querySelector('#btnRight');
		this.$btnLeft = this.$baseEl.querySelector('#btnLeft');
		this.$btnReset = this.$baseEl.querySelector('#btnReset');
		this.$cnvBoard.setAttribute('width', Game.CANVAS_WIDTH + 'px');
		this.$cnvBoard.setAttribute('height', Game.CANVAS_HEIGHT + 'px');
		this.canvasContext = this.$cnvBoard.getContext('2d');
	}

	chooseRandomFigure() {
		this.currentFigure = this.getRandomFigure();
	}

	restartGlobalXAndY() {
		this.globalX = Math.floor(Game.COLUMNS / 2) - 1;
		this.globalY = 0;
	}

	/**
	 * Returns a new instance of a random figure
	 * @returns Tetromino
	 */
	getRandomFigure() {
		switch (Utils.getRandomNumberInRange(1, 7)) {
			case 1: // O (smashboy)
				return new Tetromino(
					[
						[
							new Point(0, 0),
							new Point(1, 0),
							new Point(0, 1),
							new Point(1, 1),
						],
					],
					this.options
				);
			case 2: // I (hero)
				return new Tetromino(
					[
						[
							new Point(0, 0),
							new Point(1, 0),
							new Point(2, 0),
							new Point(3, 0),
						],
						[
							new Point(0, 0),
							new Point(0, 1),
							new Point(0, 2),
							new Point(0, 3),
						],
					],
					this.options
				);
			case 3: // L (orange ricky)
				return new Tetromino(
					[
						[
							new Point(0, 1),
							new Point(1, 1),
							new Point(2, 1),
							new Point(2, 0),
						],
						[
							new Point(0, 0),
							new Point(0, 1),
							new Point(0, 2),
							new Point(1, 2),
						],
						[
							new Point(0, 0),
							new Point(0, 1),
							new Point(1, 0),
							new Point(2, 0),
						],
						[
							new Point(0, 0),
							new Point(1, 0),
							new Point(1, 1),
							new Point(1, 2),
						],
					],
					this.options
				);
			case 4: // J (blue ricky)
				return new Tetromino(
					[
						[
							new Point(0, 0),
							new Point(0, 1),
							new Point(1, 1),
							new Point(2, 1),
						],
						[
							new Point(0, 0),
							new Point(1, 0),
							new Point(0, 1),
							new Point(0, 2),
						],
						[
							new Point(0, 0),
							new Point(1, 0),
							new Point(2, 0),
							new Point(2, 1),
						],
						[
							new Point(0, 2),
							new Point(1, 2),
							new Point(1, 1),
							new Point(1, 0),
						],
					],
					this.options
				);
			case 5: // Z (Cleveland Z)
				return new Tetromino(
					[
						[
							new Point(0, 0),
							new Point(1, 0),
							new Point(1, 1),
							new Point(2, 1),
						],
						[
							new Point(0, 1),
							new Point(1, 1),
							new Point(1, 0),
							new Point(0, 2),
						],
					],
					this.options
				);
			case 6: // S (Rhode Island Z)
				return new Tetromino(
					[
						[
							new Point(0, 1),
							new Point(1, 1),
							new Point(1, 0),
							new Point(2, 0),
						],
						[
							new Point(0, 0),
							new Point(0, 1),
							new Point(1, 1),
							new Point(1, 2),
						],
					],
					this.options
				);
			case 7: // T (Teewee)
				return new Tetromino(
					[
						[
							new Point(0, 1),
							new Point(1, 1),
							new Point(1, 0),
							new Point(2, 1),
						],
						[
							new Point(0, 0),
							new Point(0, 1),
							new Point(0, 2),
							new Point(1, 1),
						],
						[
							new Point(0, 0),
							new Point(1, 0),
							new Point(2, 0),
							new Point(1, 1),
						],
						[
							new Point(0, 1),
							new Point(1, 0),
							new Point(1, 1),
							new Point(1, 2),
						],
					],
					this.options
				);
			default: // Isolated point
				return new Tetromino([[new Point(0, 0)]], this.options);
		}
	}

	initBoardAndExistingPieces() {
		this.board = [];
		this.existingPieces = [];
		for (let y = 0; y < Game.ROWS; y++) {
			this.board.push([]);
			this.existingPieces.push([]);
			for (let x = 0; x < Game.COLUMNS; x++) {
				this.board[y].push({
					color: [Game.EMPTY_COLOR],
					taken: false,
				});
				this.existingPieces[y].push({
					taken: false,
					color: [Game.EMPTY_COLOR],
				});
			}
		}
	}

	/**
	 *
	 * @param point An object that has x and y properties; the coordinates shouldn't be global, but relative to the point
	 * @returns {boolean}
	 */
	relativePointOutOfLimits = (point: CartesianPoint): boolean => {
		const absoluteX = point.x + this.globalX;
		const absoluteY = point.y + this.globalY;
		return this.absolutePointOutOfLimits(absoluteX, absoluteY);
	};

	/**
	 * @param absoluteX
	 * @param absoluteY
	 * @returns {boolean}
	 */
	absolutePointOutOfLimits = (
		absoluteX: number,
		absoluteY: number
	): boolean => {
		return (
			absoluteX < 0 ||
			absoluteX > Game.COLUMNS - 1 ||
			absoluteY < 0 ||
			absoluteY > Game.ROWS - 1
		);
	};

	// It returns true even if the point is not valid (for example if it is out of limit, because it is not the function's responsibility)
	isEmptyPoint = (x: number, y: number) => {
		if (!this.existingPieces[y]) return true;
		if (!this.existingPieces[y][x]) return true;
		if (this.existingPieces[y][x].taken) {
			return false;
		} else {
			return true;
		}
	};

	/**
	 * Check if a point (in the game board) is valid to put another point there.
	 * @param point the point to check, with relative coordinates
	 * @param points an array of points that conforms a figure
	 */
	isValidPoint = (point: Point, points: Point[]) => {
		const emptyPoint = this.isEmptyPoint(
			this.globalX + point.x,
			this.globalY + point.y
		);
		const hasSameCoordinateOfFigurePoint =
			points.findIndex((p) => {
				return p.x === point.x && p.y === point.y;
			}) !== -1;
		const outOfLimits = this.relativePointOutOfLimits(point);
		if ((emptyPoint || hasSameCoordinateOfFigurePoint) && !outOfLimits) {
			return true;
		} else {
			return false;
		}
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
			confirmButtonText: 'Sí',
		});
		if (result.value) {
			this.resetGame();
		} else {
			this.resumeGame();
		}
	};
}
export default Game;
