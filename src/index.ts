
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsTabProvider } from 'terminus-settings';
import { ConfigProvider } from 'terminus-core';

import { TitleControlService } from './services/title-control';
import { TitleControlConfigProvider } from './config';
import { TitleControlSettingsTabProvider } from './settings';
import { TitleControlSettingsTabComponent } from './components/settings-tab';

@NgModule({
	imports: [
		CommonModule,
		FormsModule
	],
	providers: [
		TitleControlService,
		{ provide: ConfigProvider, useClass: TitleControlConfigProvider, multi: true },
		{ provide: SettingsTabProvider, useClass: TitleControlSettingsTabProvider, multi: true },
	],
	entryComponents: [
		TitleControlSettingsTabComponent
	],
	declarations: [
		TitleControlSettingsTabComponent
	],
})
export default class TitleControlModule {
	constructor(private service: TitleControlService) {
		this.service.init();
	}
}
