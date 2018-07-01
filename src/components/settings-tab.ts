
import { Component } from '@angular/core';
import { ConfigService } from 'terminus-core';

@Component({
	template: require('./settings-tab.pug'),
	styles: [ ]
})
export class TitleControlSettingsTabComponent {
	constructor(
		public config: ConfigService,
	) { }

	ngOnInit() { }
}
