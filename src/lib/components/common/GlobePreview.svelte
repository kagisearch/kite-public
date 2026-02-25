<script lang="ts">
import * as THREE from 'three';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import worldTopo from 'world-atlas/countries-110m.json';

interface Props {
	lat: number;
	lng: number;
	size?: number;
}

let { lat, lng, size = 120 }: Props = $props();

let containerEl: HTMLDivElement | undefined = $state(undefined);
let isDarkMode = $state(false);

// Watch theme
$effect(() => {
	if (typeof document === 'undefined') return;

	isDarkMode = document.documentElement.classList.contains('dark');

	const observer = new MutationObserver(() => {
		isDarkMode = document.documentElement.classList.contains('dark');
	});

	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['class'],
	});
	return () => observer.disconnect();
});

// Convert topojson to geojson once
const topo = worldTopo as unknown as Topology<{
	countries: GeometryCollection;
}>;
const countries = feature(topo, topo.objects.countries);
const countryFeatures = 'features' in countries ? countries.features : [];

// Point-in-polygon ray casting
function pointInPolygon(px: number, py: number, ring: number[][]): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const xi = ring[i][0],
			yi = ring[i][1];
		const xj = ring[j][0],
			yj = ring[j][1];
		if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
			inside = !inside;
		}
	}
	return inside;
}

function pointInGeometry(
	pLng: number,
	pLat: number,
	geometry: { type: string; coordinates: number[][][] | number[][][][] },
): boolean {
	if (geometry.type === 'Polygon') {
		return pointInPolygon(pLng, pLat, geometry.coordinates[0] as number[][]);
	} else if (geometry.type === 'MultiPolygon') {
		return (geometry.coordinates as number[][][][]).some((poly) =>
			pointInPolygon(pLng, pLat, poly[0]),
		);
	}
	return false;
}

function findCountryId(targetLat: number, targetLng: number): string | null {
	for (const feat of countryFeatures) {
		if (
			feat.geometry &&
			pointInGeometry(
				targetLng,
				targetLat,
				feat.geometry as {
					type: string;
					coordinates: number[][][] | number[][][][];
				},
			)
		) {
			return String(feat.id);
		}
	}
	return null;
}

// Compute the geographic centroid and span of a specific polygon ring
function getPolygonCentroid(ring: number[][]): { lat: number; lng: number; span: number } | null {
	let sumLng = 0;
	let sumLat = 0;
	let count = 0;
	let minLng = Infinity;
	let maxLng = -Infinity;
	let minLat = Infinity;
	let maxLat = -Infinity;

	// Skip last point (same as first in closed rings)
	for (let i = 0; i < ring.length - 1; i++) {
		const lng = ring[i][0];
		const lat = ring[i][1];
		sumLng += lng;
		sumLat += lat;
		if (lng < minLng) minLng = lng;
		if (lng > maxLng) maxLng = lng;
		if (lat < minLat) minLat = lat;
		if (lat > maxLat) maxLat = lat;
		count++;
	}

	if (count === 0) return null;
	const span = Math.max(maxLng - minLng, maxLat - minLat);
	return { lat: sumLat / count, lng: sumLng / count, span };
}

// Compute the centroid of the polygon that contains the target point (handles overseas territories)
function getCountryCentroid(
	countryId: string,
	targetLat: number,
	targetLng: number,
): { lat: number; lng: number; span: number } | null {
	const feat = countryFeatures.find((f) => String(f.id) === countryId);
	if (!feat?.geometry) return null;

	const geom = feat.geometry as {
		type: string;
		coordinates: number[][][] | number[][][][];
	};

	if (geom.type === 'Polygon') {
		return getPolygonCentroid((geom.coordinates as number[][][])[0]);
	} else if (geom.type === 'MultiPolygon') {
		// Find the polygon that contains the target point
		for (const poly of geom.coordinates as number[][][][]) {
			if (pointInPolygon(targetLng, targetLat, poly[0])) {
				return getPolygonCentroid(poly[0]);
			}
		}
		// Fallback: use the largest polygon (by vertex count) if point not found in any
		let largestPoly: number[][] | null = null;
		let maxVertices = 0;
		for (const poly of geom.coordinates as number[][][][]) {
			if (poly[0].length > maxVertices) {
				maxVertices = poly[0].length;
				largestPoly = poly[0];
			}
		}
		if (largestPoly) {
			return getPolygonCentroid(largestPoly);
		}
	}

	return null;
}

// Draw GeoJSON geometry onto canvas (equirectangular projection)
function drawGeometry(
	ctx: CanvasRenderingContext2D,
	geometry: { type: string; coordinates: number[][][] | number[][][][] },
	canvasW: number,
	canvasH: number,
) {
	const drawRings = (rings: number[][][]) => {
		ctx.beginPath();
		for (const ring of rings) {
			let prevX = 0;
			for (let i = 0; i < ring.length; i++) {
				const [cLng, cLat] = ring[i];
				const x = ((cLng + 180) / 360) * canvasW;
				const y = ((90 - cLat) / 180) * canvasH;
				// Skip segments that cross the antimeridian (huge horizontal jump)
				if (i === 0 || Math.abs(x - prevX) > canvasW * 0.5) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
				prevX = x;
			}
		}
		ctx.fill();
		ctx.stroke();
	};

	if (geometry.type === 'Polygon') {
		drawRings(geometry.coordinates as number[][][]);
	} else if (geometry.type === 'MultiPolygon') {
		for (const polygon of geometry.coordinates as number[][][][]) {
			drawRings(polygon);
		}
	}
}

function createGlobeTexture(dark: boolean, highlightId: string | null): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	const w = 2048;
	const h = 1024;
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d')!;

	// Ocean
	ctx.fillStyle = dark ? '#0d1321' : '#a8c4e0';
	ctx.fillRect(0, 0, w, h);

	// Draw all countries
	for (const feat of countryFeatures) {
		if (!feat.geometry) continue;
		const isHighlighted = String(feat.id) === highlightId;
		ctx.fillStyle = isHighlighted ? (dark ? '#1a5c3a' : '#5aad5a') : dark ? '#1c2a3a' : '#c8d8b4';
		ctx.strokeStyle = dark ? '#2a3e52' : '#8aaa88';
		ctx.lineWidth = 0.8;

		drawGeometry(
			ctx,
			feat.geometry as {
				type: string;
				coordinates: number[][][] | number[][][][];
			},
			w,
			h,
		);
	}

	return canvas;
}

function latLngToVector3(pLat: number, pLng: number, radius: number): THREE.Vector3 {
	const phi = ((90 - pLat) * Math.PI) / 180;
	const theta = (pLng * Math.PI) / 180;
	return new THREE.Vector3(
		radius * Math.sin(phi) * Math.cos(theta),
		radius * Math.cos(phi),
		-radius * Math.sin(phi) * Math.sin(theta),
	);
}

// Three.js scene
$effect(() => {
	if (!containerEl) return;

	const dark = isDarkMode;
	const targetLat = lat;
	const targetLng = lng;
	const w = size * 2;
	const h = size * 2;

	// Find which country contains the target point
	const highlightId = findCountryId(targetLat, targetLng);

	// Create texture from GeoJSON (standard equirectangular projection)
	const textureCanvas = createGlobeTexture(dark, highlightId);
	const texture = new THREE.CanvasTexture(textureCanvas);
	texture.colorSpace = THREE.SRGBColorSpace;

	// Scene setup
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
	camera.position.z = 2.8;

	const renderer = new THREE.WebGLRenderer({
		antialias: true,
		alpha: true,
	});
	renderer.setSize(w, h);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.setClearColor(0x000000, 0);
	renderer.domElement.style.width = `${size}px`;
	renderer.domElement.style.height = `${size}px`;
	containerEl.innerHTML = '';
	containerEl.appendChild(renderer.domElement);

	// Globe group - everything rotates together
	const globeGroup = new THREE.Group();
	globeGroup.rotation.order = 'XYZ';
	scene.add(globeGroup);

	// Globe sphere with country texture
	const globeGeometry = new THREE.SphereGeometry(1, 64, 64);
	const globeMaterial = new THREE.MeshPhongMaterial({
		map: texture,
		shininess: 10,
	});
	const globe = new THREE.Mesh(globeGeometry, globeMaterial);
	globeGroup.add(globe);

	// Location marker (child of globeGroup so it rotates with the globe)
	const markerPos = latLngToVector3(targetLat, targetLng, 1.015);

	// Marker dot
	const markerGeometry = new THREE.SphereGeometry(0.03, 16, 16);
	const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff4444 });
	const marker = new THREE.Mesh(markerGeometry, markerMaterial);
	marker.position.copy(markerPos);
	globeGroup.add(marker);

	// Marker ring (pulsing)
	const ringGeometry = new THREE.RingGeometry(0.035, 0.055, 32);
	const ringMaterial = new THREE.MeshBasicMaterial({
		color: 0xff4444,
		transparent: true,
		opacity: 0.6,
		side: THREE.DoubleSide,
	});
	const ring = new THREE.Mesh(ringGeometry, ringMaterial);
	ring.position.copy(markerPos);
	ring.lookAt(new THREE.Vector3(0, 0, 0));
	globeGroup.add(ring);

	// Atmosphere glow
	const atmosphereGeometry = new THREE.SphereGeometry(1.1, 64, 64);
	const atmosphereMaterial = new THREE.ShaderMaterial({
		vertexShader: `
			varying vec3 vNormal;
			void main() {
				vNormal = normalize(normalMatrix * normal);
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: `
			varying vec3 vNormal;
			uniform vec3 glowColor;
			void main() {
				float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
				gl_FragColor = vec4(glowColor, intensity * 0.4);
			}
		`,
		uniforms: {
			glowColor: { value: new THREE.Color(dark ? 0x3355aa : 0x5588cc) },
		},
		blending: THREE.AdditiveBlending,
		side: THREE.BackSide,
		transparent: true,
		depthWrite: false,
	});
	const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
	scene.add(atmosphere);

	// Lighting
	const ambientLight = new THREE.AmbientLight(0xffffff, dark ? 1.2 : 1.8);
	scene.add(ambientLight);

	const directionalLight = new THREE.DirectionalLight(0xffffff, dark ? 0.4 : 0.6);
	directionalLight.position.set(5, 3, 5);
	scene.add(directionalLight);

	// Blend marker position with country centroid for better framing of large countries
	const centroid = highlightId ? getCountryCentroid(highlightId, targetLat, targetLng) : null;
	let centroidWeight = 0;
	if (centroid && centroid.span > 0) {
		const distFromCentroid = Math.sqrt(
			(targetLat - centroid.lat) ** 2 + (targetLng - centroid.lng) ** 2,
		);
		// How far the marker is from centroid relative to country size (0 = at centroid, 1 = at edge)
		const edgeness = Math.min(1, distFromCentroid / (centroid.span * 0.5));
		// Only pull toward centroid when marker is near the edge of a large country
		centroidWeight = edgeness * Math.min(0.55, 0.15 + centroid.span / 200);
	}
	const viewLat = centroid
		? targetLat * (1 - centroidWeight) + centroid.lat * centroidWeight
		: targetLat;
	const viewLng = centroid
		? targetLng * (1 - centroidWeight) + centroid.lng * centroidWeight
		: targetLng;

	// Y rotation: -90 - lng works for horizontal centering
	const targetRotationY = ((-90 - viewLng) * Math.PI) / 180;
	// X rotation: try positive value ~= latitude to tilt north toward camera
	const targetRotationX = (viewLat * Math.PI) / 180;

	console.log('Globe debug:', {
		inputLat: targetLat,
		inputLng: targetLng,
		targetRotationX: (targetRotationX * 180) / Math.PI,
		targetRotationY: (targetRotationY * 180) / Math.PI,
	});

	// Start slightly offset for a spin-in animation
	let currentRotationY = targetRotationY + Math.PI * 0.4;
	let currentRotationX = 0;

	let animId: number;
	const startTime = Date.now();

	function animate() {
		animId = requestAnimationFrame(animate);

		const elapsed = (Date.now() - startTime) / 1000;

		// Smooth lerp toward target rotation
		currentRotationY += (targetRotationY - currentRotationY) * 0.06;
		currentRotationX += (targetRotationX - currentRotationX) * 0.06;

		globeGroup.rotation.y = currentRotationY;
		globeGroup.rotation.x = currentRotationX;

		// Pulse the ring
		const pulse = 1.0 + 0.3 * Math.sin(elapsed * 3);
		ring.scale.set(pulse, pulse, pulse);
		ringMaterial.opacity = 0.6 * (1.0 - 0.3 * Math.sin(elapsed * 3));

		renderer.render(scene, camera);
	}

	animate();

	return () => {
		cancelAnimationFrame(animId);
		renderer.dispose();
		texture.dispose();
		globeGeometry.dispose();
		globeMaterial.dispose();
		atmosphereGeometry.dispose();
		atmosphereMaterial.dispose();
		markerGeometry.dispose();
		markerMaterial.dispose();
		ringGeometry.dispose();
		ringMaterial.dispose();
		if (containerEl) containerEl.innerHTML = '';
	};
});
</script>

<div
  bind:this={containerEl}
  style="width: {size}px; height: {size}px;"
  class="overflow-hidden rounded-lg"
></div>
