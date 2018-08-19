
import './scrollbar';
import { NgModule } from '@angular/core';
import { TerminalDecorator } from 'terminus-terminal';

import { ScrollbarDecorator } from './decorator';

@NgModule({
	providers: [
		{ provide: TerminalDecorator, useClass: ScrollbarDecorator, multi: true },
	]
})
export default class ScrollbarModule { }
