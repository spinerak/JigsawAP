"use strict";

(function initJigsawViewControls(globalScope) {
    function init(options) {
        const viewState = options.viewState;
        const clamp = options.clamp;
        const getActiveBaseScale = options.getActiveBaseScale;
        const syncLegacyViewGlobals = options.syncLegacyViewGlobals;
        const getEffectiveZoomStep = options.getEffectiveZoomStep;
        const touchDistance = options.touchDistance;
        const touchMidpoint = options.touchMidpoint;
        const rotateCurrentPiece = options.rotateCurrentPiece;
        const events = options.events;
        const getPuzzle = options.getPuzzle;
        const getBevelSize = options.getBevelSize;
        const setBevelSize = options.setBevelSize;
        const viewDebug = !!options.viewDebug;

        const forPuzzle = document.getElementById("forPuzzle");
        if (!forPuzzle) return null;

        let viewControls = null;
        const sensitivityInteraction = { zoom: false, pan: false };
        const pinchState = { active: false, startDistance: 0, startZoom: 1, didMove: false };
        let zoomLabelRaf = 0;
        let viewTransformRaf = 0;
        let lastPinchZoomUpdateAt = 0;

        function queueUiEvent(evt) {
            if (!evt) return;
            if (typeof evt.queuedAt !== "number") {
                evt.queuedAt = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
            }
            events.push(evt);
        }

        function redrawAllPiecesForDisplayOptions() {
            const puzzle = getPuzzle();
            if (!puzzle || !puzzle.polyPieces || !puzzle.polyPieces.length) return;
            puzzle.polyPieces.forEach((pp) => {
                pp.polypiece_drawImage(false);
            });
        }

        function initDisplayOptionSliders() {
            const forPuzzleEl = document.getElementById("forPuzzle");
            const heldShadowInput = document.getElementById("displayHeldPieceShadowDarkness");
            const heldShadowValueSpan = document.getElementById("displayHeldPieceShadowDarknessValue");
            const feltOpacityInput = document.getElementById("displayFeltOpacity");
            const feltOpacityValueSpan = document.getElementById("displayFeltOpacityValue");
            const playAreaRadiusInput = document.getElementById("displayPlayAreaRadius");
            const playAreaRadiusValueSpan = document.getElementById("displayPlayAreaRadiusValue");
            const pieceBevelInput = document.getElementById("displayPieceBevel");
            const pieceBevelValueSpan = document.getElementById("displayPieceBevelValue");
            const interaction = { bevel: false, felt: false, radius: false, heldShadow: false };
            document.addEventListener("pointerup", function () {
                interaction.bevel = false;
                interaction.felt = false;
                interaction.radius = false;
                interaction.heldShadow = false;
            });
            document.addEventListener("pointercancel", function () {
                interaction.bevel = false;
                interaction.felt = false;
                interaction.radius = false;
                interaction.heldShadow = false;
            });

            if (pieceBevelInput) {
                const savedBevel = localStorage.getItem("option_bevel_2");
                const defaultBevel = 0.1;
                const initialBevel = savedBevel !== null ? parseFloat(savedBevel) : defaultBevel;
                pieceBevelInput.value = initialBevel;
                if (pieceBevelValueSpan) pieceBevelValueSpan.textContent = String(initialBevel);
                pieceBevelInput.addEventListener("pointerdown", function () { interaction.bevel = true; });
                pieceBevelInput.addEventListener("input", function () {
                    if (interaction.bevel) {
                        const val = parseFloat(pieceBevelInput.value);
                        setBevelSize(val);
                        if (pieceBevelValueSpan) pieceBevelValueSpan.textContent = (val % 1 === 0) ? String(val) : val.toFixed(1);
                    } else {
                        const val = getBevelSize();
                        const num = (typeof val === "number" && !isNaN(val)) ? val : defaultBevel;
                        pieceBevelInput.value = num;
                        if (pieceBevelValueSpan) pieceBevelValueSpan.textContent = (num % 1 === 0) ? String(num) : num.toFixed(1);
                    }
                });
                pieceBevelInput.addEventListener("change", function () {
                    const val = parseFloat(pieceBevelInput.value);
                    localStorage.setItem("option_bevel_2", String(val));
                    setBevelSize(val);
                    redrawAllPiecesForDisplayOptions();
                });
                pieceBevelInput.addEventListener("pointerup", function () {
                    if (interaction.bevel) {
                        const val = parseFloat(pieceBevelInput.value);
                        localStorage.setItem("option_bevel_2", String(val));
                        setBevelSize(val);
                        redrawAllPiecesForDisplayOptions();
                    }
                });
            }

            const displayPrefs = globalScope.displayPrefs;
            const applyDisplayPrefs = typeof globalScope.applyDisplayPreferences === "function" ? globalScope.applyDisplayPreferences : null;
            if (heldShadowInput && forPuzzleEl) {
                heldShadowInput.addEventListener("pointerdown", function () { interaction.heldShadow = true; });
                heldShadowInput.addEventListener("input", function () {
                    if (interaction.heldShadow) {
                        const val = parseFloat(heldShadowInput.value);
                        if (displayPrefs) displayPrefs.heldPieceShadowDarkness = val;
                        try { localStorage.setItem("heldPieceShadowDarkness", String(val)); } catch (_e) {}
                        if (applyDisplayPrefs) applyDisplayPrefs(forPuzzleEl);
                        if (heldShadowValueSpan) heldShadowValueSpan.textContent = val.toFixed(2);
                    } else {
                        const val = (displayPrefs && displayPrefs.heldPieceShadowDarkness != null) ? displayPrefs.heldPieceShadowDarkness : 0.35;
                        heldShadowInput.value = val;
                        if (heldShadowValueSpan) heldShadowValueSpan.textContent = val.toFixed(2);
                        if (applyDisplayPrefs) applyDisplayPrefs(forPuzzleEl);
                    }
                });
            }
            if (feltOpacityInput && forPuzzleEl) {
                feltOpacityInput.addEventListener("pointerdown", function () { interaction.felt = true; });
                feltOpacityInput.addEventListener("input", function () {
                    if (interaction.felt) {
                        const val = parseFloat(feltOpacityInput.value);
                        if (displayPrefs) displayPrefs.feltOpacity = val;
                        try { localStorage.setItem("feltOpacity", String(val)); } catch (_e) {}
                        if (applyDisplayPrefs) applyDisplayPrefs(forPuzzleEl);
                        if (feltOpacityValueSpan) feltOpacityValueSpan.textContent = val.toFixed(2);
                    } else {
                        const val = (displayPrefs && displayPrefs.feltOpacity != null) ? displayPrefs.feltOpacity : 0.5;
                        feltOpacityInput.value = val;
                        if (feltOpacityValueSpan) feltOpacityValueSpan.textContent = val.toFixed(2);
                        if (applyDisplayPrefs) applyDisplayPrefs(forPuzzleEl);
                    }
                });
            }
            if (playAreaRadiusInput && forPuzzleEl) {
                playAreaRadiusInput.addEventListener("pointerdown", function () { interaction.radius = true; });
                playAreaRadiusInput.addEventListener("input", function () {
                    if (interaction.radius) {
                        const val = parseInt(playAreaRadiusInput.value, 10);
                        if (displayPrefs) displayPrefs.playAreaRadius = val;
                        try { localStorage.setItem("playAreaRadius", String(val)); } catch (_e) {}
                        if (applyDisplayPrefs) applyDisplayPrefs(forPuzzleEl);
                        if (playAreaRadiusValueSpan) playAreaRadiusValueSpan.textContent = val + "px";
                    } else {
                        const val = (displayPrefs && displayPrefs.playAreaRadius != null) ? displayPrefs.playAreaRadius : 64;
                        playAreaRadiusInput.value = val;
                        if (playAreaRadiusValueSpan) playAreaRadiusValueSpan.textContent = val + "px";
                        if (applyDisplayPrefs) applyDisplayPrefs(forPuzzleEl);
                    }
                });
            }
            const grayscaleRefCheckbox = document.getElementById("showGrayscaleReference");
            if (grayscaleRefCheckbox) {
                grayscaleRefCheckbox.checked = !!viewState.showGrayscaleReference;
                grayscaleRefCheckbox.addEventListener("change", function () {
                    viewState.showGrayscaleReference = grayscaleRefCheckbox.checked;
                    try { localStorage.setItem("showGrayscaleReference", String(grayscaleRefCheckbox.checked)); } catch (_e) {}
                    if (typeof globalScope.updateGrayscaleReferenceCanvas === "function") globalScope.updateGrayscaleReferenceCanvas();
                });
            }
            const previewOutlineCheckbox = document.getElementById("showPreviewOutline");
            if (previewOutlineCheckbox) {
                previewOutlineCheckbox.checked = !!viewState.showPreviewOutline;
                previewOutlineCheckbox.addEventListener("change", function () {
                    viewState.showPreviewOutline = previewOutlineCheckbox.checked;
                    try { localStorage.setItem("showPreviewOutline", String(previewOutlineCheckbox.checked)); } catch (_e) {}
                    if (typeof globalScope.updateGrayscaleReferenceCanvas === "function") globalScope.updateGrayscaleReferenceCanvas();
                });
            }
            const customDropCheckbox = document.getElementById("useCustomDropLocation");
            if (customDropCheckbox) {
                customDropCheckbox.checked = !!viewState.useCustomDropLocation;
                customDropCheckbox.addEventListener("change", function () {
                    viewState.useCustomDropLocation = customDropCheckbox.checked;
                    try { localStorage.setItem("useCustomDropLocation", String(customDropCheckbox.checked)); } catch (_e) {}
                    if (typeof globalScope.updateDropLocationTarget === "function") globalScope.updateDropLocationTarget();
                });
            }
        }

        function applyBackgroundColor() {
            const red = document.getElementById("bgcolorR").value;
            const green = document.getElementById("bgcolorG").value;
            const blue = document.getElementById("bgcolorB").value;
            const newColor = `#${red}${green}${blue}`;
            if (globalScope.displayPrefs) globalScope.displayPrefs.backgroundColor = newColor;
            try { localStorage.setItem("backgroundColor", newColor); } catch (_e) {}
            if (typeof globalScope.applyDisplayPreferences === "function") globalScope.applyDisplayPreferences(forPuzzle);
        }

        function initBackgroundControls() {
            if (typeof globalScope.applyDisplayPreferences === "function") globalScope.applyDisplayPreferences(forPuzzle);

            ["bgcolorR", "bgcolorG", "bgcolorB"].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.addEventListener("change", applyBackgroundColor);
            });

            const displayPrefs = globalScope.displayPrefs || {};
            let color = displayPrefs.backgroundColor != null ? displayPrefs.backgroundColor : "#DD9";
            forPuzzle.style.backgroundColor = color;
            const bgR = document.getElementById("bgcolorR");
            const bgG = document.getElementById("bgcolorG");
            const bgB = document.getElementById("bgcolorB");
            if (bgR) bgR.value = color.length >= 4 ? color.slice(1, 2) : "D";
            if (bgG) bgG.value = color.length >= 4 ? color.slice(2, 3) : "D";
            if (bgB) bgB.value = color.length >= 4 ? color.slice(3, 4) : "9";

            function applyDropLocationColor() {
                const r = document.getElementById("dropLocationR").value;
                const g = document.getElementById("dropLocationG").value;
                const b = document.getElementById("dropLocationB").value;
                const newColor = "#" + r + g + b;
                viewState.dropLocationColor = newColor;
                try { localStorage.setItem("dropLocationColor", newColor); } catch (_e) {}
                if (typeof globalScope.updateDropLocationTarget === "function") globalScope.updateDropLocationTarget();
            }
            ["dropLocationR", "dropLocationG", "dropLocationB"].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.addEventListener("change", applyDropLocationColor);
            });
            let dropColor = viewState.dropLocationColor || "#FC8";
            if (dropColor.length === 4) {
                document.getElementById("dropLocationR").value = dropColor.slice(1, 2);
                document.getElementById("dropLocationG").value = dropColor.slice(2, 3);
                document.getElementById("dropLocationB").value = dropColor.slice(3, 4);
            }

            const feltOpacity = document.getElementById("displayFeltOpacity");
            const feltOpacityValue = document.getElementById("displayFeltOpacityValue");
            const playAreaRadius = document.getElementById("displayPlayAreaRadius");
            const playAreaRadiusValue = document.getElementById("displayPlayAreaRadiusValue");
            if (feltOpacity && playAreaRadius) {
                const felt = (displayPrefs.feltOpacity != null && !isNaN(displayPrefs.feltOpacity)) ? displayPrefs.feltOpacity : 0.5;
                feltOpacity.value = felt;
                if (feltOpacityValue) feltOpacityValue.textContent = felt.toFixed(2);

                const radius = (displayPrefs.playAreaRadius != null && !isNaN(displayPrefs.playAreaRadius)) ? displayPrefs.playAreaRadius : 64;
                playAreaRadius.value = radius;
                if (playAreaRadiusValue) playAreaRadiusValue.textContent = radius + "px";
            }
            const heldShadowSlider = document.getElementById("displayHeldPieceShadowDarkness");
            const heldShadowValue = document.getElementById("displayHeldPieceShadowDarknessValue");
            const heldShadow = (displayPrefs.heldPieceShadowDarkness != null && !isNaN(displayPrefs.heldPieceShadowDarkness)) ? displayPrefs.heldPieceShadowDarkness : 0.35;
            if (heldShadowSlider) {
                heldShadowSlider.value = heldShadow;
                if (heldShadowValue) heldShadowValue.textContent = heldShadow.toFixed(2);
            }
        }

        function clampPanToBounds() {
            const maxOffset = viewState.zoom / 2;
            viewState.panX = clamp(viewState.panX, -maxOffset, maxOffset);
            viewState.panY = clamp(viewState.panY, -maxOffset, maxOffset);
        }

        function applyViewTransform(panOnly = false) {
            clampPanToBounds();
            const baseScale = getActiveBaseScale();
            // Keep container centering stable even when layout metrics momentarily report
            // stale/transitioning widths during media/puzzle area updates.
            forPuzzle.style.left = "50%";
            forPuzzle.style.transform = `
                translate(-50%, -50%)
                scale(${baseScale})
                translate(${viewState.panX * 100}%, ${viewState.panY * 100}%)
                scale(${viewState.zoom})
            `;
            syncLegacyViewGlobals();
            globalScope.additional_zoom = viewState.zoom;
            const puzzle = getPuzzle();
            if (puzzle) {
                if (puzzle._invalidateViewMetricsCache) puzzle._invalidateViewMetricsCache();
                if (!panOnly && Number.isFinite(puzzle.scalex)) puzzle.refreshConnectionDistance();
            }
        }

        function scheduleViewTransform() {
            if (viewTransformRaf) return;
            viewTransformRaf = requestAnimationFrame(() => {
                viewTransformRaf = 0;
                applyViewTransform();
            });
        }

        function zoomAroundPoint(clientX, clientY, targetZoom, updateUi = true) {
            const newZoom = clamp(targetZoom, viewState.minZoom, viewState.maxZoom);
            const previousZoom = viewState.zoom;
            if (newZoom === previousZoom || previousZoom === 0) return;
            const br = forPuzzle.getBoundingClientRect();
            const projX = clamp(clientX, br.left, br.right);
            const projY = clamp(clientY, br.top, br.bottom);
            const width = br.width || 1;
            const height = br.height || 1;
            const wx = clamp((projX - br.left) / width, 0, 1);
            const wy = clamp((projY - br.top) / height, 0, 1);
            viewState.panX = (wx - 0.5) * (previousZoom - newZoom) + viewState.panX;
            viewState.panY = (wy - 0.5) * (previousZoom - newZoom) + viewState.panY;
            viewState.zoom = newZoom;
            if (updateUi) applyViewTransform();
            else scheduleViewTransform();
            if (updateUi) {
                updateViewControlLabels();
            } else if (!zoomLabelRaf) {
                zoomLabelRaf = requestAnimationFrame(() => {
                    zoomLabelRaf = 0;
                    updateViewControlLabels();
                });
            }
        }

        function resetView() {
            viewState.zoom = 1;
            viewState.panX = 0;
            viewState.panY = 0;
            applyViewTransform();
            updateViewControlLabels();
        }

        function lockScalingLayout() {
            if (viewState.isScalingLocked) return;
            const style = getComputedStyle(forPuzzle);
            forPuzzle.style.width = style.width;
            forPuzzle.style.height = style.height;
            forPuzzle.style.maxWidth = style.maxWidth;
            forPuzzle.style.maxHeight = style.maxHeight;
            viewState.fitScaleLocked = 1 / Number(globalScope.scaleFactor || 1);
            viewState.isScalingLocked = true;
        }

        function unlockScalingLayout() {
            if (!viewState.isScalingLocked) return;
            forPuzzle.style.width = "";
            forPuzzle.style.height = "";
            forPuzzle.style.maxWidth = "";
            forPuzzle.style.maxHeight = "";
            viewState.fitScaleLocked = null;
            viewState.isScalingLocked = false;
        }

        function updateViewControlLabels() {
            if (!viewControls) return;
            viewControls.zoom.textContent = `Zoom: ${viewState.enableZoom ? "On" : "Off"}`;
            viewControls.pan.textContent = `Pan: ${viewState.enablePan ? "On" : "Off"}`;
            viewControls.scaling.textContent = `Scaling: ${viewState.enableScaling ? "On" : "Off"}`;
            viewControls.reset.title = `Reset view (zoom ${viewState.zoom.toFixed(2)}x)`;
            viewControls.zoomValue.textContent = `${viewState.zoomSensitivity.toFixed(1)}x`;
            viewControls.panValue.textContent = `${viewState.panSensitivity.toFixed(1)}x`;
            const panButtonNames = ["Left", "Middle", "Right"];
            viewControls.panButtonToggle.textContent = `Pan with: ${panButtonNames[viewState.panButton]}`;
            viewControls.panButtonToggle.title = `Choose which mouse button starts panning (Left / Middle / Right). Currently: ${panButtonNames[viewState.panButton]}.`;
            [viewControls.zoom, viewControls.pan, viewControls.scaling].forEach((button, index) => {
                const enabled = [viewState.enableZoom, viewState.enablePan, viewState.enableScaling][index];
                button.classList.toggle("is-off", !enabled);
            });
        }

        function setScalingEnabled(enabled) {
            if (viewState.enableScaling === enabled) return;
            viewState.enableScaling = enabled;
            localStorage.setItem("viewEnableScaling", String(enabled));
            if (enabled) {
                unlockScalingLayout();
                queueUiEvent({ event: "resize" });
            } else {
                lockScalingLayout();
                const puzzle = getPuzzle();
                if (puzzle) {
                    puzzle.getContainerSize();
                    puzzle.prevWidth = puzzle.contWidth;
                    puzzle.prevHeight = puzzle.contHeight;
                }
            }
            applyViewTransform();
            updateViewControlLabels();
        }

        function initViewButtons() {
            const zoomToggle = document.getElementById("viewZoomToggle");
            const panToggle = document.getElementById("viewPanToggle");
            const scalingToggle = document.getElementById("viewScalingToggle");
            const resetButton = document.getElementById("viewResetButton");
            const zoomSensitivity = document.getElementById("viewZoomSensitivity");
            const panSensitivity = document.getElementById("viewPanSensitivity");
            const zoomSensitivityValue = document.getElementById("viewZoomSensitivityValue");
            const panSensitivityValue = document.getElementById("viewPanSensitivityValue");
            const fullscreenButton = document.getElementById("taskbarFullscreen");
            const panButtonToggle = document.getElementById("viewPanButtonToggle");
            if (!zoomToggle || !panToggle || !scalingToggle || !resetButton || !zoomSensitivity || !panSensitivity || !zoomSensitivityValue || !panSensitivityValue || !fullscreenButton) return;

            viewControls = {
                zoom: zoomToggle,
                pan: panToggle,
                scaling: scalingToggle,
                reset: resetButton,
                zoomSensitivity: zoomSensitivity,
                panSensitivity: panSensitivity,
                zoomValue: zoomSensitivityValue,
                panValue: panSensitivityValue,
                fullscreen: fullscreenButton,
                panButtonToggle: panButtonToggle || null
            };

            if (panButtonToggle) {
                panButtonToggle.addEventListener("click", () => {
                    viewState.panButton = (viewState.panButton + 1) % 3;
                    localStorage.setItem("viewPanButton", String(viewState.panButton));
                    updateViewControlLabels();
                });
            }

            zoomToggle.addEventListener("click", () => {
                viewState.enableZoom = !viewState.enableZoom;
                localStorage.setItem("viewEnableZoom", String(viewState.enableZoom));
                updateViewControlLabels();
            });
            panToggle.addEventListener("click", () => {
                viewState.enablePan = !viewState.enablePan;
                localStorage.setItem("viewEnablePan", String(viewState.enablePan));
                updateViewControlLabels();
            });
            scalingToggle.addEventListener("click", () => {
                setScalingEnabled(!viewState.enableScaling);
            });
            resetButton.addEventListener("click", resetView);
            zoomSensitivity.addEventListener("pointerdown", () => { sensitivityInteraction.zoom = true; });
            panSensitivity.addEventListener("pointerdown", () => { sensitivityInteraction.pan = true; });
            document.addEventListener("pointerup", () => {
                sensitivityInteraction.zoom = false;
                sensitivityInteraction.pan = false;
            });
            document.addEventListener("pointercancel", () => {
                sensitivityInteraction.zoom = false;
                sensitivityInteraction.pan = false;
            });
            zoomSensitivity.addEventListener("input", () => {
                if (sensitivityInteraction.zoom) {
                    viewState.zoomSensitivity = clamp(parseFloat(zoomSensitivity.value), 0.2, 3);
                    localStorage.setItem("viewZoomSensitivity", String(viewState.zoomSensitivity));
                    updateViewControlLabels();
                } else {
                    zoomSensitivity.value = viewState.zoomSensitivity.toFixed(1);
                    if (viewDebug) console.log("view zoom slider: ignored input, re-synced", viewState.zoomSensitivity);
                }
            });
            panSensitivity.addEventListener("input", () => {
                if (sensitivityInteraction.pan) {
                    viewState.panSensitivity = clamp(parseFloat(panSensitivity.value), 0.2, 3);
                    localStorage.setItem("viewPanSensitivity", String(viewState.panSensitivity));
                    updateViewControlLabels();
                } else {
                    panSensitivity.value = viewState.panSensitivity.toFixed(1);
                    if (viewDebug) console.log("view pan slider: ignored input, re-synced", viewState.panSensitivity);
                }
            });
            fullscreenButton.addEventListener("click", (e) => {
                e.stopPropagation();
                if (typeof globalScope.toggleFullscreen === "function") {
                    globalScope.toggleFullscreen();
                    return;
                }
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen?.();
                } else {
                    document.exitFullscreen?.();
                }
            });
            zoomSensitivity.value = viewState.zoomSensitivity.toFixed(1);
            panSensitivity.value = viewState.panSensitivity.toFixed(1);
            setScalingEnabled(viewState.enableScaling);
            updateViewControlLabels();
        }

        function initResizeAndGestures() {
            let resizeTimeout = null;
            globalScope.addEventListener("resize", () => {
                if (resizeTimeout) clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    queueUiEvent({ event: "resize" });
                    resizeTimeout = null;
                }, 300);
            });

            let lastTap = 0;
            forPuzzle.addEventListener("touchstart", (event) => {
                if (event.touches.length === 2) {
                    if (globalScope.moving && globalScope.moving.pp) {
                        event.preventDefault();
                        return;
                    }
                    if (viewState.enableZoom) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        const dist = touchDistance(event.touches);
                        pinchState.active = true;
                        pinchState.startDistance = dist || 1;
                        pinchState.startZoom = viewState.zoom;
                        pinchState.didMove = false;
                    }
                }
            }, { passive: false });

            forPuzzle.addEventListener("wheel", (event) => {
                const puzzle = getPuzzle();
                if (globalScope.moving) {
                    rotateCurrentPiece(event.deltaY < 0);
                    return;
                }
                if (!viewState.enableZoom || !puzzle) return;
                event.preventDefault();
                const zoomStep = getEffectiveZoomStep();
                const zoomMultiplier = event.deltaY < 0 ? zoomStep : 1 / zoomStep;
                zoomAroundPoint(event.clientX, event.clientY, viewState.zoom * zoomMultiplier);
            }, { passive: false });

            forPuzzle.addEventListener("touchmove", (event) => {
                if (event.touches.length !== 2) {
                    pinchState.active = false;
                } else if (globalScope.moving && globalScope.moving.pp) {
                    event.preventDefault();
                    pinchState.active = false;
                } else if (pinchState.active && viewState.enableZoom) {
                    event.preventDefault();
                    const dist = touchDistance(event.touches);
                    const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
                    // Ignore tiny pinch jitter and cap zoom recalculation cadence on mobile.
                    const distanceDelta = Math.abs(dist - pinchState.startDistance);
                    if (distanceDelta < 2.5) return;
                    if ((now - lastPinchZoomUpdateAt) < 16) return;
                    lastPinchZoomUpdateAt = now;
                    const mid = touchMidpoint(event.touches);
                    const targetZoom = pinchState.startZoom * (dist / pinchState.startDistance);
                    zoomAroundPoint(mid.x, mid.y, targetZoom, false);
                    pinchState.didMove = true;
                    return;
                }
                if (viewState.enablePan || viewState.enableZoom) event.preventDefault();
            }, { passive: false });

            forPuzzle.addEventListener("touchend", (event) => {
                if (event.touches.length < 2) {
                    if (pinchState.active && !pinchState.didMove) {
                        event.preventDefault();
                        rotateCurrentPiece();
                    }
                    pinchState.active = false;
                }
                if (event.touches.length !== 0) return;
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                if (event.changedTouches.length === 1 && tapLength < 300 && tapLength > 0) {
                    event.preventDefault();
                    if (!viewState.enableZoom) return;
                    const t = event.changedTouches[0];
                    zoomAroundPoint(t.clientX, t.clientY, viewState.zoom * getEffectiveZoomStep());
                }
                lastTap = currentTime;
            }, { passive: false });

            forPuzzle.addEventListener("dblclick", (event) => {
                if (!viewState.enableZoom) return;
                event.preventDefault();
                zoomAroundPoint(event.clientX, event.clientY, viewState.zoom * getEffectiveZoomStep());
            });
        }

        initDisplayOptionSliders();
        initBackgroundControls();
        initViewButtons();
        initResizeAndGestures();
        applyViewTransform();

        return {
            applyViewTransform: applyViewTransform,
            resetView: resetView,
            updateViewControlLabels: updateViewControlLabels,
            setScalingEnabled: setScalingEnabled,
            zoomAroundPoint: zoomAroundPoint
        };
    }

    globalScope.JigsawViewControls = { init: init };
})(window);
