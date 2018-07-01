
export class TerminusHtermScrollbar extends HTMLElement {
	private connected: boolean = false;
	private frame: HTMLIFrameElement;
	private screen: HTMLElement;
	private track: HTMLDivElement;
	private handle: HTMLDivElement;
	private lastScrollTop: number;
	private lastScrollHeight: number;
	private moveHandler: EventListener;
	private nextScrollY: number = null;
	private scrollIsDebounced: boolean = false;
	private desiredHandlePosition: number = 0;
	private desiredHandleHeight: number;

	constructor() {
		super();

		// Bind the css to the shadow root
		this.innerHTML = `<style>${require('./scrollbar.scss')}</style>`;

		// Create the actual scrollbar DOM
		this.track = this.appendChild(document.createElement('div'));
		this.handle = this.track.appendChild(document.createElement('div'));

		this.track.className = 'track';
		this.handle.className = 'handle';

		// Hide the scrollbar until it is attached to something and can actually render properly
		this.track.style.display = 'none';

		// Bind the mouse listeners to the scrollbar
		this.track.addEventListener('click', this.onTrackClick);
		this.handle.addEventListener('mousedown', this.onHandleMouseDown);
	}

	connectedCallback() : void {
		this.connected = true;
	}

	disconnectedCallback() : void {
		this.connected = false;
	}

	attachToHTerm(frame: HTMLIFrameElement) : void {
		// The iframe that HTerm is hosted in
		this.frame = frame;

		// The x-screen element inside the frame that actually renders the terminal
		this.screen = frame.contentDocument.querySelector('x-screen');

		// Set the last known scroll info; used to detect changes that require a redraw
		this.lastScrollTop = this.screen.scrollTop;
		this.lastScrollHeight = this.screen.scrollHeight;

		// Inject the needed CSS into the frame to allow turning off text selection
		this.frame.contentDocument.head.innerHTML += `<style>${require('./frame-styles.scss')}</style>`;

		// Listen for scroll events to update the scrollbar when someone scrolls with mousewheel
		this.screen.addEventListener('scroll', this.handleInternalScroll);
	}

	detachFromHTerm() : void {
		// Stop listening to scroll events
		this.screen.removeEventListener('scroll', this.handleInternalScroll);

		// Remove the references to the terminal
		this.frame = null;
		this.screen = null;
		this.lastScrollTop = null;
		this.lastScrollHeight = null;

		// Hide the scrollbar as it is no longer connected to anything
		this.track.style.display = 'none';
	}



	// Once an update has "happened" inside the class, actually redraws the scrollbar UI and applies the
	// change in position to the terminal if requested

	render() : void {
		// If we're not actually connected to anything, don't bother trying to draw
		if (! this.connected || ! this.frame) {
			return;
		}

		// If the terminal is small enough to not need a scrollbar, just hide
		if (! this.terminalNeedsScrollbar()) {
			this.fadeOut();

			return;
		}

		const availableRenderSpace = this.parentElement.offsetHeight;

		// 

		// If we've made it this far, make sure the element is visible
		this.fadeIn();

		// If we need to move the handle, do so
		if (this.desiredHandlePosition !== this.handle.offsetTop) {
			this.handle.style.top = this.desiredHandlePosition + 'px';
		}
	}



	// Functions for reading data from the scrollbar UI

	getAvailableScrollSpace() : number {
		return this.track.offsetHeight - this.handle.offsetHeight;
	}

	determineNewScrollPercentFromHandle() : number {
		return this.handle.offsetTop / this.getAvailableScrollSpace();
	}



	// Functions for actually scrolling the live terminal

	scrollTerminal(newY) : void {
		if (this.scrollIsDebounced) {
			this.nextScrollY = newY;

			return;
		}

		this.screen.scrollTo(0, newY);
		this.lastScrollTop = this.screen.scrollTop;
		this.scrollIsDebounced = true;

		setTimeout(this.handleDebouncedScroll, 50);
	}

	handleDebouncedScroll = () : void => {
		this.scrollIsDebounced = false;

		if (this.nextScrollY != null) {
			this.scrollTerminal(this.nextScrollY);
			this.nextScrollY = null;
		}
	}

	scrollTerminalToPercent(percent : number) : void {
		const newY = this.getScrollableAmount() * percent;

		this.scrollTerminal(newY);
	}



	// Functions for accessing information about the current state of the terminal

	getCurrentTerminalScrollPercent() : number {
		return this.screen.scrollTop / this.getScrollableAmount();
	}

	getScrollableAmount() : number {
		return this.screen.scrollHeight - this.screen.offsetHeight;
	}

	terminalNeedsScrollbar() : boolean {
		return this.screen.scrollHeight > this.screen.offsetHeight;
	}



	// Functions for showing/hiding the scrollbar element

	fadeIn() {
		const { display, opacity } = this.track.style;

		if (display !== 'block' || parseFloat(opacity) !== 1) {
			this.track.style.display = 'block';

			setTimeout(() => this.track.style.opacity = '1', 0);
		} 
	}

	fadeOut() {
		const { display, opacity } = this.track.style;

		if (display !== 'none' || parseFloat(opacity) !== 0) {
			this.track.style.opacity = '0';

			setTimeout(() => this.track.style.display = 'none', 300);
		}
	}



	// User input event handlers for actually causing scrolling to happen

	onTrackClick = (click : MouseEvent) : void => {
		click.preventDefault();
		click.stopPropagation();
	}

	onHandleMouseDown = (mouseDown : MouseEvent) : void => {
		// Don't allow this event to continue, to avoid also triggering the track onclick
		mouseDown.preventDefault();
		mouseDown.stopPropagation();

		// Bind the needed event listeners to track dragging the handle
		this.moveHandler = this.onHandleMouseMove(mouseDown.clientY) as EventListener;
		this.handle.addEventListener('mousemove', this.moveHandler);
		document.addEventListener('mouseup', this.onMouseUp);

		// Prevent text selection in the frame while scrolling
		this.frame.contentDocument.body.setAttribute('data-scrolling', 'scrolling');

		// Add a class to the handle so it can be styled while dragging
		this.handle.classList.add('dragging');
	}

	onHandleMouseMove = (startingMouseY : number) : Function => {
		const startingHandleY = this.handle.offsetTop;

		return (mouseMove : MouseEvent) : void => {
			mouseMove.preventDefault();
			mouseMove.stopPropagation();

			const mouseYDelta = mouseMove.clientY - startingMouseY;

			this.desiredHandlePosition = startingHandleY + mouseYDelta;

			// Update the scrollbar UI
			this.render();

			// Actually scroll the terminal to match the scrollbar state
			this.scrollTerminalToPercent(this.determineNewScrollPercentFromHandle());
		};
	}

	onMouseUp = (mouseUp : MouseEvent) : void => {
		mouseUp.preventDefault();
		mouseUp.stopPropagation();

		// Remove the event listeners for dragging
		this.handle.removeEventListener('mousemove', this.moveHandler);
		this.moveHandler = null;

		document.removeEventListener('mouseup', this.onMouseUp);

		// Allow text selection in the frame again
		this.frame.contentDocument.body.removeAttribute('data-scrolling');
	}

	handleDragScroll() {
		// 
	}

	handleInternalScroll = () : void => {
		const newPercent = this.getCurrentTerminalScrollPercent();

		this.moveHandleToScrollPercent(newPercent);
	}
}
