
import './scrollbar';
import { NgModule } from '@angular/core';

import { ScrollbarService } from './services/scrollbar';

@NgModule({
	providers: [
		ScrollbarService,
	]
})
export default class ScrollbarModule {
	constructor(private service: ScrollbarService) {
		this.service.init();
	}
}
