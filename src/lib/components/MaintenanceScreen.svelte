<script lang="ts">
import { theme } from '$lib/stores/theme.svelte.js';
import { s } from '$lib/client/localization.svelte';
import { onMount } from 'svelte';
import { PUBLIC_MAINTENANCE_START, PUBLIC_MAINTENANCE_END, PUBLIC_MAINTENANCE_AUTO } from '$env/static/public';
import IntroScreen from './IntroScreen.svelte';

// Reactive state variables
let progressPercentage = $state(0);
let timeRemaining = $state('');
let displayProgress = $state(0);
let isMaintenanceComplete = $state(false);
type MaintenanceStatus = {
    currentTime: string;
    isActive: boolean;
    status: 'inactive' | 'scheduled' | 'active' | 'completed';
    progress: number;
    timeRemaining: string;
    startTime: string;
    endTime: string;
    autoReload: boolean;
};

let maintenanceStatus = $state<MaintenanceStatus | null>(null);
let showIntroScreen = $state(false);

function openIntro() {
    showIntroScreen = true;
}

function closeIntro() {
    showIntroScreen = false;
}

// Detect offline status (true when navigator reports offline or fetch fails)
let isOffline = $state(typeof navigator !== 'undefined' ? !navigator.onLine : false);

// Determine if we should display a progress percentage.
// Show it only when maintenance is scheduled automatically (AUTO=true)
// or when explicit start/end timestamps are provided.
const showProgressIndicator = PUBLIC_MAINTENANCE_AUTO === 'true' || (PUBLIC_MAINTENANCE_START && PUBLIC_MAINTENANCE_END);

// Fetch maintenance status from server API (uses server time)
async function fetchMaintenanceStatus() {
    try {
        const response = await fetch('/api/maintenance/status');
        if (response.ok) {
            const data = await response.json();
            // We successfully reached the server – reset offline flag if previously set
            isOffline = false;
            maintenanceStatus = data;
            return data;
        }
    } catch (error) {
        console.warn('Failed to fetch maintenance status:', error);
        // Treat network errors as offline condition
        isOffline = true;
    }
    
    // Fallback to client-side calculation if API fails
    return null;
}

// Post-maintenance loading stages
const postMaintenanceStages = [
    'Finalizing updates...',
    'Restarting services...',
    'Loading application...',
    'Almost ready...'
];

let postMaintenanceProgress = $state(0);
let currentStage = $state('');
let isInPostMaintenance = $state(false);

// Calculate progress allocation dynamically based on maintenance duration
function getProgressAllocation() {
    if (PUBLIC_MAINTENANCE_AUTO !== 'true') {
        return { maintenanceMax: 100, postMaintenanceStart: 100 };
    }
    
    const startTime = new Date(PUBLIC_MAINTENANCE_START || '2025-07-20T00:00:00Z');
    const endTime = new Date(PUBLIC_MAINTENANCE_END || '2025-07-20T14:00:00Z');
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    // Dynamic allocation based on maintenance duration
    // Longer maintenance = smaller post-maintenance percentage (more realistic)
    let postMaintenancePercentage: number;
    if (durationHours <= 0.5) {
        // Very short maintenance (≤30min): 10% for post-maintenance
        postMaintenancePercentage = 10;
    } else if (durationHours <= 2) {
        // Short maintenance (30min-2h): 5% for post-maintenance
        postMaintenancePercentage = 5;
    } else if (durationHours <= 6) {
        // Medium maintenance (2-6h): 3% for post-maintenance
        postMaintenancePercentage = 3;
    } else if (durationHours <= 12) {
        // Long maintenance (6-12h): 2% for post-maintenance
        postMaintenancePercentage = 2;
    } else {
        // Very long maintenance (>12h): 1% for post-maintenance
        postMaintenancePercentage = 1;
    }
    
    const maintenanceMax = 100 - postMaintenancePercentage;
    return { maintenanceMax, postMaintenanceStart: maintenanceMax };
}

const getMaintenanceMaxProgress = () => getProgressAllocation().maintenanceMax;
const getPostMaintenanceStartProgress = () => getProgressAllocation().postMaintenanceStart;

async function updateProgress() {
    const status = await fetchMaintenanceStatus();
    const maintenanceMax = getMaintenanceMaxProgress();
    
    if (status) {
        // Use server-provided status
        if (status.status === 'completed' && status.autoReload && !isMaintenanceComplete) {
            isMaintenanceComplete = true;
            if (PUBLIC_MAINTENANCE_AUTO === 'true') {
                startPostMaintenanceSequence();
            }
        } else {
            // Scale maintenance progress to allocated portion (0-85% if auto, 0-100% if not)
            progressPercentage = Math.round((status.progress / 100) * maintenanceMax);
            timeRemaining = status.timeRemaining;
        }
    } else {
        // Fallback to client-side calculation
        const now = new Date();
        const startTime = new Date(PUBLIC_MAINTENANCE_START || '2025-07-20T00:00:00Z');
        const endTime = new Date(PUBLIC_MAINTENANCE_END || '2025-07-20T14:00:00Z');
        
        if (now < startTime) {
            progressPercentage = 0;
            timeRemaining = 'Starting soon...';
        } else if (now > endTime) {
            if (PUBLIC_MAINTENANCE_AUTO === 'true' && !isMaintenanceComplete) {
                isMaintenanceComplete = true;
                startPostMaintenanceSequence();
            } else {
                progressPercentage = 100;
                timeRemaining = 'Finishing...';
            }
        } else {
            const totalDuration = endTime.getTime() - startTime.getTime();
            const elapsed = now.getTime() - startTime.getTime();
            const rawProgress = (elapsed / totalDuration) * 100;
            // Scale to allocated portion
            progressPercentage = Math.round((rawProgress / 100) * maintenanceMax);
            
            const remaining = endTime.getTime() - now.getTime();
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            
            if (hours > 0) {
                timeRemaining = `${hours}h ${minutes}m remaining`;
            } else if (minutes > 0) {
                timeRemaining = `${minutes}m remaining`;
            } else {
                timeRemaining = 'Completing...';
            }
        }
    }
}

function startPostMaintenanceSequence() {
    isInPostMaintenance = true;
    postMaintenanceProgress = 0;
    
    const interval = setInterval(() => {
        postMaintenanceProgress += Math.random() * 8 + 4; // Slower, smoother progress
        
        if (postMaintenanceProgress >= 100) {
            postMaintenanceProgress = 100;
            currentStage = 'Ready!';
            clearInterval(interval);
            
            setTimeout(() => {
                // Set flag to indicate we're reloading after maintenance
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('kite-post-maintenance', Date.now().toString());
                }
                window.location.reload();
            }, 500);
        } else {
            // Update stage based on progress
            const stageIndex = Math.floor((postMaintenanceProgress / 100) * postMaintenanceStages.length);
            if (stageIndex < postMaintenanceStages.length) {
                currentStage = postMaintenanceStages[stageIndex];
            }
        }
    }, 600 + Math.random() * 400); // Vary timing for natural feel
}

// Smooth animation for progress counter
let animationFrame: number;

onMount(() => {
    // Listen for browser online/offline events
    const onlineHandler = () => { isOffline = false; };
    const offlineHandler = () => { isOffline = true; };
    if (typeof window !== 'undefined') {
        window.addEventListener('online', onlineHandler);
        window.addEventListener('offline', offlineHandler);
    }

    // Initial update (non-blocking)
    void updateProgress();
    
    // Update every 5 seconds (less frequent since we're using server API)
    const interval = setInterval(() => {
        if (!isInPostMaintenance) {
            updateProgress();
        }
    }, 5000);
    
    const animate = () => {
        let targetProgress: number;
        
        if (isInPostMaintenance) {
            // Continue from 85% to 100% during post-maintenance
            const postMaintenanceStart = getPostMaintenanceStartProgress();
            const postMaintenanceRange = 100 - postMaintenanceStart; // 15%
            targetProgress = postMaintenanceStart + (postMaintenanceProgress / 100) * postMaintenanceRange;
        } else {
            targetProgress = progressPercentage;
        }
        
        const diff = targetProgress - displayProgress;
        
        if (Math.abs(diff) < 0.1) {
            displayProgress = targetProgress;
        } else {
            displayProgress += diff * 0.08;
        }
        
        animationFrame = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
        clearInterval(interval);
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', onlineHandler);
            window.removeEventListener('offline', offlineHandler);
        }
    };
});
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-dark-bg">
	<div class="text-center">
		<div class="mx-auto mb-4 h-24 w-24">
			{#if theme.current === 'dark'}
				<!-- Dark theme logo -->
				<svg width="100%" height="100%" viewBox="0 0 146 162" class="h-full w-full" class:animate-bounce={!isMaintenanceComplete} class:brightness-75={false} class:sepia={false} class:hue-rotate-[320deg]={false} class:saturate-150={false}>
					<defs>
						<path d="M23.6629882,24.5265449 L71.9882372,1.42194023 C73.4470783,0.724459141 75.1967713,1.28315718 75.9814359,2.69701668 L101.193219,48.1252385 C101.858794,49.3245155 101.644511,50.8202438 100.668992,51.7844114 L43.7053012,108.085261 C42.5040105,109.272574 40.5676654,109.261242 39.3803532,108.059951 C38.9677863,107.642527 38.6840435,107.115206 38.5629899,106.540923 L21.9896485,27.9164559 C21.698611,26.5357645 22.3899712,25.1351823 23.6629882,24.5265449 Z" id="path-1"></path>
					</defs>
					<g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
						<g transform="translate(-22, -16)">
							<g transform="translate(22.8438, 20.5045)">
								<g transform="translate(71.8573, 67.5869) rotate(12) translate(-71.8573, -67.5869)translate(10.3005, 11.5744)">
									<g transform="translate(-0, 0)">
										<g fill-rule="nonzero">
											<use fill="#FFB319" href="#path-1"></use>
											<path stroke="#FFFFFF" stroke-width="4.80582524" d="M70.9517601,-0.745939913 C72.2542968,-1.36869088 73.6866781,-1.4306476 74.9685736,-1.02132294 C76.250469,-0.611998276 77.3818786,0.268607767 78.0824721,1.53098232 L103.294255,46.9592042 C103.888519,48.0299872 104.089988,49.2331146 103.925142,50.3837621 C103.760296,51.5344097 103.229134,52.6325775 102.358135,53.4934414 L45.3944446,109.794291 C44.3218637,110.854392 42.9211334,111.379383 41.5235233,111.371204 C40.1259132,111.363025 38.7314233,110.821676 37.6713232,109.749095 C36.9345967,109.003694 36.4279131,108.062049 36.2117459,107.036545 L19.6384045,28.4120774 C19.3785495,27.1793171 19.557265,25.9376771 20.0850999,24.8683706 C20.6129347,23.799064 21.4898888,22.902091 22.6265111,22.3586647 Z"></path>
											<use stroke="#FFB319" stroke-width="0.35" href="#path-1"></use>
										</g>
										<path d="M11.2742185,18.7464759 L7.7287926,12.0100626 C7.50403591,11.5830183 6.97564681,11.4190318 6.54860251,11.6437885 C6.50660954,11.6658897 6.46648677,11.6913751 6.42863228,11.7199917 L3.95772012,13.5879103 C3.57276167,13.8789247 3.49660499,14.426909 3.78761941,14.8118675 C3.8303808,14.8684329 3.87986873,14.9195828 3.93499133,14.9641887 L9.95132943,19.8326833 C10.3264686,20.1362505 10.8766687,20.07823 11.1802359,19.7030909 C11.3998945,19.4316434 11.4368505,19.0554814 11.2742185,18.7464759 Z" fill="#FFFFFF" fill-rule="nonzero" transform="translate(8.159, 16.8013) rotate(-12) translate(-8.159, -16.8013)"></path>
										<path d="M11.5825164,24.8860825 L3.58685937,24.7060566 C3.10440274,24.6951938 2.70448838,25.0774962 2.69362564,25.5599529 C2.69227458,25.6199589 2.69710989,25.6799445 2.70805497,25.7389595 L3.29505681,28.904021 C3.38305669,29.3785086 3.83904284,29.6918187 4.31353038,29.6038188 C4.370749,29.5932069 4.42676439,29.5769054 4.48074213,29.5551571 L11.8893973,26.5701214 C12.3370097,26.389773 12.55367,25.8807102 12.3733216,25.4330978 C12.2427678,25.1090722 11.9317657,24.893946 11.5825164,24.8860825 Z" fill="#FFFFFF" fill-rule="nonzero" transform="translate(9.1718, 27.3181) rotate(-12) translate(-9.1718, -27.3181)"></path>
										<path d="M112.970459,49.1712103 L121.461294,47.8336847 C121.937995,47.758592 122.385311,48.0841596 122.460404,48.5608602 C122.469167,48.6164859 122.472531,48.6728284 122.470451,48.7291015 L122.342666,52.1863944 C122.324842,52.6686441 121.919452,53.045135 121.437202,53.0273106 C121.375644,53.0250354 121.3145,53.016257 121.254788,53.001122 L112.891738,50.8813548 C112.423952,50.7627858 112.140856,50.2874512 112.259425,49.8196651 C112.345338,49.4807146 112.625049,49.2256212 112.970459,49.1712103 Z" fill="#FFFFFF" fill-rule="nonzero" transform="translate(115.6353, 50.4676) rotate(-12) translate(-115.6353, -50.4676)"></path>
										<path d="M112.947327,55.9295159 L118.309837,62.9425853 C118.602965,63.3259368 118.529824,63.8743318 118.146473,64.1674597 C118.0976,64.2048295 118.044918,64.2369334 117.989303,64.263237 L114.742113,65.7990101 C114.305865,66.0053355 113.784956,65.8189465 113.578631,65.3826986 C113.553803,65.3302032 113.53427,65.2753635 113.520322,65.2189929 L111.405002,56.6701505 C111.289088,56.2016994 111.574877,55.7279784 112.043328,55.6120651 C112.380986,55.5285151 112.736041,55.6531972 112.947327,55.9295159 Z" fill="#FFFFFF" fill-rule="nonzero" transform="translate(114.6813, 59.4244) rotate(-12) translate(-114.6813, -59.4244)"></path>
										<path d="M9.58913022,22.3458964 L2.84875351,18.8296527 C2.68026044,18.7417551 2.47427306,18.7728599 2.33924657,18.90659 L0.973980198,20.2587487 C0.802541798,20.4285412 0.80120749,20.7051634 0.970999939,20.8766018 C1.0255631,20.9316939 1.09380528,20.9712723 1.16872012,20.9912734 L9.27436321,23.1553585 C9.50748702,23.2175991 9.74692716,23.0790708 9.80916772,22.845947 C9.8619351,22.6483053 9.77049929,22.440511 9.58913022,22.3458964 Z" fill="#FFFFFF" fill-rule="nonzero" transform="translate(6.7651, 21.4291) rotate(-12) translate(-6.7651, -21.4291)"></path>
										<path d="M113.206827,52.3356217 L121.986014,56.2389381 C122.170449,56.3209399 122.274703,56.5186114 122.238215,56.7171292 L121.763045,59.3024024 C121.719427,59.5397167 121.491686,59.6967385 121.254372,59.6531204 C121.185069,59.6403825 121.119875,59.6110709 121.064351,59.5676857 L112.760334,53.079096 C112.570204,52.9305323 112.536508,52.6559667 112.685072,52.4658367 C112.808512,52.3078591 113.023632,52.2541714 113.206827,52.3356217 Z" fill="#FFFFFF" fill-rule="nonzero" transform="translate(116.1318, 55.4526) rotate(-12) translate(-116.1318, -55.4526)"></path>
										<line x1="40.4037209" y1="109.918221" x2="74.2108712" y2="-5.53291763e-13" stroke="#FFFFFF" stroke-width="3.69194112"></line>
										<polyline stroke="#FFFFFF" stroke-width="3.25504791" points="20.8875912 26.0445226 60.770302 44.7313038 102.58662 50.9474352"></polyline>
									</g>
								</g>
								<path d="M42.1909695,117.052592 C41.3771756,119.609185 41.6946959,120.507926 39.2137426,121.528813 C37.4917058,122.237391 35.8640035,122.557492 33.9980409,122.501718 C32.0477118,122.443422 28.9871028,121.016343 27.0468392,120.864137 C23.2500067,120.566546 18.8322268,121.159129 16.7502682,124.348014 C14.9763015,127.065102 15.6797425,130.929537 17.8779958,133.316651 C20.0760126,135.703765 23.4506859,136.746635 26.6955914,136.730089 C27.3666496,136.72678 29.6438508,135.568088 30.0144811,135.050907 C31.8246126,132.524334 32.6727129,129.154152 31.6099875,126.233312 C29.9222962,121.59547 23.7856241,119.706863 19.1988387,121.528813 C14.6120533,123.351 11.5973735,127.921712 10.2531298,132.670648 C9.20718671,136.365841 9.23909684,140.898025 12.1523733,143.400251 C14.4236437,145.351001 18.1083997,145.10344 20.2680897,146.873887 C20.6216564,147.16373 20.9035013,147.532389 21.1644034,147.947318 C21.8361707,149.015716 22.0437047,150.309849 22.1096523,151.570181 C22.1219129,151.80469 22.115256,152.05177 22.0896816,152.311422" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" transform="translate(25.9086, 134.682) rotate(-8) translate(-25.9086, -134.682)"></path>
							</g>
						</g>
					</g>
				</svg>
			{:else}
				<!-- Light theme logo -->
				<svg width="100%" height="100%" viewBox="0 0 146 162" class="h-full w-full" class:animate-bounce={!isMaintenanceComplete} class:brightness-75={false} class:sepia={false} class:hue-rotate-[320deg]={false} class:saturate-150={false}>
					<g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
						<g transform="translate(-22, -16)" fill-rule="nonzero">
							<g transform="translate(22.8438, 20.5045)">
								<g transform="translate(71.8573, 67.5869) rotate(12) translate(-71.8573, -67.5869)translate(10.3005, 11.5744)">
									<g transform="translate(0, 0)">
										<path d="M70.9517601,-0.745939913 C72.2542968,-1.36869088 73.6866781,-1.4306476 74.9685736,-1.02132294 C76.250469,-0.611998276 77.3818786,0.268607767 78.0824721,1.53098232 L103.294255,46.9592042 C103.888519,48.0299872 104.089988,49.2331146 103.925142,50.3837621 C103.760296,51.5344097 103.229134,52.6325775 102.358135,53.4934414 L45.3944446,109.794291 C44.3218637,110.854392 42.9211334,111.379383 41.5235233,111.371204 C40.1259132,111.363025 38.7314233,110.821676 37.6713232,109.749095 C36.9345967,109.003694 36.4279131,108.062049 36.2117459,107.036545 L19.6384045,28.4120774 C19.3785495,27.1793171 19.557265,25.9376771 20.0850999,24.8683706 C20.6129347,23.799064 21.4898888,22.902091 22.6265111,22.3586647 Z" stroke="#191919" stroke-width="4.80582524" fill="#FFB319"></path>
										<path d="M11.2742185,18.7464759 L7.7287926,12.0100626 C7.50403591,11.5830183 6.97564681,11.4190318 6.54860251,11.6437885 C6.50660954,11.6658897 6.46648677,11.6913751 6.42863228,11.7199917 L3.95772012,13.5879103 C3.57276167,13.8789247 3.49660499,14.426909 3.78761941,14.8118675 C3.8303808,14.8684329 3.87986873,14.9195828 3.93499133,14.9641887 L9.95132943,19.8326833 C10.3264686,20.1362505 10.8766687,20.07823 11.1802359,19.7030909 C11.3998945,19.4316434 11.4368505,19.0554814 11.2742185,18.7464759 Z" fill="#191919" transform="translate(8.159, 16.8013) rotate(-12) translate(-8.159, -16.8013)"></path>
										<path d="M11.5825164,24.8860825 L3.58685937,24.7060566 C3.10440274,24.6951938 2.70448838,25.0774962 2.69362564,25.5599529 C2.69227458,25.6199589 2.69710989,25.6799445 2.70805497,25.7389595 L3.29505681,28.904021 C3.38305669,29.3785086 3.83904284,29.6918187 4.31353038,29.6038188 C4.370749,29.5932069 4.42676439,29.5769054 4.48074213,29.5551571 L11.8893973,26.5701214 C12.3370097,26.389773 12.55367,25.8807102 12.3733216,25.4330978 C12.2427678,25.1090722 11.9317657,24.893946 11.5825164,24.8860825 Z" fill="#191919" transform="translate(9.1718, 27.3181) rotate(-12) translate(-9.1718, -27.3181)"></path>
										<path d="M112.970459,49.1712103 L121.461294,47.8336847 C121.937995,47.758592 122.385311,48.0841596 122.460404,48.5608602 C122.469167,48.6164859 122.472531,48.6728284 122.470451,48.7291015 L122.342666,52.1863944 C122.324842,52.6686441 121.919452,53.045135 121.437202,53.0273106 C121.375644,53.0250354 121.3145,53.016257 121.254788,53.001122 L112.891738,50.8813548 C112.423952,50.7627858 112.140856,50.2874512 112.259425,49.8196651 C112.345338,49.4807146 112.625049,49.2256212 112.970459,49.1712103 Z" fill="#191919" transform="translate(115.6353, 50.4676) rotate(-12) translate(-115.6353, -50.4676)"></path>
										<path d="M112.947327,55.9295159 L118.309837,62.9425853 C118.602965,63.3259368 118.529824,63.8743318 118.146473,64.1674597 C118.0976,64.2048295 118.044918,64.2369334 117.989303,64.263237 L114.742113,65.7990101 C114.305865,66.0053355 113.784956,65.8189465 113.578631,65.3826986 C113.553803,65.3302032 113.53427,65.2753635 113.520322,65.2189929 L111.405002,56.6701505 C111.289088,56.2016994 111.574877,55.7279784 112.043328,55.6120651 C112.380986,55.5285151 112.736041,55.6531972 112.947327,55.9295159 Z" fill="#191919" transform="translate(114.6813, 59.4244) rotate(-12) translate(-114.6813, -59.4244)"></path>
										<path d="M9.58913022,22.3458964 L2.84875351,18.8296527 C2.68026044,18.7417551 2.47427306,18.7728599 2.33924657,18.90659 L0.973980198,20.2587487 C0.802541798,20.4285412 0.80120749,20.7051634 0.970999939,20.8766018 C1.0255631,20.9316939 1.09380528,20.9712723 1.16872012,20.9912734 L9.27436321,23.1553585 C9.50748702,23.2175991 9.74692716,23.0790708 9.80916772,22.845947 C9.8619351,22.6483053 9.77049929,22.440511 9.58913022,22.3458964 Z" fill="#191919" transform="translate(6.7651, 21.4291) rotate(-12) translate(-6.7651, -21.4291)"></path>
										<path d="M113.206827,52.3356217 L121.986014,56.2389381 C122.170449,56.3209399 122.274703,56.5186114 122.238215,56.7171292 L121.763045,59.3024024 C121.719427,59.5397167 121.491686,59.6967385 121.254372,59.6531204 C121.185069,59.6403825 121.119875,59.6110709 121.064351,59.5676857 L112.760334,53.079096 C112.570204,52.9305323 112.536508,52.6559667 112.685072,52.4658367 C112.808512,52.3078591 113.023632,52.2541714 113.206827,52.3356217 Z" fill="#191919" transform="translate(116.1318, 55.4526) rotate(-12) translate(-116.1318, -55.4526)"></path>
										<polygon fill="#191919" points="72.4464688 -0.542670858 75.9752735 0.542670858 42.1681232 110.460892 38.6393185 109.37555"></polygon>
										<polygon fill="#191919" points="21.5781179 24.5707495 61.2415912 43.1555226 102.825927 49.3376009 102.347313 52.5572695 60.5309949 46.341138 60.2954303 46.3061206 60.0797753 46.2050769 20.1970646 27.5182957"></polygon>
									</g>
								</g>
								<path d="M40.2852292,116.446917 C40.6202631,115.394384 41.7451085,114.812736 42.7976417,115.14777 C43.8501748,115.482804 44.4318229,116.607649 44.096789,117.660182 C44.0035002,117.953256 43.9219369,118.236006 43.829475,118.579567 C43.8228352,118.604239 43.6522087,119.24977 43.6021314,119.429267 C43.0909225,121.261647 42.3376482,122.26899 40.549727,123.124758 C40.3696948,123.210929 40.1786151,123.295457 39.974826,123.379314 C37.968495,124.204872 36.0612227,124.565236 33.9383267,124.501782 C33.6246494,124.492406 33.319036,124.465286 32.9943122,124.416502 L32.9831993,124.41355 L33.0401281,124.520353 C33.1672903,124.768463 33.2836547,125.023719 33.3885045,125.285925 L33.4894895,125.550441 C34.7397651,128.986752 33.9313375,133.018881 31.6401783,136.21687 C30.8904295,137.263075 28.0084102,138.724597 26.705829,138.73102 C22.6780664,138.751558 18.8869129,137.365881 16.4068209,134.672425 C15.0331164,133.1807 14.1570867,131.293952 13.8601732,129.355969 L13.8321993,129.16055 L13.7922033,129.232892 C13.1880504,130.33487 12.6827163,131.542655 12.2914919,132.82831 L12.1775632,133.216315 C11.1338643,136.903579 11.557818,140.254058 13.4555146,141.883999 C14.0877953,142.427052 14.9046634,142.761065 16.614289,143.231147 C16.7896371,143.279225 16.7896371,143.279225 16.9681052,143.327935 C19.3121323,143.968034 20.3756245,144.376832 21.5360748,145.328133 C22.0505567,145.749889 22.4590114,146.249846 22.8575714,146.883702 C23.668982,148.174193 24.0110185,149.633091 24.106964,151.466716 C24.1246079,151.80419 24.1152527,152.15142 24.0800899,152.508421 C23.9718192,153.607671 22.9929301,154.411019 21.8936798,154.302748 C20.7944295,154.194478 19.9910817,153.215588 20.0993524,152.116338 C20.1153385,151.954035 20.1192971,151.807104 20.1124242,151.675647 C20.0489247,150.4621 19.8505607,149.616013 19.4713341,149.012879 C19.2834452,148.714068 19.1342703,148.531475 19.0001838,148.421555 C18.4298579,147.954019 17.7071069,147.6762 15.9143796,147.186647 C15.7358429,147.13792 15.7358429,147.13792 15.5537995,147.088006 C13.2987781,146.467961 12.0670581,145.964317 10.8492899,144.9184 C7.52806128,142.065781 6.90632556,137.152243 8.32877905,132.126883 C9.96657995,126.34087 13.5624675,121.616897 18.460558,119.671039 C20.1084712,119.016459 21.8751248,118.758475 23.6056998,118.854582 L23.6301993,118.85655 C24.6550423,118.775131 25.7238672,118.773347 26.8323449,118.844726 L27.2032903,118.87122 C28.1885277,118.948508 28.9670735,119.151618 30.9715227,119.766073 C31.0463771,119.789017 31.0463771,119.789017 31.1208837,119.811827 C32.7004875,120.295207 33.4859389,120.486474 34.0578342,120.503568 C35.6094692,120.549946 36.9585566,120.295047 38.4527168,119.680235 C38.589553,119.623929 38.7125966,119.569498 38.8227952,119.516752 C39.4877414,119.198483 39.5292549,119.142968 39.749263,118.35437 C39.7906436,118.206045 39.9539502,117.588207 39.9669123,117.540044 C40.0738604,117.142656 40.171405,116.804504 40.2852292,116.446917 Z M23.7101993,122.87355 L23.5045653,122.895547 C21.1410925,123.172039 19.3534182,124.020282 18.4249781,125.442351 C17.2422877,127.253813 17.651087,130.118733 19.3493223,131.96287 C21.0006878,133.756304 23.7091339,134.746249 26.6857684,134.731071 L26.5601993,134.72955 L26.5743784,134.725655 C26.5976711,134.718411 26.6238003,134.709816 26.6524029,134.699932 L26.7452673,134.666478 C26.9783849,134.579389 27.2691103,134.449531 27.5631672,134.30041 C27.8561689,134.151823 28.1308888,133.995049 28.3357011,133.860477 C28.3643787,133.841634 28.3907925,133.823806 28.4146652,133.807261 L28.4711993,133.76655 L28.5651142,133.632324 C29.9394853,131.57791 30.4261931,129.140973 29.8129911,127.162983 L29.7305968,126.918186 C28.9129501,124.67126 26.4759109,123.166192 23.8124101,122.883295 L23.7101993,122.87355 Z" fill="#191919" transform="translate(25.9017, 134.6828) rotate(-8) translate(-25.9017, -134.6828)"></path>
						</g>
					</g>
				</svg>
			{/if}
		</div>
		
		<h1 class="mb-2 flex items-center justify-center text-2xl font-bold text-gray-800 dark:text-dark-text">
			<span>{s('app.title') || 'Kite'}</span>
			<span class="mt-0.5 ml-2 rounded-lg bg-yellow-200 px-2 py-0.5 text-xs font-medium text-black">
				{s('app.beta') || 'BETA'}
			</span>
		</h1>
		
		<p class="text-xl text-gray-600 dark:text-gray-400">
			{s('app.motto') || 'News. Elevated.'}
		</p>
		
		{#if isMaintenanceComplete}
			<div class="mt-4 text-center">
				<p class="text-green-600 dark:text-green-400 font-medium">
					Systems are back online
				</p>
				<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
					Thank you for your patience.
				</p>
			</div>
		{:else}
			<div class="mt-4 text-center">
				<p class="text-yellow-600 dark:text-yellow-400 font-medium">
					Maintenance in progress
				</p>
				<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
					We are performing routine updates to improve your experience.
				</p>
			</div>
		{/if}
		
		<div class="mt-4 text-center">
			<!-- Single unified progress counter (hidden for manual maintenance mode) -->
			{#if showProgressIndicator && !isOffline && displayProgress > 0}
				<p class="text-xl text-gray-600 dark:text-gray-400">
					{Math.round(displayProgress)}%
				</p>
			{/if}
			
			<!-- Dynamic status message -->
			<p class="min-h-[1.5rem] text-sm text-gray-500 dark:text-gray-400 mt-1">
				{#if isInPostMaintenance}
					{currentStage || 'Preparing...'}
				{:else if isMaintenanceComplete}
					Systems are back online.
				{:else if isOffline}
					You are offline. Please check your internet connection.
				{:else if displayProgress <= 0}
					We’ll bring Kite back online as soon as possible.
				{:else if displayProgress >= 99}
					Almost done! Starting back up…
				{:else}
					{timeRemaining || ''}
				{/if}
			</p>
		</div>
		
		<!-- Disclaimer about maintenance -->
		<div class="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
			<p>Thanks for your patience!</p>
		</div>
		
		<!-- Disclaimer about auto-generated content -->
		<div class="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
			<p>{s('app.disclaimerAutoGenerated') || 'Summaries are auto-generated and Kite can make mistakes.'}</p>
			<p>{s('app.disclaimerVerify') || 'Please verify important information.'}</p>
		</div>
		
		<!-- About Kite link -->
		<div class="mt-4 text-center">
			<button 
				onclick={openIntro}
				class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline transition-colors duration-200"
			>
				About Kite
			</button>
		</div>
	</div>
</div>

<!-- IntroScreen modal -->
<IntroScreen 
	visible={showIntroScreen} 
	onClose={closeIntro} 
/>


