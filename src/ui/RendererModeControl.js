"use strict";

(function initRendererModeControlModule(globalScope) {
    function create(deps) {
        let rendererModeControl = null;

        function getModeStatus() {
            const facade = deps.getRendererFacade();
            if (!facade || typeof facade.getModeStatus !== "function") {
                return { active: "none", note: "" };
            }
            return facade.getModeStatus() || { active: "none", note: "" };
        }

        function refreshRendererModeControl() {
            if (!rendererModeControl || !rendererModeControl.select) return;
            const cfg = deps.getRendererConfig() || {};
            const modeStatus = getModeStatus();
            const webglDowngraded = modeStatus.webglDowngraded === true;
            const legacyMode = !!cfg.legacyMode;
            const requested = cfg.mode || "auto";
            const active = modeStatus.active || "none";
            const forceCanvas = webglDowngraded || legacyMode;
            const wantedValue = forceCanvas ? "canvas2d" : (active === "webgl" || active === "canvas2d" ? active : requested);
            if (document.activeElement !== rendererModeControl.select && !rendererModeControl.select._rendererSelecting) {
                rendererModeControl.select.value = wantedValue;
            }

            const webglOpt = rendererModeControl.select.querySelector('option[value="webgl"]');
            const autoOpt = rendererModeControl.select.querySelector('option[value="auto"]');
            if (webglOpt) webglOpt.disabled = forceCanvas;
            if (autoOpt) autoOpt.disabled = forceCanvas;
            rendererModeControl.select.title = legacyMode
                ? "Legacy mode is on. Only Canvas2D is used; uncheck Legacy mode to enable WebGL/Auto."
                : (webglDowngraded
                    ? "WebGL is disabled for this session after fallback/downgrade. Use Canvas2D. Refresh to retry WebGL."
                    : "Auto: attempts WebGL and falls back to Canvas2D. WebGL: fastest GPU path when available. Canvas2D: most compatible fallback.");

            if (rendererModeControl.status && rendererModeControl.fallbackRow) {
                const note = modeStatus.note || modeStatus.webglDowngradeReason || "";
                if (legacyMode) {
                    rendererModeControl.fallbackRow.style.display = "flex";
                    rendererModeControl.status.textContent = "Legacy mode: Canvas2D only. Uncheck Legacy mode to enable WebGL.";
                } else if (webglDowngraded) {
                    rendererModeControl.fallbackRow.style.display = "flex";
                    rendererModeControl.status.textContent = note ? `WebGL fallback: ${note}` : "WebGL fallback active for this session.";
                } else {
                    rendererModeControl.fallbackRow.style.display = "none";
                    rendererModeControl.status.textContent = "";
                }
                rendererModeControl.status.title = rendererModeControl.select.title;
            }
            if (rendererModeControl.retryBtn) {
                rendererModeControl.retryBtn.disabled = legacyMode || !webglDowngraded;
                rendererModeControl.retryBtn.title = legacyMode
                    ? "WebGL retry is disabled in Legacy mode. Uncheck Legacy mode first."
                    : (webglDowngraded
                        ? "Retry WebGL now. This clears the current downgrade lock and attempts WebGL again."
                        : "WebGL retry is only shown after a downgrade.");
            }
        }

        function setRendererMode(mode) {
            const cfg = deps.getRendererConfig() || {};
            if (mode !== "canvas2d" && mode !== "webgl" && mode !== "auto") mode = "auto";
            const modeStatus = getModeStatus();
            const legacyMode = !!cfg.legacyMode;
            if (modeStatus.webglDowngraded === true && mode === "webgl") {
                mode = "canvas2d";
            }
            if (legacyMode && mode !== "canvas2d") {
                mode = "canvas2d";
            }
            cfg.mode = mode;
            deps.setRendererConfig(cfg);
            const facade = deps.getRendererFacade();
            const puzzle = deps.getPuzzle();
            if (facade && puzzle) {
                facade.selectMode(mode, puzzle);
                facade.onResize(
                    puzzle.contWidth || puzzle.container.clientWidth || 1,
                    puzzle.contHeight || puzzle.container.clientHeight || 1
                );
                if (puzzle.polyPieces && puzzle.polyPieces.length) {
                    for (const pp of puzzle.polyPieces) deps.queuePolyPieceSetup(pp, false, true);
                    facade.renderDirtyPieces();
                }
            }
            refreshRendererModeControl();
        }

        function initRendererModeControl() {
            const select = document.getElementById("rendererModeSelect");
            const status = document.getElementById("rendererModeStatus");
            const retryBtn = document.getElementById("rendererModeRetry");
            const fallbackRow = document.getElementById("rendererFallbackRow");
            if (!select) return;
            select.addEventListener("change", () => setRendererMode(select.value));
            select.addEventListener("pointerdown", () => {
                // Avoid refresh races while the dropdown is being opened.
                select._rendererSelecting = true;
            });
            select.addEventListener("blur", () => {
                select._rendererSelecting = false;
                refreshRendererModeControl();
            });
            if (retryBtn) {
                retryBtn.addEventListener("click", () => {
                    const facade = deps.getRendererFacade();
                    const puzzle = deps.getPuzzle();
                    if (facade && puzzle && facade.retryWebGLAfterDowngrade) {
                        const ok = facade.retryWebGLAfterDowngrade("auto");
                        if (!ok && typeof console !== "undefined" && console.warn) {
                            console.warn("[RendererModeControl] WebGL retry failed; staying on canvas2d.");
                        }
                    }
                    refreshRendererModeControl();
                });
            }
            rendererModeControl = { control: null, select: select, status: status, retryBtn: retryBtn || null, fallbackRow: fallbackRow || null };
            refreshRendererModeControl();
            globalScope.addEventListener("jigsaw-renderer-status-change", refreshRendererModeControl);

            const resolutionSelect = document.getElementById("puzzleResolutionSelect");
            if (resolutionSelect && typeof deps.getPuzzleResolution === "function" && typeof deps.setPuzzleResolution === "function") {
                const current = deps.getPuzzleResolution();
                const resolved = (current === "16k" || current === "8k" || current === "4k" || current === "1440p" || current === "1080p" || current === "720p" || current === "540p") ? current : "1080p";
                resolutionSelect.value = resolved;
                resolutionSelect.addEventListener("change", () => {
                    const value = resolutionSelect.value;
                    if (value !== "16k" && value !== "8k" && value !== "4k" && value !== "1440p" && value !== "1080p" && value !== "720p" && value !== "540p") return;
                    deps.setPuzzleResolution(value);
                    const facade = deps.getRendererFacade();
                    const puzzle = deps.getPuzzle();
                    if (facade && puzzle && typeof puzzle.contWidth === "number" && typeof puzzle.contHeight === "number") {
                        facade.onResize(puzzle.contWidth, puzzle.contHeight);
                    }
                });
            }

            const videoFrameRateSelect = document.getElementById("videoFrameRateSelect");
            if (videoFrameRateSelect) {
                const viewState = globalScope.viewState;
                const validValues = ["0", "16", "33", "42", "50", "66"];
                const initialMs = (viewState && typeof viewState.videoFrameIntervalMs === "number") ? viewState.videoFrameIntervalMs : 33;
                const initialValue = String(validValues.includes(String(initialMs)) ? initialMs : 33);
                videoFrameRateSelect.value = initialValue;
                const facade = deps.getRendererFacade();
                if (facade && facade.media) facade.media.frameIntervalMs = initialMs;
                videoFrameRateSelect.addEventListener("change", () => {
                    const value = videoFrameRateSelect.value;
                    if (!validValues.includes(value)) return;
                    const ms = parseInt(value, 10);
                    if (viewState) viewState.videoFrameIntervalMs = ms;
                    if (globalScope.localStorage) globalScope.localStorage.setItem("videoFrameIntervalMs", String(ms));
                    const fac = deps.getRendererFacade();
                    if (fac && fac.media) fac.media.frameIntervalMs = ms;
                });
            }

            const legacyCheckbox = document.getElementById("rendererLegacyMode");
            if (legacyCheckbox) {
                const saved = globalScope.localStorage && globalScope.localStorage.getItem("rendererLegacyMode");
                const initial = saved === "true";
                legacyCheckbox.checked = initial;
                const cfg = deps.getRendererConfig();
                if (cfg) cfg.legacyMode = initial;
                legacyCheckbox.addEventListener("change", () => {
                    const legacy = !!legacyCheckbox.checked;
                    const c = deps.getRendererConfig();
                    if (c) c.legacyMode = legacy;
                    if (globalScope.localStorage) globalScope.localStorage.setItem("rendererLegacyMode", legacy ? "true" : "false");
                    const facade = deps.getRendererFacade();
                    const puzzle = deps.getPuzzle();
                    if (facade) {
                        if (facade.scheduler) facade.scheduler.targetFrameMs = legacy ? 33 : 16;
                        if (puzzle) {
                            facade.selectMode(legacy ? "canvas2d" : (c && c.mode) || "auto", puzzle);
                            if (typeof facade.onResize === "function" && typeof puzzle.contWidth === "number" && typeof puzzle.contHeight === "number") {
                                facade.onResize(puzzle.contWidth, puzzle.contHeight);
                            }
                            if (legacy && facade.renderDirtyPieces) facade.renderDirtyPieces();
                        }
                    }
                    refreshRendererModeControl();
                });
            }
        }

        function runRendererPerfBench(durationMs = 5000) {
            const start = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
            const targetEnd = start + Math.max(250, durationMs);
            const samples = [];
            return new Promise((resolve) => {
                const step = () => {
                    const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
                    if (globalScope.rendererPerf) {
                        samples.push({
                            t: now,
                            frameMs: globalScope.rendererPerf.lastFrameMs || 0,
                            drawCalls: globalScope.rendererPerf.lastDrawCalls || 0,
                            mediaUploads: globalScope.rendererPerf.lastMediaUploads || 0
                        });
                    }
                    if (now >= targetEnd) {
                        const n = samples.length || 1;
                        const totalFrameMs = samples.reduce((a, s) => a + s.frameMs, 0);
                        const totalDrawCalls = samples.reduce((a, s) => a + s.drawCalls, 0);
                        const totalUploads = samples.reduce((a, s) => a + s.mediaUploads, 0);
                        const summary = {
                            samples: samples.length,
                            avgFrameMs: totalFrameMs / n,
                            avgDrawCalls: totalDrawCalls / n,
                            avgMediaUploads: totalUploads / n
                        };
                        console.log("[RendererPerfBench]", summary);
                        resolve(summary);
                        return;
                    }
                    requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            });
        }

        return {
            initRendererModeControl: initRendererModeControl,
            refreshRendererModeControl: refreshRendererModeControl,
            setRendererMode: setRendererMode,
            runRendererPerfBench: runRendererPerfBench
        };
    }

    globalScope.JigsawRendererModeControl = { create: create };
})(window);
