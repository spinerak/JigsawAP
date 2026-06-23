"use strict";

(function initPreviewSurfaceManager(globalScope) {
    const TARGET_FRAME_MS_ACTIVE = 1000 / 60;
    const GRAYSCALE_VIDEO_INTERVAL_MS = 120;
    const PREVIEW_OUTLINE_STROKE_PX = 3;

    class PreviewSurfaceManager {
        constructor({ getPuzzle, getRendererFacade, getViewState, getApDimensions } = {}) {
            this.getPuzzle = typeof getPuzzle === "function" ? getPuzzle : () => null;
            this.getRendererFacade = typeof getRendererFacade === "function" ? getRendererFacade : () => null;
            this.getViewState = typeof getViewState === "function" ? getViewState : () => ({});
            this.getApDimensions = typeof getApDimensions === "function" ? getApDimensions : () => ({ apnx: 0, apny: 0 });

            this.tmpImage = null;
            this.tmpPreviewCtx = null;
            this.syncedPreviewCanvas = null;
            this.syncedPreviewCtx = null;
            this.lastSyncedPreviewAt = 0;
            this.hasDrawnStaticSyncedPreview = false;
            this.prestartPreviewDirty = true;
            this.lastPrestartPreviewAt = 0;
            this.grayscaleReferenceCanvas = null;
            this.grayscaleReferenceCtx = null;
            this.lastGrayscaleUpdateMs = 0;
            this.interactionActive = false;
            this._stats = {
                syncedDraws: 0,
                syncedSkippedHidden: 0,
                syncedSkippedInvisible: 0,
                prestartDraws: 0,
                prestartSkippedInteraction: 0,
                grayscaleDraws: 0,
                grayscaleSkippedInteraction: 0,
                grayscaleSkippedHidden: 0,
                lastIntervalMs: TARGET_FRAME_MS_ACTIVE
            };
        }

        getPrestartCanvas() {
            return this.tmpImage;
        }

        hasPrestartCanvas() {
            return !!this.tmpImage;
        }

        markPrestartDirty() {
            this.prestartPreviewDirty = true;
        }

        clearPrestartDirty() {
            this.prestartPreviewDirty = false;
        }

        resetSyncedPreviewCache() {
            this.hasDrawnStaticSyncedPreview = false;
        }

        resetCadence() {
            this.lastSyncedPreviewAt = 0;
            this.lastPrestartPreviewAt = 0;
            this.lastGrayscaleUpdateMs = 0;
            this.hasDrawnStaticSyncedPreview = false;
            this.prestartPreviewDirty = true;
        }

        getPreviewSourceDimensions(source) {
            if (!source) return { w: 0, h: 0 };
            const w = source.videoWidth || source.naturalWidth || source.width || 0;
            const h = source.videoHeight || source.naturalHeight || source.height || 0;
            return { w: w | 0, h: h | 0 };
        }

        setInteractionActive(active) {
            this.interactionActive = !!active;
        }

        isDocumentHidden() {
            return typeof document !== "undefined" && !!document.hidden;
        }

        isSyncedPreviewVisible() {
            const syncedPreviewCanvas = this.ensureSyncedPreviewCanvas();
            if (!syncedPreviewCanvas) return false;
            const parent = syncedPreviewCanvas.parentElement;
            if (!parent || !parent.style) return true;
            return parent.style.display !== "none" && parent.style.visibility !== "hidden";
        }

        getStatsSnapshot() {
            return {
                interactionActive: !!this.interactionActive,
                syncedDraws: this._stats.syncedDraws,
                syncedSkippedHidden: this._stats.syncedSkippedHidden,
                syncedSkippedInvisible: this._stats.syncedSkippedInvisible,
                prestartDraws: this._stats.prestartDraws,
                prestartSkippedInteraction: this._stats.prestartSkippedInteraction,
                grayscaleDraws: this._stats.grayscaleDraws,
                grayscaleSkippedInteraction: this._stats.grayscaleSkippedInteraction,
                grayscaleSkippedHidden: this._stats.grayscaleSkippedHidden,
                lastIntervalMs: this._stats.lastIntervalMs
            };
        }

        resolvePrestartPreviewSource() {
            const rendererFacade = this.getRendererFacade();
            if (rendererFacade && rendererFacade.media && typeof rendererFacade.media.getFrameSource === "function") {
                const src = rendererFacade.media.getFrameSource();
                if (src) return src;
            }
            const puzzle = this.getPuzzle();
            return puzzle && puzzle.srcImage ? puzzle.srcImage : null;
        }

        ensurePreviewPuzzleDimensions() {
            const puzzle = this.getPuzzle();
            if (!puzzle || typeof puzzle.computenxAndny !== "function") return;
            const dims = this.getApDimensions();
            const apnx = dims && Number.isFinite(dims.apnx) ? dims.apnx : 0;
            const apny = dims && Number.isFinite(dims.apny) ? dims.apny : 0;
            if (!(apnx > 0 && apny > 0)) return;
            if (puzzle.nx !== apnx || puzzle.ny !== apny) {
                puzzle.computenxAndny(apnx, apny);
                puzzle._previewDimsChanged = true;
            }
        }

        getPrestartPreviewDisplaySize() {
            const puzzle = this.getPuzzle();
            if (!puzzle) return { w: 1, h: 1 };
            const w = (typeof puzzle._mediaContentWidth === "number" && puzzle._mediaContentWidth > 0)
                ? puzzle._mediaContentWidth
                : ((typeof puzzle.gameWidth === "number" && puzzle.gameWidth > 0) ? puzzle.gameWidth : (puzzle.contWidth || 1));
            const h = (typeof puzzle._mediaContentHeight === "number" && puzzle._mediaContentHeight > 0)
                ? puzzle._mediaContentHeight
                : ((typeof puzzle.gameHeight === "number" && puzzle.gameHeight > 0) ? puzzle.gameHeight : (puzzle.contHeight || 1));
            return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
        }

        layoutPrestartPreviewCanvas() {
            const puzzle = this.getPuzzle();
            if (!this.tmpImage || !puzzle) return;
            const display = this.getPrestartPreviewDisplaySize();
            this.tmpImage.style.position = "absolute";
            this.tmpImage.style.width = display.w + "px";
            this.tmpImage.style.height = display.h + "px";
            this.tmpImage.style.top = "50%";
            this.tmpImage.style.left = "50%";
            this.tmpImage.style.transform = "translate(-50%,-50%)";
        }

        ensureSyncedPreviewCanvas() {
            if (!this.syncedPreviewCanvas) {
                this.syncedPreviewCanvas = document.getElementById("prevsync");
                if (!this.syncedPreviewCanvas) return null;
                this.syncedPreviewCtx = this.syncedPreviewCanvas.getContext("2d");
            }
            return this.syncedPreviewCanvas;
        }

        drawSyncedPreviewWindowFrame() {
            const syncedPreviewCanvas = this.ensureSyncedPreviewCanvas();
            if (!syncedPreviewCanvas || !this.syncedPreviewCtx) return false;
            if (this.isDocumentHidden()) {
                this._stats.syncedSkippedHidden += 1;
                return false;
            }
            if (!this.isSyncedPreviewVisible()) {
                this._stats.syncedSkippedInvisible += 1;
                return false;
            }
            const source = this.resolvePrestartPreviewSource();
            if (!source) return false;
            if (source.tagName === "VIDEO" && source.readyState < 2) return false;
            const dims = this.getPreviewSourceDimensions(source);
            if (dims.w <= 0 || dims.h <= 0) return false;
            let resized = false;
            if (syncedPreviewCanvas.width !== dims.w || syncedPreviewCanvas.height !== dims.h) {
                syncedPreviewCanvas.width = dims.w;
                syncedPreviewCanvas.height = dims.h;
                resized = true;
            }
            this.syncedPreviewCtx.clearRect(0, 0, syncedPreviewCanvas.width, syncedPreviewCanvas.height);
            this.syncedPreviewCtx.drawImage(source, 0, 0, syncedPreviewCanvas.width, syncedPreviewCanvas.height);
            this._stats.syncedDraws += 1;
            if (resized && typeof globalScope.requestPreviewSyncResize === "function") {
                globalScope.requestPreviewSyncResize();
            }
            return true;
        }

        drawPrestartPreviewFrame(force = false) {
            const puzzle = this.getPuzzle();
            if (!this.tmpImage || this.tmpImage.tagName !== "CANVAS" || !this.tmpPreviewCtx || !puzzle) return false;
            if (this.interactionActive && !force) {
                this._stats.prestartSkippedInteraction += 1;
                return false;
            }
            const source = this.resolvePrestartPreviewSource();
            if (!source) return false;
            if (source.tagName === "VIDEO" && source.readyState < 2) return false;
            this.ensurePreviewPuzzleDimensions();
            if (puzzle._previewDimsChanged || !(puzzle.gameWidth > 0) || !(puzzle.gameHeight > 0)) {
                puzzle._previewDimsChanged = false;
                if (typeof puzzle.puzzle_scale === "function") puzzle.puzzle_scale();
            }
            const internalW = Math.max(1, Math.round(puzzle.gameWidth || 1));
            const internalH = Math.max(1, Math.round(puzzle.gameHeight || 1));
            if (this.tmpImage.width !== internalW || this.tmpImage.height !== internalH) {
                this.tmpImage.width = internalW;
                this.tmpImage.height = internalH;
            }
            this.layoutPrestartPreviewCanvas();
            if (typeof puzzle.renderSourceToGameCanvas === "function") puzzle.renderSourceToGameCanvas(source);
            this.tmpPreviewCtx.clearRect(0, 0, this.tmpImage.width, this.tmpImage.height);
            if (puzzle.gameCanvas) {
                this.tmpPreviewCtx.drawImage(puzzle.gameCanvas, 0, 0, this.tmpImage.width, this.tmpImage.height);
            } else {
                this.tmpPreviewCtx.drawImage(source, 0, 0, this.tmpImage.width, this.tmpImage.height);
            }
            this._stats.prestartDraws += 1;
            return true;
        }

        setupPrestartPreviewCanvas({ boxShadow } = {}) {
            const puzzle = this.getPuzzle();
            if (!puzzle || !puzzle.container) return null;
            this.tmpImage = document.createElement("canvas");
            this.tmpPreviewCtx = this.tmpImage.getContext("2d");
            const source = this.resolvePrestartPreviewSource();
            const dims = this.getPreviewSourceDimensions(source);
            this.tmpImage.width = Math.max(1, dims.w || (puzzle.srcImage && puzzle.srcImage.naturalWidth | 0) || 1);
            this.tmpImage.height = Math.max(1, dims.h || (puzzle.srcImage && puzzle.srcImage.naturalHeight | 0) || 1);
            this.layoutPrestartPreviewCanvas();
            if (boxShadow) this.tmpImage.style.boxShadow = boxShadow;
            puzzle.container.appendChild(this.tmpImage);
            this.drawPrestartPreviewFrame(true);
            this.prestartPreviewDirty = false;
            return this.tmpImage;
        }

        updateGrayscaleReferenceCanvas() {
            const puzzle = this.getPuzzle();
            const viewState = this.getViewState() || {};
            if (!puzzle || !puzzle.container) return;
            const showGrayscale = !!viewState.showGrayscaleReference;
            const showOutline = !!viewState.showPreviewOutline;
            if (!showGrayscale && !showOutline) {
                if (this.grayscaleReferenceCanvas && this.grayscaleReferenceCanvas.parentNode) {
                    this.grayscaleReferenceCanvas.parentNode.removeChild(this.grayscaleReferenceCanvas);
                }
                this.grayscaleReferenceCanvas = null;
                this.grayscaleReferenceCtx = null;
                return;
            }
            if (this.isDocumentHidden()) {
                this._stats.grayscaleSkippedHidden += 1;
                return;
            }
            if (!puzzle.gameCanvas || !puzzle.gameCtx || typeof puzzle.gameWidth !== "number" || puzzle.gameWidth <= 0 || typeof puzzle.gameHeight !== "number" || puzzle.gameHeight <= 0) return;
            const w = Math.max(1, Math.round(puzzle.gameWidth));
            const h = Math.max(1, Math.round(puzzle.gameHeight));
            const contentW = (typeof puzzle._mediaContentWidth === "number" && puzzle._mediaContentWidth > 0)
                ? puzzle._mediaContentWidth
                : ((puzzle.nx && puzzle.ny) ? puzzle.nx * puzzle.scalex : w);
            const contentH = (typeof puzzle._mediaContentHeight === "number" && puzzle._mediaContentHeight > 0)
                ? puzzle._mediaContentHeight
                : ((puzzle.nx && puzzle.ny) ? puzzle.ny * puzzle.scaley : h);
            const displayW = Math.max(1, Math.round(contentW));
            const displayH = Math.max(1, Math.round(contentH));
            const halfRes = 2;
            const bufW = Math.max(1, Math.floor(w / halfRes));
            const bufH = Math.max(1, Math.floor(h / halfRes));
            if (!this.grayscaleReferenceCanvas) {
                this.grayscaleReferenceCanvas = document.createElement("canvas");
                this.grayscaleReferenceCtx = this.grayscaleReferenceCanvas.getContext("2d");
                this.grayscaleReferenceCanvas.className = "grayscale-reference-canvas";
                this.grayscaleReferenceCanvas.style.position = "absolute";
                this.grayscaleReferenceCanvas.style.pointerEvents = "none";
                this.grayscaleReferenceCanvas.style.zIndex = "99999997";
            }
            if (this.grayscaleReferenceCanvas.width !== bufW || this.grayscaleReferenceCanvas.height !== bufH) {
                this.grayscaleReferenceCanvas.width = bufW;
                this.grayscaleReferenceCanvas.height = bufH;
            }
            this.grayscaleReferenceCanvas.style.width = displayW + "px";
            this.grayscaleReferenceCanvas.style.height = displayH + "px";
            const grayscaleLeft = (puzzle.contWidth != null && puzzle.contHeight != null) ? (puzzle.contWidth - displayW) / 2 : (puzzle.offsx || 0);
            const grayscaleTop = (puzzle.contWidth != null && puzzle.contHeight != null) ? (puzzle.contHeight - displayH) / 2 : (puzzle.offsy || 0);
            this.grayscaleReferenceCanvas.style.left = grayscaleLeft + "px";
            this.grayscaleReferenceCanvas.style.top = grayscaleTop + "px";
            if (!this.grayscaleReferenceCtx) return;

            if (showGrayscale) {
                const nowMs = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
                const rendererFacade = this.getRendererFacade();
                const frameSource = (rendererFacade && rendererFacade.media && typeof rendererFacade.media.getFrameSource === "function") ? rendererFacade.media.getFrameSource() : null;
                const mediaStatus = (rendererFacade && rendererFacade.media && typeof rendererFacade.media.getStatus === "function") ? rendererFacade.media.getStatus() : null;
                const kind = mediaStatus && mediaStatus.kind ? mediaStatus.kind : "image";
                const isVideoSource = !!(frameSource && typeof frameSource.videoWidth === "number" && typeof frameSource.videoHeight === "number");
                const isAnimated = isVideoSource || kind === "gif-decoded";
                const interactionIntervalMs = this.interactionActive ? Math.max(GRAYSCALE_VIDEO_INTERVAL_MS, 250) : GRAYSCALE_VIDEO_INTERVAL_MS;
                if (!isAnimated || (nowMs - this.lastGrayscaleUpdateMs) >= interactionIntervalMs) {
                    if (isAnimated) this.lastGrayscaleUpdateMs = nowMs;
                    this.grayscaleReferenceCtx.filter = "grayscale(1) contrast(0.5)";
                    if (isVideoSource && frameSource && puzzle._gifDraw) {
                        const g = puzzle._gifDraw;
                        const vw = Math.max(1, frameSource.videoWidth || 1);
                        const vh = Math.max(1, frameSource.videoHeight || 1);
                        const dx = g.dx / halfRes;
                        const dy = g.dy / halfRes;
                        const dw = g.dw / halfRes;
                        const dh = g.dh / halfRes;
                        const baseW = Math.max(1, g.sourceW || vw);
                        const baseH = Math.max(1, g.sourceH || vh);
                        const sx = Math.max(0, Math.min(vw - 1, Math.round((g.sx || 0) * (vw / baseW))));
                        const sy = Math.max(0, Math.min(vh - 1, Math.round((g.sy || 0) * (vh / baseH))));
                        const sw = Math.max(1, Math.min(vw - sx, Math.round((g.sw || baseW) * (vw / baseW))));
                        const sh = Math.max(1, Math.min(vh - sy, Math.round((g.sh || baseH) * (vh / baseH))));
                        this.grayscaleReferenceCtx.drawImage(frameSource, sx, sy, sw, sh, dx, dy, dw, dh);
                    } else if (kind === "gif-decoded" && frameSource && typeof frameSource.width === "number" && typeof frameSource.height === "number") {
                        this.grayscaleReferenceCtx.drawImage(frameSource, 0, 0, frameSource.width, frameSource.height, 0, 0, bufW, bufH);
                    } else {
                        this.grayscaleReferenceCtx.drawImage(puzzle.gameCanvas, 0, 0, w, h, 0, 0, bufW, bufH);
                    }
                    this.grayscaleReferenceCtx.filter = "none";
                    this._stats.grayscaleDraws += 1;
                } else if (this.interactionActive) {
                    this._stats.grayscaleSkippedInteraction += 1;
                }
            } else {
                this.grayscaleReferenceCtx.clearRect(0, 0, bufW, bufH);
            }

            if (showOutline) {
                const L = PREVIEW_OUTLINE_STROKE_PX;
                this.grayscaleReferenceCtx.strokeStyle = "rgba(0,0,0,0.45)";
                this.grayscaleReferenceCtx.lineWidth = L;
                let ox, oy, ow, oh;
                if (puzzle._gifDraw && typeof puzzle._gifDraw.dx === "number" && typeof puzzle._gifDraw.dw === "number") {
                    const g = puzzle._gifDraw;
                    ox = (g.dx || 0) / halfRes;
                    oy = (g.dy || 0) / halfRes;
                    ow = Math.min(g.dw, w) / halfRes;
                    oh = Math.min(g.dh, h) / halfRes;
                } else {
                    ox = 0;
                    oy = 0;
                    ow = bufW;
                    oh = bufH;
                }
                this.grayscaleReferenceCtx.strokeRect(ox + L / 2, oy + L / 2, Math.max(0, ow - L), Math.max(0, oh - L));
            }

            if (!this.grayscaleReferenceCanvas.parentNode) {
                puzzle.container.insertBefore(this.grayscaleReferenceCanvas, puzzle.container.firstChild);
            }
        }

        onRenderPhase(nowMs, state, { previewIntervalMs, mediaAnimated, interactionActive, documentHidden } = {}) {
            if (typeof interactionActive === "boolean") this.interactionActive = interactionActive;
            const hidden = typeof documentHidden === "boolean" ? documentHidden : this.isDocumentHidden();
            const baseIntervalMs = previewIntervalMs || TARGET_FRAME_MS_ACTIVE;
            const interactionIntervalMs = this.interactionActive ? Math.max(baseIntervalMs, 120) : baseIntervalMs;
            const intervalMs = hidden ? Math.max(interactionIntervalMs, 1000) : interactionIntervalMs;
            this._stats.lastIntervalMs = intervalMs;
            if (state < 50) this.hasDrawnStaticSyncedPreview = false;
            if (!hidden) {
                if (mediaAnimated) {
                    if (nowMs - this.lastSyncedPreviewAt >= intervalMs) {
                        if (this.drawSyncedPreviewWindowFrame()) {
                            this.lastSyncedPreviewAt = nowMs;
                        }
                    }
                    this.hasDrawnStaticSyncedPreview = false;
                } else if (state >= 50 && !this.hasDrawnStaticSyncedPreview) {
                    if (this.drawSyncedPreviewWindowFrame()) {
                        this.hasDrawnStaticSyncedPreview = true;
                    }
                }
            }
            if (state === 15) {
                if (this.prestartPreviewDirty) {
                    if (this.drawPrestartPreviewFrame(this.interactionActive === false)) {
                        this.prestartPreviewDirty = false;
                        this.lastPrestartPreviewAt = nowMs;
                    }
                } else if (mediaAnimated && (nowMs - this.lastPrestartPreviewAt) >= intervalMs) {
                    if (this.drawPrestartPreviewFrame(false)) {
                        this.lastPrestartPreviewAt = nowMs;
                    }
                }
            }
            if (globalScope.rendererPerf) {
                globalScope.rendererPerf.previewStats = this.getStatsSnapshot();
            }
        }
    }

    globalScope.JigsawPreviewSurfaceManager = PreviewSurfaceManager;
})(window);
