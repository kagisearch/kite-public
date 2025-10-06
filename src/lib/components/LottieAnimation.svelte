<script lang="ts">
import type { AnimationItem } from 'lottie-web';
import lottie from 'lottie-web';
import { onDestroy, onMount } from 'svelte';

interface Props {
	animationData: any;
	loop?: boolean;
	autoplay?: boolean;
	width?: number;
	height?: number;
	class?: string;
	loopFrameOffset?: number; // Number of frames to cut from the end before looping
}

let {
	animationData,
	loop = true,
	autoplay = true,
	width = 100,
	height = 100,
	class: className = '',
	loopFrameOffset = 0,
}: Props = $props();

let container: HTMLDivElement;
let animation: AnimationItem | null = null;

onMount(() => {
	if (container && animationData) {
		// For animations with frame offset, we need to modify the animation data
		let modifiedData = animationData;

		if (loop && loopFrameOffset > 0 && animationData.op) {
			// Clone the animation data to avoid modifying the original
			modifiedData = {
				...animationData,
				// Reduce the out point (op) by the offset
				op: Math.max(animationData.ip || 0, animationData.op - loopFrameOffset),
			};
		}

		animation = lottie.loadAnimation({
			container,
			renderer: 'svg',
			loop,
			autoplay,
			animationData: modifiedData,
			rendererSettings: {
				preserveAspectRatio: 'xMidYMid slice',
			},
		});
	}
});

onDestroy(() => {
	if (animation) {
		animation.destroy();
	}
});
</script>

<div
  bind:this={container}
  class={className}
  style="width: {width}px; height: {height}px;"
></div>
