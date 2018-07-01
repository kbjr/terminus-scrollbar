
import { Injectable } from '@angular/core';
import { AppService, Logger, LogService } from 'terminus-core';
import { TerminalTabComponent } from 'terminus-terminal';
import { TerminusHtermScrollbar } from '../scrollbar';

@Injectable()
export class ScrollbarService {
	private logger: Logger;
	private knownTabs: Map<TerminalTabComponent, Tab>;

	constructor(
		private app: AppService,
        log: LogService,
	) {
		this.logger = log.create('scrollbar');
	}

	init() : void {
		this.logger.debug('scrollbar plugin starting up');

		this.knownTabs = new Map<TerminalTabComponent, Tab>();

		this.onTabsChange();

		this.app.tabsChanged$.subscribe(() => {
			setTimeout(() => this.onTabsChange(), 1000);
		});
	}

	onTabsChange() : void {
		this.app.tabs.forEach((tab) => {
			if (! this.knownTabs.has(tab as TerminalTabComponent)) {
				this.logger.debug(`New terminal tab discovered id=${tab.id}`);

				if (tab instanceof TerminalTabComponent) {
					this.initScrollbar(tab);
				}
			}
		});

		const newTabSet = new Set(this.app.tabs);

		this.knownTabs.forEach((tab) => {
			if (! newTabSet.has(tab.tab)) {
				this.knownTabs.delete(tab.tab);
				tab.scrollbar.detachFromTerminal();
			}
		});
	}

	initScrollbar(tab) {
		const scrollbar = document.createElement('terminus-hterm-scrollbar') as TerminusHtermScrollbar;

		tab.content.nativeElement.appendChild(scrollbar);
		scrollbar.attachToTerminal(tab);

		this.knownTabs.set(tab, new Tab(tab, scrollbar));
	}
}

class Tab {
	constructor(
		public tab: TerminalTabComponent,
		public scrollbar: TerminusHtermScrollbar
	) { }
}
