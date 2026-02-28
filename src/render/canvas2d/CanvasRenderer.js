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
        }

        setVisible(visible) {
            this.canvas.style.display = visible ? "block" : "none";
        }

        setMediaSource(source) {
            this.mediaSource = source || null;
        }

        resize(bufferW, bufferH, displayW, displayH) {
            if (!this.enabled) return;
            this.canvas.width = Math.max(1, Math.round(bufferW));
            this.canvas.height = Math.max(1, Math.round(bufferH));
            this._displayWidth = (displayW != null && displayH != null) ? Math.max(1, Math.round(displayW)) : this.canvas.width;
            this._displayHeight = (displayW != null && displayH != null) ? Math.max(1, Math.round(displayH)) : this.canvas.height;
        }

        clear() {
            if (!this.enabled) return;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        _getSortedPieces() {
            const puzzle = this.puzzle;
            if (!puzzle) return [];
            const version = puzzle._zOrderVersion || 0;
            const pieces = puzzle.polyPieces || [];
            if (puzzle._sortedPolyPiecesByZ && puzzle._sortedPolyPiecesVersion === version && puzzle._sortedPolyPiecesByZ.length === pieces.length) {
                return puzzle._sortedPolyPiecesByZ;
            }
            if (this._sortedPiecesVersion !== version || this._sortedPieces.length !== pieces.length) {
                this._sortedPieces = pieces.slice();
                this._sortedPieces.sort((a, b) => {
                    const za = (a._zIndex != null) ? a._zIndex : (Number(a.polypiece_canvas && a.polypiece_canvas.style.zIndex) || 0);
                    const zb = (b._zIndex != null) ? b._zIndex : (Number(b.polypiece_canvas && b.polypiece_canvas.style.zIndex) || 0);
                    return za - zb;
                });
                this._sortedPiecesVersion = version;
            }
            return this._sortedPieces;
        }

        _isPieceVisible(pp, w, h) {
            const deg = (window.rotations === 180 ? 90 : window.rotations) || 0;
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
            const dw = this._displayWidth || this.canvas.width;
            const dh = this._displayHeight || this.canvas.height;
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

        _drawHeldShadow(pp, w, h, cachedDarkness) {
            if (!pp.path) return;
            const darkness = typeof cachedDarkness === "number" && !isNaN(cachedDarkness)
                ? Math.max(0, Math.min(1, cachedDarkness))
                : Math.max(0, Math.min(1, parseFloat(localStorage.getItem("heldPieceShadowDarkness") || "0.35")));
            const localShadow = this._worldToPieceLocal(pp, Math.max(6, w * 0.05), Math.max(6, h * 0.06));
            const blur = Math.max(18, Math.min(w, h) * 0.24);
            this.ctx.save();
            this.ctx.translate(localShadow.x, localShadow.y);
            this.ctx.shadowColor = `rgba(0,0,0,${Math.min(1, darkness * 0.85)})`;
            this.ctx.shadowBlur = blur;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
            // Keep the core very faint so most weight comes from the blurred edge.
            this.ctx.fillStyle = `rgba(0,0,0,${Math.min(1, darkness * 0.12)})`;
            this.ctx.fill(pp.path);
            this.ctx.restore();
        }

        renderFrame() {
            if (!this.enabled || !this.puzzle) return;
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            this.clear();
            const dw = this._displayWidth || this.canvas.width;
            const dh = this._displayHeight || this.canvas.height;
            const scaleX = this.canvas.width / dw;
            const scaleY = this.canvas.height / dh;
            this.ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
            this.ctx.imageSmoothingEnabled = true;
            if (scaleX < 1 || scaleY < 1) {
                if (typeof this.ctx.imageSmoothingQuality !== "undefined") {
                    this.ctx.imageSmoothingQuality = "high";
                }
            }
            const pieces = this._getSortedPieces();
            const puzzle = this.puzzle;
            const sourceCanvas = puzzle.gameCanvas || null;
            const videoSource = (this.mediaSource && typeof this.mediaSource.videoWidth === "number" && typeof this.mediaSource.videoHeight === "number") ? this.mediaSource : null;
            const gifDraw = puzzle._gifDraw || null;
            // Route video through gameCanvas (once per render) so alignment matches static images; then use gameCanvas for sampling.
            if (videoSource && sourceCanvas && typeof puzzle.renderSourceToGameCanvas === "function") {
                puzzle.renderSourceToGameCanvas(videoSource);
            }
            const useVideoDirect = false;
            const sourceW = sourceCanvas ? sourceCanvas.width : 0;
            const sourceH = sourceCanvas ? sourceCanvas.height : 0;
            const heldShadowDarkness = Math.max(0, Math.min(1, parseFloat(localStorage.getItem("heldPieceShadowDarkness") || "0.35")));
            let drawn = 0;
            for (const pp of pieces) {
                const w = pp.polypiece_canvas ? pp.polypiece_canvas.width : (pp.nx * puzzle.scalex);
                const h = pp.polypiece_canvas ? pp.polypiece_canvas.height : (pp.ny * puzzle.scaley);
                if (w <= 0 || h <= 0 || !pp.path) continue;
                if (!this._isPieceVisible(pp, w, h)) continue;
                const cx = pp.x + w / 2;
                const cy = pp.y + h / 2;
                this.ctx.save();
                this.ctx.translate(cx, cy);
                const deg = (window.rotations === 180 ? 90 : window.rotations) || 0;
                this.ctx.rotate((pp.rot || 0) * deg * Math.PI / 180);
                this.ctx.translate(-w / 2, -h / 2);
                if (pp._isHeld && !(typeof window !== "undefined" && window.rendererConfig && window.rendererConfig.legacyMode)) {
                    this._drawHeldShadow(pp, w, h, heldShadowDarkness);
                }
                if (pp._mediaSample) {
                    const ms = pp._mediaSample;
                    this.ctx.save();
                    this.ctx.clip(pp.path);
                    if (useVideoDirect) {
                        const dw = gifDraw.dw;
                        const dh = gifDraw.dh;
                        const vx = ((ms.sx - gifDraw.dx) / dw) * sourceW;
                        const vy = ((ms.sy - gifDraw.dy) / dh) * sourceH;
                        const vw = (ms.w / dw) * sourceW;
                        const vh = (ms.h / dh) * sourceH;
                        this.ctx.drawImage(this.mediaSource, vx, vy, vw, vh, ms.destx, ms.desty, ms.w, ms.h);
                    } else if (sourceCanvas) {
                        this.ctx.drawImage(
                            sourceCanvas,
                            ms.sx, ms.sy, ms.w, ms.h,
                            ms.destx, ms.desty, ms.w, ms.h
                        );
                    }
                    this.ctx.restore();
                }
                if (typeof pp.drawOverlayToContext === "function") {
                    pp.drawOverlayToContext(this.ctx, w, h, puzzle);
                } else if (pp.polypiece_canvas) {
                    this.ctx.drawImage(pp.polypiece_canvas, 0, 0);
                }
                this.ctx.restore();
                drawn++;
            }
            this.lastDrawCount = drawn;
            this.lastMediaUploads = 0;
        }

        renderDirtyPieces(sceneState) {
            if (sceneState && sceneState.hasDirtyPieces && !sceneState.hasDirtyPieces()) return;
            if (sceneState && sceneState.consumeDirtyPieces) sceneState.consumeDirtyPieces();
            this.renderFrame();
        }

        destroy() {
            this.enabled = false;
            if (this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas);
        }
    }

    globalScope.JigsawCanvasRenderer = CanvasRenderer;
})(window);

