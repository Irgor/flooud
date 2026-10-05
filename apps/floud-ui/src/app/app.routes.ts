import type { Routes } from "@angular/router";

export const routes: Routes = [
	{
		path: "",
		loadComponent: () => import("./features/home/home").then((m) => m.Home),
	},
	{
		path: "files",
		loadComponent: () => import("./features/files/files").then((m) => m.Files),
	},
];
