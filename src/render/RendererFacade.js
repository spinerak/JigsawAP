"use strict";

(function initRendererFacade(globalScope) {
    class RendererFacade {
        constructor({ container, config, getPuzzleResolution }) {
            this.container = container;
            this.config = config || {};
            this.getPuzzleResolution = typeof getPuzzleResolution === "function" ? getPuzzleResolution : () => "1080p";
            this.canvasRenderer = null;
            this.webglRenderer = null;
            this.activeRenderer = null;
            const legacyMode = !!(config && config.legacyMode);
            this.scheduler = new globalScope.JigsawRenderScheduler({
                targetFrameMs: legacyMode ? 33 : 16
            });
            this.sceneState = new globalScope.JigsawPuzzleSceneState();
            this.media = new globalScope.JigsawMediaSourceAdapter();
            this.hitTest = new globalScope.JigsawHitTestService();
            this.mode = "canvas2d";
            this.requestedMode = "auto";
            this.activeMode = "none";
            this.modeNote = "";
            this.webglDowngraded = false;
            this.webglDowngradeReason = "";
            globalScope.rendererPerf = globalScope.rendererPerf || {
                frameCount: 0,
                renderedFrames: 0,
                skippedFrames: 0,
                lastFrameMs: 0,
                lastDrawCalls: 0,
                lastMediaUploads: 0
            };
        }

        _markWebGLDowngraded(reason, context = "unknown") {
            this.webglDowngraded = true;
            this.webglDowngradeReason = reason || "webgl downgrade";
            this.modeNote = this.webglDowngradeReason;
            this.mode = "canvas2d";
            this.requestedMode = "canvas2d";
            if (this.config) this.config.mode = "canvas2d";
            if (typeof console !== "undefined" && console.warn) {
                console.warn(`[RendererFacade] WebGL downgraded (${context}); using canvas2d.`, this.webglDowngradeReason);
            }
            this._emitStatusChange();
        }

        setWebGLUnavailableForSession(reason, context = "prestart-check") {
            this._markWebGLDowngraded(reason || "webgl unavailable for selected media", context);
        }

        _emitStatusChange() {
            if (typeof globalScope === "undefined" || !globalScope.dispatchEvent) return;
            try {
                globalScope.dispatchEvent(new CustomEvent("jigsaw-renderer-status-change", {
                    detail: this.getModeStatus()
                }));
            } catch (_e) {}
        }

        init(puzzle) {
            this.sceneState.bindPuzzle(puzzle);
            this.canvasRenderer = new globalScope.JigsawCanvasRenderer({ container: this.container });
            this.webglRenderer = new globalScope.JigsawWebGLRenderer({ container: this.container });
            this.selectMode(this.config.mode || "canvas2d", puzzle);
        }

        selectMode(requestedMode, puzzle) {
            const legacyMode = !!(this.config && this.config.legacyMode);
            if (this.scheduler) this.scheduler.targetFrameMs = legacyMode ? 33 : 16;
            const normalizedMode = (requestedMode === "webgl" || requestedMode === "auto" || requestedMode === "canvas2d")
                ? requestedMode
                : "canvas2d";
            this.requestedMode = legacyMode ? "canvas2d" : normalizedMode;
            this.mode = this.requestedMode;
            this.modeNote = legacyMode ? "legacy mode" : "";
            if (this.activeRenderer) this.activeRenderer.setVisible(false);
            this.activeRenderer = null;
            this.activeMode = "none";

            const tryWebGL = () => {
                if (!this.webglRenderer) return false;
                const ok = this.webglRenderer.init(puzzle);
                if (!ok) {
                    this._markWebGLDowngraded(this.webglRenderer.failureReason || "webgl initialization failed", "selectMode:init");
                    return false;
                }
                if (!this.webglRenderer.supportsPieceRendering) {
                    this.webglRenderer.setVisible(false);
                    this._markWebGLDowngraded(this.webglRenderer.failureReason || "webgl piece rendering unavailable", "selectMode:pieceRender");
                    return false;
                }
                this.activeRenderer = this.webglRenderer;
                this.activeMode = "webgl";
                this.mode = "webgl";
                return true;
            };

            const useCanvas = () => {
                if (!this.canvasRenderer) return false;
                this.canvasRenderer.init(puzzle);
                this.activeRenderer = this.canvasRenderer;
                this.activeMode = "canvas2d";
                this.mode = "canvas2d";
                return true;
            };

            const webglBlockedThisSession = this.webglDowngraded === true;
            if (legacyMode || (webglBlockedThisSession && normalizedMode !== "canvas2d")) {
                if (webglBlockedThisSession) this.modeNote = this.webglDowngradeReason || "webgl disabled for this session after downgrade";
                useCanvas();
            } else if (this.requestedMode === "webgl") {
                if (!tryWebGL() && this.config.autoFallback !== false) useCanvas();
            } else if (this.requestedMode === "auto") {
                if (!tryWebGL()) useCanvas();
            } else {
                useCanvas();
            }

            if (this.activeRenderer) this.activeRenderer.setVisible(true);
            if (this.activeRenderer && puzzle && puzzle.polyPieces && puzzle.polyPieces.length) {
                for (const pp of puzzle.polyPieces) pp.polypiece_drawImage(true);
                if (this.sceneState && this.sceneState.markAllDirty) this.sceneState.markAllDirty();
            }
            this._emitStatusChange();
        }

        ensureStartRendererCompatibility() {
            if (!this.sceneState || !this.sceneState.puzzle) return;
            const puzzle = this.sceneState.puzzle;
            if (this.activeRenderer !== this.webglRenderer || !this.webglRenderer || !this.webglRenderer.enabled) return;
            const sourceCanvas = puzzle.gameCanvas || null;
            if (!sourceCanvas || !this.webglRenderer._updateMediaTexture) return;
            if ((sourceCanvas.width | 0) <= 0 || (sourceCanvas.height | 0) <= 0) {
                if (this.config.autoFallback !== false) {
                    this._markWebGLDowngraded("invalid startup canvas dimensions", "startup-check:invalid-source");
                    this.selectMode("canvas2d", puzzle);
                    this.modeNote = this.webglDowngradeReason;
                    if (this.sceneState && this.sceneState.markAllDirty) this.sceneState.markAllDirty();
                    this._emitStatusChange();
                    return true;
                }
                return false;
            }
            const ok = this.webglRenderer._updateMediaTexture(sourceCanvas);
            if (!ok && this.config.autoFallback !== false) {
                const hardFailure = !!(
                    this.webglRenderer.contextLost ||
                    this.webglRenderer.enabled === false ||
                    this.webglRenderer.supportsPieceRendering === false
                );
                const reason = this.webglRenderer.failureReason || "";
                // Do not downgrade on transient startup timing (e.g., source not ready yet).
                if (!hardFailure && !reason) return false;
                this._markWebGLDowngraded(reason, "startup-check");
                this.selectMode("canvas2d", puzzle);
                this.modeNote = reason || "webgl startup compatibility check failed";
                if (this.sceneState && this.sceneState.markAllDirty) this.sceneState.markAllDirty();
                this._emitStatusChange();
                return true;
            }
            return false;
        }

        retryWebGLAfterDowngrade(preferredMode = "auto") {
            const puzzle = this.sceneState ? this.sceneState.puzzle : null;
            if (!puzzle) return false;
            if (puzzle._webglStartBlockedReason) {
                this._markWebGLDowngraded(puzzle._webglStartBlockedReason, "retry:blocked-source");
                this.selectMode("canvas2d", puzzle);
                if (this.sceneState && this.sceneState.markAllDirty) this.sceneState.markAllDirty();
                if (this.activeRenderer && this.activeRenderer.renderDirtyPieces) {
                    this.activeRenderer.renderDirtyPieces(this.sceneState);
                }
                this._emitStatusChange();
                return false;
            }
            this.webglDowngraded = false;
            this.webglDowngradeReason = "";
            const mode = (preferredMode === "webgl" || preferredMode === "auto") ? preferredMode : "auto";
            this.selectMode(mode, puzzle);
            if (this.activeMode === "webgl" && this.ensureStartRendererCompatibility() === true) {
                if (this.activeRenderer && this.activeRenderer.renderDirtyPieces) {
                    this.activeRenderer.renderDirtyPieces(this.sceneState);
                }
                return false;
            }
            if (this.activeMode === "webgl") {
                this.modeNote = "";
                if (this.sceneState && this.sceneState.markAllDirty) this.sceneState.markAllDirty();
                if (this.activeRenderer && this.activeRenderer.renderDirtyPieces) {
                    this.activeRenderer.renderDirtyPieces(this.sceneState);
                }
                this._emitStatusChange();
                return true;
            }
            this._markWebGLDowngraded(this.modeNote || "webgl retry failed", "retry");
            if (this.sceneState && this.sceneState.markAllDirty) this.sceneState.markAllDirty();
            if (this.activeRenderer && this.activeRenderer.renderDirtyPieces) {
                this.activeRenderer.renderDirtyPieces(this.sceneState);
            }
            this._emitStatusChange();
            return false;
        }

        getModeStatus() {
            return {
                requested: this.requestedMode || "auto",
                active: this.activeMode || "none",
                note: this.modeNote || "",
                webglDowngraded: this.webglDowngraded === true,
                webglDowngradeReason: this.webglDowngradeReason || ""
            };
        }

        setMediaSource(source, kind = "image") {
            if (this.media && this.media.setImageSource) {
                this.media.setImageSource(source, kind);
            }
            if (this.canvasRenderer && this.canvasRenderer.setMediaSource) {
                this.canvasRenderer.setMediaSource(source);
            }
            if (this.webglRenderer && this.webglRenderer.setMediaSource) {
                this.webglRenderer.setMediaSource(source);
            }
        }

        async setGifSource(url, fallbackImage) {
            if (!this.media || !this.media.startGifPlayback) {
                if (fallbackImage) this.setMediaSource(fallbackImage, "gif");
                this.modeNote = "gif decoder unavailable";
                return false;
            }
            const ok = await this.media.startGifPlayback(url);
            if (!ok) {
                if (fallbackImage) this.setMediaSource(fallbackImage, "gif");
                const st = this.media.getStatus ? this.media.getStatus() : null;
                this.modeNote = (st && st.failureReason) ? st.failureReason : "gif decode failed";
                return false;
            }
            if (this.canvasRenderer && this.canvasRenderer.setMediaSource) {
                this.canvasRenderer.setMediaSource(this.media.getFrameSource());
            }
            if (this.webglRenderer && this.webglRenderer.setMediaSource) {
                this.webglRenderer.setMediaSource(this.media.getFrameSource());
            }
            return true;
        }

        setVideoSource(videoEl, kind = "video") {
            if (this.media && this.media.setVideoElement) {
                this.media.setVideoElement(videoEl, kind);
            }
            if (this.canvasRenderer && this.canvasRenderer.setMediaSource) {
                this.canvasRenderer.setMediaSource(videoEl);
            }
            if (this.webglRenderer && this.webglRenderer.setMediaSource) {
                this.webglRenderer.setMediaSource(videoEl);
            }
        }

        async setCameraStream(constraints = { video: true, audio: false }) {
            if (!this.media || !this.media.setCameraStream) return null;
            await this.media.setCameraStream(constraints);
            const source = this.media.getFrameSource();
            if (this.canvasRenderer && this.canvasRenderer.setMediaSource) {
                this.canvasRenderer.setMediaSource(source);
            }
            if (this.webglRenderer && this.webglRenderer.setMediaSource) {
                this.webglRenderer.setMediaSource(source);
            }
            return source;
        }

        async setDisplayStream(stream) {
            if (!this.media || !this.media.setDisplayStream) return null;
            await this.media.setDisplayStream(stream);
            const source = this.media.getFrameSource();
            if (this.canvasRenderer && this.canvasRenderer.setMediaSource) {
                this.canvasRenderer.setMediaSource(source);
            }
            if (this.webglRenderer && this.webglRenderer.setMediaSource) {
                this.webglRenderer.setMediaSource(source);
            }
            return source;
        }

        _computeCappedResolution(width, height, preset) {
            if (!preset || preset === "native" || width <= 0 || height <= 0) {
                return { cappedW: Math.max(1, Math.round(width)), cappedH: Math.max(1, Math.round(height)) };
            }
            let maxW = 1920, maxH = 1080;
            if (preset === "16k") { maxW = 15360; maxH = 8640; }
            else if (preset === "8k") { maxW = 7680; maxH = 4320; }
            else if (preset === "4k") { maxW = 3840; maxH = 2160; }
            else if (preset === "1440p") { maxW = 2560; maxH = 1440; }
            else if (preset === "1080p") { maxW = 1920; maxH = 1080; }
            else if (preset === "720p") { maxW = 1280; maxH = 720; }
            else if (preset === "540p") { maxW = 960; maxH = 540; }
            else {
                return { cappedW: Math.max(1, Math.round(width)), cappedH: Math.max(1, Math.round(height)) };
            }
            const scale = Math.min(maxW / width, maxH / height, 1);
            const cappedW = Math.max(1, Math.round(width * scale));
            const cappedH = Math.max(1, Math.round(height * scale));
            return { cappedW, cappedH };
        }

        onResize(width, height) {
            const preset = this.getPuzzleResolution();
            const { cappedW, cappedH } = this._computeCappedResolution(width, height, preset);
            const displayW = Math.max(1, Math.round(width));
            const displayH = Math.max(1, Math.round(height));
            if (this.canvasRenderer) this.canvasRenderer.resize(cappedW, cappedH, displayW, displayH);
            if (this.webglRenderer) this.webglRenderer.resize(cappedW, cappedH, displayW, displayH);
            if (this.sceneState && this.sceneState.markAllDirty) this.sceneState.markAllDirty();
        }

        _isWebGLRuntimeFailed() {
            if (this.activeRenderer !== this.webglRenderer || !this.webglRenderer) return false;
            return this.webglRenderer.contextLost || !this.webglRenderer.enabled || !this.webglRenderer.supportsPieceRendering;
        }

        _fallbackToCanvasFromWebGL(context = "runtime-failure") {
            if (this.config.autoFallback === false) return;
            const reason = this.webglRenderer && this.webglRenderer.failureReason
                ? this.webglRenderer.failureReason
                : "webgl runtime failure";
            this._markWebGLDowngraded(reason, context);
            this.selectMode("canvas2d", this.sceneState ? this.sceneState.puzzle : null);
            this.modeNote = reason;
            if (this.sceneState && this.sceneState.markAllDirty) this.sceneState.markAllDirty();
            this._emitStatusChange();
        }

        renderFrame(nowMs) {
            if (!this.activeRenderer) return;
            const perf = globalScope.rendererPerf;
            if (perf) perf.frameCount += 1;
            const puzzle = this.sceneState ? this.sceneState.puzzle : null;
            let mediaAdvanced = false;
            if (this.media && puzzle) {
                const advanced = this.media.updateFrameClock(nowMs);
                const mediaStatus = this.media.getStatus ? this.media.getStatus() : null;
                if (mediaStatus && mediaStatus.failureReason && this.requestedMode === "webgl") {
                    this.modeNote = mediaStatus.failureReason;
                    this._emitStatusChange();
                }
                if (advanced && this.scheduler.shouldRender(nowMs)) {
                    const frameSource = this.media.getFrameSource();
                    if (frameSource && puzzle.applyMediaFrame && puzzle.applyMediaFrame(frameSource, nowMs)) {
                        this.sceneState.markAllDirty();
                    }
                    mediaAdvanced = true;
                }
            }
            if (!this.scheduler.shouldRender(nowMs)) return;

            if (this.media && puzzle && !mediaAdvanced) {
                const status = this.media.getStatus ? this.media.getStatus() : null;
                const kind = status && status.kind ? status.kind : "image";
                const animated = kind === "video" || kind === "camera" || kind === "display" || kind === "gif-decoded";
                if (animated) {
                    const frameSource = this.media.getFrameSource();
                    if (frameSource && puzzle.applyMediaFrame && puzzle.applyMediaFrame(frameSource, nowMs)) {
                        this.sceneState.markAllDirty();
                        mediaAdvanced = true;
                    }
                }
            }

            // Catch WebGL failures before dirty-skip can short-circuit fallback.
            if (this._isWebGLRuntimeFailed()) {
                this._fallbackToCanvasFromWebGL("runtime-precheck");
            }

            if (!mediaAdvanced && this.sceneState && this.sceneState.hasDirtyPieces && !this.sceneState.hasDirtyPieces()) {
                if (perf) perf.skippedFrames += 1;
                return;
            }
            if (this.sceneState && this.sceneState.consumeDirtyPieces) this.sceneState.consumeDirtyPieces();
            if (this.sceneState) this.sceneState.mediaContentDirty = mediaAdvanced;
            const t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
            this.activeRenderer.renderFrame(nowMs, this.sceneState);

            // If WebGL failed during this frame, fallback immediately and force redraw.
            if (this._isWebGLRuntimeFailed()) {
                this._fallbackToCanvasFromWebGL("runtime-postrender");
                if (this.activeRenderer && this.activeRenderer.renderDirtyPieces) {
                    this.activeRenderer.renderDirtyPieces(this.sceneState);
                }
            }

            const t1 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
            if (perf) {
                perf.renderedFrames += 1;
                perf.lastFrameMs = Math.max(0, t1 - t0);
                perf.lastDrawCalls = this.activeRenderer.lastDrawCount || 0;
                perf.lastMediaUploads = this.activeRenderer.lastMediaUploads || 0;
            }
        }

        renderDirtyPieces() {
            if (this.activeRenderer && this.activeRenderer.renderDirtyPieces) {
                this.activeRenderer.renderDirtyPieces(this.sceneState);
            }
        }

        findTopPieceAt(puzzle, x, y) {
            return this.hitTest.findTopPieceAt(puzzle, x, y);
        }

        destroy() {
            if (this.canvasRenderer) this.canvasRenderer.destroy();
            if (this.webglRenderer) this.webglRenderer.destroy();
            this.activeRenderer = null;
        }
    }

    globalScope.JigsawRendererFacade = RendererFacade;
})(window);

