import {
	type ApplicationConfig,
	importProvidersFrom,
	provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideRouter } from "@angular/router";
import Aura from "@primeuix/themes/aura";
import { PlotlyModule } from "angular-plotly.js";
import * as PlotlyJS from "plotly.js-dist-min";
import { providePrimeNG } from "primeng/config";
import { routes } from "./app.routes";

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideRouter(routes),
		providePrimeNG({
			theme: {
				preset: Aura,
			},
		}),
		importProvidersFrom(PlotlyModule.forRoot(PlotlyJS)),
	],
};
