import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import DOMPurify from "dompurify";
import maplibregl from "maplibre-gl";
import FreehandController from "../../draw/freehandController";
import LineController from "../../draw/lineController";
import PolygonController from "../../draw/polygonController";
import CircleController from "../../draw/circleController";
import ArrowController from "../../draw/arrowController";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { openNotes } from "../../store/mapSlice";
import "maplibre-gl/dist/maplibre-gl.css";
import GalaxyCanvas from "../common/GalaxyCanvas";
import saveIcon from "../../assets/icons/save_icon.png";
import deleteIcon from "../../assets/icons/delete_icon.png";
import cancelIcon from "../../assets/icons/cancel_icon.png";
import noteIcon from "../../assets/icons/note_icon.png"
import { fetchAllNotes } from "../api/note";
import { store as reduxStore } from "../../store/store";
import { imageManager } from './ImageManager';
import { hyperlinkManager } from "./HyperlinkManager";
export default function MapView({ leftOffset = 0, rightOffset = 0 }) {
	const mapContainer = useRef(null);
	const map = useRef(null);
	const finalFeaturesRef = useRef([]);
	const selectedFeatureIdRef = useRef(null);
	const featureSeqRef = useRef(1);
	const selectionOverlayElRef = useRef(null);
	const selectionOverlayLngLatRef = useRef(null);
	const dispatch = useDispatch();

	// Text tool state
	const manager = imageManager(map);
	const hyperlinker = hyperlinkManager(map);
	const textToolbarElRef = useRef(null);
	const textToolbarLngLatRef = useRef(null);
	const textToolbarFeatureIdRef = useRef(null);
	const textModeActiveRef = useRef(false);
	const textClickHandlerRef = useRef(null);
	const clickedCoordsRef = useRef(null);

	// Text helpers
	const sanitizeText = (raw) => {
		try {
			return DOMPurify.sanitize(String(raw || ""), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).slice(0, 2000);
		} catch (_) {
			return String(raw || "").slice(0, 2000);
		}
	};
	const isValidCoordinate = (coords) => {
		return (
			Array.isArray(coords) &&
			coords.length === 2 &&
			typeof coords[0] === "number" &&
			typeof coords[1] === "number" &&
			coords[0] >= -180 && coords[0] <= 180 && coords[1] >= -90 && coords[1] <= 90
		);
	};
	const isVisibleOnGlobe = (center, point) => {
		try {
			const latLonToUnit = ([lon, lat]) => {
				const phi = (lat * Math.PI) / 180;
				const lam = (lon * Math.PI) / 180;
				return [Math.cos(phi) * Math.cos(lam), Math.cos(phi) * Math.sin(lam), Math.sin(phi)];
			};
			const a = latLonToUnit([center.lng, center.lat]);
			const b = latLonToUnit([point[0], point[1]]);
			const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
			return dot > 0;
		} catch (_) { return true; }
	};

	const finalizeTextFeature = (coords, textValue, sizePx, colorHex) => {
		if (!isValidCoordinate(coords)) throw new Error("Invalid coordinates");
		const id = `tx_${uuidv4()}`;
		const feature = {
			type: "Feature",
			properties: {
				id,
				tool: "text",
				text: sanitizeText(textValue),
				fontSize: Math.max(8, Math.min(72, Number(sizePx) || 16)),
				color: colorHex || "#ffffff",
				created_at: new Date().toISOString(),
			},
			geometry: { type: "Point", coordinates: [Number(coords[0].toFixed(6)), Number(coords[1].toFixed(6))] },
		};
		finalFeaturesRef.current = [...finalFeaturesRef.current, feature];
		const src = map.current && map.current.getSource("draw-final-src");
		src && src.setData({ type: "FeatureCollection", features: finalFeaturesRef.current });
		return feature;
	};

	// ✅ Get polygons from Redux
	const polygons = useSelector((state) => state.map.polygons);
	const year = useSelector((state) => state.map.year);
	const { id: projectIdParam } = useParams?.() || {};



	useEffect(() => {
		if (map.current) return;
		map.current = new maplibregl.Map({
			container: mapContainer.current,
			style: "https://tiles.openfreemap.org/styles/liberty",
			center: [78.9629, 20.5937],
			zoom: 2,
			projection: { type: "globe" },
			attributionControl: false,
		});

		// Add attribution control in compact mode (collapsed by default)
		try {
			map.current.addControl(
				new maplibregl.AttributionControl({ compact: true }),
				"bottom-right"
			);
		} catch (_) {}

		map.current.on("load", () => {
			map.current.setProjection({ type: "globe" });
			// Ensure the WebGL canvas is transparent so the galaxy background shows
			try {
				const canvas = map.current.getCanvas();
				if (canvas) canvas.style.backgroundColor = "transparent";
			} catch (_) {}
			// Atmosphere effect
			if (map.current.setFog) {
				map.current.setFog({
					color: "#d6e7ff",
					"high-color": "#add3ff",
					"space-color": "rgba(0,0,0,0)",
					"horizon-blend": 0.02,
				});
			}


			// Add empty source for dynamic polygons (only if it doesn't exist)
			if (!map.current.getSource("polygons-source")) {
			map.current.addSource("polygons-source", {
				type: "geojson",
				data: {
					type: "FeatureCollection",
					features: [],
				},
			});
			}

			// Freehand drawing sources and layers (live preview + finalized)
			const liveSourceId = "draw-live-src";
			const finalSourceId = "draw-final-src";
			if (!map.current.getSource(liveSourceId)) {
				map.current.addSource(liveSourceId, {
					type: "geojson",
					data: { type: "FeatureCollection", features: [] },
				});
			}
			if (!map.current.getSource(finalSourceId)) {
				map.current.addSource(finalSourceId, {
					type: "geojson",
					data: { type: "FeatureCollection", features: [] },
				});
			}
			if (!map.current.getLayer("draw-live-line")) {
				map.current.addLayer({ id: "draw-live-line", type: "line", source: liveSourceId, layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": ["case", ["==", ["get", "tool"], "highlight"], "#39FF14", "#000000"], "line-width": ["case", ["==", ["get", "tool"], "highlight"], 15, 3], "line-opacity": ["case", ["==", ["get", "tool"], "highlight"], 0.4, 0.9] } });
			}
			if (!map.current.getLayer("draw-live-shadow")) {
				map.current.addLayer({ id: "draw-live-shadow", type: "line", source: liveSourceId, layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": ["case", ["==", ["get", "tool"], "highlight"], "#39FF14", "#000000"], "line-width": ["case", ["==", ["get", "tool"], "highlight"], 20, 6], "line-opacity": ["case", ["==", ["get", "tool"], "highlight"], 0.12, 0.2] } }, "draw-live-line");
			}
			if (!map.current.getLayer("draw-final-line")) {
				map.current.addLayer({ id: "draw-final-line", type: "line", source: finalSourceId, layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": ["case", ["==", ["get", "tool"], "highlight"], "#39FF14", "#000000"], "line-width": ["case", ["==", ["get", "tool"], "highlight"], 15, 3], "line-opacity": ["case", ["==", ["get", "tool"], "highlight"], 0.4, 1] } });
			}

			// Text layer for finalized features with tool === 'text'
			if (!map.current.getLayer("draw-final-text")) {
				map.current.addLayer({
					id: "draw-final-text",
					type: "symbol",
					source: finalSourceId,
					filter: ["==", ["get", "tool"], "text"],
					layout: {
						"text-field": ["get", "text"],
						"text-font": ["Noto Sans Regular"],
						"text-size": ["coalesce", ["get", "fontSize"], 16],
						"text-anchor": "center",
						"text-allow-overlap": false,
						"text-ignore-placement": false,
						"text-pitch-alignment": "map",
						"text-rotation-alignment": "auto",
						"text-max-width": 16,
						"symbol-placement": "point"
					},
					paint: {
						"text-color": ["coalesce", ["get", "color"], "#ffffff"],
						"text-halo-color": "#000000",
						"text-halo-width": 1,
						"text-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.7, 8, 1]
					}
				});
			}
			// Final polygon/circle fill and selection fill (exclude pencil/arrow)
			if (!map.current.getLayer("draw-final-fill")) {
				map.current.addLayer({
					id: "draw-final-fill",
					type: "fill",
					source: finalSourceId,
					paint: { "fill-color": "#000000", "fill-opacity": 0.1 },
					filter: [
						"any",
						["==", ["get", "tool"], "polygon"],
						["==", ["get", "tool"], "circle"],
					],
				});
			}
			if (!map.current.getLayer("draw-final-fill-selected")) {
				map.current.addLayer({
					id: "draw-final-fill-selected",
					type: "fill",
					source: finalSourceId,
					paint: { "fill-color": "#1e90ff", "fill-opacity": 0.15 },
					filter: [
						"all",
						["any",
							["==", ["get", "tool"], "polygon"],
							["==", ["get", "tool"], "circle"],
						],
						["==", ["get", "id"], "__none__"],
					],
				});
			}
			// Selection highlight layer on top
			if (!map.current.getLayer("draw-final-line-selected")) {
				map.current.addLayer({
					id: "draw-final-line-selected",
					type: "line",
					source: finalSourceId,
					layout: { "line-join": "round", "line-cap": "round" },
					paint: { "line-color": "#1e90ff", "line-width": 5, "line-opacity": 0.9 },
					filter: ["==", ["get", "id"], "__none__"],
				});
			}

			// Fill layer
			if (!map.current.getLayer("polygon-fill")) {
				map.current.addLayer({
					id: "polygon-fill",
					type: "fill",
					source: "polygons-source",
					paint: {
						"fill-color": "#0080ff",
						"fill-opacity": 0.5,
					},
				});
			}

			// Border layer
			if (!map.current.getLayer("polygon-border")) {
				map.current.addLayer({
					id: "polygon-border",
					type: "line",
					source: "polygons-source",
					paint: {
						"line-color": "#0000ff",
						"line-width": 2,
					},
				});
			}

			// Offset builtin control groups so they don't sit under side panels
			try {
				const container = map.current.getContainer();
				const leftCorners = container.querySelectorAll(
					".maplibregl-ctrl-bottom-left, .maplibregl-ctrl-top-left"
				);
				leftCorners.forEach((el) => {
					el.style.left = `${leftOffset + 8}px`;
					el.style.marginLeft = "0px";
					el.style.zIndex = "20";
				});
				const rightCorners = container.querySelectorAll(
					".maplibregl-ctrl-bottom-right, .maplibregl-ctrl-top-right"
				);
				rightCorners.forEach((el) => {
					el.style.right = `${rightOffset + 8}px`;
					el.style.marginRight = "0px";
					el.style.zIndex = "20";
				});

				// Position bottom controls higher up to avoid timeline
				const bottomLeft = container.querySelector(
					".maplibregl-ctrl-bottom-left"
				);
				const bottomRight = container.querySelector(
					".maplibregl-ctrl-bottom-right"
				);
				if (bottomLeft) bottomLeft.style.bottom = "130px";
				if (bottomRight) bottomRight.style.bottom = "130px";

				// Place attribution as compact "i" at bottom-right below timeline
				const attrib = container.querySelector(".maplibregl-ctrl-attrib");
				if (attrib) {
					attrib.classList.add("maplibregl-compact");
					attrib.style.position = "absolute";
					attrib.style.bottom = "8px";
					attrib.style.right = `${rightOffset + 8}px`;
					attrib.style.left = "auto";
					attrib.style.zIndex = "14"; // under timeline (z-index 15)
					if (attrib.parentElement !== container) container.appendChild(attrib);
				}
			} catch (_) {}


			// Initialize geometry worker and freehand controller
			try {
				const worker = new Worker(new URL("../../draw/workers/geometry.worker.js", import.meta.url), { type: "module" });
				const freehand = new FreehandController({
					map: map.current,
					liveSourceId,
					worker,
					baseToleranceMeters: 0.75,
					minPixelDelta: 2,
					maxTimeDeltaMs: 40,
					tool: "freehand",
					onFinalize: (coords) => {
						const id = `fh_${Date.now()}_${featureSeqRef.current++}`;
						const feature = {
							type: "Feature",
							properties: { id, tool: "freehand", created_at: new Date().toISOString() },
							geometry: { type: "LineString", coordinates: coords },
						};
						finalFeaturesRef.current = [...finalFeaturesRef.current, feature];
						const src = map.current.getSource(finalSourceId);
						src && src.setData({ type: "FeatureCollection", features: finalFeaturesRef.current });
					}
				});

				const highlight = new FreehandController({
					map: map.current,
					liveSourceId,
					worker,
					baseToleranceMeters: 0.75,
					minPixelDelta: 2,
					maxTimeDeltaMs: 40,
					tool: "highlight",
					onFinalize: (coords) => {
						const id = `hl_${Date.now()}_${featureSeqRef.current++}`;
						const feature = { type: "Feature", properties: { id, tool: "highlight", created_at: new Date().toISOString() }, geometry: { type: "LineString", coordinates: coords } };
						finalFeaturesRef.current = [...finalFeaturesRef.current, feature];
						const src = map.current.getSource(finalSourceId);
						src && src.setData({ type: "FeatureCollection", features: finalFeaturesRef.current });
					}
				});

				const line = new LineController({
					map: map.current,
					liveSourceId,
					onFinalize: (coords) => {
						const id = `ln_${Date.now()}_${featureSeqRef.current++}`;
						const feature = { type: "Feature", properties: { id, tool: "line", created_at: new Date().toISOString() }, geometry: { type: "LineString", coordinates: coords } };
						finalFeaturesRef.current = [...finalFeaturesRef.current, feature];
						const src = map.current.getSource(finalSourceId);
						src && src.setData({ type: "FeatureCollection", features: finalFeaturesRef.current });
					}
				});

				const polygon = new PolygonController({
					map: map.current,
					liveSourceId,
					onFinalize: (ring) => {
						const id = `pg_${Date.now()}_${featureSeqRef.current++}`;
						const feature = { type: "Feature", properties: { id, tool: "polygon", created_at: new Date().toISOString() }, geometry: { type: "Polygon", coordinates: [ring] } };
						finalFeaturesRef.current = [...finalFeaturesRef.current, feature];
						const src = map.current.getSource(finalSourceId);
						src && src.setData({ type: "FeatureCollection", features: finalFeaturesRef.current });
					}
				});

				const circle = new CircleController({
					map: map.current,
					liveSourceId,
					onFinalize: (ring) => {
						const id = `cr_${Date.now()}_${featureSeqRef.current++}`;
						const feature = { type: "Feature", properties: { id, tool: "circle", created_at: new Date().toISOString() }, geometry: { type: "Polygon", coordinates: [ring] } };
						finalFeaturesRef.current = [...finalFeaturesRef.current, feature];
						const src = map.current.getSource(finalSourceId);
						src && src.setData({ type: "FeatureCollection", features: finalFeaturesRef.current });
					}
				});

				const arrow = new ArrowController({
					map: map.current,
					liveSourceId,
					onFinalize: ({ shaft, head }) => {
						const id = `ar_${Date.now()}_${featureSeqRef.current++}`;
						const lineF = { type: "Feature", properties: { id, tool: "arrow", created_at: new Date().toISOString() }, geometry: { type: "LineString", coordinates: shaft } };
						const headF = { type: "Feature", properties: { id, tool: "arrow", created_at: new Date().toISOString() }, geometry: { type: "Polygon", coordinates: [head] } };
						finalFeaturesRef.current = [...finalFeaturesRef.current, lineF, headF];
						const src = map.current.getSource(finalSourceId);
						src && src.setData({ type: "FeatureCollection", features: finalFeaturesRef.current });
					}
				});


				// --- Floating Text Toolbar ---
				const buildTextToolbar = () => {
					try {
						if (textToolbarElRef.current) return;
						const host = map.current.getContainer();
						const el = document.createElement("div");
						el.style.position = "absolute";
						el.style.transform = "translate(-50%, -100%)";
						el.style.display = "none";
						el.style.zIndex = "26";
						el.style.pointerEvents = "auto";
						el.className = "rounded-lg bg-white/1 border border-white/30 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.3),0_0_9px_rgba(0,0,0,0.2),0_3px_8px_rgba(0,0,0,0.15)] p-3 flex flex-col gap-3";
						el.style.width = "fit-content";
						el.style.maxWidth = "400px";

						// Text input container with cancel button
						const textContainer = document.createElement("div");
						textContainer.style.display = "flex";
						textContainer.style.alignItems = "center";
						textContainer.style.gap = "8px";
						textContainer.style.position = "relative";

						const txt = document.createElement("input");
						txt.type = "text";
						txt.placeholder = "Enter text...";
						txt.value = "";
						txt.style.width = "300px";
						txt.style.padding = "8px 12px";
						txt.style.borderRadius = "6px";
						txt.style.border = "1px solid rgba(255,255,255,0.3)";
						txt.style.backgroundColor = "rgba(255,255,255,0.05)";
						txt.addEventListener("keydown", (ev) => {
							if (ev.key === "Enter") { ev.preventDefault(); onSave(); }
							if (ev.key === "Escape") { ev.preventDefault(); onCancel(); }
						});

						const cancelBtn = document.createElement("button");
						cancelBtn.type = "button";
						cancelBtn.setAttribute("aria-label", "Cancel");
						cancelBtn.innerHTML = "&#10005;";
						cancelBtn.className = "rounded-full w-6 h-6 flex items-center justify-center bg-white/40 hover:bg-white/60 text-black shadow transition";
						cancelBtn.style.position = "absolute";
						cancelBtn.style.right = "8px";
						cancelBtn.style.top = "50%";
						cancelBtn.style.transform = "translateY(-50%)";
						cancelBtn.addEventListener("click", () => onCancel());

						// Controls row (color, size, save, delete) - positioned below text
						const controlsRow = document.createElement("div");
						controlsRow.style.display = "flex";
						controlsRow.style.alignItems = "center";
						controlsRow.style.gap = "8px";
						controlsRow.style.justifyContent = "flex-start";
						controlsRow.style.marginTop = "8px";

						const color = document.createElement("input");
						color.type = "color";
						color.value = "#ffffff";
						color.setAttribute("aria-label", "Text color");
						color.style.width = "32px";
						color.style.height = "32px";
						color.style.border = "1px solid rgba(255,255,255,0.3)";
						color.style.borderRadius = "6px";
						color.style.backgroundColor = "rgba(255,255,255,0.8)";

						const size = document.createElement("input");
						size.type = "number";
						size.min = "8";
						size.max = "72";
						size.value = "16";
						size.setAttribute("aria-label", "Font size");
						size.style.width = "60px";
						size.style.padding = "6px 8px";
						size.style.borderRadius = "6px";
						size.style.border = "1px solid rgba(255,255,255,0.3)";
						size.style.backgroundColor = "rgba(255,255,255,0.05)";

						const saveBtn = document.createElement("button");
						saveBtn.type = "button";
						saveBtn.textContent = "Save";
						saveBtn.className = "rounded-lg px-4 py-2 bg-[#007cba] text-white shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_0_6px_rgba(0,0,0,0.15)] hover:bg-[#005a8b] transition-all duration-300";
						saveBtn.addEventListener("click", () => onSave());

						const delBtn = document.createElement("button");
						delBtn.type = "button";
						delBtn.textContent = "Delete";
						delBtn.className = "rounded-lg px-4 py-2 bg-[#ef4444] text-white shadow hover:bg-[#b91c1c] transition-all duration-300";
						delBtn.addEventListener("click", () => onDelete());

						// Prevent map interaction while using toolbar
						["mousedown", "dblclick", "wheel"].forEach((evt) => {
							el.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
						});

						textContainer.appendChild(txt);
						textContainer.appendChild(cancelBtn);
						
						controlsRow.appendChild(color);
						controlsRow.appendChild(size);
						controlsRow.appendChild(saveBtn);
						controlsRow.appendChild(delBtn);
						
						el.appendChild(textContainer);
						el.appendChild(controlsRow);
						host.appendChild(el);
						textToolbarElRef.current = el;

						function onSave() {
							const vText = txt.value || "";
							if (!vText.trim()) return;
						const vSize = Math.max(8, Math.min(72, Number(size.value) || 16));
						const elMode = el.getAttribute("data-mode") || "create";
						if (elMode === "edit" && textToolbarFeatureIdRef.current) {
							const id = textToolbarFeatureIdRef.current;
							const idx = finalFeaturesRef.current.findIndex((f) => f.properties && f.properties.id === id);
							if (idx >= 0) {
								const f = { ...finalFeaturesRef.current[idx] };
								f.properties = { ...f.properties, text: sanitizeText(vText.trim()), fontSize: vSize, color: color.value || "#ffffff" };
								finalFeaturesRef.current[idx] = f;
								const src = map.current.getSource("draw-final-src");
								src && src.setData({ type: "FeatureCollection", features: finalFeaturesRef.current });
							}
							try { window.mapxDrawSaveAllToLocal && window.mapxDrawSaveAllToLocal(); } catch(_){}
						} else {
							finalizeTextFeature([textToolbarLngLatRef.current.lng, textToolbarLngLatRef.current.lat], vText.trim(), vSize, color.value || "#ffffff");
							try { window.mapxDrawSaveAllToLocal && window.mapxDrawSaveAllToLocal(); } catch(_){}
						}
						
						// Download GeoJSON file
						try {
							const geoJsonData = {
								type: "FeatureCollection",
								features: finalFeaturesRef.current,
								metadata: {
									exportedAt: new Date().toISOString(),
									totalFeatures: finalFeaturesRef.current.length,
									textFeatures: finalFeaturesRef.current.filter(f => f.properties && f.properties.tool === 'text').length,
									drawingFeatures: finalFeaturesRef.current.filter(f => f.properties && f.properties.tool !== 'text').length
								}
							};
							
							const blob = new Blob([JSON.stringify(geoJsonData, null, 2)], { type: 'application/json' });
							const url = URL.createObjectURL(blob);
							const a = document.createElement('a');
							a.href = url;
							a.download = `mapx-drawing-${new Date().toISOString().split('T')[0]}.geojson`;
							document.body.appendChild(a);
							a.click();
							document.body.removeChild(a);
							URL.revokeObjectURL(url);
						} catch (error) {
							console.error('Failed to download GeoJSON:', error);
						}
						
						hideTextToolbar();
						}

						function onCancel() { hideTextToolbar(); }

						function onDelete() {
							const id = textToolbarFeatureIdRef.current;
							if (!id) { hideTextToolbar(); return; }
							finalFeaturesRef.current = finalFeaturesRef.current.filter((f) => (f.properties && f.properties.id) !== id);
							const src = map.current.getSource("draw-final-src");
							src && src.setData({ type: "FeatureCollection", features: finalFeaturesRef.current });
							selectedFeatureIdRef.current = null;
							try { map.current.setFilter("draw-final-line-selected", ["==", ["get", "id"], "__none__"]); } catch(_){}
							try { window.mapxDrawSaveAllToLocal && window.mapxDrawSaveAllToLocal(); } catch(_){}
							hideTextToolbar();
						}

						// focus after mount
						setTimeout(() => { try { txt.focus(); txt.select(); } catch(_){} }, 50);
					} catch (_) {}
				};

				const positionTextToolbar = (lngLat) => {
					try {
						const el = textToolbarElRef.current;
						if (!el || !lngLat) return;
						const p = map.current.project(lngLat);
						el.style.left = `${p.x}px`;
						el.style.top = `${p.y - 10}px`;
					} catch (_) {}
				};

                const showTextToolbar = (lngLat) => {
					buildTextToolbar();
					textToolbarLngLatRef.current = lngLat;
					positionTextToolbar(lngLat);
                    try { textToolbarElRef.current.style.display = "flex"; } catch (_) {}
                    try { textToolbarElRef.current.setAttribute("data-mode", "create"); } catch(_){}
                    textToolbarFeatureIdRef.current = null;
					try { map.current.boxZoom.disable(); map.current.dragPan.disable(); map.current.dragRotate.disable(); map.current.keyboard.disable(); } catch(_){}
				};

				const hideTextToolbar = () => {
					try { if (textToolbarElRef.current) textToolbarElRef.current.style.display = "none"; } catch(_){}
					textToolbarLngLatRef.current = null;
					try { map.current.boxZoom.enable(); map.current.dragPan.enable(); map.current.dragRotate.enable(); map.current.keyboard.enable(); } catch(_){}
				};

                const showTextToolbarEdit = (feature, lngLat) => {
                    buildTextToolbar();
                    textToolbarLngLatRef.current = lngLat;
                    positionTextToolbar(lngLat);
                    try { textToolbarElRef.current.style.display = "flex"; } catch (_) {}
                    try { textToolbarElRef.current.setAttribute("data-mode", "edit"); } catch(_){}
                    textToolbarFeatureIdRef.current = feature && feature.properties ? feature.properties.id : null;
                    try {
                        const el = textToolbarElRef.current;
                        const text = el.querySelector('input[type="text"]');
                        const inputs = el.querySelectorAll('input');
                        let color = null, size = null;
                        inputs.forEach((i) => { if (i.type === 'color') color = i; if (i.type === 'number') size = i; });
                        if (color) color.value = (feature.properties && feature.properties.color) || '#ffffff';
                        if (size) size.value = String((feature.properties && feature.properties.fontSize) ? feature.properties.fontSize : 16);
                        if (text) text.value = (feature.properties && feature.properties.text) || '';
                    } catch(_){}
                    try { map.current.boxZoom.disable(); map.current.dragPan.disable(); map.current.dragRotate.disable(); map.current.keyboard.disable(); } catch(_){}
                };

				// Expose a minimal mode switch bridge for LeftPanel
				// --- Note tool manager: cursor-follow + click-to-place textbox ---
				const noteManager = (() => {
	let active = false;
	let cursorEl = null;
	let onMove = null;
	let onClick = null;
	const textMarkers = [];
	const NOTE_EXPAND_ZOOM = 12; // full box with content
	const stopEvt = (ev) => ev.stopPropagation();

	const styleBaseBox = (box,foldSize) => {
		box.style.background = "linear-gradient(135deg, #FFE571 0%, #FFCD2B 100%)";
		box.style.boxShadow = "0 8px 20px rgba(0,0,0,0.18)";
		box.style.color = "#111827";
		box.style.fontSize = "13px";
		box.style.lineHeight = "1.35";
		box.style.borderRadius = "0"; // no rounded corners
		box.style.padding = "0px";
		box.style.backdropFilter = "blur(3px)";
		box.style.position = "relative";
		box.style.cursor = "text";
		box.style.userSelect = "text";
		box.style.overflow = "visible";
	
		// cut out bottom-right corner
		const clip = `polygon(0 0, 100% 0, 100% calc(100% - ${foldSize}px), calc(100% - ${foldSize}px) 100%, 0 100%)`;
		box.style.clipPath = clip;
		box.style.webkitClipPath = clip;
	};
	
	const noteSvgInner = '<svg xmlns="http://www.w3.org/2000/svg" width="37" height="37" viewBox="0 0 512 512"><path fill="#ffd469" d="M450.812 462.658H74.759a8.8 8.8 0 0 1-8.802-8.802V77.802A8.8 8.8 0 0 1 74.759 69H290.76l168.854 168.854v216.001a8.8 8.8 0 0 1-8.802 8.803"/><path fill="#597b91" d="M242.863 168.403H126.007c-6.613 0-11.974-5.361-11.974-11.974s5.361-11.974 11.974-11.974h116.856c6.613 0 11.974 5.361 11.974 11.974s-5.361 11.974-11.974 11.974m11.974 66.401c0-6.613-5.361-11.974-11.974-11.974H126.007c-6.613 0-11.974 5.361-11.974 11.974s5.361 11.974 11.974 11.974h116.856c6.613-.001 11.974-5.361 11.974-11.974m0 78.374c0-6.612-5.361-11.974-11.974-11.974H126.007c-6.613 0-11.974 5.361-11.974 11.974s5.361 11.974 11.974 11.974h116.856c6.613-.001 11.974-5.362 11.974-11.974m101.165 78.374c0-6.612-5.361-11.974-11.974-11.974H126.007c-6.613 0-11.974 5.361-11.974 11.974s5.361 11.974 11.974 11.974h218.021c6.613-.001 11.974-5.362 11.974-11.974m40.334-78.374c0-6.612-5.361-11.974-11.974-11.974h-80.668c-6.612 0-11.974 5.361-11.974 11.974s5.361 11.974 11.974 11.974h80.668c6.613-.001 11.974-5.362 11.974-11.974"/><path fill="#ffb636" d="m290.76 69l168.854 168.854H326.651c-19.822 0-35.891-16.069-35.891-35.891z"/></svg>';
	
	const renderMini = (rootEl) => {
		rootEl.style.background = 'transparent';
		rootEl.style.border = 'none';
		rootEl.style.boxShadow = 'none';
		rootEl.style.padding = '0';
		rootEl.style.borderRadius = '0';
		rootEl.style.minWidth = '24px';
		rootEl.style.minHeight = '24px';
		rootEl.style.width = 'auto';
		rootEl.style.height = 'auto';
		rootEl.style.maxWidth = 'none';
		rootEl.style.maxHeight = 'none';

		const row = document.createElement('div');
		row.style.display = 'inline-flex';
		row.style.alignItems = 'center';
		row.style.gap = '4px';
		row.style.width = 'fit-content';
		row.style.height = 'fit-content';

		// Create the image element
		const img = document.createElement('img');
		img.src = noteIcon; // path to your image
		img.alt = 'Note Icon';
		img.style.width = '24px';  // adjust as needed
		img.style.height = '24px'; // adjust as needed

		row.appendChild(img);
		rootEl.appendChild(row);
	};

	const renderLabel = (rootEl, idText) => {
		// small pill with icon + id
		rootEl.style.background = 'rgba(255,208,52,0.95)';
		rootEl.style.border = '1px solid rgba(0,0,0,0.15)';
		rootEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
		rootEl.style.padding = '4px 6px';
		rootEl.style.borderRadius = '6px';
		rootEl.style.minWidth = '0';
		rootEl.style.minHeight = '0';
		const row = document.createElement('div');
		row.style.display = 'inline-flex';
		row.style.alignItems = 'center';
		row.style.gap = '6px';
		row.innerHTML = noteSvgInner;
		const idSpan = document.createElement('span');
		idSpan.textContent = idText || 'Note';
		idSpan.style.fontSize = '12px';
		idSpan.style.color = '#111827';
		idSpan.style.fontWeight = '600';
		row.appendChild(idSpan);
		rootEl.appendChild(row);
	};

	const addFoldedCorner = (box,size) => {
		let fold = box.querySelector('.mx-note-fold');
		if (!fold) {
			fold = document.createElement('div');
			fold.className = 'mx-note-fold';
			fold.style.position = 'absolute';
			fold.style.right = '0';
			fold.style.bottom = '0';
			fold.style.width = '0';
			fold.style.height = '0';
	
			// triangle to simulate folded paper
			fold.style.borderLeft = `${size}px solid transparent`;
			fold.style.borderTop = `${size}px solid #FFD034`; // back side of the fold
			fold.style.boxShadow = '-2px -2px 6px rgba(0,0,0,0.18)';
			fold.style.zIndex = '5';
			fold.style.pointerEvents = 'none';
	
			box.appendChild(fold);
		}
	};

	const NOTE_ICON_ZOOM = 5;    
	const renderNote = (state, expanded) => {
		const { rootEl } = state;
		rootEl.innerHTML = '';
		// reset ALL inline styles to avoid layout drift
		rootEl.style.background = 'transparent';
		rootEl.style.border = 'none';
		rootEl.style.boxShadow = 'none';
		rootEl.style.padding = '0';
		rootEl.style.borderRadius = '0';
		rootEl.style.minWidth = '0';
		rootEl.style.minHeight = '0';
		rootEl.style.maxWidth = 'none';
		rootEl.style.maxHeight = 'none';
		rootEl.style.width = 'auto';
		rootEl.style.height = 'auto';
		rootEl.style.clipPath = 'none';
		rootEl.style.webkitClipPath = 'none';
		rootEl.style.display = 'inline-block';
		rootEl.style.whiteSpace = 'nowrap';
		rootEl.style.pointerEvents = 'auto';
		rootEl.style.boxSizing = 'border-box'; // Important - same as imageManager
		rootEl.style.margin = '0';             // Important - same as imageManager
		// Do NOT set position or transform on rootEl
		
		rootEl.addEventListener('mousedown', (ev) => { ev.stopPropagation(); ev.preventDefault(); });
		rootEl.addEventListener('dblclick', stopEvt);
		rootEl.addEventListener('click', stopEvt);
		rootEl.addEventListener('wheel', stopEvt, { passive: true });

		const z = map.current.getZoom();
		
		if (z < NOTE_ICON_ZOOM) {
			// icon only (zoomed out)
			renderMini(rootEl);
			state.expanded = false;
			state.titleEl = null;
			state.bodyEl = null;
			return;
		}

		if (z >= NOTE_ICON_ZOOM && z < NOTE_EXPAND_ZOOM) {
			// medium rectangle (higher zoom)
			styleBaseBox(rootEl,10);
			addFoldedCorner(rootEl,10);
			rootEl.style.minWidth = '222px';
			rootEl.style.maxWidth = '222px';
			rootEl.style.minHeight = '37px';
			rootEl.style.maxHeight = '37px';
			
			// Add centering styles
			rootEl.style.display = 'flex';
			rootEl.style.flexDirection = "column";
			rootEl.style.alignItems = 'center';
			
			const newD = document.createElement('div');
			newD.style.height = "5px";
			newD.style.width = "100%";
			newD.style.background = "#D9D9D9";
			newD.style.opacity = "54%";
			newD.style.marginBottom = "5px";

			const header = document.createElement('div');
			header.style.display = 'flex';
			header.style.alignItems = 'center';
			header.style.gap = '4px';
			header.style.marginBottom = '0';
			
			const titleSpan = document.createElement('span');
			titleSpan.textContent = (state.title && state.title.trim().length>0) ? state.title : 'Note';
			titleSpan.style.marginLeft = '4px';
			titleSpan.style.fontSize = '12px';
			titleSpan.style.fontWeight = '600';
			titleSpan.style.whiteSpace = 'nowrap';
			titleSpan.style.overflow = 'hidden';
			titleSpan.style.textOverflow = 'ellipsis';
			
			header.appendChild(titleSpan);
			rootEl.appendChild(newD);
			rootEl.appendChild(header);
			
			state.expanded = false;
			state.titleEl = null;
			state.bodyEl = null;
			return;
		}

		// full mode (very zoomed in)
		styleBaseBox(rootEl,20);
		addFoldedCorner(rootEl,20);
		rootEl.style.minWidth = '222px';
		rootEl.style.maxWidth = '222px';
		rootEl.style.minHeight = '222px';
		rootEl.style.maxHeight = '222px';
		
		const header = document.createElement('div');
		header.style.display = 'flex';
		header.style.alignItems = 'center';
		header.style.gap = '6px';
		
		const title = document.createElement('div');
		title.style.width = '100%';
		title.style.fontWeight = '700';
		title.style.fontSize = '14px';
		title.style.marginBottom = '6px';
		title.style.outline = 'none';
		title.style.whiteSpace = 'nowrap';
		title.style.overflow = 'hidden';
		title.style.textOverflow = 'ellipsis';
		title.style.background = "rgba(217, 217, 217, 0.60)"
		title.style.padding = "5px 10px"
		title.textContent = (state.title && state.title.trim().length>0) ? state.title : 'Title';

		const body = document.createElement('div');
		body.style.outline = 'none';
		body.style.minHeight = '80px';
		body.style.whiteSpace = 'pre-wrap';
		body.style.wordBreak = 'break-word';
		body.style.padding = '5px';
		body.innerHTML = (state.body && state.body.trim().length>0) ? state.body : '';

		header.appendChild(title);
		rootEl.appendChild(header);
		rootEl.appendChild(body);
		state.expanded = true;
		state.titleEl = title;
		state.bodyEl = body;
	};

	const ensureCursorEl = () => {
		if (cursorEl) return cursorEl;
		const el = document.createElement("div");
		el.style.position = "absolute";
		el.style.pointerEvents = "none";
		el.style.zIndex = "24";
		el.style.transform = "translate(-50%, -50%)";
		el.style.fontSize = "18px";
		el.style.lineHeight = "1";
		el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512"><path fill="#ffd469" d="M450.812 462.658H74.759a8.8 8.8 0 0 1-8.802-8.802V77.802A8.8 8.8 0 0 1 74.759 69H290.76l168.854 168.854v216.001a8.8 8.8 0 0 1-8.802 8.803"/><path fill="#597b91" d="M242.863 168.403H126.007c-6.613 0-11.974-5.361-11.974-11.974s5.361-11.974 11.974-11.974h116.856c6.613 0 11.974 5.361 11.974 11.974s-5.361 11.974-11.974 11.974m11.974 66.401c0-6.613-5.361-11.974-11.974-11.974H126.007c-6.613 0-11.974 5.361-11.974 11.974s5.361 11.974 11.974 11.974h116.856c6.613-.001 11.974-5.361 11.974-11.974m0 78.374c0-6.612-5.361-11.974-11.974-11.974H126.007c-6.613 0-11.974 5.361-11.974 11.974s5.361 11.974 11.974 11.974h116.856c6.613-.001 11.974-5.362 11.974-11.974m101.165 78.374c0-6.612-5.361-11.974-11.974-11.974H126.007c-6.613 0-11.974 5.361-11.974 11.974s5.361 11.974 11.974 11.974h218.021c6.613-.001 11.974-5.362 11.974-11.974m40.334-78.374c0-6.612-5.361-11.974-11.974-11.974h-80.668c-6.612 0-11.974 5.361-11.974 11.974s5.361 11.974 11.974 11.974h80.668c6.613-.001 11.974-5.362 11.974-11.974"/><path fill="#ffb636" d="m290.76 69l168.854 168.854H326.651c-19.822 0-35.891-16.069-35.891-35.891z"/></svg>';
		map.current.getContainer().appendChild(el);
		cursorEl = el;
		return el;
	};

const createTextboxMarker = (lngLat, initialTitle = '', initialBody = '', noteId = null, backgroundColor = "") => {
    // Create an invisible anchor container that NEVER changes size
    const anchorContainer = document.createElement("div");
    anchorContainer.style.position = 'relative';
    anchorContainer.style.width = '1px';
    anchorContainer.style.height = '1px';
    anchorContainer.style.background = 'transparent';
    anchorContainer.style.pointerEvents = 'none';
    
    // The actual note element positioned relative to anchor
    const root = document.createElement("div");
    root.className = 'mx-note-root';
    root.spellcheck = true;
    root.style.position = 'absolute';
    root.style.pointerEvents = 'auto';
    
    // Position based on actual rendered sizes
    const positionContent = () => {
        // Small delay to ensure DOM has updated
        setTimeout(() => {
            const rect = root.getBoundingClientRect();
            const width = rect.width || root.offsetWidth || 24;
            const height = rect.height || root.offsetHeight || 24;
            
            // Center horizontally based on actual width
            root.style.left = `${-width / 2}px`;
            root.style.bottom = '0px';
        }, 0);
    };
    
    anchorContainer.appendChild(root);
    
    const state = { 
        rootEl: root, 
        anchorEl: anchorContainer,
        title: initialTitle, 
        body: initialBody, 
        expanded: false, 
        titleEl: null, 
        bodyEl: null, 
        noteId,
        backgroundColor,
        positionContent // Store the positioning function
    };
    
    // Pre-render so MapLibre computes the correct anchor offsets
    const expanded = (map.current.getZoom() >= NOTE_EXPAND_ZOOM);
    renderNote(state, expanded);
    positionContent(); // Position after first render
    
    // Create marker with the anchor container
    const marker = new maplibregl.Marker({
        element: anchorContainer, // Use the 1x1 pixel anchor
        draggable: true,
        anchor: 'center', // Center of the 1px container
        offset: [0, 0]
    })
    .setLngLat(lngLat)
    .addTo(map.current);

    state.marker = marker;
    
    // Ensure final position after first paint with double RAF for safety
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            try { 
                marker.setLngLat(lngLat);
                positionContent(); // Reposition content after DOM fully settles
            } catch (_) {}
        });
    });

    // Add click handler to open notes
    root.addEventListener('click', (e) => {
        e.stopPropagation();
        dispatch(openNotes({
            id: noteId,
            title: initialTitle,
            content: initialBody,
            coordinates: lngLat,
            backgroundColor
        }));
    });
    
    // Add drag event handlers
    marker.on('dragstart', () => {
        root.style.opacity = '0.7';
    });
    
    marker.on('drag', () => {
        // Position updates automatically
    });
    
    marker.on('dragend', () => {
        root.style.opacity = '1';
        const newPos = marker.getLngLat();
        state.coordinates = {
            lng: newPos.lng,
            lat: newPos.lat
        };
    });

    const entry = { marker, state };
    textMarkers.push(entry);
    return entry;
};

	const clearAllNotes = () => {
		while (textMarkers.length) {
			const entry = textMarkers.pop();
			try { entry.marker.remove(); } catch (_) {}
		}
	};

const syncNotesWithZoom = () => {
    textMarkers.forEach((entry) => {
        const { state } = entry;
        
        // Store previous dimensions to detect size changes
        const prevWidth = state.rootEl.offsetWidth;
        const prevHeight = state.rootEl.offsetHeight;
        
        // Render new state based on current zoom
        renderNote(state, false);
        
        // Check if size changed (especially from mini to wide)
        const newWidth = state.rootEl.offsetWidth;
        const newHeight = state.rootEl.offsetHeight;
        
        // Reposition the content within its anchor container if size changed
        if (state.positionContent && (prevWidth !== newWidth || prevHeight !== newHeight)) {
            // Force layout recalculation
            state.rootEl.getBoundingClientRect();
            
            // Update position relative to anchor
            state.positionContent();
        }
        
        // Ensure marker stays at correct position
        requestAnimationFrame(() => {
            const pos = entry.marker.getLngLat();
            entry.marker.setLngLat(pos);
        });
    });
};

	const activate = () => {
		if (active) return;
		active = true;
		const el = ensureCursorEl();
		el.style.display = "block";
		onMove = (e) => {
			if (!cursorEl) return;
			cursorEl.style.left = `${e.point.x}px`;
			cursorEl.style.top = `${e.point.y}px`;
		};
		onClick = (e) => {
			const entry = createTextboxMarker(e.lngLat, '', '','');
			// Open notes component for the new note
			dispatch(openNotes({
				id: `new`,
				title: '',
				content: 'Enter the content here!!',
				coordinates: {
					lng: e.lngLat.lng,
					lat: e.lngLat.lat
				}
			}));
			// After placing a single note, switch back to select mode
			deactivate();
			try { window.mapxDrawSetMode && window.mapxDrawSetMode('select'); } catch (_) {}
		};
		map.current.getCanvas().style.cursor = "none";
		map.current.on("mousemove", onMove);
		map.current.on("click", onClick);
	};

	const deactivate = () => {
		if (!active) return;
		active = false;
		map.current.getCanvas().style.cursor = "";
		try { map.current.off("mousemove", onMove); } catch (_) {}
		try { map.current.off("click", onClick); } catch (_) {}
		onMove = null; onClick = null;
		if (cursorEl) { cursorEl.style.display = "none"; }
	};

	try { map.current.on('zoom', syncNotesWithZoom); } catch (_) {}
	
	const loadFromUrl = async (url) => {
		try {
			const r = await fetch(url, { headers: { Accept: 'application/json' } });
			if (!r.ok) return false;
			const items = await r.json();
			if (!Array.isArray(items)) return false;
			items.forEach((it) => {
				if (!it) return;
				const lng = Number(it.lng);
				const lat = Number(it.lat);
				if (Number.isFinite(lng) && Number.isFinite(lat)) {
					createTextboxMarker({ lng, lat }, String(it.noteTitle || ''), String(it.body || ''),String(it.backgroundColor||''));
				}
			});
			return true;
		} catch (_) {
			return false;
		}
	};
	
	// Expose loader globally and also a typed loader using project/year/era
	try { window.mapxNotesLoadFromUrl = loadFromUrl; } catch (_) {}
	let lastLoaded = { projectId: null, year: null, era: null };
	let loading = false;
	const loadByContext = async (opts) => {
		try {
			const projectId = projectIdParam || null;
			// Always read the freshest year at call time (avoid stale closure)
			const latestYearFromStore = (reduxStore && reduxStore.getState && reduxStore.getState().map?.year);
			const yearValRaw = (opts && typeof opts.year !== 'undefined') ? opts.year : (latestYearFromStore ?? year);
			const yearVal = Number(yearValRaw);
			// era from timeline if present on year shape, else default 'CE'
			const eraVal = (opts && opts.era) || 'CE';
			if (projectId && (yearVal !== undefined)) {
				// Prevent unnecessary API calls (but allow re-fetch if markers are cleared)
				if (loading) return;
				loading = true;
				try {
					// Clear existing markers before re-rendering
					clearAllNotes();
					const response = await fetchAllNotes(projectId, yearVal, eraVal);
					const notes = response?.note || response || [];
					if (Array.isArray(notes)) {
						//try { console.log('Loaded notes:', notes.length, notes); } catch (_) {}
						notes.forEach((n) => {
							if (!n) return;
							const lng = Number(n.longitude);
							const lat = Number(n.latitude);
							if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
							const title = n.noteTitle;
							const body = n.noteContent;
							createTextboxMarker({ lng, lat }, title, body, n.noteId, n.backgroundColor);
						});
						lastLoaded = { projectId, year: yearVal, era: eraVal };
					}
				} finally {
					loading = false;
				}
			}
		} catch (_) { /* ignore */ }
	};
	try { window.mapxNotesLoadByContext = loadByContext; } catch (_) {}
	// Initial load
	loadByContext({ year });
	return { activate, deactivate };
})();
				// imageManager.loadImagesByContext({ year,projectIdParam,era:"CE" });
				window.mapxDrawSetMode = (mode) => {
					// pencil mode
					if (mode === "pencil") {
						// Clean up eraser if active
						try { window.mapxEraserCleanup && window.mapxEraserCleanup(); } catch(_){}
						// Clean up hand mode if active
						try { window.mapxHandCleanup && window.mapxHandCleanup(); } catch(_){}
						// Disable text mode
						textModeActiveRef.current = false;
						try { if (textClickHandlerRef.current) map.current.off("click", textClickHandlerRef.current); } catch (_) {}
						try { hideTextToolbar(); } catch(_){}
						freehand.setActive(true);
						line.setActive(false);
						polygon.setActive(false);
						circle.setActive(false);
						arrow.setActive(false);
						highlight.setActive(false);
						// disable selection handler when drawing
						try { map.current.off("click", onSelectClick); } catch (_) {}
						try { window.mapxOnModeChanged && window.mapxOnModeChanged('pencil'); } catch (_) {}
						return;
					}
					if (mode === "highlight") {
						// Clean up eraser if active
						try { window.mapxEraserCleanup && window.mapxEraserCleanup(); } catch(_){}
						// Disable text mode
						textModeActiveRef.current = false;
						try { if (textClickHandlerRef.current) map.current.off("click", textClickHandlerRef.current); } catch (_) {}
						try { hideTextToolbar(); } catch(_){}
						freehand.setActive(false);
						line.setActive(false);
						polygon.setActive(false);
						circle.setActive(false);
						arrow.setActive(false);
						highlight.setActive(true);
						try { map.current.off("click", onSelectClick); } catch (_) {}
						try { window.mapxOnModeChanged && window.mapxOnModeChanged('highlight'); } catch (_) {}
						return;
					}
					if (mode === "line") {
						// Clean up eraser if active
						try { window.mapxEraserCleanup && window.mapxEraserCleanup(); } catch(_){}
						freehand.setActive(false);
						polygon.setActive(false);
						circle.setActive(false);
						arrow.setActive(false);
						highlight.setActive(false);
						line.setActive(true);
						try { map.current.off("click", onSelectClick); } catch (_) {}
						try { window.mapxOnModeChanged && window.mapxOnModeChanged('line'); } catch (_) {}
						return;
					}
					if (mode === "polygon") {
						// Clean up eraser if active
						try { window.mapxEraserCleanup && window.mapxEraserCleanup(); } catch(_){}
						freehand.setActive(false);
						line.setActive(false);
						circle.setActive(false);
						arrow.setActive(false);
						highlight.setActive(false);
						polygon.setActive(true);
						try { map.current.off("click", onSelectClick); } catch (_) {}
						try { window.mapxOnModeChanged && window.mapxOnModeChanged('polygon'); } catch (_) {}
						return;
					}
					if (mode === "circle") {
						// Clean up eraser if active
						try { window.mapxEraserCleanup && window.mapxEraserCleanup(); } catch(_){}
						freehand.setActive(false);
						line.setActive(false);
						polygon.setActive(false);
						arrow.setActive(false);
						highlight.setActive(false);
						circle.setActive(true);
						try { map.current.off("click", onSelectClick); } catch (_) {}
						try { window.mapxOnModeChanged && window.mapxOnModeChanged('circle'); } catch (_) {}
						return;
					}
					if (mode === "arrow") {
						// Clean up eraser if active
						try { window.mapxEraserCleanup && window.mapxEraserCleanup(); } catch(_){}
						freehand.setActive(false);
						line.setActive(false);
						polygon.setActive(false);
						circle.setActive(false);
						highlight.setActive(false);
						arrow.setActive(true);
						try { map.current.off("click", onSelectClick); } catch (_) {}
						return;
					}
					if (mode === "note") {
						freehand.setActive(false);
						line.setActive(false);
						polygon.setActive(false);
						circle.setActive(false);
						arrow.setActive(false);
						highlight.setActive(false);
						manager.deactivate();
						hyperlinker.deactivate();
						try { map.current.off("click", onSelectClick); } catch (_) {}
						noteManager.activate();
						try { window.mapxOnModeChanged && window.mapxOnModeChanged('note'); } catch (_) {}
						return;
					}
					if (mode === "image") {
						freehand.setActive(false);
						line.setActive(false);
						polygon.setActive(false);
						circle.setActive(false);
						arrow.setActive(false);
						highlight.setActive(false);
						noteManager.deactivate();
						hyperlinker.deactivate();
						try { map.current.off("click", onSelectClick); } catch (_) {}
						manager.activate();
						try { window.mapxOnModeChanged && window.mapxOnModeChanged('image'); } catch (_) {}
						return;
					}
					if (mode === "hyperlink") {
						freehand.setActive(false);
						line.setActive(false);
						polygon.setActive(false);
						circle.setActive(false);
						arrow.setActive(false);
						highlight.setActive(false);
						noteManager.deactivate();
						manager.deactivate();
						try { map.current.off("click", onSelectClick); } catch (_) {}
						hyperlinker.activate();
						try { window.mapxOnModeChanged && window.mapxOnModeChanged('hyperlink'); } catch (_) {}
						return;
					}
					if (mode === "text") {
						// Clean up eraser if active
						try { window.mapxEraserCleanup && window.mapxEraserCleanup(); } catch(_){}
						// Clean up hand mode if active
						try { window.mapxHandCleanup && window.mapxHandCleanup(); } catch(_){}
						freehand.setActive(false);
						line.setActive(false);
						polygon.setActive(false);
						circle.setActive(false);
						arrow.setActive(false);
						highlight.setActive(false);
						try { map.current.off("click", onSelectClick); } catch (_) {}
						// Activate text mode: click opens modal to enter text
						textModeActiveRef.current = true;
						if (!textClickHandlerRef.current) {
							textClickHandlerRef.current = (e) => {
								if (!textModeActiveRef.current) return;
								clickedCoordsRef.current = [e.lngLat.lng, e.lngLat.lat];
								showTextToolbar({ lng: e.lngLat.lng, lat: e.lngLat.lat });
							};
						}
						try { map.current.on("click", textClickHandlerRef.current); } catch (_) {}
						map.current.getCanvas().style.cursor = "crosshair";
						return;
					}
					if (mode === "hand") {
						// Clean up eraser if active
						try { window.mapxEraserCleanup && window.mapxEraserCleanup(); } catch(_){}
						// Disable text mode
						textModeActiveRef.current = false;
						try { if (textClickHandlerRef.current) map.current.off("click", textClickHandlerRef.current); } catch (_) {}
						try { hideTextToolbar(); } catch(_){}
						freehand.setActive(false);
						line.setActive(false);
						polygon.setActive(false);
						circle.setActive(false);
						arrow.setActive(false);
						highlight.setActive(false);
						try { map.current.off("click", onSelectClick); } catch (_) {}
						// Enable pan/globe control - this is the default behavior
						try { 
							map.current.dragPan.enable(); 
							map.current.dragRotate.enable();
							map.current.boxZoom.enable();
							map.current.keyboard.enable();
						} catch(_){}
						map.current.getCanvas().style.cursor = "grab";
						
						// Add visual feedback for dragging
						const onMouseDown = () => {
							map.current.getCanvas().style.cursor = "grabbing";
						};
						const onMouseUp = () => {
							map.current.getCanvas().style.cursor = "grab";
						};
						
						map.current.on("mousedown", onMouseDown);
						map.current.on("mouseup", onMouseUp);
						map.current.on("mouseleave", onMouseUp);
						
						// Store cleanup function
						window.mapxHandCleanup = () => {
							try {
								map.current.off("mousedown", onMouseDown);
								map.current.off("mouseup", onMouseUp);
								map.current.off("mouseleave", onMouseUp);
								map.current.getCanvas().style.cursor = "";
							} catch (_) {}
						};
						return;
					}
					if (mode === "eraser") {
						freehand.setActive(false);
						line.setActive(false);
						polygon.setActive(false);
						circle.setActive(false);
						arrow.setActive(false);
						highlight.setActive(false);
						try { map.current.off("click", onSelectClick); } catch (_) {}
						
						// Disable map controls for eraser mode
						try { 
							map.current.boxZoom.disable(); 
							map.current.dragPan.disable(); 
							map.current.dragRotate.disable(); 
							map.current.keyboard.disable(); 
						} catch(_){}
						
						// Activate eraser mode: hover to erase
						map.current.getCanvas().style.cursor = "crosshair";
						
						// Eraser functionality - hover to delete
						let erasedIds = new Set(); // Track what we've already erased
						
						const eraseOnHover = (e) => {
							try {
								// Find pencil/highlighter strokes at mouse position
								const features = map.current.queryRenderedFeatures(e.point, { 
									layers: ["draw-final-line"] 
								});
								
                    // Filter for all drawing tools (pencil, highlighter, line, arrow, polygon, circle)
                    const strokesToErase = features.filter(f => 
                        f.properties && 
                        (f.properties.tool === 'freehand' || 
                         f.properties.tool === 'highlight' || 
                         f.properties.tool === 'line' || 
                         f.properties.tool === 'arrow' || 
                         f.properties.tool === 'polygon' || 
                         f.properties.tool === 'circle') &&
                        !erasedIds.has(f.properties.id) // Don't erase the same stroke multiple times
                    );
								
								if (strokesToErase.length > 0) {
									
									// Track erased IDs
									strokesToErase.forEach(f => erasedIds.add(f.properties.id));
									
									// Remove the strokes from the data
									const strokeIds = strokesToErase.map(f => f.properties.id);
									finalFeaturesRef.current = finalFeaturesRef.current.filter(f => 
										!strokeIds.includes(f.properties?.id)
									);
									
									// Update the map source
									const src = map.current.getSource("draw-final-src");
									if (src) {
										src.setData({ 
											type: "FeatureCollection", 
											features: finalFeaturesRef.current 
										});
									}
									
									// Save changes
									try { 
										window.mapxDrawSaveAllToLocal && window.mapxDrawSaveAllToLocal(); 
									} catch(_){}
								}
							} catch (error) {
								console.error("Erase error:", error);
							}
						};
						
						// Add hover listener for erasing
						map.current.on("mousemove", eraseOnHover);
						
						// Store cleanup function
						window.mapxEraserCleanup = () => {
							try {
								map.current.off("mousemove", eraseOnHover);
								// Clear the erasedIds Set to prevent memory leak
								erasedIds.clear();
								// Re-enable map controls
								map.current.boxZoom.enable(); 
								map.current.dragPan.enable(); 
								map.current.dragRotate.enable(); 
								map.current.keyboard.enable(); 
								// Reset cursor to default
								map.current.getCanvas().style.cursor = "";
							} catch (_) {}
						};
						
            // Eraser mode activated - hover over any drawing to erase
						return;
					}
					// selection mode
					if (mode === "select") {
						// Clean up eraser if active
						try { window.mapxEraserCleanup && window.mapxEraserCleanup(); } catch(_){}
						// Clean up hand mode if active
						try { window.mapxHandCleanup && window.mapxHandCleanup(); } catch(_){}
						// Disable text mode
						textModeActiveRef.current = false;
						try { if (textClickHandlerRef.current) map.current.off("click", textClickHandlerRef.current); } catch (_) {}
						try { hideTextToolbar(); } catch(_){}
						noteManager.deactivate();
						freehand.setActive(false);
						line.setActive(false);
						polygon.setActive(false);
						circle.setActive(false);
						arrow.setActive(false);
						highlight.setActive(false);
						// In select mode: when clicking a text feature, show ONLY the text toolbar (not selection overlay)
						try { map.current.on("click", onSelectClick); } catch (_) {}
						try { window.mapxOnModeChanged && window.mapxOnModeChanged('select'); } catch (_) {}
						return;
					}
					// any other mode disables drawing and selection binding
					noteManager.deactivate();
					freehand.setActive(false);
					line.setActive(false);
					polygon.setActive(false);
					circle.setActive(false);
					arrow.setActive(false);
					highlight.setActive(false);
					textModeActiveRef.current = false;
					try { if (textClickHandlerRef.current) map.current.off("click", textClickHandlerRef.current); } catch (_) {}
					try { map.current.off("click", onSelectClick); } catch (_) {}
					try { hideTextToolbar(); } catch(_){}
					try { window.mapxOnModeChanged && window.mapxOnModeChanged(null); } catch (_) {}
				};

				// Build selection overlay (Save / Delete / Cancel)
				const buildSelectionOverlay = () => {
					try {
						const host = map.current.getContainer();
						if (selectionOverlayElRef.current) return;
						const el = document.createElement("div");
						el.style.position = "absolute";
						el.style.transform = "translate(-50%, -100%)";
						el.style.display = "none";
						el.style.zIndex = "25";
						el.style.pointerEvents = "auto";
						el.style.whiteSpace = "nowrap";
						el.className = "rounded-lg bg-white/2 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.45),0_3px_8px_rgba(0,0,0,0.15)] p-2 flex items-center gap-2";

						const mkBtn = (title, imgSrc, onClick) => {
							const b = document.createElement("button");
							b.type = "button";
							b.title = title;
							b.className = "rounded-lg p-2 bg-white/2 backdrop-blur-sm shadow-[inset_0_1px_0px_rgba(255,255,255,0.6),0_0_6px_rgba(0,0,0,0.15)] hover:bg-white/30 transition-all duration-300 inline-flex items-center justify-center";
							const img = document.createElement("img");
							img.src = imgSrc;
							img.alt = title;
							img.style.width = "20px";
							img.style.height = "20px";
							img.style.objectFit = "contain";
							b.appendChild(img);
							b.style.cursor = "pointer";
							b.addEventListener("click", (ev) => { ev.stopPropagation(); onClick && onClick(); });
							return b;
						};

						const onSave = () => {
							try {
								// If selected feature is text, persist any palette changes before saving
								const id = selectedFeatureIdRef.current;
								if (id) {
									const idx = finalFeaturesRef.current.findIndex((f) => f.properties && f.properties.id === id);
									if (idx >= 0) {
										const f = { ...finalFeaturesRef.current[idx] };
										if (f.properties && f.properties.tool === 'text') {
											const size = el.querySelector('input[data-role="text-size"]');
											const color = el.querySelector('input[data-role="text-color"]');
											if (size) f.properties.fontSize = Math.max(8, Math.min(72, Number(size.value)||16));
											if (color) f.properties.color = color.value || '#000000';
											finalFeaturesRef.current[idx] = f;
											const src = map.current.getSource(finalSourceId);
											src && src.setData({ type: 'FeatureCollection', features: finalFeaturesRef.current });
										}
									}
								}
								window.mapxDrawExportAll && window.mapxDrawExportAll();
								window.mapxDrawSaveAllToLocal && window.mapxDrawSaveAllToLocal();
							} catch (_) {}
						};
						const onDelete = () => { try { window.mapxDrawDeleteSelected && window.mapxDrawDeleteSelected(); hideSelectionOverlay(); } catch (_) {} };
						const onCancel = () => { hideSelectionOverlay(); try { selectedFeatureIdRef.current = null; map.current.setFilter("draw-final-line-selected", ["==", ["get", "id"], "__none__"]); } catch (_) {} };

						// Order: Delete (left), Save (center), Cancel (right)
						el.appendChild(mkBtn("Delete", deleteIcon, onDelete));
						el.appendChild(mkBtn("Save", saveIcon, onSave));
						el.appendChild(mkBtn("Cancel", cancelIcon, onCancel));
						host.appendChild(el);
						selectionOverlayElRef.current = el;
					} catch (_) {}
				};

				const positionSelectionOverlay = (lngLat) => {
					try {
						const el = selectionOverlayElRef.current;
						if (!el || !lngLat) return;
						const p = map.current.project(lngLat);
						el.style.left = `${p.x}px`;
						el.style.top = `${p.y - 10}px`;
					} catch (_) {}
				};

				const showSelectionOverlay = (lngLat) => {
					buildSelectionOverlay();
					selectionOverlayLngLatRef.current = lngLat;
					positionSelectionOverlay(lngLat);
					try { selectionOverlayElRef.current.style.display = "flex"; } catch (_) {}
				};

				const hideSelectionOverlay = () => {
					try { if (selectionOverlayElRef.current) selectionOverlayElRef.current.style.display = "none"; } catch (_) {}
					selectionOverlayLngLatRef.current = null;
				};

				// Keep overlay anchored while moving
				map.current.on("move", () => {
					const ll = selectionOverlayLngLatRef.current;
					if (ll) positionSelectionOverlay(ll);
					const tll = textToolbarLngLatRef.current;
					if (tll) positionTextToolbar(tll);
				});

				// Selection logic: click on final line to select
				const onSelectClick = (e) => {
					if (!e) return;
					try {
						const features = map.current.queryRenderedFeatures(e.point, { layers: ["draw-final-line", "draw-final-fill", "draw-final-text"] });
						if (features && features.length > 0) {
							const f = features[0];
							const id = (f.properties && f.properties.id) || null;
							selectedFeatureIdRef.current = id;
                            // If selected is text, open text toolbar instead of selection overlay
								const isText = (f.properties && f.properties.tool === 'text');
								if (isText) {
                                let anchor = null;
                                try {
                                    const coords = (f.geometry && f.geometry.coordinates) || [];
                                    if (f.geometry && f.geometry.type === "Point" && coords && coords.length === 2) anchor = coords;
							} catch (_) {}
                                if (anchor) {
                                    showTextToolbarEdit(f, { lng: anchor[0], lat: anchor[1] });
                                }
                                // Do NOT show selection overlay for text
                                map.current.setFilter("draw-final-line-selected", ["==", ["get", "id"], "__none__"]);
                                map.current.setFilter("draw-final-fill-selected", ["==", ["get", "id"], "__none__"]);
                                hideSelectionOverlay();
                                return;
                            }
                            
                            // For non-text features, hide text toolbar and show selection overlay
                            try { hideTextToolbar(); } catch(_){}
                            map.current.setFilter("draw-final-line-selected", ["==", ["get", "id"], id || "__none__"]);
                            map.current.setFilter("draw-final-fill-selected", ["==", ["get", "id"], id || "__none__"]);
							// position overlay near feature midpoint
							let anchor = null;
							try {
								const coords = (f.geometry && f.geometry.coordinates) || [];
								if (f.geometry && f.geometry.type === "LineString" && coords && coords.length > 1) anchor = coords[Math.floor(coords.length / 2)];
								if (f.geometry && f.geometry.type === "Polygon" && coords && coords[0] && coords[0].length > 2) anchor = coords[0][Math.floor(coords[0].length / 2)];
							} catch (_) {}
							if (!anchor && f.geometry && f.geometry.type === "LineString") anchor = f.geometry.coordinates[0];
							if (anchor) showSelectionOverlay({ lng: anchor[0], lat: anchor[1] });
							// callback for UI
							if (window.mapxDrawOnFeatureSelect && id) {
								const full = finalFeaturesRef.current.find((ff) => ff.properties && ff.properties.id === id);
								try { window.mapxDrawOnFeatureSelect(full || f); } catch (_) {}
							}
						} else {
							selectedFeatureIdRef.current = null;
							map.current.setFilter("draw-final-line-selected", ["==", ["get", "id"], "__none__"]);
							map.current.setFilter("draw-final-fill-selected", ["==", ["get", "id"], "__none__"]);
							hideSelectionOverlay();
                            try { if (textToolbarElRef.current) textToolbarElRef.current.style.display = 'none'; } catch(_){}
						}
					} catch (_) {}
				};

				// Export/delete/save APIs
				window.mapxDrawGetAll = () => ({ type: "FeatureCollection", features: finalFeaturesRef.current.slice() });
				window.mapxDrawExportAll = () => {
					try {
						const data = JSON.stringify(window.mapxDrawGetAll());
						const blob = new Blob([data], { type: "application/geo+json" });
						const url = URL.createObjectURL(blob);
						const a = document.createElement("a");
						a.href = url;
						a.download = `mapx-draw-${new Date().toISOString().replace(/[:.]/g, "-")}.geojson`;
						document.body.appendChild(a);
						a.click();
						document.body.removeChild(a);
						URL.revokeObjectURL(url);
					} catch (_) {}
				};
				window.mapxDrawDeleteSelected = () => {
					const id = selectedFeatureIdRef.current;
					if (!id) return false;
					finalFeaturesRef.current = finalFeaturesRef.current.filter((f) => (f.properties && f.properties.id) !== id);
					selectedFeatureIdRef.current = null;
					try {
						map.current.setFilter("draw-final-line-selected", ["==", ["get", "id"], "__none__"]);
						const src = map.current.getSource(finalSourceId);
						src && src.setData({ type: "FeatureCollection", features: finalFeaturesRef.current });
						// Persist deletion so it does not reappear on refresh
						if (window.mapxDrawSaveAllToLocal) window.mapxDrawSaveAllToLocal();
					} catch (_) {}
					return true;
				};
				window.mapxDrawSaveAllToLocal = () => {
					try { localStorage.setItem("mapx.draw.features", JSON.stringify(window.mapxDrawGetAll())); } catch (_) {}
				};
				window.mapxDrawLoadAllFromLocal = () => {
					try {
						const raw = localStorage.getItem("mapx.draw.features");
						if (!raw) return false;
						const fc = JSON.parse(raw);
						if (!fc || !Array.isArray(fc.features)) return false;
						finalFeaturesRef.current = fc.features;
						const src = map.current.getSource(finalSourceId);
						src && src.setData({ type: "FeatureCollection", features: finalFeaturesRef.current });
						return true;
					} catch (_) { return false; }
				};

				// Auto-load from local storage if present
				try { window.mapxDrawLoadAllFromLocal(); } catch (_) {}
				// Clean up on unmount/style reload
				map.current.on("remove", () => {
					try { controller.setActive(false); } catch (_) {}
					try { worker.terminate(); } catch (_) {}
				});
			} catch (_) {}

			//Initializing image container
			
			manager.loadImagesByContext({ year,projectIdParam,era:"CE" }); 
			try { 
				window.mapxImagesLoadByContext = manager.loadImagesByContext; 
			} catch (_) {}

			hyperlinker.loadHyperlinksByContext({ year,projectIdParam,era:"CE" }); 
			try { 
				window.mapxImagesLoadByContext = hyperlinker.loadHyperlinksByContext; 
			} catch (_) {}
		});

		// Search control powered by Photon (https://photon.komoot.io/)
	class PhotonSearchControl {
		onAdd(m) {
			this._map = m;
			this._container = document.createElement("div");
			this._container.className = "maplibregl-ctrl";
			this._container.style.background = "white";
			this._container.style.borderRadius = "4px";
			this._container.style.boxShadow = "0 1px 2px rgba(0,0,0,0.15)";
			this._container.style.display = "flex";
			this._container.style.flexDirection = "column";
			this._container.style.gap = "4px";

			const row = document.createElement("div");
			row.style.display = "flex";
			row.style.alignItems = "center";
			row.style.gap = "4px";

			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "maplibregl-ctrl-icon";
			btn.setAttribute("aria-label", "Search");
			btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" d="m21 21l-3.5-3.5M17 10a7 7 0 1 1-14 0a7 7 0 0 1 14 0Z"/></svg>`;

			// Add these style properties to match MapLibre button styling
			btn.style.backgroundColor = '#fff';
			btn.style.border = '1px solid #ccc';
			btn.style.borderRadius = '4px';
			btn.style.padding = '4px';
			btn.style.cursor = 'pointer';
			btn.style.display = 'flex';
			btn.style.alignItems = 'center';
			btn.style.justifyContent = 'center';
			btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
			
			const input = document.createElement("input");
			input.type = "text";
			input.placeholder = "Search places";
			input.style.width = "220px";
			input.style.height = "16px";
			input.style.padding = "2px 6px";
			input.style.border = "1px solid #d0d7de";
			input.style.borderRadius = "4px";
			input.style.fontSize = "12px";
			input.style.outline = "none";
			input.style.display = "none";

			const list = document.createElement("div");
			list.style.maxHeight = "180px";
			list.style.overflowY = "auto";
			list.style.border = "1px solid #e5e7eb";
			list.style.borderRadius = "4px";
			list.style.display = "none";
			list.style.background = "#fff";

			this._container.appendChild(list);
			row.appendChild(btn);
			row.appendChild(input);
			this._container.appendChild(row);

			let aborter = null;
			let debounceId = null;

			const clearList = () => {
				list.innerHTML = "";
				list.style.display = "none";
			};

			const renderResults = (features) => {
				clearList();
				features.forEach((f) => {
					const item = document.createElement("button");
					item.type = "button";
					item.style.display = "block";
					item.style.width = "100%";
					item.style.textAlign = "left";
					item.style.padding = "6px 8px";
					item.style.fontSize = "12px";
					item.style.cursor = "pointer";
					item.style.border = "none";
					item.style.background = "#fff";
					item.onmouseenter = () => (item.style.background = "#f3f4f6");
					item.onmouseleave = () => (item.style.background = "#fff");
					const props = f.properties || {};
					const label = [props.name, props.city, props.state, props.country]
						.filter(Boolean)
						.join(", ");
					item.textContent = label || "Unknown";
					item.addEventListener("click", () => {
						const [lon, lat] = f.geometry.coordinates;
						const type = props.osm_value || props.type || "";
						const targetZoom =
							type === "house" || type === "building" ? 15 : 11;
						this._map.flyTo({
							center: [lon, lat],
							zoom: Math.max(this._map.getZoom(), targetZoom),
							speed: 0.7,
							curve: 1.5,
							easing: (t) => 1 - Math.pow(1 - t, 2),
							essential: false,
						});
						clearList();
					});
					list.appendChild(item);
				});
				if (features.length > 0) list.style.display = "block";
			};

			const search = async (q) => {
				if (!q || q.trim().length < 2) {
					clearList();
					return;
				}
				if (aborter) aborter.abort();
				aborter = new AbortController();
				const c = this._map.getCenter();
				const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
					q
				)}&limit=6&lat=${c.lat}&lon=${c.lng}`;
				try {
					const r = await fetch(url, {
						signal: aborter.signal,
						headers: { Accept: "application/json" },
					});
					if (!r.ok) return;
					const data = await r.json();
					renderResults((data && data.features) || []);
				} catch (_) {
					/* silently ignore aborts/errors */
				}
			};

			const debouncedSearch = (q) => {
				if (debounceId) clearTimeout(debounceId);
				debounceId = setTimeout(() => search(q), 220);
			};

			// Global click handler to close search results when clicking outside
			const handleGlobalClick = (e) => {
				// Check if click is outside the search container
				if (!this._container.contains(e.target)) {
					clearList();
					input.style.display = "none";
				}
			};

			btn.addEventListener("click", () => {
				input.style.display = "block";
				input.focus();
			});

			input.addEventListener("blur", (e) => {
				// Only hide input if not clicking on a search result
				// Use setTimeout to allow click events on search results to fire first
				setTimeout(() => {
					if (!list.contains(document.activeElement)) {
						input.style.display = "none";
						clearList();
					}
				}, 100);
			});

			input.addEventListener("input", (e) => debouncedSearch(e.target.value));
			
			input.addEventListener("keydown", (e) => {
				if (e.key === "Escape") {
					input.style.display = "none";
					clearList();
				}
				e.stopPropagation();
			});

			// Prevent map interactions when interacting with search control
			this._container.addEventListener("mousedown", (e) =>
				e.stopPropagation()
			);
			this._container.addEventListener("dblclick", (e) =>
				e.stopPropagation()
			);
			this._container.addEventListener("wheel", (e) => e.stopPropagation(), {
				passive: true,
			});

			// Add global click listener
			document.addEventListener("click", handleGlobalClick);

			// Store reference to remove later
			this._handleGlobalClick = handleGlobalClick;

			return this._container;
		}
		
		onRemove() {
			// Remove global click listener
			if (this._handleGlobalClick) {
				document.removeEventListener("click", this._handleGlobalClick);
			}
			
			if (this._container && this._container.parentNode)
				this._container.parentNode.removeChild(this._container);
			this._map = undefined;
		}
	}

		// Screenshot control: downloads current map canvas as PNG
		class ScreenshotControl {
			onAdd(m) {
				this._map = m;
				this._container = document.createElement("div");
				this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";

				const button = document.createElement("button");
				button.type = "button";
				button.className = "maplibregl-ctrl-icon";
				button.setAttribute("aria-label", "Download screenshot");
				const cameraSVG = `
								<div class="pl-1.25">
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z"/>
										<circle cx="12" cy="13" r="4"/>
									</svg>
								</div>
								`;
				const spinnerSVG = `
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<circle cx="12" cy="12" r="10" opacity="0.25"/>
									<path d="M22 12a10 10 0 0 0-10-10"/>
								</svg>`;
				button.innerHTML = cameraSVG;
				// Keep default button styling (no overrides)

				const showToast = (text) => {
					const host = this._map.getContainer();
					const toast = document.createElement("div");
					toast.textContent = text;
					toast.style.position = "absolute";
					toast.style.bottom = "64px";
					toast.style.left = "10px";
					toast.style.padding = "6px 8px";
					toast.style.borderRadius = "6px";
					toast.style.background = "rgba(17,24,39,0.9)";
					toast.style.color = "#fff";
					toast.style.fontSize = "12px";
					toast.style.zIndex = "1000";
					host.appendChild(toast);
					setTimeout(() => {
						toast.style.transition = "opacity 300ms ease";
						toast.style.opacity = "0";
						setTimeout(() => host.removeChild(toast), 320);
					}, 1000);
				};

				// No flash; keep behavior simple
				const flashButton = () => {};

				const downloadPng = () => {
					// No extra visual effects
					button.disabled = true;
					button.innerHTML = spinnerSVG;

					const captureNow = () => {
						try {
							const src = this._map.getCanvas();
							// Ensure GL pipeline is flushed before we read back pixels
							try {
								const gl = src.getContext("webgl2") || src.getContext("webgl");
								if (gl && gl.finish) gl.finish();
							} catch (_) {}
							const off = document.createElement("canvas");
							off.width = src.width;
							off.height = src.height;
							const ctx = off.getContext("2d");
							ctx.fillStyle = "#ffffff";
							ctx.fillRect(0, 0, off.width, off.height);
							ctx.drawImage(src, 0, 0);

							// Detect if the result looks empty (all white)
							const sample = ctx.getImageData(
								Math.max(0, off.width / 2 - 2),
								Math.max(0, off.height / 2 - 2),
								4,
								4
							).data;
							let allWhite = true;
							for (let i = 0; i < sample.length; i += 4) {
								const r = sample[i],
									g = sample[i + 1],
									b = sample[i + 2];
								if (!(r === 255 && g === 255 && b === 255)) {
									allWhite = false;
									break;
								}
							}

							const finalizeDownload = (blobOrDataUrl) => {
								flashButton();
								const link = document.createElement("a");
								const ts = new Date().toISOString().replace(/[:.]/g, "-");
								let href = "";
								if (typeof blobOrDataUrl === "string") {
									href = blobOrDataUrl;
								} else {
									href = URL.createObjectURL(blobOrDataUrl);
								}
								link.href = href;
								link.download = `mapx-snapshot-${ts}.png`;
								document.body.appendChild(link);
								link.click();
								document.body.removeChild(link);
								if (typeof blobOrDataUrl !== "string")
									URL.revokeObjectURL(href);
								showToast("Screenshot saved");
							};

							const finalize = () => {
								if (off.toBlob) {
									off.toBlob((blob) => {
										if (blob) finalizeDownload(blob);
										else finalizeDownload(off.toDataURL("image/png"));
									}, "image/png");
								} else {
									finalizeDownload(off.toDataURL("image/png"));
								}
							};

							if (!allWhite) {
								finalize();
							} else {
								// Fallback: request a static image of the current view (base map only)
								const center = this._map.getCenter();
								const zoom = Math.round(this._map.getZoom());
								const w = Math.min(2000, Math.floor(off.width));
								const h = Math.min(2000, Math.floor(off.height));
								let key = "";
								try {
									const styleUrl =
										(this._map &&
											this._map._style &&
											this._map._style.stylesheet &&
											this._map._style.stylesheet.sprite) ||
										"";
									const m = /[?&]key=([^&]+)/.exec(styleUrl || "");
									if (m) key = decodeURIComponent(m[1]);
								} catch (_) {}
								const staticUrl = key
									? `https://api.maptiler.com/maps/basic/static/${center.lng},${center.lat},${zoom}/${w}x${h}.png?key=${key}`
									: null;
								if (staticUrl) {
									const img = new Image();
									img.crossOrigin = "anonymous";
									img.onload = () => {
										ctx.drawImage(img, 0, 0, off.width, off.height);
										finalize();
										showToast("Screenshot saved (static base)");
									};
									img.onerror = () => {
										showToast("Screenshot blocked by CORS");
									};
									img.src = staticUrl;
								} else {
									showToast("Screenshot blocked (no static API key)");
								}
							}
						} catch (e) {
							showToast("Unable to save screenshot");
						} finally {
							button.disabled = false;
							button.innerHTML = cameraSVG;
						}
					};

					// Force one guaranteed render, then capture synchronously in that render
					const prevRepaint = this._map.repaint;
					this._map.repaint = true;
					this._map.once("render", () => {
						try {
							captureNow();
						} finally {
							this._map.repaint = prevRepaint;
						}
					});
					this._map.triggerRepaint();
				};

				button.addEventListener("click", downloadPng);
				this._container.appendChild(button);
				return this._container;
			}
			onRemove() {
				if (this._container && this._container.parentNode)
					this._container.parentNode.removeChild(this._container);
				this._map = undefined;
			}
		}

		class MeasureDistanceControl {
			onAdd(m) {
				this._map = m;
				this._container = document.createElement("div");
				this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";
				this._button = document.createElement("button");
				this._button.type = "button";
				this._button.className = "maplibregl-ctrl-icon";
				this._button.style.display = "flex";
				this._button.style.alignItems = "center";
				this._button.style.justifyContent = "center";
				this._button.style.padding = "0";
				this._button.setAttribute("aria-label", "Measure distance");
				this._button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M17.143 18.957c-.49.201.13.552.473.554a.97.97 0 0 0 1.07-1.188c-.307-.865-1.757-1.213-2.887-.94c-1.629.395-2.257 1.74-1.638 2.799c.812 1.392 3.249 1.916 5.165 1.331c2.384-.727 3.266-2.762 2.2-4.357c-1.28-1.913-4.71-2.612-7.389-1.718c-3.13 1.045-4.265 3.767-2.755 5.886c1.732 2.428 6.15 3.302 9.577 2.101c3.87-1.355 5.255-4.76 3.304-7.393c-2.175-2.939-7.571-3.986-11.738-2.482c-4.602 1.661-6.235 5.741-3.85 8.886c2.613 3.444 8.98 4.662 13.88 2.858c5.327-1.963 7.207-6.714 4.39-10.364c-3.047-3.946-10.378-5.336-16.003-3.232c-6.05 2.262-8.175 7.68-4.928 11.831c2.065 2.641 5.994 4.413 10.296 4.708" stroke-width="1.5"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M16.31 28.237H43.5v9.043H16.24c-6.618 0-11.735-4.41-11.735-10.173v-7.912m5.086 16.163v-2.26m3.391 3.617v-4.522m3.391 5.087v-2.26m3.391 2.26v-4.522m3.39 4.522v-2.26m3.392 2.26v-4.522m3.39 4.522v-2.26m6.782 2.26v-2.26m-3.39 2.26v-4.522m6.781 4.522v-4.522m-11.868-4.634v-9.833" stroke-width="1.5"/></svg>`
								this._container.appendChild(this._button);

				this._active = false;
				this._points = [];
				this._tempPoint = null;
				this._distancePopup = null;
				this._ids = {
					lineSource: "measure-line-src",
					pointsSource: "measure-points-src",
					lineLayer: "measure-line-lyr",
					pointsLayer: "measure-points-lyr",
				};

				this._button.addEventListener("click", () => {
					if (this._active) {
						this._deactivate();
					} else {
						this._activate();
					}
				});
				return this._container;
			}
			onRemove() {
				this._deactivate();
				this._container.parentNode &&
					this._container.parentNode.removeChild(this._container);
				this._map = undefined;
			}

			_haversineKm(a, b) {
				const toRad = (d) => (d * Math.PI) / 180;
				const R = 6371;
				const dLat = toRad(b[1] - a[1]);
				const dLon = toRad(b[0] - a[0]);
				const lat1 = toRad(a[1]);
				const lat2 = toRad(b[1]);
				const h =
					Math.sin(dLat / 2) ** 2 +
					Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
				return 2 * R * Math.asin(Math.sqrt(h));
			}

			_totalDistanceKm(coords) {
				let d = 0;
				for (let i = 1; i < coords.length; i++)
					d += this._haversineKm(coords[i - 1], coords[i]);
				return d;
			}

			_updateSources() {
				const lineCoords = [...this._points];
				if (this._tempPoint) lineCoords.push(this._tempPoint);
				const line = {
					type: "Feature",
					geometry: { type: "LineString", coordinates: lineCoords },
				};
				const pts = {
					type: "FeatureCollection",
					features: this._points.map((c) => ({
						type: "Feature",
						geometry: { type: "Point", coordinates: c },
					})),
				};
				if (this._map.getSource(this._ids.lineSource))
					this._map.getSource(this._ids.lineSource).setData(line);
				if (this._map.getSource(this._ids.pointsSource))
					this._map.getSource(this._ids.pointsSource).setData(pts);
			}

			_updatePopup(lngLat) {
				const coords = [...this._points];
				if (this._tempPoint) coords.push(this._tempPoint);
				if (coords.length < 2) {
					if (this._distancePopup) this._distancePopup.remove();
					this._distancePopup = null;
					return;
				}
				const km = this._totalDistanceKm(coords);
				const text = `${km.toFixed(2)} km`;
				if (!this._distancePopup) {
					this._distancePopup = new maplibregl.Popup({
						closeButton: false,
						closeOnClick: false,
						className: "measure-popup",
					});
					this._distancePopup.setLngLat(lngLat).setHTML(text).addTo(this._map);
				} else {
					this._distancePopup.setLngLat(lngLat).setHTML(text);
				}
			}

			_activate() {
				this._active = true;
				this._button.style.backgroundColor = "#11182710";
				this._points = [];
				this._tempPoint = null;
				this._distancePopup && this._distancePopup.remove();
				this._distancePopup = null;
				this._map.getCanvas().style.cursor = "crosshair";
				this._map.doubleClickZoom && this._map.doubleClickZoom.disable();

				if (!this._map.getSource(this._ids.lineSource)) {
					this._map.addSource(this._ids.lineSource, {
						type: "geojson",
						data: {
							type: "Feature",
							geometry: { type: "LineString", coordinates: [] },
						},
					});
				}
				if (!this._map.getSource(this._ids.pointsSource)) {
					this._map.addSource(this._ids.pointsSource, {
						type: "geojson",
						data: { type: "FeatureCollection", features: [] },
					});
				}
				if (!this._map.getLayer(this._ids.lineLayer)) {
					this._map.addLayer({
						id: this._ids.lineLayer,
						type: "line",
						source: this._ids.lineSource,
						paint: { "line-color": "#10b981", "line-width": 3 },
					});
				}
				if (!this._map.getLayer(this._ids.pointsLayer)) {
					this._map.addLayer({
						id: this._ids.pointsLayer,
						type: "circle",
						source: this._ids.pointsSource,
						paint: {
							"circle-radius": 4,
							"circle-color": "#10b981",
							"circle-stroke-color": "#064e3b",
							"circle-stroke-width": 1,
						},
					});
				}

				this._onClick = (e) => {
					this._points.push([e.lngLat.lng, e.lngLat.lat]);
					this._updateSources();
					this._updatePopup(e.lngLat);
				};
				this._onMove = (e) => {
					if (!this._active || this._points.length === 0) return;
					this._tempPoint = [e.lngLat.lng, e.lngLat.lat];
					this._updateSources();
					this._updatePopup(e.lngLat);
				};
				this._onDbl = () => this._deactivate();
				this._onKey = (ev) => {
					if (ev.key === "Escape") this._deactivate();
				};

				this._map.on("click", this._onClick);
				this._map.on("mousemove", this._onMove);
				this._map.on("dblclick", this._onDbl);
				window.addEventListener("keydown", this._onKey, { once: false });
			}

			_deactivate() {
				if (!this._active) return;
				this._active = false;
				this._button.style.backgroundColor = "";
				this._map.getCanvas().style.cursor = "";
				this._map.doubleClickZoom && this._map.doubleClickZoom.enable();
				this._map.off("click", this._onClick);
				this._map.off("mousemove", this._onMove);
				this._map.off("dblclick", this._onDbl);
				window.removeEventListener("keydown", this._onKey);
				this._distancePopup && this._distancePopup.remove();
				this._distancePopup = null;
				this._points = [];
				this._tempPoint = null;
				if (this._map.getLayer(this._ids.lineLayer))
					this._map.removeLayer(this._ids.lineLayer);
				if (this._map.getLayer(this._ids.pointsLayer))
					this._map.removeLayer(this._ids.pointsLayer);
				if (this._map.getSource(this._ids.lineSource))
					this._map.removeSource(this._ids.lineSource);
				if (this._map.getSource(this._ids.pointsSource))
					this._map.removeSource(this._ids.pointsSource);
			}
		}

		// Controls: North arrow to reset view, and zoom buttons at bottom-right
		class ResetNorthControl {
			onAdd(m) {
				this._map = m;
				this._container = document.createElement("div");
				this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";

				const button = document.createElement("button");
				button.type = "button";
				button.className = "maplibregl-ctrl-icon";
				button.setAttribute("aria-label", "Reset view");
				button.style.display = "flex";
				button.style.alignItems = "center";
				button.style.justifyContent = "center";
				button.style.padding = "0";
				// Simple north arrow
				button.innerHTML = `
								<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24"><g fill="none"><path fill="currentColor" d="m6.2 20.634l5.668-10.393a.15.15 0 0 1 .264 0L17.8 20.634a.15.15 0 0 1-.187.211l-4.536-1.814a.15.15 0 0 1-.092-.113l-.837-4.606c-.03-.164-.266-.164-.296 0l-.837 4.606a.15.15 0 0 1-.092.113l-4.536 1.814a.15.15 0 0 1-.187-.21"/><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M9 9V3.12a.05.05 0 0 1 .085-.035l5.83 5.83A.05.05 0 0 0 15 8.879V3"/></g></svg>`;

				button.addEventListener("click", () => {
					// True "north up": only reset bearing; keep center, zoom and pitch
					this._map.rotateTo(0, { duration: 400, essential: false });
				});

				this._container.appendChild(button);
				return this._container;
			}
			onRemove() {
				if (this._container && this._container.parentNode) {
					this._container.parentNode.removeChild(this._container);
				}
				this._map = undefined;
			}
		}

		map.current.addControl(
			new maplibregl.NavigationControl({ showCompass: false, showZoom: true }),
			"bottom-right"
		);
		map.current.addControl(new ResetNorthControl(), "bottom-right");
		
		// --- Style switcher control for OpenFreeMap styles ---
		// Ensure custom data layers survive style changes
		const ensurePolygonLayers = () => {
			try {
				if (!map.current.getSource("polygons-source")) {
					map.current.addSource("polygons-source", {
						type: "geojson",
						data: { type: "FeatureCollection", features: [] },
					});
				}
				if (!map.current.getLayer("polygon-fill")) {
					map.current.addLayer({
						id: "polygon-fill",
						type: "fill",
						source: "polygons-source",
						paint: { "fill-color": "#0080ff", "fill-opacity": 0.5 },
					});
				}
				if (!map.current.getLayer("polygon-border")) {
					map.current.addLayer({
						id: "polygon-border",
						type: "line",
						source: "polygons-source",
						paint: { "line-color": "#0000ff", "line-width": 2 },
					});
				}
				// refresh data if present
				if (polygons && map.current.getSource("polygons-source")) {
					map.current.getSource("polygons-source").setData({
						type: "FeatureCollection",
						features: polygons,
					});
				}
			} catch (_) {}
		};

		// Keep globe projection and fog when styles change
		const enforceGlobe = () => {
			try {
				map.current.setProjection && map.current.setProjection({ type: "globe" });
				if (map.current.setFog) {
					map.current.setFog({
						color: "#d6e7ff",
						"high-color": "#add3ff",
						"space-color": "rgba(0,0,0,0)",
						"horizon-blend": 0.02,
					});
				}
				const canvas = map.current.getCanvas && map.current.getCanvas();
				if (canvas) canvas.style.backgroundColor = "transparent";
			} catch (_) {}
		};

		// Recreate layers and globe when a new style is applied
		map.current.on("styledata", () => {
			try { enforceGlobe(); } catch (_) {}
			try { ensurePolygonLayers(); } catch (_) {}
			// Ensure drawing layers and their data persist across style changes
			try {
				const liveSourceId = "draw-live-src";
				const finalSourceId = "draw-final-src";
				if (!map.current.getSource(liveSourceId)) {
					map.current.addSource(liveSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
				}
				if (!map.current.getSource(finalSourceId)) {
					map.current.addSource(finalSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
				}
				if (!map.current.getLayer("draw-live-line")) {
					map.current.addLayer({ id: "draw-live-line", type: "line", source: liveSourceId, layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": ["case", ["==", ["get", "tool"], "highlight"], "#39FF14", "#000000"], "line-width": ["case", ["==", ["get", "tool"], "highlight"], 15, 3], "line-opacity": ["case", ["==", ["get", "tool"], "highlight"], 0.4, 0.9] } });
				}
				if (!map.current.getLayer("draw-live-shadow")) {
					map.current.addLayer({ id: "draw-live-shadow", type: "line", source: liveSourceId, layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": ["case", ["==", ["get", "tool"], "highlight"], "#39FF14", "#000000"], "line-width": ["case", ["==", ["get", "tool"], "highlight"], 20, 6], "line-opacity": ["case", ["==", ["get", "tool"], "highlight"], 0.12, 0.2] } }, "draw-live-line");
				}
				if (!map.current.getLayer("draw-final-line")) {
					map.current.addLayer({ id: "draw-final-line", type: "line", source: finalSourceId, layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": ["case", ["==", ["get", "tool"], "highlight"], "#39FF14", "#000000"], "line-width": ["case", ["==", ["get", "tool"], "highlight"], 15, 3], "line-opacity": ["case", ["==", ["get", "tool"], "highlight"], 0.4, 1] } });
				}
				if (!map.current.getLayer("draw-final-line-selected")) {
					map.current.addLayer({ id: "draw-final-line-selected", type: "line", source: finalSourceId, layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#1e90ff", "line-width": 5, "line-opacity": 0.9 }, filter: ["==", ["get", "id"], "__none__"] });
				}
				// --- added: ensure polygon fill layers exist ---
				if (!map.current.getLayer("draw-final-fill")) {
					map.current.addLayer({ id: "draw-final-fill", type: "fill", source: finalSourceId, paint: { "fill-color": "#000000", "fill-opacity": 0.1 }, filter: ["any", ["==", ["get", "tool"], "polygon"], ["==", ["get", "tool"], "circle"]] });
				}
				if (!map.current.getLayer("draw-final-fill-selected")) {
					map.current.addLayer({ id: "draw-final-fill-selected", type: "fill", source: finalSourceId, paint: { "fill-color": "#1e90ff", "fill-opacity": 0.15 }, filter: ["all", ["any", ["==", ["get", "tool"], "polygon"], ["==", ["get", "tool"], "circle"]], ["==", ["get", "id"], "__none__"]] });
				}
				// ensure text layer exists
				if (!map.current.getLayer("draw-final-text")) {
					map.current.addLayer({
						id: "draw-final-text",
						type: "symbol",
						source: finalSourceId,
						filter: ["==", ["get", "tool"], "text"],
						layout: {
							"text-field": ["get", "text"],
							"text-font": ["Noto Sans Regular"],
							"text-size": ["coalesce", ["get", "fontSize"], 16],
							"text-anchor": "center",
							"text-allow-overlap": false,
							"text-ignore-placement": false,
							"text-pitch-alignment": "map",
							"text-rotation-alignment": "auto",
							"text-max-width": 16,
							"symbol-placement": "point"
						},
						paint: {
							"text-color": ["coalesce", ["get", "color"], "#ffffff"],
							"text-halo-color": "#000000",
							"text-halo-width": 1,
							"text-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.7, 8, 1]
						}
					});
				}
				const finalSrc = map.current.getSource(finalSourceId);
				finalSrc && finalSrc.setData({ type: "FeatureCollection", features: finalFeaturesRef.current });
				map.current.setFilter("draw-final-line-selected", ["==", ["get", "id"], selectedFeatureIdRef.current || "__none__"]);
				map.current.setFilter("draw-final-fill-selected", ["all", ["any", ["==", ["get", "tool"], "polygon"], ["==", ["get", "tool"], "circle"]], ["==", ["get", "id"], selectedFeatureIdRef.current || "__none__"]]);
			} catch (_) {}
		});

		// Expose a small API for external UI to switch styles
		try {
			// Build a cloudless global satellite style (EOX Sentinel-2 cloudless, no auth)
			const buildCloudlessStyle = () => {
				return {
					version: 8,
					sources: {
						"eox-s2cloudless": {
							type: "raster",
							tiles: [
								"https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg",
							],
							scheme: "xyz",
							tileSize: 256,
							attribution: "Sentinel-2 cloudless © EOX IT Services GmbH",
							minzoom: 0,
							maxzoom: 12,
						},
					},
					layers: [
						{ id: "eox-s2cloudless-layer", type: "raster", source: "eox-s2cloudless" },
					],
					glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
				};
			};

			window.mapxSetStyle = (styleUrl) => {
				if (map.current && typeof styleUrl === "string" && styleUrl) {
					map.current.setStyle(styleUrl);
				}
			};

			window.mapxSetSatellite = () => {
				if (!map.current) return;
				const style = buildCloudlessStyle();
				map.current.setStyle(style);
			};
		} catch (_) {}

		map.current.addControl(new ScreenshotControl(), "bottom-left");
		map.current.addControl(new MeasureDistanceControl(), "bottom-left");
		map.current.addControl(new PhotonSearchControl(), "bottom-left");

		return () => {
			if (map.current) {
				map.current.remove();
				map.current = null;
			}
		};
	}, []);

	// ✅ Whenever polygons change in Redux → update the map
	useEffect(() => {
		if (!map.current || !map.current.getSource("polygons-source")) return;

		map.current.getSource("polygons-source").setData({
			type: "FeatureCollection",
			features: polygons,
		});
	}, [polygons, year]);

	// Reposition control corners whenever side offsets change
	useEffect(() => {
		if (!map.current) return;
		try {
			const container = map.current.getContainer();
			const leftCorners = container.querySelectorAll(
				".maplibregl-ctrl-bottom-left, .maplibregl-ctrl-top-left"
			);
			leftCorners.forEach((el) => {
				el.style.left = `${leftOffset + 8}px`;
				el.style.marginLeft = "0px";
			});
			const rightCorners = container.querySelectorAll(
				".maplibregl-ctrl-bottom-right, .maplibregl-ctrl-top-right"
			);
			rightCorners.forEach((el) => {
				el.style.right = `${rightOffset + 8}px`;
				el.style.marginRight = "0px";
			});

			// Position bottom controls higher up to avoid timeline
			const bottomLeft = container.querySelector(
				".maplibregl-ctrl-bottom-left"
			);
			const bottomRight = container.querySelector(
				".maplibregl-ctrl-bottom-right"
			);
			if (bottomLeft) bottomLeft.style.bottom = "130px";
			if (bottomRight) bottomRight.style.bottom = "130px";

			// Ensure attribution stays as compact "i" at bottom-right below timeline
			const attrib = container.querySelector(".maplibregl-ctrl-attrib");
			if (attrib) {
				attrib.classList.add("maplibregl-compact");
				attrib.style.position = "absolute";
				attrib.style.bottom = "8px";
				attrib.style.right = `${rightOffset + 8}px`;
				attrib.style.left = "auto";
				attrib.style.zIndex = "14";
				if (attrib.parentElement !== container) container.appendChild(attrib);
			}
		} catch (_) {}
	}, [leftOffset, rightOffset]);


	// Refetch notes whenever year changes (Redux timeline)
useEffect(() => {
    let t = null;
    try {
        if (window.mapxNotesLoadByContext) {
            const latestYear = (reduxStore && reduxStore.getState && reduxStore.getState().map?.year) ?? year;
            t = setTimeout(() => window.mapxNotesLoadByContext({ year: latestYear }), 1000);
        }
    } catch (_) {}
    return () => { if (t) clearTimeout(t); };
}, [year]);

useEffect(() => {
    let t = null;
    try {
        if (window.mapxImagesLoadByContext) {
            const latestYear = (reduxStore && reduxStore.getState && reduxStore.getState().map?.year) ?? year;
            t = setTimeout(() => window.mapxImagesLoadByContext({ 
                year: latestYear, 
                projectIdParam, 
                era: "CE" 
            }), 1000);
        }
    } catch (_) {}
    return () => { if (t) clearTimeout(t); };
}, [year, projectIdParam]);
	return (
		<div style={{ position: "relative", width: "100%", height: "100vh" }}>
			<GalaxyCanvas />
			<div
				ref={mapContainer}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					zIndex: 1,
					backgroundColor: "transparent",
				}}
			/>
        {/* Replaced modal with floating toolbar near click. */}
		</div>
	);
}
