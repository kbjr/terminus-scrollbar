
export class TerminusHtermScrollbar extends HTMLElement {
	private frame: HTMLIFrameElement;
	private screen: HTMLElement;
	private track: HTMLDivElement;
	private handle: HTMLDivElement;
	private connected: boolean = false;
	private shadow: ShadowRoot;

	constructor() {
		super();

		// Attach the shadow root
		this.shadow = this.attachShadow({ mode: 'closed' });

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
		this.track.addEventListener('click', onTrackClick(this));
		this.handle.addEventListener('mousedown', onHandleMouseDown(this));
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
	}

	detachFromHTerm() : void {
		// Remove the references to the terminal
		this.frame = null;
		this.screen = null;

		// Hide the scrollbar as it is no longer connected to anything
		this.track.style.display = 'none';
	}

	draw() : void {
		// If we're not actually connected to anything, don't bother trying to draw
		if (! this.connected || ! this.frame) {
			return;
		}

		// 

		// If we've made it this far, make sure the element is visible
		this.track.style.display = 'block';
	}

	scrollTerminal(newY) : void {
		this.screen.scrollTo(0, newY);
	}

	scrollTerminalToPercent(percent : number) : void {
		const newY = this.getScrollableAmount() * percent;

		this.scrollTerminal(newY);
	}

	getCurrentTerminalScrollPercent() : number {
		return this.screen.scrollTop / this.getScrollableAmount();
	}

	getScrollableAmount() : number {
		return this.screen.scrollHeight - this.screen.offsetHeight;
	}
}

const onTrackClick = (scrollbar : TerminusHtermScrollbar) : Function => {
	return (event : MouseEvent) : void => {
		// 
	};
};

const onHandleMouseDown = (scrollbar : TerminusHtermScrollbar) : Function => {
	return (event : MouseEvent) : void => {
		// 
	};
};
