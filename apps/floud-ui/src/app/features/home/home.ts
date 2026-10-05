import {
	Component,
	computed,
	inject,
	type OnDestroy,
	signal,
} from "@angular/core";
import { PlotlyModule } from "angular-plotly.js";
import { ButtonModule } from "primeng/button";
import { FileUploadModule } from "primeng/fileupload";
import { FilesService } from "../../core/services/files.service";

@Component({
	selector: "app-home",
	imports: [ButtonModule, FileUploadModule, PlotlyModule],
	templateUrl: "./home.html",
	styleUrl: "./home.scss",
})
export class Home implements OnDestroy {
	private fileService = inject(FilesService);

	selectedFile = signal<File | null>(null);
	filePreview = computed(() => {
		const file = this.selectedFile();
		return file ? URL.createObjectURL(file) : undefined;
	});
	fileType = computed(() => {
		const type = this.selectedFile()?.type;
		if (type?.includes("video")) return "video";
		if (type?.includes("image")) return "image";
		return "unknown";
	});

	videoFileMetadada(video: File) {
		return new Promise<{ width: number; height: number; quality: number }>(
			(resolve, reject) => {
				const videoeEl = document.createElement("video");
				videoeEl.src = URL.createObjectURL(video);
				videoeEl.preload = "metadata";

				videoeEl.onloadedmetadata = () => {
					URL.revokeObjectURL(videoeEl.src);

					const width = videoeEl.videoWidth;
					const height = videoeEl.videoHeight;
					let quality = 0;

					if (height >= 2160) quality = 2160;
					else if (height >= 1080) quality = 1080;
					else if (height >= 720) quality = 720;
					else if (height >= 480) quality = 480;

					resolve({ width, height, quality });
				};

				videoeEl.onerror = () => reject(null);
			},
		);
	}

	onFileSelected(event: Event): void {
		const input = event.target as HTMLInputElement;

		if (input.files?.[0]) {
			const file = input.files[0];
			this.selectedFile.set(file);
		}
	}

	async uploadImage(): Promise<void> {
		const file = this.selectedFile();
		if (!file) {
			return;
		}

		if (this.fileType() === "video") {
			const metadata = await this.videoFileMetadada(file);
			this.fileService.uploadFile(file, metadata).subscribe();
			return;
		}

		this.fileService.uploadFile(file).subscribe();
	}

	ngOnDestroy(): void {
		if (this.filePreview() && typeof this.filePreview() === "string") {
			console.log(`Revoke: ${this.filePreview()}`);
			URL.revokeObjectURL(this.filePreview()!);
		}
	}
}
