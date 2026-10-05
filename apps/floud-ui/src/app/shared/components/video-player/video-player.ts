import {
	Component,
	computed,
	type ElementRef,
	effect,
	inject,
	input,
	viewChild,
} from "@angular/core";
import Hls from "hls.js";
import { FilesService } from "../../../core/services/files.service";
import type { Media } from "../../types/Media";

@Component({
	selector: "fl-video-player",
	imports: [],
	templateUrl: "./video-player.html",
	styleUrl: "./video-player.scss",
})
export class VideoPlayer {
	private fileService = inject(FilesService);
	private hsl?: Hls;

	playListType = "application/vnd.apple.mpegurl";

	media = input.required<Media>();

	videoElementRef = viewChild.required<ElementRef<HTMLVideoElement>>("player");
	videoEl = computed(() => {
		return this.videoElementRef().nativeElement;
	});

	constructor() {
		effect((onCleanup) => {
			const video = this.videoEl();
			const media = this.media();

			const streamUrl = this.fileService.steramUrl(media.storageKey);

			if (Hls.isSupported()) {
				this.hsl = new Hls();
				this.hsl.loadSource(streamUrl);
				this.hsl.attachMedia(video);
			} else if (video.canPlayType(this.playListType)) {
				video.src = streamUrl;
			}

			onCleanup(() => {
				if (this.hsl) {
					this.hsl.destroy();
				}
			});
		});
	}
}
