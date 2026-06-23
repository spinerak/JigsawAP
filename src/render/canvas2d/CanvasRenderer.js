"use strict";

(function initCanvasRenderer(globalScope) {
    class CanvasRenderer {
        constructor({ container }) {
            this.container = container;
            this.canvas = document.createElement("canvas");
            this.canvas.className = "jigsaw-single-canvas-renderer";
            this.canvas.style.position = "absolute";
            this.canvas.style.left = "0px";
            this.canvas.style.top = "0px";
            this.canvas.style.zIndex = "99999999";
            this.ctx = this.canvas.getContext("2d");
            this.puzzle = null;
            this.enabled = false;
            this.mediaSource = null;
            this._sortedPieces = [];
            this._sortedPiecesVersion = -1;
            this.lastDrawCount = 0;
            this.lastMediaUploads = 0;
            this._displayWidth = 0;
            this._displayHeight = 0;
            this._overlayOversampleCanvas = null;
            this._overlayOversampleCtx = null;
            this._overlayOversampleMax = 2048;
            this._staticCanvas = null;
            this._staticCtx = null;
            this._staticLayerDirty = true;
            this._lastStaticDrawCount = 0;
            this._lastHeldDrawCount = 0;
            this.lastStaticRebuilt = false;
            this.lastVisiblePieces = 0;
            this._heldPiecesCountLastFrame = -1;
            this._cachedHeldShadowDarkness = null;
            this._cachedHeldShadowAt = 0;
            this._stats = {
                staticLayerRebuilds: 0,
                staticLayerReuseFrames: 0,
                overlayOversampleUses: 0,
                overlayDirectUses: 0
            };
        }

        _isOverlayOversampleEnabled() {
            if (typeof window === "undefined" || typeof window.getPuzzleResolution !== "function") return false;
            const preset = window.getPuzzleResolution();
            return preset === "1080p" || preset === "1440p" || preset === "4k" || preset === "8k" || preset === "16k";
        }

        _shouldUseOverlayOversample(pp, isAnimatedMedia) {
            if (!this._isOverlayOversampleEnabled()) return false;
            if (isAnimatedMedia) return false;
            if (pp && pp._isHeld) return false;
            return true;
        }

        _ensureOverlayOversampleBuffer(w, h) {
            const tw = Math.min(Math.max(1, Math.ceil(2 * w)), this._overlayOversampleMax);
            const th = Math.min(Math.max(1, Math.ceil(2 * h)), this._overlayOversampleMax);
            if (!this._overlayOversampleCanvas || this._overlayOversampleCanvas.width < tw || this._overlayOversampleCanvas.height < th) {
                if (!this._overlayOversampleCanvas) {
                    this._overlayOversampleCanvas = document.createElement("canvas");
                    this._overlayOversampleCtx = this._overlayOversampleCanvas.getContext("2d");
                }
                this._overlayOversampleCanvas.width = tw;
                this._overlayOversampleCanvas.height = th;
            }
            return this._overlayOversampleCtx;
        }

        init(puzzle) {
            this.puzzle = puzzle || null;
            if (!this.puzzle || !this.container) return;
            this.canvas.width = this.container.clientWidth || this.puzzle.contWidth || 1;
            this.canvas.height = this.container.clientHeight || this.puzzle.contHeight || 1;
            if (!this.canvas.parentElement) this.container.appendChild(this.canvas);
            this.canvas.style.width = "100%";
            this.canvas.style.height = "100%";
            this.enabled = true;
            this._markStaticLayerDirty();
        }

        setVisible(visible) {
            this.canvas.style.display = visible ? "block" : "none";
        }

        setMediaSource(source) {
            this.mediaSource = source || null;
            this._markStaticLayerDirty();
        }

        resize(bufferW, bufferH, displayW, displayH) {
            if (!this.enabled) return;
            this.canvas.width = Math.max(1, Math.round(bufferW));
            this.canvas.height = Math.max(1, Math.round(bufferH));
            this._displayWidth = (displayW != null && displayH != null) ? Math.max(1, Math.round(displayW)) : this.canvas.width;
            this._displayHeight = (displayW != null && displayH != null) ? Math.max(1, Math.round(displayH)) : this.canvas.height;
            this._markStaticLayerDirty();
        }

        clear() {
            if (!this.enabled) return;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        _getSortedPieces(sceneState = null) {
            const puzzle = this.puzzle;
            if (!puzzle) return [];
            if (sceneState && typeof sceneState.getOrderedPieces === "function") {
                return sceneState.getOrderedPieces(puzzle);
            }
            const version = puzzle._zOrderVersion || 0;
            const pieces = puzzle.polyPieces || [];
            if (puzzle._sortedPolyPiecesByZ && puzzle._sortedPolyPiecesVersion === version && puzzle._sortedPolyPiecesByZ.length === pieces.length) {
                return puzzle._sortedPolyPiecesByZ;
            }
            if (this._sortedPiecesVersion !== version || this._sortedPieces.length !== pieces.length) {
                this._sortedPieces = pieces.slice();
                this._sortedPieces.sort((a, b) => {
                    const za = (a._zIndex != null) ? a._zIndex : 0;
                    const zb = (b._zIndex != null) ? b._zIndex : 0;
                    return za - zb;
                });
                this._sortedPiecesVersion = version;
            }
            return this._sortedPieces;
        }

        _isPieceVisible(pp, w, h, deg, dw, dh) {
            const angle = (pp.rot || 0) * deg * Math.PI / 180;
            let hw = w / 2;
            let hh = h / 2;
            if (angle !== 0) {
                const c = Math.abs(Math.cos(angle));
                const s = Math.abs(Math.sin(angle));
                const aw = hw * c + hh * s;
                const ah = hw * s + hh * c;
                hw = aw;
                hh = ah;
            }
            const cx = pp.x + w / 2;
            const cy = pp.y + h / 2;
            if (cx + hw < 0 || cy + hh < 0) return false;
            if (cx - hw > dw || cy - hh > dh) return false;
            return true;
        }

        _worldToPieceLocal(pp, worldDx, worldDy) {
            const deg = (window.rotations === 180 ? 90 : window.rotations) || 0;
            const angle = (pp.rot || 0) * deg * Math.PI / 180;
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            return {
                x: worldDx * c + worldDy * s,
                y: -worldDx * s + worldDy * c
            };
        }

        _drawHeldShadow(ctx, pp, w, h, cachedDarkness) {
            if (!pp.path) return;
            let darkness;
            if (typeof cachedDarkness === "number" && !isNaN(cachedDarkness)) {
                darkness = Math.max(0, Math.min(1, cachedDarkness));
            } else {
                const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
                if (this._cachedHeldShadowDarkness == null || now - this._cachedHeldShadowAt > 300) {
                    this._cachedHeldShadowDarkness = Math.max(0, Math.min(1, parseFloat(localStorage.getItem("heldPieceShadowDarkness") || "0.35")));
                    this._cachedHeldShadowAt = now;
                }
                darkness = this._cachedHeldShadowDarkness;
            }
            const localShadow = this._worldToPieceLocal(pp, Math.max(6, w * 0.05), Math.max(6, h * 0.06));
            ctx.save();
            ctx.translate(localShadow.x, localShadow.y);
            // Solid offset shadow only; no shadowBlur to avoid GPU cost.
            ctx.fillStyle = `rgba(0,0,0,${Math.min(1, darkness * 0.35)})`;
            ctx.fill(pp.path);
            ctx.restore();
        }

        _markStaticLayerDirty() {
            this._staticLayerDirty = true;
        }

        _ensureStaticLayer() {
            if (!this._staticCanvas) {
                this._staticCanvas = document.createElement("canvas");
                this._staticCtx = this._staticCanvas.getContext("2d");
                this._staticLayerDirty = true;
            }
            if (this._staticCanvas.width !== this.canvas.width || this._staticCanvas.height !== this.canvas.height) {
                this._staticCanvas.width = this.canvas.width;
                this._staticCanvas.height = this.canvas.height;
                this._staticLayerDirty = true;
            }
        }

        _configureDrawContext(ctx) {
            const dw = this._displayWidth || this.canvas.width;
            const dh = this._displayHeight || this.canvas.height;
            const scaleX = this.canvas.width / dw;
            const scaleY = this.canvas.height / dh;
            ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
            ctx.imageSmoothingEnabled = true;
            if (scaleX < 1 || scaleY < 1) {
                if (typeof ctx.imageSmoothingQuality !== "undefined") {
                    ctx.imageSmoothingQuality = "high";
                }
            }
        }

        _drawPieceToContext(ctx, pp, puzzle, sourceCanvas, scaleSrcX, scaleSrcY, heldShadowDarkness, drawHeldShadow, viewportDeg, viewportDw, viewportDh, isAnimatedMedia) {
            const w = pp.nx * puzzle.scalex;
            const h = pp.ny * puzzle.scaley;
            if (w <= 0 || h <= 0 || !pp.path) return false;
            if (!this._isPieceVisible(pp, w, h, viewportDeg, viewportDw, viewportDh)) return false;
            const cx = pp.x + w / 2;
            const cy = pp.y + h / 2;
            ctx.save();
            ctx.translate(cx, cy);
            const deg = (window.rotations === 180 ? 90 : window.rotations) || 0;
            ctx.rotate((pp.rot || 0) * deg * Math.PI / 180);
            ctx.translate(-w / 2, -h / 2);
            if (drawHeldShadow && pp._isHeld) {
                this._drawHeldShadow(ctx, pp, w, h, heldShadowDarkness);
            }
            if (pp._mediaSample) {
                const ms = pp._mediaSample;
                ctx.save();
                ctx.clip(pp.path);
                if (sourceCanvas) {
                    const sx = ms.sx * scaleSrcX;
                    const sy = ms.sy * scaleSrcY;
                    const sw = ms.w * scaleSrcX;
                    const sh = ms.h * scaleSrcY;
                    ctx.drawImage(
                        sourceCanvas,
                        sx, sy, sw, sh,
                        ms.destx, ms.desty, ms.w, ms.h
                    );
                }
                ctx.restore();
            }
            if (typeof pp.drawOverlayToContext === "function") {
                if (this._shouldUseOverlayOversample(pp, isAnimatedMedia)) {
                    const octx = this._ensureOverlayOversampleBuffer(w, h);
                    const ow = this._overlayOversampleCanvas.width;
                    const oh = this._overlayOversampleCanvas.height;
                    const tw = Math.min(Math.ceil(2 * w), ow);
                    const th = Math.min(Math.ceil(2 * h), oh);
                    const oversampleFits = tw >= 2 * w && th >= 2 * h;
                    if (octx && tw > 0 && th > 0 && oversampleFits) {
                        this._stats.overlayOversampleUses += 1;
                        octx.setTransform(1, 0, 0, 1, 0, 0);
                        octx.clearRect(0, 0, tw, th);
                        octx.save();
                        octx.scale(2, 2);
                        pp.drawOverlayToContext(octx, w, h, puzzle);
                        octx.restore();
                        ctx.drawImage(this._overlayOversampleCanvas, 0, 0, tw, th, 0, 0, w, h);
                    } else {
                        this._stats.overlayDirectUses += 1;
                        pp.drawOverlayToContext(ctx, w, h, puzzle);
                    }
                } else {
                    this._stats.overlayDirectUses += 1;
                    pp.drawOverlayToContext(ctx, w, h, puzzle);
                }
            }
            ctx.restore();
            return true;
        }

        // Rebuild static layer only when something on it actually changed. Do not rebuild when the
        // only dirty pieces are held (they are composited after the static pass); do rebuild when any
        // non-held piece is dirty (e.g. position/rotation from network or merge).
        // Also rebuild when held count changes (pick up or drop) so static no longer includes the held piece.
        _shouldRebuildStaticLayer(sceneState, heldCount) {
            if (this._staticLayerDirty) return true;
            if (!sceneState) return true;
            if (sceneState.mediaContentDirty) return true;
            if (sceneState.zOrderDirty) return true;
            if (typeof heldCount === "number" && heldCount !== this._heldPiecesCountLastFrame) return true;
            if (sceneState.dirtyPieces && sceneState.dirtyPieces.size > 0) {
                for (const dirtyPiece of sceneState.dirtyPieces) {
                    if (!dirtyPiece || !dirtyPiece._isHeld) return true;
                }
            }
            return false;
        }

        renderFrame(_nowMs, sceneState) {
            if (!this.enabled || !this.puzzle) return;
            const pieces = this._getSortedPieces(sceneState);
            const puzzle = this.puzzle;
            const sourceCanvas = puzzle.gameCanvas || null;
            const videoSource = (this.mediaSource && typeof this.mediaSource.videoWidth === "number" && typeof this.mediaSource.videoHeight === "number") ? this.mediaSource : null;
            const isAnimatedMedia = !!videoSource || (typeof puzzle._isGifPlaying === "function" && puzzle._isGifPlaying());
            // Route video through gameCanvas (once per render) so alignment matches static images; then use gameCanvas for sampling.
            if (videoSource && sourceCanvas && typeof puzzle.renderSourceToGameCanvas === "function") {
                puzzle.renderSourceToGameCanvas(videoSource);
            }
            const sourceW = sourceCanvas ? sourceCanvas.width : 0;
            const sourceH = sourceCanvas ? sourceCanvas.height : 0;
            const contentW = (typeof puzzle._mediaContentWidth === "number" && puzzle._mediaContentWidth > 0)
                ? puzzle._mediaContentWidth
                : ((puzzle.nx && puzzle.ny) ? puzzle.nx * puzzle.scalex : sourceW);
            const contentH = (typeof puzzle._mediaContentHeight === "number" && puzzle._mediaContentHeight > 0)
                ? puzzle._mediaContentHeight
                : ((puzzle.nx && puzzle.ny) ? puzzle.ny * puzzle.scaley : sourceH);
            const scaleSrcX = (contentW > 0 && contentW !== sourceW) ? sourceW / contentW : 1;
            const scaleSrcY = (contentH > 0 && contentH !== sourceH) ? sourceH / contentH : 1;
            const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
            if (this._cachedHeldShadowDarkness == null || now - this._cachedHeldShadowAt > 300) {
                this._cachedHeldShadowDarkness = Math.max(0, Math.min(1, parseFloat(localStorage.getItem("heldPieceShadowDarkness") || "0.35")));
                this._cachedHeldShadowAt = now;
            }
            const heldShadowDarkness = this._cachedHeldShadowDarkness;
            const viewportDeg = (window.rotations === 180 ? 90 : window.rotations) || 0;
            const viewportDw = this._displayWidth || this.canvas.width;
            const viewportDh = this._displayHeight || this.canvas.height;

            if (!this._heldPieces) this._heldPieces = [];
            if (!this._staticPieces) this._staticPieces = [];
            this._heldPieces.length = 0;
            this._staticPieces.length = 0;
            for (const pp of pieces) {
                if (pp && pp._isHeld) this._heldPieces.push(pp);
                else this._staticPieces.push(pp);
            }

            this._ensureStaticLayer();
            const rebuiltStatic = this._shouldRebuildStaticLayer(sceneState, this._heldPieces.length);
            this.lastStaticRebuilt = rebuiltStatic;
            this.lastVisiblePieces = this._staticPieces.length + this._heldPieces.length;
            if (rebuiltStatic) {
                this._stats.staticLayerRebuilds += 1;
                const sctx = this._staticCtx;
                sctx.setTransform(1, 0, 0, 1, 0, 0);
                sctx.clearRect(0, 0, this._staticCanvas.width, this._staticCanvas.height);
                this._configureDrawContext(sctx);
                let staticDrawn = 0;
                for (const pp of this._staticPieces) {
                    if (this._drawPieceToContext(sctx, pp, puzzle, sourceCanvas, scaleSrcX, scaleSrcY, heldShadowDarkness, false, viewportDeg, viewportDw, viewportDh, isAnimatedMedia)) {
                        staticDrawn++;
                    }
                }
                this._lastStaticDrawCount = staticDrawn;
                this._staticLayerDirty = false;
            } else {
                this._stats.staticLayerReuseFrames += 1;
            }

            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (this._staticCanvas) this.ctx.drawImage(this._staticCanvas, 0, 0);
            this._configureDrawContext(this.ctx);
            let heldDrawn = 0;
            for (const pp of this._heldPieces) {
                if (this._drawPieceToContext(this.ctx, pp, puzzle, sourceCanvas, scaleSrcX, scaleSrcY, heldShadowDarkness, true, viewportDeg, viewportDw, viewportDh, isAnimatedMedia)) {
                    heldDrawn++;
                }
            }
            this._lastHeldDrawCount = heldDrawn;
            this.lastDrawCount = this._lastStaticDrawCount + heldDrawn;
            this.lastMediaUploads = 0;
            this._heldPiecesCountLastFrame = this._heldPieces.length;
            if (globalScope.rendererPerf) {
                globalScope.rendererPerf.canvasStaticLayerRebuilds = this._stats.staticLayerRebuilds;
                globalScope.rendererPerf.canvasStaticLayerReuseFrames = this._stats.staticLayerReuseFrames;
                globalScope.rendererPerf.canvasStaticRebuiltLastFrame = rebuiltStatic;
                globalScope.rendererPerf.canvasStaticDrawCount = this._lastStaticDrawCount;
                globalScope.rendererPerf.canvasHeldDrawCount = heldDrawn;
                globalScope.rendererPerf.canvasVisiblePieces = this.lastVisiblePieces;
                globalScope.rendererPerf.canvasOverlayOversampleUses = this._stats.overlayOversampleUses;
                globalScope.rendererPerf.canvasOverlayDirectUses = this._stats.overlayDirectUses;
            }
        }

        renderDirtyPieces(sceneState) {
            if (sceneState && sceneState.hasDirtyPieces && !sceneState.hasDirtyPieces()) return;
            this.renderFrame(undefined, sceneState);
            if (sceneState && sceneState.consumeDirtyPieces) sceneState.consumeDirtyPieces();
        }

        destroy() {
            this.enabled = false;
            if (this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas);
            this._staticCanvas = null;
            this._staticCtx = null;
        }
    }

    globalScope.JigsawCanvasRenderer = CanvasRenderer;
})(window);

