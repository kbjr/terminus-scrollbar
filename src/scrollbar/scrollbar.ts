
import { Subscription } from 'rxjs';
import { TerminalTabComponent } from 'terminus-terminal';

const scrollDebounce = 50;
const renderDebounce = 16;

export class TerminusHtermScrollbar extends HTMLElement {
	private shadow: ShadowRoot;
	private connected: boolean = false;
	private terminal: TerminalTabComponent;
	private terminalSubscriptions: Array<Subscription> = [ ];
	private frame: HTMLIFrameElement;
	private screen: HTMLElement;
	private track: HTMLDivElement;
	private handle: HTMLDivElement;
	private lastScrollTop: number;
	private lastScrollHeight: number;
	private moveHandler: EventListener;
	private nextScrollY: number = null;
	private scrollIsDebounced: boolean = false;
	private renderIsDebounced: boolean = false;
	private renderIsDesired: boolean = false;
	private desiredHandlePosition: number = null;
	private desiredHandlePercent: number = null;

	constructor() {
		super();

		this.shadow = this.attachShadow({ mode: 'open' });

		// Bind the css to the shadow root
		this.shadow.innerHTML = `<style>${require('./scrollbar.scss')}</style>`;

		// Create the actual scrollbar DOM
		this.track = this.shadow.appendChild(document.createElement('div'));
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

	attachToTerminal(terminal: TerminalTabComponent) : void {
		// The terminal tab component that we will be creating a scrollbar for
		this.terminal = terminal;

		this.terminalSubscriptions.push(
			this.terminal.resize$.subscribe(this.onTerminalUpdate),
			this.terminal.input$.subscribe(this.onTerminalUpdate),
			this.terminal.output$.subscribe(this.onTerminalUpdate),
		);

		// The iframe that HTerm is hosted in
		this.frame = terminal.content.nativeElement.querySelector('iframe');

		// The x-screen element inside the frame that actually renders the terminal
		this.screen = this.frame.contentDocument.querySelector('x-screen');

		// Set the last known scroll info; used to detect changes that require a redraw
		this.lastScrollTop = this.screen.scrollTop;
		this.lastScrollHeight = this.screen.scrollHeight;

		// Listen for scroll events to update the scrollbar when someone scrolls with mousewheel
		this.screen.addEventListener('scroll', this.handleInternalScroll);
	}

	detachFromTerminal() : void {
		// Stop listening to scroll events
		this.screen.removeEventListener('scroll', this.handleInternalScroll);

		// Stop listening to terminal events
		this.terminalSubscriptions.forEach((subscription) => {
			subscription.unsubscribe();
		});

		// Remove the references to the terminal
		this.terminal = null;
		this.frame = null;
		this.screen = null;
		this.lastScrollTop = null;
		this.lastScrollHeight = null;

		// Hide the scrollbar as it is no longer connected to anything
		this.track.style.display = 'none';
	}



	// Handlers connected to HTerm

	onTerminalUpdate = () : void => {
		if (this.lastScrollTop !== this.screen.scrollTop || this.lastScrollHeight !== this.screen.scrollHeight) {
			setTimeout(() => {
				this.render();
				this.handleInternalScroll();
			}, 150);
		}

		this.lastScrollTop = this.screen.scrollTop;
		this.lastScrollHeight = this.screen.scrollHeight;
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

		// If the render is currently debounced, just make it known that we would like to render, and
		// wait for the debounce to clear
		if (this.renderIsDebounced) {
			this.renderIsDesired = true;

			return;
		}

		// Debounce to ensure we don't render too often
		this.renderIsDebounced = true;
		setTimeout(this.handleDebouncedRender, renderDebounce);

		// If we've made it this far, make sure the element is visible
		this.fadeIn();

		const outputScreenCount = Math.max(this.getTerminalScrollableAmount() / this.screen.offsetHeight, 1);
		const newHeight = this.track.offsetHeight / outputScreenCount;

		// Update the handle height (this changes based on the amount of scrollable buffer)
		this.handle.style.height = newHeight + 'px';

		// If a given position is desired, move there
		if (this.desiredHandlePosition != null) {
			this.moveHandleToPosition(this.desiredHandlePosition);
		}

		// If a given percent is desired, move there. Otherwise, update to match the state of the terminal
		else {
			const scrollPercent = this.desiredHandlePercent == null
				? this.getCurrentTerminalScrollPercent()
				: this.desiredHandlePercent;

			this.moveHandleToPercent(scrollPercent);
		}
		
		// Clear out the state about where to move
		this.desiredHandlePosition = null;
		this.desiredHandlePercent = null;
	}

	handleDebouncedRender = () : void => {
		this.renderIsDebounced = false;

		if (this.renderIsDesired) {
			this.renderIsDesired = false;
			this.render();
		}
	}

	moveHandleToPercent(percent : number) : void {
		const availableSpace = this.getAvailableScrollSpace();
		const newScrollPosition = availableSpace * percent;

		this.moveHandleToPosition(newScrollPosition);
	}

	moveHandleToPosition(position : number) : void {
		this.handle.style.top = Math.max(0, Math.min(this.getAvailableScrollSpace(), position)) + 'px';
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

		this.screen.scrollTop = newY;
		this.lastScrollTop = this.screen.scrollTop;
		this.scrollIsDebounced = true;

		setTimeout(this.handleDebouncedScroll, scrollDebounce);
	}

	handleDebouncedScroll = () : void => {
		this.scrollIsDebounced = false;

		if (this.nextScrollY != null) {
			this.scrollTerminal(this.nextScrollY);
			this.nextScrollY = null;
		}
	}

	scrollTerminalToPercent(percent : number) : void {
		const newY = this.getTerminalScrollableAmount() * percent;

		this.scrollTerminal(newY);
	}



	// Functions for accessing information about the current state of the terminal

	getCurrentTerminalScrollPercent() : number {
		return this.screen.scrollTop / this.getTerminalScrollableAmount();
	}

	getTerminalScrollableAmount() : number {
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

			setTimeout(() => this.track.style.display = 'none', 1000);
		}
	}



	// User input event handlers for actually causing scrolling to happen

	onTrackClick = (click : MouseEvent) : void => {
		click.preventDefault();
		click.stopPropagation();

		// Determine where to move the handle based on where the user click
		const clickPosition = click.pageY - this.track.getBoundingClientRect().top;
		const newHandlePosition = clickPosition - (this.handle.offsetHeight / 2);

		// Move the handle
		this.moveHandleToPosition(newHandlePosition);

		// Determine the new scroll percent based on where the handle moved to
		const newPercent = this.determineNewScrollPercentFromHandle();

		// Scroll the terminal to match
		this.scrollTerminalToPercent(newPercent);
	}

	onHandleMouseDown = (mouseDown : MouseEvent) : void => {
		// Don't allow this event to continue, to avoid also triggering the track onclick
		mouseDown.preventDefault();
		mouseDown.stopPropagation();

		// Add a class to the scrollbar so it can be styled while dragging
		this.classList.add('dragging');

		// Bind the needed event listeners to track dragging the handle
		this.moveHandler = this.onHandleMouseMove(mouseDown.clientY) as EventListener;
		document.addEventListener('mousemove', this.moveHandler);
		document.addEventListener('mouseup', this.onMouseUp);
	}

	onHandleMouseMove = (startingMouseY : number) : Function => {
		const startingHandleY = this.handle.offsetTop;

		return (mouseMove : MouseEvent) : void => {
			mouseMove.preventDefault();
			mouseMove.stopPropagation();

			const mouseYDelta = mouseMove.clientY - startingMouseY;

			this.desiredHandlePosition = Math.max(startingHandleY + mouseYDelta, 0);

			// Update the scrollbar UI
			this.render();

			// Actually scroll the terminal to match the scrollbar state
			this.scrollTerminalToPercent(this.determineNewScrollPercentFromHandle());
		};
	}

	onMouseUp = (mouseUp : MouseEvent) : void => {
		mouseUp.preventDefault();
		mouseUp.stopPropagation();

		// Remove the drag active class
		this.classList.remove('dragging');

		// Remove the event listeners for dragging
		document.removeEventListener('mousemove', this.moveHandler);
		this.moveHandler = null;

		document.removeEventListener('mouseup', this.onMouseUp);
	}

	handleInternalScroll = () : void => {
		const newPercent = this.getCurrentTerminalScrollPercent();

		this.moveHandleToPercent(newPercent);
	}
}
