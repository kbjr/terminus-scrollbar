
import { Injectable } from '@angular/core';
import { Logger, LogService } from 'terminus-core';
import { TerminalDecorator, TerminalTabComponent } from 'terminus-terminal';
import { TerminusHtermScrollbar } from './scrollbar';

const scrollbars: WeakMap<TerminalTabComponent, TerminusHtermScrollbar> = new WeakMap();

@Injectable()
export class ScrollbarDecorator extends TerminalDecorator {
	private logger: Logger;

	constructor(log: LogService) {
		super();

		this.logger = log.create('scrollbar');

		this.logger.debug('scrollbar plugin starting up');
	}

	attach(terminal: TerminalTabComponent) : void {
		this.logger.debug(`New terminal tab discovered id=${terminal.id}`);

		const scrollbar = document.createElement('terminus-hterm-scrollbar') as TerminusHtermScrollbar;

		scrollbars.set(terminal, scrollbar);

		terminal.content.nativeElement.appendChild(scrollbar);
		scrollbar.attachToTerminal(terminal);
	}

	detach(terminal: TerminalTabComponent) : void {
		this.logger.debug(`Disconnecting from closed tab id=${terminal.id}`)

		const scrollbar = scrollbars.get(terminal);

		if (scrollbar) {
			scrollbar.detachFromTerminal();
			scrollbars.delete(terminal);
		}
	}
}
