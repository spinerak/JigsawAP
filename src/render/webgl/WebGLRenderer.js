"use strict";

(function initWebGLRenderer(globalScope) {
    class WebGLRenderer {
        constructor({ container }) {
            this.container = container;
            this.canvas = document.createElement("canvas");
            this.canvas.className = "jigsaw-webgl-renderer";
            this.canvas.style.position = "absolute";
            this.canvas.style.left = "0px";
            this.canvas.style.top = "0px";
            this.canvas.style.zIndex = "99999998";
            this.gl = null;
            this.enabled = false;
            this.contextLost = false;
            this.puzzle = null;
            this.supportsPieceRendering = false;
            this._eventsBound = false;
            this._pieceProgram = null;
            this._meshProgram = null;
            this._supportsStencil = false;
            this._vertexBuffer = null;
            this._staticVertexBuffer = null;
            this._meshVertexBuffer = null;
            this._staticMeshVertexBuffer = null;
            this._meshVertexBufferVertexCount = 0;
            this._staticMeshVertexBufferVertexCount = 0;
            this._pieceTextureCache = new Map();
            this._mediaTexture = null;
            this._mediaTextureW = 0;
            this._mediaTextureH = 0;
            this._mediaTextureConfigured = false;
            this._mediaTextureSourceRef = null;
            this._onContextLost = null;
            this._onContextRestored = null;
            this._fatalErrorLogged = false;
            this.failureReason = "";
            this.mediaSource = null;
            this._boundTexture0 = null;
            this._boundTexture1 = null;
            this._activeTextureUnit = -1;
            this._resolutionSerial = 1;
            this._frameCounter = 0;
            this._sortedPieces = [];
            this._sortedPiecesVersion = -1;
            this.lastDrawCount = 0;
            this.lastMediaUploads = 0;
            this.lastMediaSourceKind = "unknown";
            this.lastMediaUsesMapping = false;
            this.lastStaticRebuilt = false;
            this._batchedVertices = null;
            this._batchedVertexCapacity = 0;
            this._staticFallbackBatchedVertices = null;
            this._staticFallbackBatchedVertexCapacity = 0;
            this._staticFallbackBatch = null;
            this._heldFallbackLocalVertices = null;
            this._heldFallbackLocalVertexCapacity = 0;
            this._heldFallbackBatch = null;
            this._meshBatchedVertices = null;
            this._meshBatchedVertexCapacity = 0;
            this._heldMeshLocalVertices = null;
            this._heldMeshLocalVertexCapacity = 0;
            this._heldMeshBatch = null;
            this._staticMeshBatchedVertices = null;
            this._staticMeshBatchedVertexCapacity = 0;
            this._staticMeshBatch = null;
            this._staticDrawPlan = null;
            this._staticRenderPlan = null;
            this._cacheSerialCounter = 1;
            this._displayWidth = 0;
            this._displayHeight = 0;
            this._cachedHeldShadowAlpha = null;
            this._cachedHeldShadowFrameMs = -1;
            this._uploadBudgetPerFrame = 12;
            this._uploadCountThisFrame = 0;
            this._sharedMaskCanvas = null;
            this._sharedMaskCtx = null;
            this._maskAtlasTexture = null;
            this._maskAtlasConfigured = false;
            this._maskAtlasWidth = 0;
            this._maskAtlasHeight = 0;
            this._maskAtlasMaxSize = 0;
            this._maskAtlasNextX = 1;
            this._maskAtlasNextY = 1;
            this._maskAtlasRowH = 0;
            this._maskAtlasPadding = 1;
            this._maskAtlasRebuildRequested = false;
            this._atlasMetrics = {
                rebuilds: 0,
                uploads: 0,
                batchedMainDrawCalls: 0,
                atlasMaskUses: 0,
                standaloneMaskUses: 0,
                restoredMaskUses: 0,
                prepMisses: 0
            };
            this._meshMetrics = {
                batchedDrawCalls: 0,
                singleDrawCalls: 0,
                triangles: 0,
                pieces: 0,
                fallbackPieces: 0,
                shadowMaskPieces: 0,
                meshShadowPieces: 0,
                meshShadowDrawCalls: 0,
                geometryEdgePieces: 0,
                holedMeshPieces: 0,
                stencilPieces: 0,
                stencilDrawCalls: 0,
                stencilScissoredClears: 0,
                stencilFullClears: 0,
                stencilScissorStateChanges: 0,
                stencilStateSessions: 0,
                stencilStateReuses: 0,
                holedFallbackPieces: 0,
                triangulationFailures: 0,
                staticBatchRebuilds: 0,
                staticBatchReuses: 0,
                staticVertexUploads: 0,
                dynamicVertexUploads: 0,
                heldBatchRebuilds: 0,
                heldBatchReuses: 0,
                staticPieces: 0,
                dynamicPieces: 0,
                staticPlanRebuilds: 0,
                staticPlanReuses: 0,
                staticRenderPlanRebuilds: 0,
                staticRenderPlanReuses: 0
            };
            this._fallbackMetrics = {
                staticBatchRebuilds: 0,
                staticBatchReuses: 0,
                staticVertexUploads: 0,
                dynamicVertexUploads: 0,
                atlasBatchDrawCalls: 0,
                standaloneDrawCalls: 0,
                staticPieces: 0,
                dynamicPieces: 0,
                heldBatchRebuilds: 0,
                heldBatchReuses: 0
            };
            this._webglDebugEnabled = true;
            this._webglDebugLogBudget = 200;
            this._webglDebugCounts = Object.create(null);
            this._webglDebugHistory = [];
            this._colorParserCanvas = null;
            this._colorParserCtx = null;
            this._cachedHintColorKey = "";
            this._cachedHintColorRgba = [1, 0, 0, 1];
            this.lastStaticFallbackRebuilt = false;
        }

        _ensureSharedMaskCanvas(w, h) {
            if (!this._sharedMaskCanvas) {
                this._sharedMaskCanvas = document.createElement("canvas");
                this._sharedMaskCtx = this._sharedMaskCanvas.getContext("2d");
            }
            const c = this._sharedMaskCanvas;
            if (c.width !== w || c.height !== h) {
                c.width = Math.max(1, w | 0);
                c.height = Math.max(1, h | 0);
            }
            return this._sharedMaskCtx;
        }

        _resetDrawItemTransientState(item, heldShadowAlpha) {
            if (!item) return item;
            item.heldShadowAlpha = heldShadowAlpha;
            item.stencilBounds = null;
            item.stencilScissorRect = null;
            item.maskTexture = null;
            item.maskSource = null;
            item.maskUv = null;
            item.maskW = item.w;
            item.maskH = item.h;
            item.quadBufferKind = item.held ? "dynamic" : "static";
            item.pieceVertexStart = -1;
            item.pieceVertexCount = 0;
            item.shadowVertexStart = -1;
            item.shadowVertexCount = 0;
            item.meshBufferKind = item.held ? "dynamic" : "static";
            item.meshVertexStart = -1;
            item.meshVertexCount = 0;
            item.meshFillVertexStart = -1;
            item.meshFillVertexCount = 0;
            item.meshEdgeVertexStart = -1;
            item.meshEdgeVertexCount = 0;
            return item;
        }

        _makeDrawItem(pp, w, h, held, mesh, frameGeom, appearance, heldShadowAlpha) {
            const needsMaskFallback = !mesh || (mesh.requiresStencil && !this._supportsStencil);
            const needsShadowMask = held && needsMaskFallback;
            const shadowDx = held ? Math.max(6, w * 0.05) : 0;
            const shadowDy = held ? Math.max(6, h * 0.06) : 0;
            const stencilPadPx = mesh && mesh.requiresStencil ? Math.max(2, (appearance.edgeWidthPx || 0) + (appearance.hintBandPx || 0) + 2) : 0;
            return this._resetDrawItemTransientState({
                pp,
                w,
                h,
                held,
                mesh,
                frameGeom,
                heldShadowAlpha,
                shadowDx,
                shadowDy,
                edgeOffsetPx: appearance.edgeOffsetPx,
                edgeWidthPx: appearance.edgeWidthPx,
                hinted: appearance.hinted,
                hintBandPx: appearance.hintBandPx,
                needsMaskFallback,
                needsShadowMask,
                stencilPadPx
            }, heldShadowAlpha);
        }

        _getStaticDrawPlanKey(sceneState, pieces, puzzle, deg, dw, dh) {
            const version = puzzle ? (puzzle._zOrderVersion || 0) : 0;
            return [
                version,
                Array.isArray(pieces) ? pieces.length : 0,
                dw | 0,
                dh | 0,
                this.canvas.width | 0,
                this.canvas.height | 0,
                Math.round(((puzzle && puzzle.scalex) || 0) * 1000),
                Math.round(((puzzle && puzzle.scaley) || 0) * 1000),
                deg | 0
            ].join(":");
        }

        _hasDirtyNonHeldPieces(sceneState) {
            const dirtySet = sceneState && sceneState.dirtyPieces instanceof Set ? sceneState.dirtyPieces : null;
            if (!dirtySet || dirtySet.size === 0) return false;
            for (const piece of dirtySet) {
                if (piece && !piece._isHeld) return true;
            }
            return false;
        }

        _touchDrawPlanItems(items, visibleFrameMark, heldShadowAlpha) {
            if (!Array.isArray(items)) return;
            for (const item of items) {
                if (!item || !item.pp) continue;
                const entry = this._getOrCreatePieceCacheEntry(item.pp);
                entry.lastSeenFrame = visibleFrameMark;
                this._resetDrawItemTransientState(item, heldShadowAlpha);
            }
        }

        _getOrBuildStaticDrawPlan(pieces, puzzle, deg, dw, dh, visibleFrameMark, heldShadowAlpha, sceneState) {
            const key = this._getStaticDrawPlanKey(sceneState, pieces, puzzle, deg, dw, dh);
            let canReuse = !!(this._staticDrawPlan && this._staticDrawPlan.key === key && !(sceneState && sceneState.zOrderDirty));
            if (canReuse && this._hasDirtyNonHeldPieces(sceneState)) canReuse = false;
            if (canReuse) {
                this._touchDrawPlanItems(this._staticDrawPlan.items, visibleFrameMark, heldShadowAlpha);
                this._staticDrawPlan.reused = true;
                this._meshMetrics.staticPlanReuses += 1;
                return this._staticDrawPlan;
            }
            const items = [];
            const maskItems = [];
            const staticFallbackItems = [];
            const staticMeshItems = [];
            for (const pp of pieces) {
                if (!pp || pp._isHeld) continue;
                const w = pp.nx * puzzle.scalex;
                const h = pp.ny * puzzle.scaley;
                if (w <= 0 || h <= 0 || !pp.path || !pp._mediaSample) continue;
                const frameGeom = this._computePieceFrameGeometry(pp, w, h, deg);
                if (!this._isPieceVisible(frameGeom, dw, dh)) continue;
                const appearance = this._getPieceAppearance(pp, puzzle);
                const entry = this._getOrCreatePieceCacheEntry(pp);
                entry.lastSeenFrame = visibleFrameMark;
                const mesh = this._ensurePieceMesh(pp, entry, appearance);
                const item = this._makeDrawItem(pp, w, h, false, mesh, frameGeom, appearance, heldShadowAlpha);
                items.push(item);
                if (item.needsMaskFallback || item.needsShadowMask) maskItems.push(item);
                if (item.needsMaskFallback) staticFallbackItems.push(item);
                else if (item.mesh) staticMeshItems.push(item);
            }
            this._staticDrawPlan = {
                key,
                serial: this._cacheSerialCounter++,
                reused: false,
                items,
                maskItems,
                staticFallbackItems,
                staticMeshItems
            };
            this._meshMetrics.staticPlanRebuilds += 1;
            return this._staticDrawPlan;
        }

        _getStaticRenderPlanKey(staticDrawPlan, staticMeshBatch, staticFallbackBatch) {
            return [
                staticDrawPlan && staticDrawPlan.serial ? staticDrawPlan.serial : 0,
                staticMeshBatch && staticMeshBatch.serial ? staticMeshBatch.serial : 0,
                staticFallbackBatch && staticFallbackBatch.serial ? staticFallbackBatch.serial : 0
            ].join(":");
        }

        _getOrBuildStaticRenderPlan(staticDrawPlan, staticMeshBatch, staticFallbackBatch) {
            if (!staticDrawPlan || !Array.isArray(staticDrawPlan.items) || staticDrawPlan.items.length === 0) {
                this._staticRenderPlan = null;
                return null;
            }
            const key = this._getStaticRenderPlanKey(staticDrawPlan, staticMeshBatch, staticFallbackBatch);
            if (this._staticRenderPlan && this._staticRenderPlan.key === key) {
                this._meshMetrics.staticRenderPlanReuses += 1;
                return this._staticRenderPlan;
            }
            const commands = [];
            const renderedMeshPieces = [];
            const renderedFallbackPieces = [];
            let visiblePieces = 0;
            let meshPieces = 0;
            let meshTriangles = 0;
            let geometryEdgePieces = 0;
            let holedMeshPieces = 0;
            let stencilPieces = 0;
            let staticMeshPieces = 0;
            let fallbackPieces = 0;
            let holedFallbackPieces = 0;
            let staticFallbackPieces = 0;
            let meshRunStartVertex = -1;
            let meshRunVertexCount = 0;
            let atlasRunStartVertex = -1;
            let atlasRunVertexCount = 0;
            const flushMeshRun = () => {
                if (meshRunStartVertex < 0 || meshRunVertexCount <= 0) return;
                commands.push({ kind: "meshRun", firstVertex: meshRunStartVertex, vertexCount: meshRunVertexCount, bufferKind: "static" });
                meshRunStartVertex = -1;
                meshRunVertexCount = 0;
            };
            const flushAtlasRun = () => {
                if (atlasRunStartVertex < 0 || atlasRunVertexCount <= 0) return;
                commands.push({ kind: "atlasFallbackRun", firstVertex: atlasRunStartVertex, vertexCount: atlasRunVertexCount, bufferKind: "static" });
                atlasRunStartVertex = -1;
                atlasRunVertexCount = 0;
            };
            for (const item of staticDrawPlan.items) {
                if (!item) continue;
                if (item.mesh && !item.needsMaskFallback && !item.mesh.requiresStencil) {
                    flushAtlasRun();
                    if (meshRunStartVertex < 0) {
                        meshRunStartVertex = item.meshVertexStart;
                        meshRunVertexCount = item.meshVertexCount;
                    } else if (this._canAppendContiguousRun(meshRunStartVertex, meshRunVertexCount, item.meshVertexStart, item.meshVertexCount)) {
                        meshRunVertexCount += item.meshVertexCount;
                    } else {
                        flushMeshRun();
                        meshRunStartVertex = item.meshVertexStart;
                        meshRunVertexCount = item.meshVertexCount;
                    }
                    visiblePieces += 1;
                    renderedMeshPieces.push(item.pp);
                    meshPieces += 1;
                    staticMeshPieces += 1;
                    meshTriangles += Math.max(0, item.meshVertexCount / 3);
                    if (item.mesh.hasGeometryEdge) geometryEdgePieces += 1;
                    if (item.mesh.holeCount > 0) holedMeshPieces += 1;
                    continue;
                }

                flushMeshRun();

                if (item.needsMaskFallback && item.maskTexture && item.maskSource === "atlas" && item.quadBufferKind === "static" && item.pieceVertexStart >= 0 && item.pieceVertexCount > 0) {
                    if (atlasRunStartVertex < 0) {
                        atlasRunStartVertex = item.pieceVertexStart;
                        atlasRunVertexCount = item.pieceVertexCount;
                    } else if (this._canAppendContiguousRun(atlasRunStartVertex, atlasRunVertexCount, item.pieceVertexStart, item.pieceVertexCount)) {
                        atlasRunVertexCount += item.pieceVertexCount;
                    } else {
                        flushAtlasRun();
                        atlasRunStartVertex = item.pieceVertexStart;
                        atlasRunVertexCount = item.pieceVertexCount;
                    }
                    visiblePieces += 1;
                    renderedFallbackPieces.push(item.pp);
                    fallbackPieces += 1;
                    staticFallbackPieces += 1;
                    if (item.pp && item.pp.tbLoops && item.pp.tbLoops.length > 1) holedFallbackPieces += 1;
                    continue;
                }

                flushAtlasRun();

                if (item.mesh && !item.needsMaskFallback) {
                    commands.push({
                        kind: "stencilMeshStatic",
                        pp: item.pp,
                        fillFirstVertex: item.meshFillVertexStart,
                        fillVertexCount: item.meshFillVertexCount,
                        colorFirstVertex: item.meshVertexStart,
                        colorVertexCount: item.meshVertexCount,
                        scissorRect: item.stencilScissorRect || null
                    });
                    visiblePieces += 1;
                    renderedMeshPieces.push(item.pp);
                    meshPieces += 1;
                    staticMeshPieces += 1;
                    meshTriangles += Math.max(0, item.meshVertexCount / 3);
                    if (item.mesh.hasGeometryEdge) geometryEdgePieces += 1;
                    if (item.mesh.holeCount > 0) holedMeshPieces += 1;
                    if (item.mesh.requiresStencil) stencilPieces += 1;
                    continue;
                }

                if (item.needsMaskFallback && item.maskTexture) {
                    const texelX = 1 / Math.max(1, item.maskSource === "atlas" ? (this._maskAtlasWidth || 1) : (item.maskW || item.w || 1));
                    const texelY = 1 / Math.max(1, item.maskSource === "atlas" ? (this._maskAtlasHeight || 1) : (item.maskH || item.h || 1));
                    commands.push({
                        kind: "fallbackPieceStatic",
                        pp: item.pp,
                        firstVertex: item.pieceVertexStart,
                        vertexCount: item.pieceVertexCount,
                        maskTexture: item.maskTexture,
                        texelX,
                        texelY
                    });
                    visiblePieces += 1;
                    renderedFallbackPieces.push(item.pp);
                    fallbackPieces += 1;
                    staticFallbackPieces += 1;
                    if (item.pp && item.pp.tbLoops && item.pp.tbLoops.length > 1) holedFallbackPieces += 1;
                }
            }
            flushMeshRun();
            flushAtlasRun();
            this._staticRenderPlan = {
                key,
                commands,
                renderedMeshPieces,
                renderedFallbackPieces,
                visiblePieces,
                meshPieces,
                meshTriangles,
                geometryEdgePieces,
                holedMeshPieces,
                stencilPieces,
                staticMeshPieces,
                fallbackPieces,
                holedFallbackPieces,
                staticFallbackPieces
            };
            this._meshMetrics.staticRenderPlanRebuilds += 1;
            return this._staticRenderPlan;
        }

        _buildHeldDrawItems(pieces, puzzle, deg, dw, dh, visibleFrameMark, heldShadowAlpha) {
            const items = [];
            const maskItems = [];
            const heldFallbackItems = [];
            const dynamicMeshItems = [];
            let numHeld = 0;
            for (const pp of pieces) {
                if (!pp || !pp._isHeld) continue;
                const w = pp.nx * puzzle.scalex;
                const h = pp.ny * puzzle.scaley;
                if (w <= 0 || h <= 0 || !pp.path || !pp._mediaSample) continue;
                const frameGeom = this._computePieceFrameGeometry(pp, w, h, deg);
                if (!this._isPieceVisible(frameGeom, dw, dh)) continue;
                numHeld += 1;
                const appearance = this._getPieceAppearance(pp, puzzle);
                const entry = this._getOrCreatePieceCacheEntry(pp);
                entry.lastSeenFrame = visibleFrameMark;
                const mesh = this._ensurePieceMesh(pp, entry, appearance);
                const item = this._makeDrawItem(pp, w, h, true, mesh, frameGeom, appearance, heldShadowAlpha);
                items.push(item);
                if (item.needsMaskFallback || item.needsShadowMask) maskItems.push(item);
                if (item.needsMaskFallback) heldFallbackItems.push(item);
                else if (item.mesh) dynamicMeshItems.push(item);
            }
            return { items, maskItems, heldFallbackItems, dynamicMeshItems, numHeld };
        }

        init(puzzle) {
            this.puzzle = puzzle || null;
            if (!this.container) return false;
            this.canvas.width = this.container.clientWidth || 1;
            this.canvas.height = this.container.clientHeight || 1;
            if (!this.canvas.parentElement) this.container.appendChild(this.canvas);
            this.canvas.style.width = "100%";
            this.canvas.style.height = "100%";
            const glOpts = { powerPreference: "high-performance", stencil: true };
            this.gl = this.canvas.getContext("webgl2", glOpts) || this.canvas.getContext("webgl", glOpts);
            if (!this.gl) {
                this.enabled = false;
                this.supportsPieceRendering = false;
                this.failureReason = "webgl context unavailable";
                return false;
            }
            if (!this._eventsBound) {
                this._onContextLost = (e) => {
                    e.preventDefault();
                    this.contextLost = true;
                    this.enabled = false;
                    this.supportsPieceRendering = false;
                };
                this._onContextRestored = () => {
                    this.contextLost = false;
                    this.enabled = this._initResources();
                    this._supportsStencil = !!(this.gl && this.gl.getParameter && this.gl.getParameter(this.gl.STENCIL_BITS) > 0);
                    this.supportsPieceRendering = this.enabled;
                };
                this.canvas.addEventListener("webglcontextlost", this._onContextLost);
                this.canvas.addEventListener("webglcontextrestored", this._onContextRestored);
                this._eventsBound = true;
            }
            this.enabled = this._initResources();
            this._supportsStencil = !!(this.gl && this.gl.getParameter && this.gl.getParameter(this.gl.STENCIL_BITS) > 0);
            this.supportsPieceRendering = this.enabled;
            this.failureReason = this.enabled ? "" : "webgl resource initialization failed";
            this._fatalErrorLogged = false;
            return this.enabled;
        }

        setVisible(visible) {
            this.canvas.style.display = visible ? "block" : "none";
        }

        setMediaSource(source) {
            this.mediaSource = source || null;
        }

        resize(bufferW, bufferH, displayW, displayH) {
            const prevCanvasW = this.canvas.width | 0;
            const prevCanvasH = this.canvas.height | 0;
            const prevDisplayW = this._displayWidth | 0;
            const prevDisplayH = this._displayHeight | 0;
            this.canvas.width = Math.max(1, Math.round(bufferW));
            this.canvas.height = Math.max(1, Math.round(bufferH));
            this._displayWidth = (displayW != null && displayH != null) ? Math.max(1, Math.round(displayW)) : this.canvas.width;
            this._displayHeight = (displayW != null && displayH != null) ? Math.max(1, Math.round(displayH)) : this.canvas.height;
            if (
                prevCanvasW !== (this.canvas.width | 0) ||
                prevCanvasH !== (this.canvas.height | 0) ||
                prevDisplayW !== (this._displayWidth | 0) ||
                prevDisplayH !== (this._displayHeight | 0)
            ) {
                this._resolutionSerial++;
            }
            if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }


        renderFrame(nowMs, sceneState) {
            if (!this.enabled || !this.gl) return;
            try {
                this._uploadCountThisFrame = 0;
                this._meshMetrics.batchedDrawCalls = 0;
                this._meshMetrics.singleDrawCalls = 0;
                this._meshMetrics.triangles = 0;
                this._meshMetrics.pieces = 0;
                this._meshMetrics.fallbackPieces = 0;
                this._meshMetrics.shadowMaskPieces = 0;
                this._meshMetrics.meshShadowPieces = 0;
                this._meshMetrics.meshShadowDrawCalls = 0;
                this._meshMetrics.geometryEdgePieces = 0;
                this._meshMetrics.holedMeshPieces = 0;
                this._meshMetrics.stencilPieces = 0;
                this._meshMetrics.stencilDrawCalls = 0;
                this._meshMetrics.stencilScissoredClears = 0;
                this._meshMetrics.stencilFullClears = 0;
                this._meshMetrics.stencilScissorStateChanges = 0;
                this._meshMetrics.stencilStateSessions = 0;
                this._meshMetrics.stencilStateReuses = 0;
                this._meshMetrics.holedFallbackPieces = 0;
                this._meshMetrics.triangulationFailures = 0;
                this._meshMetrics.staticBatchRebuilds = 0;
                this._meshMetrics.staticBatchReuses = 0;
                this._meshMetrics.staticVertexUploads = 0;
                this._meshMetrics.dynamicVertexUploads = 0;
                this._meshMetrics.heldBatchRebuilds = 0;
                this._meshMetrics.heldBatchReuses = 0;
                this._meshMetrics.staticPieces = 0;
                this._meshMetrics.dynamicPieces = 0;
                this._fallbackMetrics.staticBatchRebuilds = 0;
                this._fallbackMetrics.staticBatchReuses = 0;
                this._fallbackMetrics.staticVertexUploads = 0;
                this._fallbackMetrics.dynamicVertexUploads = 0;
                this._fallbackMetrics.atlasBatchDrawCalls = 0;
                this._fallbackMetrics.standaloneDrawCalls = 0;
                this._fallbackMetrics.staticPieces = 0;
                this._fallbackMetrics.dynamicPieces = 0;
                this._atlasMetrics.restoredMaskUses = 0;
                this._atlasMetrics.prepMisses = 0;
                this.lastStaticFallbackRebuilt = false;
                const gl = this.gl;
                gl.viewport(0, 0, this.canvas.width, this.canvas.height);
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                if (!this.puzzle || !this._pieceProgram || !this._meshProgram) return;

                const mediaState = this._resolveMediaState(sceneState);
                if (!mediaState || !mediaState.textureSource || !this._updateMediaTexture(mediaState.textureSource, mediaState.forceUpload)) return;
                this.lastMediaSourceKind = mediaState.sourceKind || "direct";
                this.lastMediaUsesMapping = !!mediaState.mapping;

                const pieces = this._getSortedPieces(sceneState);
                const sourceW = mediaState.textureW || 1;
                const sourceH = mediaState.textureH || 1;

                if (this._cachedHeldShadowAlpha == null || (nowMs - (this._cachedHeldShadowFrameMs || 0) > 300)) {
                    this._cachedHeldShadowFrameMs = nowMs;
                    const heldShadowDarkness = Math.max(0, Math.min(1, parseFloat(localStorage.getItem("heldPieceShadowDarkness") || "0.35")));
                    this._cachedHeldShadowAlpha = Math.min(1, heldShadowDarkness * 0.35);
                }
                const heldShadowAlpha = this._cachedHeldShadowAlpha;
                const visibleFrameMark = this._frameCounter + 1;
                const puzzle = this.puzzle;
                const deg = (globalScope.rotations === 180 ? 90 : globalScope.rotations) || 0;
                const dw = this._displayWidth || this.canvas.width;
                const dh = this._displayHeight || this.canvas.height;
                const hadDirtyNonHeld = this._hasDirtyNonHeldPieces(sceneState);
                const staticDrawPlan = this._getOrBuildStaticDrawPlan(pieces, puzzle, deg, dw, dh, visibleFrameMark, heldShadowAlpha, sceneState);
                const heldDrawPlan = this._buildHeldDrawItems(pieces, puzzle, deg, dw, dh, visibleFrameMark, heldShadowAlpha);
                const numHeld = heldDrawPlan.numHeld;

                if (!staticDrawPlan.items.length && !heldDrawPlan.items.length) {
                    this._frameCounter++;
                    this.lastVisiblePieces = 0;
                    this.lastDrawCount = 0;
                    this.lastMediaUploads = this._mediaUploadsThisFrame || 0;
                    return;
                }

                const maskItems = staticDrawPlan.maskItems.concat(heldDrawPlan.maskItems);
                const unresolvedMaskItems = this._restoreCachedMaskResources(maskItems, sceneState, visibleFrameMark);
                if (unresolvedMaskItems.length) this._prepareMaskResources(unresolvedMaskItems, sceneState, visibleFrameMark);

                const staticFallbackItems = staticDrawPlan.staticFallbackItems.filter((item) => !!item.maskTexture);
                const heldFallbackItems = heldDrawPlan.heldFallbackItems.filter((item) => !!item.maskTexture);
                const quadContextKey = this._getMeshRenderContextKey(mediaState, sourceW, sourceH);
                this._prepareStaticFallbackBatch(staticFallbackItems, sourceW, sourceH, mediaState, sceneState, quadContextKey);
                this._prepareHeldFallbackBatch(heldFallbackItems, sourceW, sourceH, mediaState, sceneState, quadContextKey);

                const staticMeshItems = staticDrawPlan.staticMeshItems;
                const dynamicMeshItems = heldDrawPlan.dynamicMeshItems;
                const meshContextKey = this._getMeshRenderContextKey(mediaState, sourceW, sourceH);
                let staticMeshBatch = this._prepareStaticMeshBatch(staticMeshItems, sourceW, sourceH, mediaState, sceneState, meshContextKey);

                this._prepareHeldMeshBatch(dynamicMeshItems, sourceW, sourceH, mediaState, sceneState, meshContextKey);
                let staticRenderPlan = this._getOrBuildStaticRenderPlan(staticDrawPlan, staticMeshBatch, this._staticFallbackBatch);
                if (!this._validateStaticRenderPlan(staticRenderPlan, staticMeshBatch, this._staticFallbackBatch)) {
                    this._invalidateStaticGpuCaches();
                    this._prepareStaticFallbackBatch(staticFallbackItems, sourceW, sourceH, mediaState, sceneState, quadContextKey);
                    staticMeshBatch = this._prepareStaticMeshBatch(staticMeshItems, sourceW, sourceH, mediaState, sceneState, meshContextKey);
                    staticRenderPlan = this._getOrBuildStaticRenderPlan(staticDrawPlan, staticMeshBatch, this._staticFallbackBatch);
                    if (!this._validateStaticRenderPlan(staticRenderPlan, staticMeshBatch, this._staticFallbackBatch)) {
                        logWebglDebug("static-render-plan-still-invalid", {
                            staticMeshVertexCount: staticMeshBatch && Number.isFinite(staticMeshBatch.vertexCount) ? staticMeshBatch.vertexCount : 0,
                            staticFallbackVertexCount: this._staticFallbackBatch && Number.isFinite(this._staticFallbackBatch.vertexCount) ? this._staticFallbackBatch.vertexCount : 0,
                            commandCount: staticRenderPlan && Array.isArray(staticRenderPlan.commands) ? staticRenderPlan.commands.length : 0
                        });
                        staticRenderPlan = {
                            key: "invalid",
                            commands: [],
                            renderedMeshPieces: [],
                            renderedFallbackPieces: [],
                            visiblePieces: 0,
                            meshPieces: 0,
                            meshTriangles: 0,
                            geometryEdgePieces: 0,
                            holedMeshPieces: 0,
                            stencilPieces: 0,
                            staticMeshPieces: 0,
                            fallbackPieces: 0,
                            holedFallbackPieces: 0,
                            staticFallbackPieces: 0
                        };
                    }
                }
                if (!this._validateHeldMeshBatch(dynamicMeshItems)) {
                    this._heldMeshBatch = null;
                    this._meshVertexBufferVertexCount = 0;
                    this._prepareHeldMeshBatch(dynamicMeshItems, sourceW, sourceH, mediaState, sceneState, meshContextKey);
                }
                let activeProgramKind = "";
                let activeMeshMode = "";
                let activeMeshOffsetX = 0;
                let activeMeshOffsetY = 0;
                let activeMeshAlpha = 1;
                let activeMeshBufferKind = "";
                let activeMeshTransformMode = "";
                let activeMeshPieceCenterX = 0;
                let activeMeshPieceCenterY = 0;
                let activeMeshPieceHalfW = 0;
                let activeMeshPieceHalfH = 0;
                let activeMeshPieceCos = 1;
                let activeMeshPieceSin = 0;
                const pieceAttribLocations = [
                    this._pieceProgram.aPosition,
                    this._pieceProgram.aTexCoord,
                    this._pieceProgram.aMediaUv,
                    this._pieceProgram.aEdgeOffset,
                    this._pieceProgram.aHintFlag
                ].filter((loc, index, arr) => loc >= 0 && arr.indexOf(loc) === index);
                const meshAttribLocations = [
                    this._meshProgram.aPosition,
                    this._meshProgram.aMediaUv,
                    this._meshProgram.aEdgeCoord,
                    this._meshProgram.aEdgeShade,
                    this._meshProgram.aHintBandFrac
                ].filter((loc, index, arr) => loc >= 0 && arr.indexOf(loc) === index);
                const knownAttribLocations = pieceAttribLocations.concat(meshAttribLocations).filter((loc, index, arr) => arr.indexOf(loc) === index);
                const setEnabledAttribLayout = (enabledLocations) => {
                    for (const loc of knownAttribLocations) {
                        if (loc >= 0) gl.disableVertexAttribArray(loc);
                    }
                    for (const loc of enabledLocations) {
                        if (loc >= 0) gl.enableVertexAttribArray(loc);
                    }
                };
                const glTypeByteSize = (type) => {
                    switch (type) {
                        case gl.BYTE:
                        case gl.UNSIGNED_BYTE:
                            return 1;
                        case gl.SHORT:
                        case gl.UNSIGNED_SHORT:
                            return 2;
                        case gl.FLOAT:
                        default:
                            return 4;
                    }
                };
                const getBufferByteSize = (buffer) => {
                    if (!buffer) return 0;
                    const previous = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
                    if (previous !== buffer) gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                    let bytes = 0;
                    try {
                        bytes = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE) || 0;
                    } catch (_err) {
                        bytes = 0;
                    }
                    if (previous !== buffer) gl.bindBuffer(gl.ARRAY_BUFFER, previous);
                    return bytes | 0;
                };
                const getBufferLabel = (buffer) => {
                    if (!buffer) return "null";
                    if (buffer === this._staticMeshVertexBuffer) return "staticMesh";
                    if (buffer === this._meshVertexBuffer) return "dynamicMesh";
                    if (buffer === this._staticVertexBuffer) return "staticQuad";
                    if (buffer === this._vertexBuffer) return "dynamicQuad";
                    return "unknown";
                };
                const pushDebugHistory = (entry) => {
                    if (!globalScope) return;
                    if (!Array.isArray(globalScope.__jigsawWebglDebug)) globalScope.__jigsawWebglDebug = [];
                    globalScope.__jigsawWebglDebug.push(entry);
                    if (globalScope.__jigsawWebglDebug.length > 100) globalScope.__jigsawWebglDebug.shift();
                };
                const logWebglDebug = (tag, payload) => {
                    if (!this._webglDebugEnabled || typeof console === "undefined" || !console.warn) return;
                    const nextCount = ((this._webglDebugCounts[tag] || 0) + 1) | 0;
                    this._webglDebugCounts[tag] = nextCount;
                    if (nextCount > this._webglDebugLogBudget) return;
                    const entry = Object.assign({
                        tag,
                        count: nextCount,
                        frame: this._frameCounter | 0,
                        timestamp: Date.now()
                    }, payload || {});
                    this._webglDebugHistory.push(entry);
                    if (this._webglDebugHistory.length > 100) this._webglDebugHistory.shift();
                    pushDebugHistory(entry);
                    console.warn(`[WebGLRenderer][${tag} #${nextCount}]`, entry);
                };
                const captureAttribState = (loc, fallbackStride) => {
                    if (!(loc >= 0)) return null;
                    let enabled = false;
                    let buffer = null;
                    let size = 0;
                    let stride = 0;
                    let type = gl.FLOAT;
                    let normalized = false;
                    let offset = 0;
                    try {
                        enabled = !!gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
                        buffer = gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
                        size = gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_SIZE) || 0;
                        stride = gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_STRIDE) || 0;
                        type = gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_TYPE) || gl.FLOAT;
                        normalized = !!gl.getVertexAttrib(loc, gl.VERTEX_ATTRIB_ARRAY_NORMALIZED);
                        offset = gl.getVertexAttribOffset(loc, gl.VERTEX_ATTRIB_ARRAY_POINTER) || 0;
                    } catch (_err) {}
                    const resolvedStride = stride || fallbackStride || 0;
                    const bufferBytes = getBufferByteSize(buffer);
                    let supplied = enabled ? Infinity : 0;
                    if (enabled) {
                        const typeBytes = glTypeByteSize(type);
                        const bytesNeeded = offset + (Math.max(0, size) * typeBytes);
                        if (!resolvedStride || resolvedStride < (Math.max(0, size) * typeBytes)) supplied = 0;
                        else if (bufferBytes < bytesNeeded) supplied = 0;
                        else supplied = 1 + Math.floor((bufferBytes - bytesNeeded) / resolvedStride);
                    }
                    return {
                        loc,
                        enabled,
                        bufferLabel: getBufferLabel(buffer),
                        bufferBytes,
                        size,
                        stride: resolvedStride,
                        type,
                        normalized,
                        offset,
                        supplied: isFinite(supplied) ? supplied : null
                    };
                };
                const captureMeshBindingState = (bufferKind = "dynamic") => {
                    const expectedBuffer = bufferKind === "static" ? this._staticMeshVertexBuffer : this._meshVertexBuffer;
                    const expectedBufferLabel = getBufferLabel(expectedBuffer);
                    const boundBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
                    const boundBufferLabel = getBufferLabel(boundBuffer);
                    const boundBytes = getBufferByteSize(boundBuffer);
                    const expectedBytes = getBufferByteSize(expectedBuffer);
                    const attribs = meshAttribLocations.map((loc) => captureAttribState(loc, 28)).filter(Boolean);
                    let minSupplied = Infinity;
                    for (const attrib of attribs) {
                        if (!attrib.enabled) {
                            minSupplied = 0;
                            continue;
                        }
                        if (attrib.supplied == null) continue;
                        minSupplied = Math.min(minSupplied, attrib.supplied);
                    }
                    if (!isFinite(minSupplied)) minSupplied = 0;
                    return {
                        bufferKind,
                        expectedBufferLabel,
                        boundBufferLabel,
                        boundBytes,
                        expectedBytes,
                        trackedVertexCount: getMeshBufferVertexCountForKind(bufferKind),
                        boundVertexCapacity: Math.floor(boundBytes / 28),
                        expectedVertexCapacity: Math.floor(expectedBytes / 28),
                        minSuppliedVertices: minSupplied,
                        attribs
                    };
                };
                const validateMeshDrawState = (tag, firstVertex, vertexCount, bufferKind = "dynamic", item = null, extra = null) => {
                    const state = captureMeshBindingState(bufferKind);
                    const requiredVertices = (firstVertex | 0) + (vertexCount | 0);
                    const availableVertices = Math.min(
                        Math.max(0, state.boundVertexCapacity | 0),
                        Math.max(0, state.minSuppliedVertices | 0)
                    );
                    const ok = firstVertex >= 0 && vertexCount > 0 && requiredVertices <= availableVertices && state.boundBufferLabel === state.expectedBufferLabel;
                    if (!ok || state.boundVertexCapacity !== state.expectedVertexCapacity || state.expectedVertexCapacity !== state.trackedVertexCount) {
                        logWebglDebug(tag, {
                            requiredVertices,
                            availableVertices,
                            firstVertex,
                            vertexCount,
                            item: item && item.pp ? {
                                x: item.pp.x || 0,
                                y: item.pp.y || 0,
                                nx: item.pp.nx || 0,
                                ny: item.pp.ny || 0,
                                held: !!item.held,
                                overlayVersion: item.pp._overlayVersion || 0,
                                meshVertexStart: item.meshVertexStart,
                                meshVertexCount: item.meshVertexCount,
                                meshFillVertexStart: item.meshFillVertexStart,
                                meshFillVertexCount: item.meshFillVertexCount
                            } : null,
                            state,
                            extra: extra || null
                        });
                    }
                    return ok;
                };
                const prepareMeshProgram = (bufferKind = "dynamic") => {
                    const programChanged = activeProgramKind !== "mesh";
                    if (programChanged) {
                        gl.useProgram(this._meshProgram.program);
                        if (this._meshProgram._resolutionAppliedSerial !== this._resolutionSerial) {
                            gl.uniform2f(this._meshProgram.uResolution, this._displayWidth || this.canvas.width, this._displayHeight || this.canvas.height);
                            this._meshProgram._resolutionAppliedSerial = this._resolutionSerial;
                        }
                        this._bindTextureUnit(0, this._mediaTexture);
                        gl.uniform1i(this._meshProgram.uMedia, 0);
                        const hint = this._getHintColorRgba();
                        gl.uniform4f(this._meshProgram.uHintTint, hint[0], hint[1], hint[2], Math.max(0.8, hint[3] || 1));
                        if (this._meshProgram.uApplyPieceTransform) gl.uniform1f(this._meshProgram.uApplyPieceTransform, 0.0);
                        if (this._meshProgram.uPieceCenterPx) gl.uniform2f(this._meshProgram.uPieceCenterPx, 0, 0);
                        if (this._meshProgram.uPieceHalfSizePx) gl.uniform2f(this._meshProgram.uPieceHalfSizePx, 0, 0);
                        if (this._meshProgram.uPieceRotationCS) gl.uniform2f(this._meshProgram.uPieceRotationCS, 1, 0);
                        activeProgramKind = "mesh";
                        activeMeshMode = "";
                        activeMeshOffsetX = 0;
                        activeMeshOffsetY = 0;
                        activeMeshAlpha = 1;
                        activeMeshBufferKind = "";
                        activeMeshTransformMode = "";
                        activeMeshPieceCenterX = 0;
                        activeMeshPieceCenterY = 0;
                        activeMeshPieceHalfW = 0;
                        activeMeshPieceHalfH = 0;
                        activeMeshPieceCos = 1;
                        activeMeshPieceSin = 0;
                    }
                    setEnabledAttribLayout(meshAttribLocations);
                    gl.bindBuffer(gl.ARRAY_BUFFER, bufferKind === "static" ? this._staticMeshVertexBuffer : this._meshVertexBuffer);
                    if (this._meshProgram.aPosition >= 0) gl.vertexAttribPointer(this._meshProgram.aPosition, 2, gl.FLOAT, false, 28, 0);
                    if (this._meshProgram.aMediaUv >= 0) gl.vertexAttribPointer(this._meshProgram.aMediaUv, 2, gl.FLOAT, false, 28, 8);
                    if (this._meshProgram.aEdgeCoord >= 0) gl.vertexAttribPointer(this._meshProgram.aEdgeCoord, 1, gl.FLOAT, false, 28, 16);
                    if (this._meshProgram.aEdgeShade >= 0) gl.vertexAttribPointer(this._meshProgram.aEdgeShade, 1, gl.FLOAT, false, 28, 20);
                    if (this._meshProgram.aHintBandFrac >= 0) gl.vertexAttribPointer(this._meshProgram.aHintBandFrac, 1, gl.FLOAT, false, 28, 24);
                    activeMeshBufferKind = bufferKind;
                };
                const applyMeshPieceTransform = (item, bufferKind = "dynamic") => {
                    prepareMeshProgram(bufferKind);
                    const useLocalTransform = bufferKind === "dynamic-local" && !!item && !!item.pp;
                    const nextTransformMode = useLocalTransform ? "local" : "world";
                    if (activeMeshTransformMode !== nextTransformMode) {
                        if (this._meshProgram.uApplyPieceTransform) gl.uniform1f(this._meshProgram.uApplyPieceTransform, useLocalTransform ? 1.0 : 0.0);
                        activeMeshTransformMode = nextTransformMode;
                    }
                    if (!useLocalTransform) return;
                    const frameGeom = item.frameGeom || this._computePieceFrameGeometry(item.pp, item.w || 0, item.h || 0, (globalScope.rotations === 180 ? 90 : globalScope.rotations) || 0);
                    if (!frameGeom) return;
                    const centerX = frameGeom.centerX;
                    const centerY = frameGeom.centerY;
                    const halfW = frameGeom.halfW;
                    const halfH = frameGeom.halfH;
                    const cosA = frameGeom.cos;
                    const sinA = frameGeom.sin;
                    if (centerX !== activeMeshPieceCenterX || centerY !== activeMeshPieceCenterY) {
                        if (this._meshProgram.uPieceCenterPx) gl.uniform2f(this._meshProgram.uPieceCenterPx, centerX, centerY);
                        activeMeshPieceCenterX = centerX;
                        activeMeshPieceCenterY = centerY;
                    }
                    if (halfW !== activeMeshPieceHalfW || halfH !== activeMeshPieceHalfH) {
                        if (this._meshProgram.uPieceHalfSizePx) gl.uniform2f(this._meshProgram.uPieceHalfSizePx, halfW, halfH);
                        activeMeshPieceHalfW = halfW;
                        activeMeshPieceHalfH = halfH;
                    }
                    if (cosA !== activeMeshPieceCos || sinA !== activeMeshPieceSin) {
                        if (this._meshProgram.uPieceRotationCS) gl.uniform2f(this._meshProgram.uPieceRotationCS, cosA, sinA);
                        activeMeshPieceCos = cosA;
                        activeMeshPieceSin = sinA;
                    }
                };
                const applyMeshRenderState = (item, mode, offsetX = 0, offsetY = 0, alpha = 1, bufferKind = "dynamic") => {
                    applyMeshPieceTransform(item, bufferKind);
                    const normalizedAlpha = Math.max(0, Math.min(1, alpha));
                    if (activeMeshMode !== mode || activeMeshOffsetX !== offsetX || activeMeshOffsetY !== offsetY || activeMeshAlpha !== normalizedAlpha) {
                        gl.uniform2f(this._meshProgram.uOffsetPx, offsetX, offsetY);
                        if (mode === "shadow") {
                            gl.uniform1f(this._meshProgram.uSolidAlpha, normalizedAlpha);
                            gl.uniform1f(this._meshProgram.uUseSolidColor, 1.0);
                        } else {
                            gl.uniform1f(this._meshProgram.uSolidAlpha, 1.0);
                            gl.uniform1f(this._meshProgram.uUseSolidColor, 0.0);
                        }
                        activeMeshMode = mode;
                        activeMeshOffsetX = offsetX;
                        activeMeshOffsetY = offsetY;
                        activeMeshAlpha = normalizedAlpha;
                    }
                };

                let activePieceBufferKind = "";
                let activePieceTransformMode = "";
                let activePieceOffsetX = 0;
                let activePieceOffsetY = 0;
                let activePieceCenterX = 0;
                let activePieceCenterY = 0;
                let activePieceHalfW = 0;
                let activePieceHalfH = 0;
                let activePieceCos = 1;
                let activePieceSin = 0;
                const preparePieceProgram = (bufferKind = "dynamic") => {
                    const programChanged = activeProgramKind !== "piece";
                    if (programChanged) {
                        gl.useProgram(this._pieceProgram.program);
                        if (this._pieceProgram.uOffsetPx) gl.uniform2f(this._pieceProgram.uOffsetPx, 0, 0);
                        if (this._pieceProgram.uApplyPieceTransform) gl.uniform1f(this._pieceProgram.uApplyPieceTransform, 0.0);
                        if (this._pieceProgram.uPieceCenterPx) gl.uniform2f(this._pieceProgram.uPieceCenterPx, 0, 0);
                        if (this._pieceProgram.uPieceHalfSizePx) gl.uniform2f(this._pieceProgram.uPieceHalfSizePx, 0, 0);
                        if (this._pieceProgram.uPieceRotationCS) gl.uniform2f(this._pieceProgram.uPieceRotationCS, 1, 0);
                        activePieceTransformMode = "world";
                        activePieceOffsetX = 0;
                        activePieceOffsetY = 0;
                        activePieceCenterX = 0;
                        activePieceCenterY = 0;
                        activePieceHalfW = 0;
                        activePieceHalfH = 0;
                        activePieceCos = 1;
                        activePieceSin = 0;
                    }
                    setEnabledAttribLayout(pieceAttribLocations);
                    gl.bindBuffer(gl.ARRAY_BUFFER, bufferKind === "static" ? this._staticVertexBuffer : this._vertexBuffer);
                    this._setVertexOffset(0);
                    activePieceBufferKind = bufferKind;
                    if (this._pieceProgram._resolutionAppliedSerial !== this._resolutionSerial) {
                        gl.uniform2f(this._pieceProgram.uResolution, this._displayWidth || this.canvas.width, this._displayHeight || this.canvas.height);
                        this._pieceProgram._resolutionAppliedSerial = this._resolutionSerial;
                    }
                    this._bindTextureUnit(0, this._mediaTexture);
                    gl.uniform1i(this._pieceProgram.uMedia, 0);
                    gl.uniform4f(
                        this._pieceProgram.uHintTint,
                        this._getHintColorRgba()[0],
                        this._getHintColorRgba()[1],
                        this._getHintColorRgba()[2],
                        Math.max(0.8, this._getHintColorRgba()[3] || 1)
                    );
                    gl.uniform1f(this._pieceProgram.uHintBandPx, Math.max(0.03 * puzzle.scalex, 7));
                    activeProgramKind = "piece";
                };

                const applyPieceTransformState = (item, offsetX = 0, offsetY = 0, bufferKind = "dynamic") => {
                    preparePieceProgram(bufferKind);
                    const useLocalTransform = bufferKind === "dynamic-local" && !!item && !!item.pp;
                    const nextTransformMode = useLocalTransform ? "local" : "world";
                    if (activePieceTransformMode !== nextTransformMode) {
                        if (this._pieceProgram.uApplyPieceTransform) gl.uniform1f(this._pieceProgram.uApplyPieceTransform, useLocalTransform ? 1.0 : 0.0);
                        activePieceTransformMode = nextTransformMode;
                    }
                    if (activePieceOffsetX !== offsetX || activePieceOffsetY !== offsetY) {
                        if (this._pieceProgram.uOffsetPx) gl.uniform2f(this._pieceProgram.uOffsetPx, offsetX, offsetY);
                        activePieceOffsetX = offsetX;
                        activePieceOffsetY = offsetY;
                    }
                    if (!useLocalTransform) return;
                    const frameGeom = item.frameGeom || this._computePieceFrameGeometry(item.pp, item.w || 0, item.h || 0, (globalScope.rotations === 180 ? 90 : globalScope.rotations) || 0);
                    if (!frameGeom) return;
                    const centerX = frameGeom.centerX;
                    const centerY = frameGeom.centerY;
                    const halfW = frameGeom.halfW;
                    const halfH = frameGeom.halfH;
                    const cosA = frameGeom.cos;
                    const sinA = frameGeom.sin;
                    if (activePieceCenterX !== centerX || activePieceCenterY !== centerY) {
                        if (this._pieceProgram.uPieceCenterPx) gl.uniform2f(this._pieceProgram.uPieceCenterPx, centerX, centerY);
                        activePieceCenterX = centerX;
                        activePieceCenterY = centerY;
                    }
                    if (activePieceHalfW !== halfW || activePieceHalfH !== halfH) {
                        if (this._pieceProgram.uPieceHalfSizePx) gl.uniform2f(this._pieceProgram.uPieceHalfSizePx, halfW, halfH);
                        activePieceHalfW = halfW;
                        activePieceHalfH = halfH;
                    }
                    if (activePieceCos !== cosA || activePieceSin !== sinA) {
                        if (this._pieceProgram.uPieceRotationCS) gl.uniform2f(this._pieceProgram.uPieceRotationCS, cosA, sinA);
                        activePieceCos = cosA;
                        activePieceSin = sinA;
                    }
                };

                const applyPieceMaskUniforms = (item, mode, alpha = 1, bufferKind = null, offsetX = 0, offsetY = 0) => {
                    const resolvedBufferKind = bufferKind || item.quadBufferKind || "dynamic";
                    applyPieceTransformState(item, offsetX, offsetY, resolvedBufferKind);
                    gl.uniform1f(this._pieceProgram.uMode, mode);
                    this._bindTextureUnit(1, item.maskTexture);
                    gl.uniform1i(this._pieceProgram.uMask, 1);
                    if (mode < 0.5) {
                        gl.uniform1f(this._pieceProgram.uAlpha, alpha);
                        gl.uniform1f(this._pieceProgram.uSoftness, 3.0);
                    }
                    gl.uniform2f(
                        this._pieceProgram.uTexel,
                        1 / Math.max(1, item.maskSource === "atlas" ? (this._maskAtlasWidth || 1) : (item.maskW || item.w)),
                        1 / Math.max(1, item.maskSource === "atlas" ? (this._maskAtlasHeight || 1) : (item.maskH || item.h))
                    );
                };

                let stencilSessionActive = false;
                let stencilColorMaskDisabled = false;
                const stencilScissorState = { enabled: false, x: 0, y: 0, width: 0, height: 0 };
                const finishStencilState = () => {
                    if (!stencilSessionActive) return;
                    if (stencilColorMaskDisabled) {
                        gl.colorMask(true, true, true, true);
                        stencilColorMaskDisabled = false;
                    }
                    if (stencilScissorState.enabled) {
                        gl.disable(gl.SCISSOR_TEST);
                        stencilScissorState.enabled = false;
                    }
                    gl.stencilMask(0xff);
                    gl.disable(gl.STENCIL_TEST);
                    stencilSessionActive = false;
                };
                const ensureStencilSession = () => {
                    if (stencilSessionActive) {
                        this._meshMetrics.stencilStateReuses += 1;
                        return;
                    }
                    gl.enable(gl.STENCIL_TEST);
                    stencilSessionActive = true;
                    this._meshMetrics.stencilStateSessions += 1;
                };

                const getMeshBufferVertexCountForKind = (bufferKind) => {
                    return Math.max(0, ((bufferKind === "static" ? this._staticMeshVertexBufferVertexCount : this._meshVertexBufferVertexCount) | 0));
                };

                const drawFallbackPiece = (item) => {
                    finishStencilState();
                    if (!item.maskTexture || item.pieceVertexStart < 0 || item.pieceVertexCount <= 0) return 0;
                    applyPieceMaskUniforms(item, 1.0, 1, item.quadBufferKind || "dynamic", 0, 0);
                    gl.drawArrays(gl.TRIANGLES, item.pieceVertexStart, item.pieceVertexCount);
                    this._fallbackMetrics.standaloneDrawCalls += 1;
                    return 1;
                };

                const drawStaticFallbackPiece = (command) => {
                    finishStencilState();
                    if (!command || !command.maskTexture || command.firstVertex < 0 || command.vertexCount <= 0) return 0;
                    applyPieceTransformState(null, 0, 0, "static");
                    gl.uniform1f(this._pieceProgram.uMode, 1.0);
                    this._bindTextureUnit(1, command.maskTexture);
                    gl.uniform1i(this._pieceProgram.uMask, 1);
                    gl.uniform2f(this._pieceProgram.uTexel, command.texelX || 1, command.texelY || 1);
                    gl.drawArrays(gl.TRIANGLES, command.firstVertex, command.vertexCount);
                    this._fallbackMetrics.standaloneDrawCalls += 1;
                    return 1;
                };

                const drawAtlasFallbackRun = (firstVertex, vertexCount, bufferKind = "static") => {
                    finishStencilState();
                    if (vertexCount <= 0 || !this._maskAtlasTexture) return 0;
                    applyPieceTransformState(null, 0, 0, bufferKind);
                    gl.uniform1f(this._pieceProgram.uMode, 1.0);
                    this._bindTextureUnit(1, this._maskAtlasTexture);
                    gl.uniform1i(this._pieceProgram.uMask, 1);
                    gl.uniform2f(
                        this._pieceProgram.uTexel,
                        1 / Math.max(1, this._maskAtlasWidth || 1),
                        1 / Math.max(1, this._maskAtlasHeight || 1)
                    );
                    gl.drawArrays(gl.TRIANGLES, firstVertex, vertexCount);
                    this._fallbackMetrics.atlasBatchDrawCalls += 1;
                    return 1;
                };

                const drawHeldShadow = (item) => {
                    finishStencilState();
                    if (!item.held || item.pieceVertexStart < 0 || item.pieceVertexCount <= 0 || !item.maskTexture || !item.needsShadowMask) return 0;
                    applyPieceMaskUniforms(item, 0.0, item.heldShadowAlpha, item.quadBufferKind || "dynamic", item.shadowDx || 0, item.shadowDy || 0);
                    gl.drawArrays(gl.TRIANGLES, item.pieceVertexStart, item.pieceVertexCount);
                    return 1;
                };

                const drawMeshRange = (firstVertex, vertexCount, singlePiece = false, bufferKind = "dynamic", transformItem = null) => {
                    finishStencilState();
                    if (firstVertex < 0 || vertexCount <= 0) return 0;
                    applyMeshRenderState(transformItem, "piece", 0, 0, 1, bufferKind);
                    if (!validateMeshDrawState("mesh-range-invalid", firstVertex, vertexCount, bufferKind, transformItem, { singlePiece })) return 0;
                    gl.drawArrays(gl.TRIANGLES, firstVertex, vertexCount);
                    if (singlePiece) this._meshMetrics.singleDrawCalls += 1;
                    else this._meshMetrics.batchedDrawCalls += 1;
                    return 1;
                };

                const drawHeldMeshShadow = (item) => {
                    if (!item || !item.held || !item.mesh || item.needsMaskFallback || item.meshFillVertexCount <= 0) return 0;
                    const bufferKind = item.meshBufferKind || "dynamic";
                    const alpha = Math.max(0, Math.min(1, item.heldShadowAlpha || 0));
                    if (alpha <= 0.0001) return 0;
                    applyMeshRenderState(item, "shadow", item.shadowDx || 0, item.shadowDy || 0, alpha, bufferKind);
                    if (!validateMeshDrawState("held-mesh-shadow-invalid", item.meshFillVertexStart, item.meshFillVertexCount, bufferKind, item, null)) return 0;
                    if (item.mesh.requiresStencil) {
                        return drawStencilMeshPiece(item, { shadowOnly: true });
                    }
                    finishStencilState();
                    gl.drawArrays(gl.TRIANGLES, item.meshFillVertexStart, item.meshFillVertexCount);
                    this._meshMetrics.meshShadowPieces += 1;
                    this._meshMetrics.meshShadowDrawCalls += 1;
                    return 1;
                };

                const drawStencilMeshPiece = (item, options = null) => {
                    if (!item || !item.mesh || !item.mesh.requiresStencil || item.meshFillVertexCount <= 0) return 0;
                    const bufferKind = item.meshBufferKind || "dynamic";
                    const shadowOnly = !!(options && options.shadowOnly);
                    const colorVertexStart = shadowOnly ? item.meshFillVertexStart : item.meshVertexStart;
                    const colorVertexCount = shadowOnly ? item.meshFillVertexCount : item.meshVertexCount;
                    if (shadowOnly) applyMeshRenderState(item, "shadow", item.shadowDx || 0, item.shadowDy || 0, item.heldShadowAlpha || 0, bufferKind);
                    else applyMeshRenderState(item, "piece", 0, 0, 1, bufferKind);
                    if (!validateMeshDrawState("stencil-mesh-fill-invalid", item.meshFillVertexStart, item.meshFillVertexCount, bufferKind, item, { shadowOnly })) return 0;
                    if (!validateMeshDrawState("stencil-mesh-color-invalid", colorVertexStart, colorVertexCount, bufferKind, item, { shadowOnly })) return 0;
                    ensureStencilSession();
                    this._clearStencilForItem(gl, item, shadowOnly, stencilScissorState);
                    gl.stencilFunc(gl.ALWAYS, 0, 0xff);
                    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);
                    if (!stencilColorMaskDisabled) {
                        gl.colorMask(false, false, false, false);
                        stencilColorMaskDisabled = true;
                    }
                    gl.drawArrays(gl.TRIANGLES, item.meshFillVertexStart, item.meshFillVertexCount);
                    let pieceDraws = 1;
                    if (stencilColorMaskDisabled) {
                        gl.colorMask(true, true, true, true);
                        stencilColorMaskDisabled = false;
                    }
                    gl.stencilMask(0x00);
                    gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
                    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
                    gl.drawArrays(gl.TRIANGLES, colorVertexStart, colorVertexCount);
                    pieceDraws += 1;
                    gl.stencilMask(0xff);
                    if (shadowOnly) {
                        this._meshMetrics.meshShadowPieces += 1;
                        this._meshMetrics.meshShadowDrawCalls += pieceDraws;
                    } else {
                        this._meshMetrics.singleDrawCalls += 1;
                        this._meshMetrics.stencilDrawCalls += pieceDraws;
                    }
                    return pieceDraws;
                };

                const drawStaticStencilCommand = (command) => {
                    if (
                        !command ||
                        command.fillFirstVertex < 0 ||
                        command.fillVertexCount <= 0 ||
                        command.colorFirstVertex < 0 ||
                        command.colorVertexCount <= 0
                    ) return 0;
                    applyMeshRenderState(null, "piece", 0, 0, 1, "static");
                    if (!validateMeshDrawState("static-stencil-fill-invalid", command.fillFirstVertex, command.fillVertexCount, "static", null, { command })) return 0;
                    if (!validateMeshDrawState("static-stencil-color-invalid", command.colorFirstVertex, command.colorVertexCount, "static", null, { command })) return 0;
                    ensureStencilSession();
                    this._clearStencilRect(gl, command.scissorRect || null, stencilScissorState);
                    gl.stencilFunc(gl.ALWAYS, 0, 0xff);
                    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);
                    if (!stencilColorMaskDisabled) {
                        gl.colorMask(false, false, false, false);
                        stencilColorMaskDisabled = true;
                    }
                    gl.drawArrays(gl.TRIANGLES, command.fillFirstVertex, command.fillVertexCount);
                    let pieceDraws = 1;
                    if (stencilColorMaskDisabled) {
                        gl.colorMask(true, true, true, true);
                        stencilColorMaskDisabled = false;
                    }
                    gl.stencilMask(0x00);
                    gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
                    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
                    gl.drawArrays(gl.TRIANGLES, command.colorFirstVertex, command.colorVertexCount);
                    pieceDraws += 1;
                    gl.stencilMask(0xff);
                    this._meshMetrics.singleDrawCalls += 1;
                    this._meshMetrics.stencilDrawCalls += pieceDraws;
                    return pieceDraws;
                };

                let drawCalls = 0;
                let visiblePieces = 0;
                const renderedMeshPieces = [];
                const renderedFallbackPieces = [];

                const clearRenderedPieceDirty = (pp) => {
                    if (!sceneState || typeof sceneState.clearPieceDirty !== "function" || !pp) return;
                    if (sceneState.dirtyPieces instanceof Set && !sceneState.dirtyPieces.has(pp)) return;
                    sceneState.clearPieceDirty(pp);
                };

                if (staticRenderPlan && Array.isArray(staticRenderPlan.commands) && staticRenderPlan.commands.length) {
                    for (const command of staticRenderPlan.commands) {
                        if (!command) continue;
                        switch (command.kind) {
                            case "meshRun":
                                drawCalls += drawMeshRange(command.firstVertex, command.vertexCount, false, command.bufferKind || "static", null);
                                break;
                            case "atlasFallbackRun":
                                drawCalls += drawAtlasFallbackRun(command.firstVertex, command.vertexCount, command.bufferKind || "static");
                                break;
                            case "stencilMeshStatic":
                                drawCalls += drawStaticStencilCommand(command);
                                break;
                            case "fallbackPieceStatic":
                                drawCalls += drawStaticFallbackPiece(command);
                                break;
                            default:
                                break;
                        }
                    }
                    visiblePieces += staticRenderPlan.visiblePieces || 0;
                    this._meshMetrics.triangles += staticRenderPlan.meshTriangles || 0;
                    this._meshMetrics.pieces += staticRenderPlan.meshPieces || 0;
                    this._meshMetrics.geometryEdgePieces += staticRenderPlan.geometryEdgePieces || 0;
                    this._meshMetrics.holedMeshPieces += staticRenderPlan.holedMeshPieces || 0;
                    this._meshMetrics.stencilPieces += staticRenderPlan.stencilPieces || 0;
                    this._meshMetrics.staticPieces += staticRenderPlan.staticMeshPieces || 0;
                    this._meshMetrics.fallbackPieces += staticRenderPlan.fallbackPieces || 0;
                    this._meshMetrics.holedFallbackPieces += staticRenderPlan.holedFallbackPieces || 0;
                    this._fallbackMetrics.staticPieces += staticRenderPlan.staticFallbackPieces || 0;
                }

                for (const item of heldDrawPlan.items) {
                    if (!item) continue;
                    if (item.needsMaskFallback && item.maskTexture) {
                        drawCalls += drawHeldShadow(item);
                        this._meshMetrics.shadowMaskPieces += 1;
                    } else {
                        drawCalls += drawHeldMeshShadow(item);
                    }

                    if (item.mesh && !item.needsMaskFallback) {
                        drawCalls += item.mesh.requiresStencil
                            ? drawStencilMeshPiece(item)
                            : drawMeshRange(item.meshVertexStart, item.meshVertexCount, true, item.meshBufferKind || "dynamic", item);
                        renderedMeshPieces.push(item.pp);
                        visiblePieces += 1;
                        this._meshMetrics.triangles += Math.max(0, item.meshVertexCount / 3);
                        this._meshMetrics.pieces += 1;
                        this._meshMetrics.dynamicPieces += 1;
                        if (item.mesh.hasGeometryEdge) this._meshMetrics.geometryEdgePieces += 1;
                        if (item.mesh.holeCount > 0) {
                            this._meshMetrics.holedMeshPieces += 1;
                            if (item.mesh.requiresStencil) this._meshMetrics.stencilPieces += 1;
                        }
                        continue;
                    }

                    if (item.needsMaskFallback && item.maskTexture) {
                        drawCalls += drawFallbackPiece(item);
                        renderedFallbackPieces.push(item.pp);
                        visiblePieces += 1;
                        this._meshMetrics.fallbackPieces += 1;
                        this._fallbackMetrics.dynamicPieces += 1;
                        if (item.pp && item.pp.tbLoops && item.pp.tbLoops.length > 1) this._meshMetrics.holedFallbackPieces += 1;
                    }
                }
                finishStencilState();

                if (hadDirtyNonHeld && staticRenderPlan) {
                    if (Array.isArray(staticRenderPlan.renderedMeshPieces)) {
                        for (const pp of staticRenderPlan.renderedMeshPieces) clearRenderedPieceDirty(pp);
                    }
                    if (Array.isArray(staticRenderPlan.renderedFallbackPieces)) {
                        for (const pp of staticRenderPlan.renderedFallbackPieces) clearRenderedPieceDirty(pp);
                    }
                }
                for (const pp of renderedMeshPieces) clearRenderedPieceDirty(pp);
                for (const pp of renderedFallbackPieces) clearRenderedPieceDirty(pp);

                this._frameCounter++;
                if ((this._frameCounter % 30) === 0) this._pruneTextureCache(visibleFrameMark);
                this.lastVisiblePieces = visiblePieces;
                this.lastDrawCount = drawCalls;
                this.lastMediaUploads = this._mediaUploadsThisFrame || 0;
                if (globalScope.rendererPerf) {
                    globalScope.rendererPerf.webglVisiblePieces = visiblePieces;
                    globalScope.rendererPerf.webglHeldPieces = numHeld;
                    globalScope.rendererPerf.webglMaskAtlasRebuilds = this._atlasMetrics.rebuilds;
                    globalScope.rendererPerf.webglMaskAtlasUploads = this._atlasMetrics.uploads;
                    globalScope.rendererPerf.webglBatchedMainDrawCalls = this._atlasMetrics.batchedMainDrawCalls;
                    globalScope.rendererPerf.webglAtlasMaskUses = this._atlasMetrics.atlasMaskUses;
                    globalScope.rendererPerf.webglStandaloneMaskUses = this._atlasMetrics.standaloneMaskUses;
                    globalScope.rendererPerf.webglRestoredMaskUses = this._atlasMetrics.restoredMaskUses;
                    globalScope.rendererPerf.webglMaskPrepMisses = this._atlasMetrics.prepMisses;
                    globalScope.rendererPerf.webglMediaSourceKind = this.lastMediaSourceKind;
                    globalScope.rendererPerf.webglMediaUsesMapping = this.lastMediaUsesMapping;
                    globalScope.rendererPerf.webglMeshBatchedDrawCalls = this._meshMetrics.batchedDrawCalls;
                    globalScope.rendererPerf.webglMeshSingleDrawCalls = this._meshMetrics.singleDrawCalls;
                    globalScope.rendererPerf.webglMeshTriangles = this._meshMetrics.triangles;
                    globalScope.rendererPerf.webglMeshPieces = this._meshMetrics.pieces;
                    globalScope.rendererPerf.webglMeshFallbackPieces = this._meshMetrics.fallbackPieces;
                    globalScope.rendererPerf.webglShadowMaskPieces = this._meshMetrics.shadowMaskPieces;
                    globalScope.rendererPerf.webglMeshShadowPieces = this._meshMetrics.meshShadowPieces;
                    globalScope.rendererPerf.webglMeshShadowDrawCalls = this._meshMetrics.meshShadowDrawCalls;
                    globalScope.rendererPerf.webglGeometryEdgePieces = this._meshMetrics.geometryEdgePieces;
                    globalScope.rendererPerf.webglHoledMeshPieces = this._meshMetrics.holedMeshPieces;
                    globalScope.rendererPerf.webglStencilPieces = this._meshMetrics.stencilPieces;
                    globalScope.rendererPerf.webglStencilDrawCalls = this._meshMetrics.stencilDrawCalls;
                    globalScope.rendererPerf.webglStencilScissoredClears = this._meshMetrics.stencilScissoredClears;
                    globalScope.rendererPerf.webglStencilFullClears = this._meshMetrics.stencilFullClears;
                    globalScope.rendererPerf.webglStencilScissorStateChanges = this._meshMetrics.stencilScissorStateChanges;
                    globalScope.rendererPerf.webglStencilStateSessions = this._meshMetrics.stencilStateSessions;
                    globalScope.rendererPerf.webglStencilStateReuses = this._meshMetrics.stencilStateReuses;
                    globalScope.rendererPerf.webglHoledFallbackPieces = this._meshMetrics.holedFallbackPieces;
                    globalScope.rendererPerf.webglTriangulationFailures = this._meshMetrics.triangulationFailures;
                    globalScope.rendererPerf.webglStaticMeshBatchRebuilds = this._meshMetrics.staticBatchRebuilds;
                    globalScope.rendererPerf.webglStaticMeshBatchReuses = this._meshMetrics.staticBatchReuses;
                    globalScope.rendererPerf.webglStaticMeshUploads = this._meshMetrics.staticVertexUploads;
                    globalScope.rendererPerf.webglDynamicMeshUploads = this._meshMetrics.dynamicVertexUploads;
                    globalScope.rendererPerf.webglHeldMeshBatchRebuilds = this._meshMetrics.heldBatchRebuilds;
                    globalScope.rendererPerf.webglHeldMeshBatchReuses = this._meshMetrics.heldBatchReuses;
                    globalScope.rendererPerf.webglStaticMeshPieces = this._meshMetrics.staticPieces;
                    globalScope.rendererPerf.webglDynamicMeshPieces = this._meshMetrics.dynamicPieces;
                    globalScope.rendererPerf.webglStaticDrawPlanRebuilds = this._meshMetrics.staticPlanRebuilds;
                    globalScope.rendererPerf.webglStaticDrawPlanReuses = this._meshMetrics.staticPlanReuses;
                    globalScope.rendererPerf.webglStaticRenderPlanRebuilds = this._meshMetrics.staticRenderPlanRebuilds;
                    globalScope.rendererPerf.webglStaticRenderPlanReuses = this._meshMetrics.staticRenderPlanReuses;
                    globalScope.rendererPerf.webglStaticFallbackBatchRebuilds = this._fallbackMetrics.staticBatchRebuilds;
                    globalScope.rendererPerf.webglStaticFallbackBatchReuses = this._fallbackMetrics.staticBatchReuses;
                    globalScope.rendererPerf.webglStaticFallbackUploads = this._fallbackMetrics.staticVertexUploads;
                    globalScope.rendererPerf.webglDynamicFallbackUploads = this._fallbackMetrics.dynamicVertexUploads;
                    globalScope.rendererPerf.webglHeldFallbackBatchRebuilds = this._fallbackMetrics.heldBatchRebuilds;
                    globalScope.rendererPerf.webglHeldFallbackBatchReuses = this._fallbackMetrics.heldBatchReuses;
                    globalScope.rendererPerf.webglStaticFallbackPieces = this._fallbackMetrics.staticPieces;
                    globalScope.rendererPerf.webglDynamicFallbackPieces = this._fallbackMetrics.dynamicPieces;
                    globalScope.rendererPerf.webglAtlasFallbackBatchDrawCalls = this._fallbackMetrics.atlasBatchDrawCalls;
                    globalScope.rendererPerf.webglStandaloneFallbackDrawCalls = this._fallbackMetrics.standaloneDrawCalls;
                    globalScope.rendererPerf.webglLastStaticFallbackRebuilt = this.lastStaticFallbackRebuilt;
                }
            } catch (e) {
                this._handleRuntimeFailure(e);
            }
        }


        renderDirtyPieces(sceneState) {
            if (sceneState && sceneState.hasDirtyPieces && !sceneState.hasDirtyPieces()) return;
            this.renderFrame(undefined, sceneState);
            if (sceneState && sceneState.clearZOrderDirty) sceneState.clearZOrderDirty();
        }

        destroy() {
            this.enabled = false;
            this.supportsPieceRendering = false;
            if (this.gl) {
                for (const entry of this._pieceTextureCache.values()) {
                    if (entry.maskTexture) this.gl.deleteTexture(entry.maskTexture);
                }
                this._pieceTextureCache.clear();
                if (this._vertexBuffer) this.gl.deleteBuffer(this._vertexBuffer);
                if (this._staticVertexBuffer) this.gl.deleteBuffer(this._staticVertexBuffer);
                if (this._meshVertexBuffer) this.gl.deleteBuffer(this._meshVertexBuffer);
                if (this._staticMeshVertexBuffer) this.gl.deleteBuffer(this._staticMeshVertexBuffer);
                if (this._mediaTexture) this.gl.deleteTexture(this._mediaTexture);
                if (this._maskAtlasTexture) this.gl.deleteTexture(this._maskAtlasTexture);
                if (this._pieceProgram && this._pieceProgram.program) this.gl.deleteProgram(this._pieceProgram.program);
                if (this._meshProgram && this._meshProgram.program) this.gl.deleteProgram(this._meshProgram.program);
            }
            this._vertexBuffer = null;
            this._staticVertexBuffer = null;
            this._meshVertexBuffer = null;
            this._staticMeshVertexBuffer = null;
            this._staticMeshBatch = null;
            this._heldMeshBatch = null;
            this._heldFallbackBatch = null;
            this._staticRenderPlan = null;
            this._staticMeshBatchedVertices = null;
            this._staticMeshBatchedVertexCapacity = 0;
            this._heldMeshLocalVertices = null;
            this._heldMeshLocalVertexCapacity = 0;
            this._heldFallbackLocalVertices = null;
            this._heldFallbackLocalVertexCapacity = 0;
            this._staticDrawPlan = null;
            this._staticRenderPlan = null;
            this._mediaTexture = null;
            this._mediaTextureW = 0;
            this._mediaTextureH = 0;
            this._maskAtlasTexture = null;
            this._pieceProgram = null;
            this._meshProgram = null;
            this._supportsStencil = false;
            if (this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas);
            this.gl = null;
        }

        _initResources() {
            if (!this.gl) return false;
            const gl = this.gl;
            if (this._vertexBuffer) gl.deleteBuffer(this._vertexBuffer);
            if (this._staticVertexBuffer) gl.deleteBuffer(this._staticVertexBuffer);
            if (this._meshVertexBuffer) gl.deleteBuffer(this._meshVertexBuffer);
            if (this._staticMeshVertexBuffer) gl.deleteBuffer(this._staticMeshVertexBuffer);
            if (this._mediaTexture) gl.deleteTexture(this._mediaTexture);
            if (this._maskAtlasTexture) gl.deleteTexture(this._maskAtlasTexture);
            if (this._pieceProgram && this._pieceProgram.program) gl.deleteProgram(this._pieceProgram.program);
            if (this._meshProgram && this._meshProgram.program) gl.deleteProgram(this._meshProgram.program);
            for (const entry of this._pieceTextureCache.values()) {
                if (entry.maskTexture) gl.deleteTexture(entry.maskTexture);
            }
            this._pieceTextureCache.clear();
            this._mediaTexture = null;
            this._mediaTextureW = 0;
            this._mediaTextureH = 0;
            this._mediaTextureConfigured = false;
            this._mediaTextureSourceRef = null;
            this._maskAtlasTexture = null;
            this._maskAtlasConfigured = false;
            this._maskAtlasWidth = 0;
            this._maskAtlasHeight = 0;
            this._maskAtlasMaxSize = 0;
            this._maskAtlasNextX = 1;
            this._maskAtlasNextY = 1;
            this._maskAtlasRowH = 0;
            this._maskAtlasRebuildRequested = false;
            this._atlasMetrics.rebuilds = 0;
            this._atlasMetrics.uploads = 0;
            this._atlasMetrics.batchedMainDrawCalls = 0;
            this._atlasMetrics.atlasMaskUses = 0;
            this._atlasMetrics.standaloneMaskUses = 0;
            this._atlasMetrics.restoredMaskUses = 0;
            this._atlasMetrics.prepMisses = 0;
            this._meshMetrics.batchedDrawCalls = 0;
            this._meshMetrics.singleDrawCalls = 0;
            this._meshMetrics.triangles = 0;
            this._meshMetrics.pieces = 0;
            this._meshMetrics.fallbackPieces = 0;
            this._meshMetrics.shadowMaskPieces = 0;
            this._meshMetrics.meshShadowPieces = 0;
            this._meshMetrics.meshShadowDrawCalls = 0;
            this._meshMetrics.geometryEdgePieces = 0;
            this._meshMetrics.holedMeshPieces = 0;
            this._meshMetrics.stencilPieces = 0;
            this._meshMetrics.stencilDrawCalls = 0;
            this._meshMetrics.stencilScissoredClears = 0;
            this._meshMetrics.stencilFullClears = 0;
            this._meshMetrics.stencilScissorStateChanges = 0;
            this._meshMetrics.holedFallbackPieces = 0;
            this._meshMetrics.triangulationFailures = 0;
            this._meshMetrics.staticBatchRebuilds = 0;
            this._meshMetrics.staticBatchReuses = 0;
            this._meshMetrics.staticVertexUploads = 0;
            this._meshMetrics.dynamicVertexUploads = 0;
            this._meshMetrics.heldBatchRebuilds = 0;
            this._meshMetrics.heldBatchReuses = 0;
            this._meshMetrics.staticPieces = 0;
            this._meshMetrics.dynamicPieces = 0;
            this._meshMetrics.staticPlanRebuilds = 0;
            this._meshMetrics.staticPlanReuses = 0;
            this._meshMetrics.staticRenderPlanRebuilds = 0;
            this._meshMetrics.staticRenderPlanReuses = 0;
            this._fallbackMetrics.staticBatchRebuilds = 0;
            this._fallbackMetrics.staticBatchReuses = 0;
            this._fallbackMetrics.staticVertexUploads = 0;
            this._fallbackMetrics.dynamicVertexUploads = 0;
            this._fallbackMetrics.atlasBatchDrawCalls = 0;
            this._fallbackMetrics.standaloneDrawCalls = 0;
            this._fallbackMetrics.staticPieces = 0;
            this._fallbackMetrics.dynamicPieces = 0;
            this._fallbackMetrics.heldBatchRebuilds = 0;
            this._fallbackMetrics.heldBatchReuses = 0;
            this._staticDrawPlan = null;
            this._staticRenderPlan = null;
            this._boundTexture0 = null;
            this._boundTexture1 = null;
            this._activeTextureUnit = -1;
            this._staticFallbackBatch = null;
            this._staticFallbackBatchedVertices = null;
            this._staticFallbackBatchedVertexCapacity = 0;
            this._heldFallbackBatch = null;
            this._heldFallbackLocalVertices = null;
            this._heldFallbackLocalVertexCapacity = 0;
            this._staticMeshBatch = null;
            this._staticMeshBatchedVertices = null;
            this._staticMeshBatchedVertexCapacity = 0;
            this.lastStaticRebuilt = false;
            this.lastStaticFallbackRebuilt = false;
            this._cacheSerialCounter = 1;
            this._resolutionSerial++;

            const quadVertexSrc = `
                attribute vec2 a_position;
                attribute vec2 a_texCoord;
                attribute vec2 a_mediaUv;
                attribute vec2 a_edgeOffsetPx;
                attribute float a_hintFlag;
                uniform vec2 u_resolution;
                uniform vec2 u_offsetPx;
                uniform float u_applyPieceTransform;
                uniform vec2 u_pieceCenterPx;
                uniform vec2 u_pieceHalfSizePx;
                uniform vec2 u_pieceRotationCS;
                varying vec2 v_texCoord;
                varying vec2 v_mediaUv;
                varying vec2 v_edgeOffsetPx;
                varying float v_hintFlag;
                void main() {
                    vec2 positionPx = a_position;
                    if (u_applyPieceTransform > 0.5) {
                        vec2 centered = a_position - u_pieceHalfSizePx;
                        positionPx = vec2(
                            centered.x * u_pieceRotationCS.x - centered.y * u_pieceRotationCS.y,
                            centered.x * u_pieceRotationCS.y + centered.y * u_pieceRotationCS.x
                        ) + u_pieceCenterPx;
                    }
                    vec2 zeroToOne = (positionPx + u_offsetPx) / u_resolution;
                    vec2 clipSpace = zeroToOne * 2.0 - 1.0;
                    gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
                    v_texCoord = a_texCoord;
                    v_mediaUv = a_mediaUv;
                    v_edgeOffsetPx = a_edgeOffsetPx;
                    v_hintFlag = a_hintFlag;
                }
            `;
            const combinedFragSrc = `
                precision mediump float;
                varying vec2 v_texCoord;
                varying vec2 v_mediaUv;
                varying vec2 v_edgeOffsetPx;
                varying float v_hintFlag;
                uniform float u_mode;
                uniform sampler2D u_media;
                uniform sampler2D u_mask;
                uniform float u_alpha;
                uniform vec2 u_texel;
                uniform float u_softness;
                uniform vec4 u_hintTint;
                uniform float u_hintBandPx;
                void main() {
                    float alpha = texture2D(u_mask, v_texCoord).a;
                    if (u_mode < 0.5) {
                        vec2 d = u_texel * u_softness;
                        float blurred = 0.0;
                        blurred += alpha * 0.227027;
                        blurred += texture2D(u_mask, v_texCoord + vec2( d.x, 0.0)).a * 0.1945946;
                        blurred += texture2D(u_mask, v_texCoord + vec2(-d.x, 0.0)).a * 0.1945946;
                        blurred += texture2D(u_mask, v_texCoord + vec2(0.0,  d.y)).a * 0.1945946;
                        blurred += texture2D(u_mask, v_texCoord + vec2(0.0, -d.y)).a * 0.1945946;
                        blurred += texture2D(u_mask, v_texCoord + vec2( d.x,  d.y)).a * 0.1216216;
                        blurred += texture2D(u_mask, v_texCoord + vec2(-d.x,  d.y)).a * 0.1216216;
                        blurred += texture2D(u_mask, v_texCoord + vec2( d.x, -d.y)).a * 0.1216216;
                        blurred += texture2D(u_mask, v_texCoord + vec2(-d.x, -d.y)).a * 0.1216216;
                        blurred = blurred * 0.62;
                        gl_FragColor = vec4(0.0, 0.0, 0.0, blurred * u_alpha);
                        return;
                    }
                    if (alpha <= 0.0001) discard;
                    vec4 media = texture2D(u_media, v_mediaUv);
                    vec3 rgb = media.rgb;
                    float outAlpha = media.a * alpha;
                    float offsetMag = abs(v_edgeOffsetPx.x) + abs(v_edgeOffsetPx.y);
                    if (offsetMag > 0.0001) {
                        vec2 delta = v_edgeOffsetPx * u_texel;
                        float shiftedDark = texture2D(u_mask, v_texCoord + delta).a;
                        float shiftedLight = texture2D(u_mask, v_texCoord - delta).a;
                        float darkEdge = clamp(max(0.0, alpha - shiftedDark) * 0.35, 0.0, 1.0);
                        float lightEdge = clamp(max(0.0, alpha - shiftedLight) * 0.35, 0.0, 1.0);
                        rgb = mix(rgb, vec3(0.0), darkEdge);
                        rgb = mix(rgb, vec3(1.0), lightEdge);
                    }
                    if (v_hintFlag > 0.5 && u_hintBandPx > 0.0) {
                        vec2 d = vec2(max(u_hintBandPx, 0.0) * u_texel.x, max(u_hintBandPx, 0.0) * u_texel.y);
                        float minNeighbor = alpha;
                        minNeighbor = min(minNeighbor, texture2D(u_mask, v_texCoord + vec2( d.x, 0.0)).a);
                        minNeighbor = min(minNeighbor, texture2D(u_mask, v_texCoord + vec2(-d.x, 0.0)).a);
                        minNeighbor = min(minNeighbor, texture2D(u_mask, v_texCoord + vec2(0.0,  d.y)).a);
                        minNeighbor = min(minNeighbor, texture2D(u_mask, v_texCoord + vec2(0.0, -d.y)).a);
                        minNeighbor = min(minNeighbor, texture2D(u_mask, v_texCoord + vec2( d.x,  d.y)).a);
                        minNeighbor = min(minNeighbor, texture2D(u_mask, v_texCoord + vec2(-d.x,  d.y)).a);
                        minNeighbor = min(minNeighbor, texture2D(u_mask, v_texCoord + vec2( d.x, -d.y)).a);
                        minNeighbor = min(minNeighbor, texture2D(u_mask, v_texCoord + vec2(-d.x, -d.y)).a);
                        float ring = clamp(max(0.0, alpha - minNeighbor) * u_hintTint.a, 0.0, 1.0);
                        rgb = mix(rgb, u_hintTint.rgb, ring);
                    }
                    gl_FragColor = vec4(rgb, outAlpha);
                }
            `;
            const meshVertexSrc = `
                attribute vec2 a_position;
                attribute vec2 a_mediaUv;
                attribute float a_edgeCoord;
                attribute float a_edgeShade;
                attribute float a_hintBandFrac;
                uniform vec2 u_resolution;
                uniform vec2 u_offsetPx;
                uniform float u_applyPieceTransform;
                uniform vec2 u_pieceCenterPx;
                uniform vec2 u_pieceHalfSizePx;
                uniform vec2 u_pieceRotationCS;
                varying vec2 v_mediaUv;
                varying float v_edgeCoord;
                varying float v_edgeShade;
                varying float v_hintBandFrac;
                void main() {
                    vec2 positionPx = a_position;
                    if (u_applyPieceTransform > 0.5) {
                        vec2 centered = a_position - u_pieceHalfSizePx;
                        positionPx = vec2(
                            centered.x * u_pieceRotationCS.x - centered.y * u_pieceRotationCS.y,
                            centered.x * u_pieceRotationCS.y + centered.y * u_pieceRotationCS.x
                        ) + u_pieceCenterPx;
                    }
                    vec2 zeroToOne = (positionPx + u_offsetPx) / u_resolution;
                    vec2 clipSpace = zeroToOne * 2.0 - 1.0;
                    gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
                    v_mediaUv = a_mediaUv;
                    v_edgeCoord = a_edgeCoord;
                    v_edgeShade = a_edgeShade;
                    v_hintBandFrac = a_hintBandFrac;
                }
            `;
            const meshFragSrc = `
                precision mediump float;
                varying vec2 v_mediaUv;
                varying float v_edgeCoord;
                varying float v_edgeShade;
                varying float v_hintBandFrac;
                uniform sampler2D u_media;
                uniform vec4 u_hintTint;
                uniform float u_useSolidColor;
                uniform float u_solidAlpha;
                void main() {
                    if (u_useSolidColor > 0.5) {
                        if (u_solidAlpha <= 0.0001) discard;
                        gl_FragColor = vec4(0.0, 0.0, 0.0, u_solidAlpha);
                        return;
                    }
                    vec4 media = texture2D(u_media, v_mediaUv);
                    if (media.a <= 0.0001) discard;
                    vec3 rgb = media.rgb;
                    float edgeMask = clamp(1.0 - v_edgeCoord, 0.0, 1.0);
                    if (edgeMask > 0.0001) {
                        float shadeStrength = min(1.0, abs(v_edgeShade)) * edgeMask * 0.4;
                        if (v_edgeShade > 0.0001) {
                            rgb = mix(rgb, vec3(1.0), shadeStrength);
                        } else if (v_edgeShade < -0.0001) {
                            rgb = mix(rgb, vec3(0.0), shadeStrength);
                        }
                        if (v_hintBandFrac > 0.0) {
                            float ring = 1.0 - smoothstep(max(0.0, v_hintBandFrac - 0.18), min(1.0, v_hintBandFrac + 0.02), v_edgeCoord);
                            rgb = mix(rgb, u_hintTint.rgb, ring * u_hintTint.a);
                        }
                    }
                    gl_FragColor = vec4(rgb, media.a);
                }
            `;
            this._pieceProgram = this._createProgramInfo(quadVertexSrc, combinedFragSrc, "combined");
            if (!this._pieceProgram) return false;
            this._meshProgram = this._createProgramInfo(meshVertexSrc, meshFragSrc, "mesh");
            if (!this._meshProgram) return false;
            this._vertexBuffer = gl.createBuffer();
            this._staticVertexBuffer = gl.createBuffer();
            this._meshVertexBuffer = gl.createBuffer();
            this._staticMeshVertexBuffer = gl.createBuffer();
            this._meshVertexBufferVertexCount = 0;
            this._staticMeshVertexBufferVertexCount = 0;
            this._heldMeshBatch = null;
            this._heldFallbackBatch = null;
            this._invalidateStaticGpuCaches();
            if (!this._vertexBuffer || !this._staticVertexBuffer || !this._meshVertexBuffer || !this._staticMeshVertexBuffer) return false;
            gl.disable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            return true;
        }


        _updateMediaTexture(source, forceUpload) {
            const gl = this.gl;
            this._mediaUploadsThisFrame = 0;
            if (!this._mediaTexture) {
                this._mediaTexture = gl.createTexture();
                if (!this._mediaTexture) return false;
                this._mediaTextureConfigured = false;
                this._mediaTextureSourceRef = null;
            }
            const isVideo = source && typeof source.videoWidth === "number" && typeof source.videoHeight === "number";
            const sw = isVideo ? (source.videoWidth | 0) : (source.width | 0);
            const sh = isVideo ? (source.videoHeight | 0) : (source.height | 0);
            if (sw <= 0 || sh <= 0) return false;
            const dimensionsMatch = this._mediaTextureW === sw && this._mediaTextureH === sh;
            const sameSource = this._mediaTextureSourceRef === source;
            const skipUpload = forceUpload === false && dimensionsMatch && this._mediaTextureW > 0 && sameSource;
            if (skipUpload) {
                this._bindTextureUnit(0, this._mediaTexture);
                return true;
            }
            this._bindTextureUnit(0, this._mediaTexture);
            if (!this._mediaTextureConfigured) {
                this._configureTextureDefaults(this._mediaTexture);
                this._mediaTextureConfigured = true;
            }
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            try {
                if (this._mediaTextureW !== sw || this._mediaTextureH !== sh) {
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
                    this._mediaTextureW = sw;
                    this._mediaTextureH = sh;
                    this._mediaUploadsThisFrame = 1;
                } else {
                    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
                    this._mediaUploadsThisFrame = 1;
                }
                this._mediaTextureSourceRef = source;
            } catch (e) {
                this._handleUploadFailure(e);
                return false;
            }
            return true;
        }

        _handleUploadFailure(err) {
            this.enabled = false;
            this.supportsPieceRendering = false;
            this.contextLost = true;
            this.failureReason = "secure texture upload blocked (CORS)";
            if (!this._fatalErrorLogged && typeof console !== "undefined" && console.warn) {
                this._fatalErrorLogged = true;
                console.warn("[WebGLRenderer] Disabled WebGL and falling back to canvas2d:", err && err.message ? err.message : err);
            }
        }


        _writePieceVerticesTo(pp, w, h, sourceW, sourceH, out, offsetFloats, mediaState, maskUv, edgeOffsetPx, hintFlag) {
            const cx = pp.x + w / 2;
            const cy = pp.y + h / 2;
            const deg = (globalScope.rotations === 180 ? 90 : globalScope.rotations) || 0;
            const angle = (pp.rot || 0) * deg * Math.PI / 180;
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const hw = w / 2;
            const hh = h / 2;
            const ms = pp._mediaSample || { sx: 0, sy: 0, destx: 0, desty: 0, w: w, h: h };
            const uv = this._computeMediaUvBounds(ms, sourceW, sourceH, mediaState);
            const mask = maskUv || { u0: 0, v0: 0, u1: 1, v1: 1 };
            const edge = edgeOffsetPx || { x: 0, y: 0 };
            const hint = hintFlag ? 1 : 0;
            const tl = this._rotateAndTranslate(-hw, -hh, c, s, cx, cy);
            const tr = this._rotateAndTranslate(hw, -hh, c, s, cx, cy);
            const bl = this._rotateAndTranslate(-hw, hh, c, s, cx, cy);
            const br = this._rotateAndTranslate(hw, hh, c, s, cx, cy);
            const o = offsetFloats;
            out[o] = tl.x; out[o + 1] = tl.y; out[o + 2] = mask.u0; out[o + 3] = mask.v0; out[o + 4] = uv.u0; out[o + 5] = uv.v0; out[o + 6] = edge.x; out[o + 7] = edge.y; out[o + 8] = hint;
            out[o + 9] = tr.x; out[o + 10] = tr.y; out[o + 11] = mask.u1; out[o + 12] = mask.v0; out[o + 13] = uv.u1; out[o + 14] = uv.v0; out[o + 15] = edge.x; out[o + 16] = edge.y; out[o + 17] = hint;
            out[o + 18] = bl.x; out[o + 19] = bl.y; out[o + 20] = mask.u0; out[o + 21] = mask.v1; out[o + 22] = uv.u0; out[o + 23] = uv.v1; out[o + 24] = edge.x; out[o + 25] = edge.y; out[o + 26] = hint;
            out[o + 27] = bl.x; out[o + 28] = bl.y; out[o + 29] = mask.u0; out[o + 30] = mask.v1; out[o + 31] = uv.u0; out[o + 32] = uv.v1; out[o + 33] = edge.x; out[o + 34] = edge.y; out[o + 35] = hint;
            out[o + 36] = tr.x; out[o + 37] = tr.y; out[o + 38] = mask.u1; out[o + 39] = mask.v0; out[o + 40] = uv.u1; out[o + 41] = uv.v0; out[o + 42] = edge.x; out[o + 43] = edge.y; out[o + 44] = hint;
            out[o + 45] = br.x; out[o + 46] = br.y; out[o + 47] = mask.u1; out[o + 48] = mask.v1; out[o + 49] = uv.u1; out[o + 50] = uv.v1; out[o + 51] = edge.x; out[o + 52] = edge.y; out[o + 53] = hint;
        }

        _writePieceLocalVerticesTo(item, sourceW, sourceH, out, offsetFloats, mediaState) {
            if (!item || !item.pp) return 0;
            const w = item.w || 0;
            const h = item.h || 0;
            const pp = item.pp;
            const ms = pp._mediaSample || { sx: 0, sy: 0, destx: 0, desty: 0, w: w, h: h };
            const uv = this._computeMediaUvBounds(ms, sourceW, sourceH, mediaState);
            const mask = item.maskUv || { u0: 0, v0: 0, u1: 1, v1: 1 };
            const edge = item.edgeOffsetPx || { x: 0, y: 0 };
            const hint = item.hinted ? 1 : 0;
            const o = offsetFloats;
            out[o] = 0; out[o + 1] = 0; out[o + 2] = mask.u0; out[o + 3] = mask.v0; out[o + 4] = uv.u0; out[o + 5] = uv.v0; out[o + 6] = edge.x; out[o + 7] = edge.y; out[o + 8] = hint;
            out[o + 9] = w; out[o + 10] = 0; out[o + 11] = mask.u1; out[o + 12] = mask.v0; out[o + 13] = uv.u1; out[o + 14] = uv.v0; out[o + 15] = edge.x; out[o + 16] = edge.y; out[o + 17] = hint;
            out[o + 18] = 0; out[o + 19] = h; out[o + 20] = mask.u0; out[o + 21] = mask.v1; out[o + 22] = uv.u0; out[o + 23] = uv.v1; out[o + 24] = edge.x; out[o + 25] = edge.y; out[o + 26] = hint;
            out[o + 27] = 0; out[o + 28] = h; out[o + 29] = mask.u0; out[o + 30] = mask.v1; out[o + 31] = uv.u0; out[o + 32] = uv.v1; out[o + 33] = edge.x; out[o + 34] = edge.y; out[o + 35] = hint;
            out[o + 36] = w; out[o + 37] = 0; out[o + 38] = mask.u1; out[o + 39] = mask.v0; out[o + 40] = uv.u1; out[o + 41] = uv.v0; out[o + 42] = edge.x; out[o + 43] = edge.y; out[o + 44] = hint;
            out[o + 45] = w; out[o + 46] = h; out[o + 47] = mask.u1; out[o + 48] = mask.v1; out[o + 49] = uv.u1; out[o + 50] = uv.v1; out[o + 51] = edge.x; out[o + 52] = edge.y; out[o + 53] = hint;
            return 6;
        }


        _getOrCreatePieceCacheEntry(pp) {
            let entry = this._pieceTextureCache.get(pp);
            if (!entry) {
                entry = {
                    maskTexture: null,
                    maskConfigured: false,
                    maskVersion: -1,
                    maskW: 0,
                    maskH: 0,
                    atlasSlot: null,
                    atlasUv: null,
                    lastSeenFrame: 0,
                    meshKey: "",
                    meshData: null
                };
                this._pieceTextureCache.set(pp, entry);
            }
            return entry;
        }

        _ensurePieceMesh(pp, entry, appearance) {
            if (!pp || !entry || !pp.tbLoops || !pp.tbLoops.length) return null;
            const edgeWidth = Math.max(appearance && appearance.edgeWidthPx ? appearance.edgeWidthPx : 0, appearance && appearance.hinted ? (appearance.hintBandPx || 0) : 0);
            const key = [
                pp._overlayVersion || 0,
                pp.nx || 0,
                pp.ny || 0,
                pp.tbLoops ? pp.tbLoops.length : 0,
                Math.round((edgeWidth || 0) * 1000),
                Math.round(((appearance && appearance.edgeOffsetPx && appearance.edgeOffsetPx.x) || 0) * 1000),
                Math.round(((appearance && appearance.edgeOffsetPx && appearance.edgeOffsetPx.y) || 0) * 1000),
                appearance && appearance.hinted ? 1 : 0,
                Math.round(((appearance && appearance.hintBandPx) || 0) * 1000)
            ].join(":");
            if (entry.meshKey === key) {
                this._syncMeshVertexMetadata(entry.meshData || null);
                return entry.meshData || null;
            }
            const mesh = this._buildPieceMesh(pp, appearance);
            if (!mesh) {
                this._meshMetrics.triangulationFailures += 1;
                entry.meshKey = key;
                entry.meshData = null;
                return null;
            }
            this._syncMeshVertexMetadata(mesh);
            entry.meshKey = key;
            entry.meshData = mesh;
            return mesh;
        }

        _getMeshVertexCounts(mesh) {
            if (!mesh) return { fillVertexCount: 0, edgeVertexCount: 0, vertexCount: 0 };
            const fillVertexCount = mesh.fillVertices ? Math.floor(mesh.fillVertices.length / 5) : 0;
            const edgeVertexCount = mesh.edgeVertices ? Math.floor(mesh.edgeVertices.length / 5) : 0;
            return {
                fillVertexCount,
                edgeVertexCount,
                vertexCount: fillVertexCount + edgeVertexCount
            };
        }

        _syncMeshVertexMetadata(mesh) {
            if (!mesh) return null;
            const counts = this._getMeshVertexCounts(mesh);
            mesh.fillVertexCount = counts.fillVertexCount;
            mesh.edgeVertexCount = counts.edgeVertexCount;
            mesh.vertexCount = counts.vertexCount;
            if (!mesh.edgeVertices || counts.edgeVertexCount <= 0) {
                mesh.edgeVertices = null;
                mesh.edgeVertexCount = 0;
            }
            mesh.hasGeometryEdge = mesh.edgeVertexCount > 0;
            return mesh;
        }

        _getMeshRequiredOutputFloats(mesh) {
            const counts = this._getMeshVertexCounts(mesh);
            return counts.vertexCount * 7;
        }

        _buildPieceMesh(pp, appearance) {
            const flattened = this._flattenPieceLoops(pp);
            if (!flattened || !flattened.loops || !flattened.loops.length) return null;
            const triangles = [];
            const requiresStencil = flattened.loops.length > 1;
            if (!requiresStencil) {
                const single = this._triangulateSimplePolygon(flattened.loops[0]);
                if (!single || !single.length) return null;
                triangles.push(...single);
            } else {
                for (const loop of flattened.loops) {
                    const triLoop = this._signedArea(loop) > 0 ? loop.slice().reverse() : loop;
                    const loopTriangles = this._triangulateSimplePolygon(triLoop);
                    if (!loopTriangles || !loopTriangles.length) return null;
                    triangles.push(...loopTriangles);
                }
            }
            const mesh = {
                fillVertices: new Float32Array(triangles.length * 5),
                edgeVertices: null,
                fillVertexCount: triangles.length / 2,
                edgeVertexCount: 0,
                vertexCount: 0,
                hasGeometryEdge: false,
                holeCount: flattened.holeCount || 0,
                requiresStencil
            };
            let fo = 0;
            for (let i = 0; i < triangles.length; i += 2) {
                mesh.fillVertices[fo] = triangles[i];
                mesh.fillVertices[fo + 1] = triangles[i + 1];
                mesh.fillVertices[fo + 2] = 1.0;
                mesh.fillVertices[fo + 3] = 0.0;
                mesh.fillVertices[fo + 4] = 0.0;
                fo += 5;
            }
            const edgeWidth = Math.max(appearance && appearance.edgeWidthPx ? appearance.edgeWidthPx : 0, appearance && appearance.hinted ? (appearance.hintBandPx || 0) : 0);
            if (edgeWidth > 0.25) {
                const edge = [];
                for (const loop of flattened.loops) {
                    if (!loop || loop.length < 2) continue;
                    const strip = this._buildEdgeStripGeometry(loop, edgeWidth, appearance);
                    if (strip && strip.length) edge.push(...strip);
                }
                if (edge.length) {
                    mesh.edgeVertices = new Float32Array(edge);
                    mesh.edgeVertexCount = edge.length / 5;
                    mesh.hasGeometryEdge = true;
                }
            }
            mesh.vertexCount = mesh.fillVertexCount + mesh.edgeVertexCount;
            return this._syncMeshVertexMetadata(mesh);
        }

        _flattenPieceLoops(pp) {
            if (!pp || !pp.tbLoops || !pp.tbLoops.length) return null;
            const shiftx = -(pp.offsx || 0);
            const shifty = -(pp.offsy || 0);
            const loops = [];
            for (const loop of pp.tbLoops) {
                if (!loop || !loop.length) continue;
                const points = [];
                for (let sideIndex = 0; sideIndex < loop.length; sideIndex++) {
                    const side = loop[sideIndex];
                    if (!side || !side.scaledPoints || !side.scaledPoints.length) continue;
                    this._appendFlattenedSide(points, side, shiftx, shifty, sideIndex === 0);
                }
                const deduped = this._dedupeLoop(points);
                if (deduped.length >= 3) loops.push(deduped);
            }
            if (!loops.length) return null;
            let outerIndex = 0;
            let outerAreaMag = 0;
            for (let i = 0; i < loops.length; i++) {
                const areaMag = Math.abs(this._signedArea(loops[i]));
                if (areaMag > outerAreaMag) {
                    outerAreaMag = areaMag;
                    outerIndex = i;
                }
            }
            const orderedLoops = [];
            const outer = loops[outerIndex].map((p) => ({ x: p.x, y: p.y }));
            if (this._signedArea(outer) > 0) outer.reverse();
            orderedLoops.push(outer);
            for (let i = 0; i < loops.length; i++) {
                if (i === outerIndex) continue;
                const hole = loops[i].map((p) => ({ x: p.x, y: p.y }));
                if (this._signedArea(hole) < 0) hole.reverse();
                orderedLoops.push(hole);
            }
            return {
                loops: orderedLoops,
                holeCount: Math.max(0, orderedLoops.length - 1)
            };
        }

        _triangulatePieceLoops(loops) {
            if (!loops || !loops.length) return null;
            if (loops.length === 1) {
                const triangles = this._triangulateSimplePolygon(loops[0]);
                return triangles && triangles.length ? {
                    triangles,
                    holeCount: 0,
                    bridgeCount: 0
                } : null;
            }
            let merged = loops[0].map((p) => ({ x: p.x, y: p.y }));
            const holes = loops.slice(1).map((loop) => loop.map((p) => ({ x: p.x, y: p.y })));
            holes.sort((a, b) => {
                const ra = this._getRightmostVertex(a);
                const rb = this._getRightmostVertex(b);
                if (Math.abs(rb.point.x - ra.point.x) > 0.001) return rb.point.x - ra.point.x;
                return ra.point.y - rb.point.y;
            });
            let bridgeCount = 0;
            for (let i = 0; i < holes.length; i++) {
                const remaining = holes.slice(i + 1);
                const bridged = this._bridgeHoleIntoPolygon(merged, holes[i], remaining);
                if (!bridged || !bridged.length) return null;
                merged = bridged;
                bridgeCount += 1;
            }
            const triangles = this._triangulateSimplePolygon(merged);
            if (!triangles || !triangles.length) return null;
            return {
                triangles,
                holeCount: holes.length,
                bridgeCount
            };
        }

        _bridgeHoleIntoPolygon(polygon, hole, remainingHoles) {
            if (!polygon || polygon.length < 3 || !hole || hole.length < 3) return null;
            const rightmost = this._getRightmostVertex(hole);
            const holeVertex = rightmost.point;
            const holeIndex = rightmost.index;
            let workingPolygon = polygon.map((p) => ({ x: p.x, y: p.y }));
            let bridgeTarget = this._findHorizontalBridgeTarget(workingPolygon, holeVertex);
            if (bridgeTarget && !this._isBridgeTargetVisible(holeVertex, bridgeTarget.point, workingPolygon, hole, holeIndex, bridgeTarget.index, remainingHoles)) {
                bridgeTarget = null;
            }
            if (!bridgeTarget) {
                bridgeTarget = this._findVisiblePolygonVertexTarget(workingPolygon, holeVertex, hole, holeIndex, remainingHoles);
            }
            if (!bridgeTarget) return null;
            if (bridgeTarget.insertPoint) {
                workingPolygon = this._insertPolygonVertex(workingPolygon, bridgeTarget.index, bridgeTarget.insertPoint);
            }
            const targetIndex = bridgeTarget.index;
            const holePath = this._rotateLoop(hole, holeIndex);
            const merged = [];
            for (let i = 0; i <= targetIndex; i++) merged.push({ x: workingPolygon[i].x, y: workingPolygon[i].y });
            for (let i = 0; i < holePath.length; i++) merged.push({ x: holePath[i].x, y: holePath[i].y });
            merged.push({ x: holePath[0].x, y: holePath[0].y });
            merged.push({ x: workingPolygon[targetIndex].x, y: workingPolygon[targetIndex].y });
            for (let i = targetIndex + 1; i < workingPolygon.length; i++) merged.push({ x: workingPolygon[i].x, y: workingPolygon[i].y });
            const deduped = this._dedupeLoop(merged);
            if (deduped.length > 2 && this._signedArea(deduped) > 0) deduped.reverse();
            return deduped;
        }

        _findHorizontalBridgeTarget(polygon, holeVertex) {
            if (!polygon || polygon.length < 3 || !holeVertex) return null;
            const hy = holeVertex.y;
            let best = null;
            for (let i = 0; i < polygon.length; i++) {
                const a = polygon[i];
                const b = polygon[(i + 1) % polygon.length];
                if (!this._segmentStraddlesY(a, b, hy)) continue;
                const x = this._intersectSegmentAtY(a, b, hy);
                if (x == null || x <= holeVertex.x + 0.01) continue;
                const point = { x, y: hy };
                let candidate = null;
                if (this._pointsNearlyEqual(point, a)) candidate = { point: { x: a.x, y: a.y }, index: i };
                else if (this._pointsNearlyEqual(point, b)) candidate = { point: { x: b.x, y: b.y }, index: (i + 1) % polygon.length };
                else candidate = { point, index: i + 1, insertPoint: point };
                const dist = point.x - holeVertex.x;
                if (!best || dist < best.distance) {
                    best = Object.assign({ distance: dist }, candidate);
                }
            }
            return best;
        }

        _findVisiblePolygonVertexTarget(polygon, holeVertex, hole, holeIndex, remainingHoles) {
            if (!polygon || !polygon.length) return null;
            const candidates = [];
            for (let i = 0; i < polygon.length; i++) {
                const p = polygon[i];
                const dx = p.x - holeVertex.x;
                const dy = p.y - holeVertex.y;
                candidates.push({
                    point: p,
                    index: i,
                    distance: dx * dx + dy * dy,
                    forwardBias: dx >= -0.01 ? 0 : 1
                });
            }
            candidates.sort((a, b) => {
                if (a.forwardBias !== b.forwardBias) return a.forwardBias - b.forwardBias;
                return a.distance - b.distance;
            });
            for (const candidate of candidates) {
                if (this._isBridgeTargetVisible(holeVertex, candidate.point, polygon, hole, holeIndex, candidate.index, remainingHoles)) {
                    return { point: { x: candidate.point.x, y: candidate.point.y }, index: candidate.index };
                }
            }
            return null;
        }

        _isBridgeTargetVisible(holeVertex, targetPoint, polygon, hole, holeIndex, polygonIndex, remainingHoles) {
            if (!holeVertex || !targetPoint || !polygon || polygon.length < 3) return false;
            if (this._bridgeIntersectsPolygonEdges(holeVertex, targetPoint, polygon, polygonIndex)) return false;
            if (this._bridgeIntersectsPolygonEdges(holeVertex, targetPoint, hole, holeIndex)) return false;
            if (remainingHoles) {
                for (const loop of remainingHoles) {
                    if (this._bridgeIntersectsPolygonEdges(holeVertex, targetPoint, loop, -1)) return false;
                }
            }
            const samples = [0.35, 0.6, 0.85];
            for (const t of samples) {
                const sample = {
                    x: holeVertex.x + (targetPoint.x - holeVertex.x) * t,
                    y: holeVertex.y + (targetPoint.y - holeVertex.y) * t
                };
                if (!this._pointInPolygon(sample, polygon)) return false;
                if (this._pointInPolygon(sample, hole)) return false;
                if (remainingHoles) {
                    for (const loop of remainingHoles) {
                        if (this._pointInPolygon(sample, loop)) return false;
                    }
                }
            }
            return true;
        }

        _bridgeIntersectsPolygonEdges(a, b, polygon, sharedIndex) {
            if (!polygon || polygon.length < 2) return false;
            for (let i = 0; i < polygon.length; i++) {
                const p0 = polygon[i];
                const p1 = polygon[(i + 1) % polygon.length];
                if (sharedIndex >= 0 && (i === sharedIndex || ((i + 1) % polygon.length) === sharedIndex)) continue;
                if (this._segmentsIntersectStrict(a, b, p0, p1)) return true;
            }
            return false;
        }

        _insertPolygonVertex(polygon, insertIndex, point) {
            const out = polygon.map((p) => ({ x: p.x, y: p.y }));
            const clamped = Math.max(1, Math.min(out.length, insertIndex | 0));
            out.splice(clamped, 0, { x: point.x, y: point.y });
            return out;
        }

        _rotateLoop(loop, startIndex) {
            const out = [];
            if (!loop || !loop.length) return out;
            const index = ((startIndex % loop.length) + loop.length) % loop.length;
            for (let i = 0; i < loop.length; i++) {
                const p = loop[(index + i) % loop.length];
                out.push({ x: p.x, y: p.y });
            }
            return out;
        }

        _getRightmostVertex(points) {
            let bestIndex = 0;
            let bestPoint = points[0];
            for (let i = 1; i < points.length; i++) {
                const p = points[i];
                if (p.x > bestPoint.x + 0.001 || (Math.abs(p.x - bestPoint.x) <= 0.001 && p.y < bestPoint.y)) {
                    bestIndex = i;
                    bestPoint = p;
                }
            }
            return {
                index: bestIndex,
                point: { x: bestPoint.x, y: bestPoint.y }
            };
        }

        _appendFlattenedSide(target, side, shiftx, shifty, includeStart) {
            const pts = side.scaledPoints;
            if (!pts || !pts.length) return;
            if (side.type === "d" || pts.length <= 2) {
                if (includeStart) target.push({ x: pts[0].x + shiftx, y: pts[0].y + shifty });
                target.push({ x: pts[pts.length - 1].x + shiftx, y: pts[pts.length - 1].y + shifty });
                return;
            }
            if (includeStart) target.push({ x: pts[0].x + shiftx, y: pts[0].y + shifty });
            for (let i = 1; i < pts.length; i += 3) {
                const p0 = pts[i - 1];
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const p3 = pts[i + 2];
                if (!p3) break;
                const segments = Math.max(4, Math.min(18, Math.ceil(this._estimateCubicLength(p0, p1, p2, p3) / 18)));
                for (let step = 1; step <= segments; step++) {
                    const t = step / segments;
                    const mt = 1 - t;
                    const x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x + shiftx;
                    const y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y + shifty;
                    target.push({ x, y });
                }
            }
        }

        _estimateCubicLength(p0, p1, p2, p3) {
            return this._distance(p0, p1) + this._distance(p1, p2) + this._distance(p2, p3);
        }

        _distance(a, b) {
            const dx = (b.x || 0) - (a.x || 0);
            const dy = (b.y || 0) - (a.y || 0);
            return Math.sqrt(dx * dx + dy * dy);
        }

        _dedupeLoop(points) {
            const out = [];
            for (const p of points || []) {
                if (!out.length) {
                    out.push({ x: p.x, y: p.y });
                    continue;
                }
                const last = out[out.length - 1];
                if (Math.abs(last.x - p.x) > 0.01 || Math.abs(last.y - p.y) > 0.01) {
                    out.push({ x: p.x, y: p.y });
                }
            }
            if (out.length > 1) {
                const first = out[0];
                const last = out[out.length - 1];
                if (Math.abs(first.x - last.x) <= 0.01 && Math.abs(first.y - last.y) <= 0.01) {
                    out.pop();
                }
            }
            return out;
        }

        _signedArea(points) {
            let area = 0;
            if (!points || points.length < 3) return 0;
            for (let i = 0; i < points.length; i++) {
                const a = points[i];
                const b = points[(i + 1) % points.length];
                area += a.x * b.y - b.x * a.y;
            }
            return area * 0.5;
        }

        _triangulateSimplePolygon(points) {
            if (!points || points.length < 3) return null;
            const n = points.length;
            const indices = [];
            for (let i = 0; i < n; i++) indices.push(i);
            const triangles = [];
            let guard = n * n;
            while (indices.length > 2 && guard-- > 0) {
                let earFound = false;
                for (let i = 0; i < indices.length; i++) {
                    const ia = indices[(i + indices.length - 1) % indices.length];
                    const ib = indices[i];
                    const ic = indices[(i + 1) % indices.length];
                    const a = points[ia];
                    const b = points[ib];
                    const c = points[ic];
                    if (!this._isConvexEarVertex(a, b, c)) continue;
                    let contains = false;
                    for (let j = 0; j < indices.length; j++) {
                        const ip = indices[j];
                        if (ip === ia || ip === ib || ip === ic) continue;
                        if (this._pointInTriangle(points[ip], a, b, c)) {
                            contains = true;
                            break;
                        }
                    }
                    if (contains) continue;
                    triangles.push(a.x, a.y, b.x, b.y, c.x, c.y);
                    indices.splice(i, 1);
                    earFound = true;
                    break;
                }
                if (!earFound) return null;
            }
            return triangles;
        }

        _isConvexEarVertex(a, b, c) {
            const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
            return cross < -0.001;
        }

        _pointInTriangle(p, a, b, c) {
            const s1 = this._triangleSign(p, a, b);
            const s2 = this._triangleSign(p, b, c);
            const s3 = this._triangleSign(p, c, a);
            const hasNeg = (s1 < -0.001) || (s2 < -0.001) || (s3 < -0.001);
            const hasPos = (s1 > 0.001) || (s2 > 0.001) || (s3 > 0.001);
            return !(hasNeg && hasPos);
        }

        _triangleSign(p1, p2, p3) {
            return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
        }

        _segmentStraddlesY(a, b, y) {
            if (!a || !b || !isFinite(y)) return false;
            if (Math.abs(a.y - b.y) <= 0.0001) return Math.abs(y - a.y) <= 0.0001;
            return (a.y <= y && b.y >= y) || (b.y <= y && a.y >= y);
        }

        _intersectSegmentAtY(a, b, y) {
            if (!a || !b) return null;
            const dy = b.y - a.y;
            if (Math.abs(dy) <= 0.0001) return Math.abs(y - a.y) <= 0.0001 ? Math.max(a.x, b.x) : null;
            const t = (y - a.y) / dy;
            if (t < -0.0001 || t > 1.0001) return null;
            return a.x + (b.x - a.x) * t;
        }

        _pointsNearlyEqual(a, b, eps = 0.01) {
            if (!a || !b) return false;
            return Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps;
        }

        _pointInPolygon(point, polygon) {
            if (!point || !polygon || polygon.length < 3) return false;
            let inside = false;
            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                const pi = polygon[i];
                const pj = polygon[j];
                const intersects = ((pi.y > point.y) !== (pj.y > point.y)) &&
                    (point.x < ((pj.x - pi.x) * (point.y - pi.y)) / Math.max(0.000001, (pj.y - pi.y)) + pi.x);
                if (intersects) inside = !inside;
            }
            return inside;
        }

        _orientation(a, b, c) {
            return ((b.x - a.x) * (c.y - a.y)) - ((b.y - a.y) * (c.x - a.x));
        }

        _onSegment(a, b, p, eps = 0.01) {
            if (Math.min(a.x, b.x) - eps > p.x || p.x > Math.max(a.x, b.x) + eps) return false;
            if (Math.min(a.y, b.y) - eps > p.y || p.y > Math.max(a.y, b.y) + eps) return false;
            return Math.abs(this._orientation(a, b, p)) <= eps;
        }

        _segmentsIntersectStrict(a, b, c, d) {
            if (!a || !b || !c || !d) return false;
            if (this._pointsNearlyEqual(a, c) || this._pointsNearlyEqual(a, d) || this._pointsNearlyEqual(b, c) || this._pointsNearlyEqual(b, d)) return false;
            const o1 = this._orientation(a, b, c);
            const o2 = this._orientation(a, b, d);
            const o3 = this._orientation(c, d, a);
            const o4 = this._orientation(c, d, b);
            const eps = 0.01;
            if (((o1 > eps && o2 < -eps) || (o1 < -eps && o2 > eps)) && ((o3 > eps && o4 < -eps) || (o3 < -eps && o4 > eps))) {
                return true;
            }
            if (Math.abs(o1) <= eps && this._onSegment(a, b, c, eps)) return true;
            if (Math.abs(o2) <= eps && this._onSegment(a, b, d, eps)) return true;
            if (Math.abs(o3) <= eps && this._onSegment(c, d, a, eps)) return true;
            if (Math.abs(o4) <= eps && this._onSegment(c, d, b, eps)) return true;
            return false;
        }

        _buildEdgeStripGeometry(points, edgeWidth, appearance) {
            if (!points || points.length < 2 || edgeWidth <= 0) return null;
            const normals = [];
            const length = points.length;
            for (let i = 0; i < length; i++) {
                const prev = points[(i + length - 1) % length];
                const curr = points[i];
                const next = points[(i + 1) % length];
                const nPrev = this._inwardNormal(prev, curr);
                const nNext = this._inwardNormal(curr, next);
                let nx = nPrev.x + nNext.x;
                let ny = nPrev.y + nNext.y;
                const nl = Math.sqrt(nx * nx + ny * ny) || 1;
                nx /= nl;
                ny /= nl;
                const align = Math.max(0.25, nx * nNext.x + ny * nNext.y);
                const scale = Math.min(edgeWidth / align, edgeWidth * 3.0);
                normals.push({ x: nx * scale, y: ny * scale });
            }
            const light = appearance && appearance.edgeOffsetPx ? appearance.edgeOffsetPx : { x: 0, y: 0 };
            const lightLen = Math.sqrt(light.x * light.x + light.y * light.y) || 1;
            const lightDir = lightLen > 0.0001 ? { x: light.x / lightLen, y: light.y / lightLen } : { x: 0, y: 0 };
            const hintFrac = edgeWidth > 0 ? this._clamp01(((appearance && appearance.hinted ? (appearance.hintBandPx || 0) : 0) / edgeWidth)) : 0;
            const out = [];
            for (let i = 0; i < length; i++) {
                const j = (i + 1) % length;
                const p0 = points[i];
                const p1 = points[j];
                const n0 = normals[i];
                const n1 = normals[j];
                const inner0 = { x: p0.x + n0.x, y: p0.y + n0.y };
                const inner1 = { x: p1.x + n1.x, y: p1.y + n1.y };
                const n0Len = Math.sqrt(n0.x * n0.x + n0.y * n0.y) || 1;
                const n1Len = Math.sqrt(n1.x * n1.x + n1.y * n1.y) || 1;
                const shade0 = lightLen > 0.0001 ? this._clampSigned(-(n0.x / n0Len) * lightDir.x - (n0.y / n0Len) * lightDir.y) : 0;
                const shade1 = lightLen > 0.0001 ? this._clampSigned(-(n1.x / n1Len) * lightDir.x - (n1.y / n1Len) * lightDir.y) : 0;
                out.push(
                    p0.x, p0.y, 0, shade0, hintFrac,
                    p1.x, p1.y, 0, shade1, hintFrac,
                    inner0.x, inner0.y, 1, shade0, hintFrac,
                    inner0.x, inner0.y, 1, shade0, hintFrac,
                    p1.x, p1.y, 0, shade1, hintFrac,
                    inner1.x, inner1.y, 1, shade1, hintFrac
                );
            }
            return out;
        }

        _inwardNormal(a, b) {
            const dx = (b.x || 0) - (a.x || 0);
            const dy = (b.y || 0) - (a.y || 0);
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            return { x: dy / len, y: -dx / len };
        }

        _clampSigned(value) {
            if (!isFinite(value)) return 0;
            if (value < -1) return -1;
            if (value > 1) return 1;
            return value;
        }

        _writeMeshVerticesTo(item, sourceW, sourceH, out, offsetFloats, mediaState) {
            const pp = item.pp;
            const mesh = this._syncMeshVertexMetadata(item.mesh);
            if (!pp || !mesh) return 0;
            const w = item.w;
            const h = item.h;
            const cx = pp.x + w / 2;
            const cy = pp.y + h / 2;
            const deg = (globalScope.rotations === 180 ? 90 : globalScope.rotations) || 0;
            const angle = (pp.rot || 0) * deg * Math.PI / 180;
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const ms = pp._mediaSample || { sx: 0, sy: 0, destx: 0, desty: 0, w: w, h: h };
            let o = offsetFloats;
            const writeGroup = (sourceArray) => {
                if (!sourceArray) return;
                for (let i = 0; i < sourceArray.length; i += 5) {
                    const lx = sourceArray[i];
                    const ly = sourceArray[i + 1];
                    const pos = this._rotateAndTranslate(lx - w / 2, ly - h / 2, c, s, cx, cy);
                    const uv = this._computeMediaUvPoint(ms, lx, ly, sourceW, sourceH, mediaState);
                    out[o] = pos.x;
                    out[o + 1] = pos.y;
                    out[o + 2] = uv.u;
                    out[o + 3] = uv.v;
                    out[o + 4] = sourceArray[i + 2];
                    out[o + 5] = sourceArray[i + 3];
                    out[o + 6] = sourceArray[i + 4];
                    o += 7;
                }
            };
            writeGroup(mesh.fillVertices);
            writeGroup(mesh.edgeVertices);
            return (o - offsetFloats) / 7;
        }

        _writeMeshLocalVerticesTo(item, sourceW, sourceH, out, offsetFloats, mediaState) {
            const pp = item.pp;
            const mesh = this._syncMeshVertexMetadata(item.mesh);
            if (!pp || !mesh) return 0;
            const w = item.w;
            const h = item.h;
            const ms = pp._mediaSample || { sx: 0, sy: 0, destx: 0, desty: 0, w: w, h: h };
            let o = offsetFloats;
            const writeGroup = (sourceArray) => {
                if (!sourceArray) return;
                for (let i = 0; i < sourceArray.length; i += 5) {
                    const lx = sourceArray[i];
                    const ly = sourceArray[i + 1];
                    const uv = this._computeMediaUvPoint(ms, lx, ly, sourceW, sourceH, mediaState);
                    out[o] = lx;
                    out[o + 1] = ly;
                    out[o + 2] = uv.u;
                    out[o + 3] = uv.v;
                    out[o + 4] = sourceArray[i + 2];
                    out[o + 5] = sourceArray[i + 3];
                    out[o + 6] = sourceArray[i + 4];
                    o += 7;
                }
            };
            writeGroup(mesh.fillVertices);
            writeGroup(mesh.edgeVertices);
            return (o - offsetFloats) / 7;
        }

        _getMeshRenderContextKey(mediaState, sourceW, sourceH) {
            const mapping = mediaState && mediaState.mapping ? mediaState.mapping : null;
            const puzzle = this.puzzle || null;
            const parts = [
                sourceW | 0,
                sourceH | 0,
                this.canvas.width | 0,
                this.canvas.height | 0,
                this._displayWidth | 0,
                this._displayHeight | 0,
                ((globalScope.rotations === 180 ? 90 : globalScope.rotations) || 0),
                Math.round(((puzzle && puzzle.scalex) || 0) * 1000),
                Math.round(((puzzle && puzzle.scaley) || 0) * 1000),
                mediaState && mediaState.bufferW ? (mediaState.bufferW | 0) : 0,
                mediaState && mediaState.bufferH ? (mediaState.bufferH | 0) : 0,
                mediaState && mediaState.contentW ? Math.round(mediaState.contentW) : 0,
                mediaState && mediaState.contentH ? Math.round(mediaState.contentH) : 0
            ];
            if (mapping) {
                parts.push(
                    Math.round((mapping.sx || 0) * 1000),
                    Math.round((mapping.sy || 0) * 1000),
                    Math.round((mapping.sw || 0) * 1000),
                    Math.round((mapping.sh || 0) * 1000),
                    Math.round((mapping.dx || 0) * 1000),
                    Math.round((mapping.dy || 0) * 1000),
                    Math.round((mapping.dw || 0) * 1000),
                    Math.round((mapping.dh || 0) * 1000)
                );
            } else {
                parts.push("nomap");
            }
            return parts.join(":");
        }

        _getFrameGeomReuseKey(frameGeom) {
            if (!frameGeom) return "nogeom";
            return [
                Math.round((frameGeom.centerX || 0) * 1000),
                Math.round((frameGeom.centerY || 0) * 1000),
                Math.round((frameGeom.halfW || 0) * 1000),
                Math.round((frameGeom.halfH || 0) * 1000),
                Math.round((frameGeom.cos || 0) * 1000000),
                Math.round((frameGeom.sin || 0) * 1000000)
            ].join(":");
        }

        _getMediaSampleReuseKey(ms, fallbackW = 0, fallbackH = 0) {
            return [
                Math.round(((ms && ms.sx) || 0) * 1000),
                Math.round(((ms && ms.sy) || 0) * 1000),
                Math.round(((ms && ms.destx) || 0) * 1000),
                Math.round(((ms && ms.desty) || 0) * 1000),
                Math.round(((ms && ms.w) || fallbackW || 0) * 1000),
                Math.round(((ms && ms.h) || fallbackH || 0) * 1000)
            ].join(":");
        }

        _getStaticRenderReuseKeyForItem(item) {
            if (!item) return "";
            const ms = item.pp && item.pp._mediaSample ? item.pp._mediaSample : null;
            return [
                Math.round((item.w || 0) * 1000),
                Math.round((item.h || 0) * 1000),
                this._getFrameGeomReuseKey(item.frameGeom || null),
                this._getMediaSampleReuseKey(ms, item.w || 0, item.h || 0),
                Math.round((((item.edgeOffsetPx && item.edgeOffsetPx.x) || 0)) * 1000),
                Math.round((((item.edgeOffsetPx && item.edgeOffsetPx.y) || 0)) * 1000),
                Math.round((item.edgeWidthPx || 0) * 1000),
                item.hinted ? 1 : 0,
                Math.round((item.hintBandPx || 0) * 1000)
            ].join(":");
        }

        _invalidateStaticGpuCaches() {
            this._staticMeshBatch = null;
            this._staticFallbackBatch = null;
            this._staticRenderPlan = null;
            this._staticMeshVertexBufferVertexCount = 0;
        }


        _canAppendContiguousRun(runStartVertex, runVertexCount, nextStartVertex, nextVertexCount) {
            if (runStartVertex < 0 || runVertexCount <= 0) return false;
            if (nextStartVertex < 0 || nextVertexCount <= 0) return false;
            return (runStartVertex + runVertexCount) === nextStartVertex;
        }

        _validateMeshItemRange(item, bufferVertexCount) {
            if (!item) return false;
            const firstVertex = Number.isFinite(item.meshVertexStart) ? item.meshVertexStart : -1;
            const vertexCount = Number.isFinite(item.meshVertexCount) ? item.meshVertexCount : 0;
            return firstVertex >= 0 && vertexCount > 0 && (firstVertex + vertexCount) <= Math.max(0, bufferVertexCount | 0);
        }

        _validateHeldMeshBatch(items) {
            const bufferVertexCount = Math.max(0, this._meshVertexBufferVertexCount | 0);
            if (!Array.isArray(items) || !items.length) return true;
            for (const item of items) {
                if (!item || !item.mesh || item.needsMaskFallback || !item.held) continue;
                if (!this._validateMeshItemRange(item, bufferVertexCount)) return false;
                if (item.meshFillVertexCount > 0) {
                    const fillStart = Number.isFinite(item.meshFillVertexStart) ? item.meshFillVertexStart : -1;
                    if (fillStart < 0 || (fillStart + item.meshFillVertexCount) > bufferVertexCount) return false;
                }
            }
            return true;
        }

        _validateStaticRenderPlan(plan, staticMeshBatch, staticFallbackBatch) {
            if (!plan || !Array.isArray(plan.commands)) return true;
            const meshVertexCount = Math.max(0, Math.min(
                staticMeshBatch && Number.isFinite(staticMeshBatch.vertexCount) ? staticMeshBatch.vertexCount : 0,
                this._staticMeshVertexBufferVertexCount | 0
            ));
            const fallbackVertexCount = staticFallbackBatch && Number.isFinite(staticFallbackBatch.vertexCount)
                ? staticFallbackBatch.vertexCount
                : 0;
            for (const command of plan.commands) {
                if (!command) continue;
                switch (command.kind) {
                    case "meshRun":
                        if (command.firstVertex < 0 || command.vertexCount <= 0 || (command.firstVertex + command.vertexCount) > meshVertexCount) return false;
                        break;
                    case "stencilMeshStatic":
                        if (
                            command.fillFirstVertex < 0 ||
                            command.fillVertexCount <= 0 ||
                            command.colorFirstVertex < 0 ||
                            command.colorVertexCount <= 0 ||
                            (command.fillFirstVertex + command.fillVertexCount) > meshVertexCount ||
                            (command.colorFirstVertex + command.colorVertexCount) > meshVertexCount
                        ) return false;
                        break;
                    case "atlasFallbackRun":
                    case "fallbackPieceStatic":
                        if (command.firstVertex < 0 || command.vertexCount <= 0 || (command.firstVertex + command.vertexCount) > fallbackVertexCount) return false;
                        break;
                    default:
                        break;
                }
            }
            return true;
        }

        _prepareStaticMeshBatch(items, sourceW, sourceH, mediaState, sceneState, contextKey) {
            const gl = this.gl;
            const dirtySet = sceneState && sceneState.dirtyPieces instanceof Set ? sceneState.dirtyPieces : null;
            const cached = this._staticMeshBatch;
            let canReuse = !!(
                cached &&
                cached.contextKey === contextKey &&
                !((sceneState && sceneState.zOrderDirty) || false) &&
                (this._staticMeshVertexBufferVertexCount | 0) === ((cached && cached.vertexCount) | 0)
            );
            if (canReuse) {
                if (!cached.items || cached.items.length !== items.length) {
                    canReuse = false;
                } else {
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        const cachedItem = cached.items[i];
                        const reuseKey = this._getStaticRenderReuseKeyForItem(item);
                        if (
                            !cachedItem ||
                            cachedItem.pp !== item.pp ||
                            cachedItem.mesh !== item.mesh ||
                            cachedItem.reuseKey !== reuseKey ||
                            (dirtySet && dirtySet.has(item.pp))
                        ) {
                            canReuse = false;
                            break;
                        }
                    }
                }
            }

            if (canReuse) {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const cachedItem = cached.items[i];
                    item.meshBufferKind = "static";
                    item.meshVertexStart = cachedItem.meshVertexStart;
                    item.meshVertexCount = cachedItem.meshVertexCount;
                    item.meshFillVertexStart = cachedItem.meshFillVertexStart;
                    item.meshFillVertexCount = cachedItem.meshFillVertexCount;
                    item.meshEdgeVertexStart = cachedItem.meshEdgeVertexStart;
                    item.meshEdgeVertexCount = cachedItem.meshEdgeVertexCount;
                    item.stencilBounds = cachedItem.stencilBounds || item.stencilBounds || null;
                    item.stencilScissorRect = cachedItem.stencilScissorRect || item.stencilScissorRect || null;
                }
                this._meshMetrics.staticBatchReuses += 1;
                this.lastStaticRebuilt = false;
                return cached;
            }

            let requiredFloats = 0;
            for (const item of items) {
                if (!item.mesh || item.needsMaskFallback) continue;
                this._syncMeshVertexMetadata(item.mesh);
                requiredFloats += this._getMeshRequiredOutputFloats(item.mesh);
            }
            if (requiredFloats > 0 && (!this._staticMeshBatchedVertices || this._staticMeshBatchedVertexCapacity < requiredFloats)) {
                this._staticMeshBatchedVertexCapacity = requiredFloats;
                this._staticMeshBatchedVertices = new Float32Array(this._staticMeshBatchedVertexCapacity);
            }
            let meshFloatOffset = 0;
            const cachedItems = [];
            for (const item of items) {
                if (!item.mesh || item.needsMaskFallback) continue;
                item.meshBufferKind = "static";
                item.meshVertexStart = (meshFloatOffset / 7) | 0;
                item.meshVertexCount = this._writeMeshVerticesTo(
                    item,
                    sourceW,
                    sourceH,
                    this._staticMeshBatchedVertices,
                    meshFloatOffset,
                    mediaState
                );
                const meshCounts = this._getMeshVertexCounts(item.mesh);
                item.meshFillVertexStart = item.meshVertexStart;
                item.meshFillVertexCount = meshCounts.fillVertexCount;
                item.meshEdgeVertexStart = item.meshVertexStart + item.meshFillVertexCount;
                item.meshEdgeVertexCount = meshCounts.edgeVertexCount;
                meshFloatOffset += item.meshVertexCount * 7;
                const ms = item.pp && item.pp._mediaSample ? item.pp._mediaSample : { sx: 0, sy: 0, destx: 0, desty: 0, w: item.w || 0, h: item.h || 0 };
                const reuseKey = this._getStaticRenderReuseKeyForItem(item);
                let stencilBounds = null;
                let stencilScissorRect = null;
                if (item.mesh && item.mesh.requiresStencil) {
                    stencilBounds = this._computePieceBounds(item.pp, item.w, item.h, (globalScope.rotations === 180 ? 90 : globalScope.rotations) || 0, item.stencilPadPx || 0, 0, 0, item.frameGeom || null);
                    stencilScissorRect = this._computeScissorRect(stencilBounds);
                    item.stencilBounds = stencilBounds;
                    item.stencilScissorRect = stencilScissorRect;
                }
                cachedItems.push({
                    pp: item.pp,
                    mesh: item.mesh,
                    reuseKey,
                    w: item.w || 0,
                    h: item.h || 0,
                    msSx: ms.sx || 0,
                    msSy: ms.sy || 0,
                    msDestx: ms.destx || 0,
                    msDesty: ms.desty || 0,
                    msW: ms.w || 0,
                    msH: ms.h || 0,
                    stencilBounds,
                    stencilScissorRect,
                    meshVertexStart: item.meshVertexStart,
                    meshVertexCount: item.meshVertexCount,
                    meshFillVertexStart: item.meshFillVertexStart,
                    meshFillVertexCount: item.meshFillVertexCount,
                    meshEdgeVertexStart: item.meshEdgeVertexStart,
                    meshEdgeVertexCount: item.meshEdgeVertexCount
                });
            }
            const vertexCount = meshFloatOffset / 7;
            if (vertexCount > 0) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this._staticMeshVertexBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, this._staticMeshBatchedVertices.subarray(0, meshFloatOffset), gl.DYNAMIC_DRAW);
                this._meshMetrics.staticVertexUploads += 1;
            }
            this._staticMeshVertexBufferVertexCount = vertexCount;
            this._staticMeshBatch = {
                serial: this._cacheSerialCounter++,
                contextKey,
                items: cachedItems,
                vertexCount
            };
            this._meshMetrics.staticBatchRebuilds += 1;
            this.lastStaticRebuilt = true;
            return this._staticMeshBatch;
        }

        _prepareHeldMeshBatch(items, sourceW, sourceH, mediaState, sceneState, contextKey) {
            const gl = this.gl;
            const cached = this._heldMeshBatch;
            const itemsForBatch = Array.isArray(items) ? items.filter((item) => item && item.mesh && !item.needsMaskFallback && item.held) : [];
            let canReuse = !!(
                cached &&
                cached.contextKey === contextKey &&
                (this._meshVertexBufferVertexCount | 0) === ((cached && cached.vertexCount) | 0)
            );
            if (canReuse) {
                if (!cached.items || cached.items.length !== itemsForBatch.length) {
                    canReuse = false;
                } else {
                    for (let i = 0; i < itemsForBatch.length; i++) {
                        const item = itemsForBatch[i];
                        const cachedItem = cached.items[i];
                        const ms = item.pp && item.pp._mediaSample ? item.pp._mediaSample : { sx: 0, sy: 0, destx: 0, desty: 0, w: item.w || 0, h: item.h || 0 };
                        if (
                            !cachedItem ||
                            cachedItem.pp !== item.pp ||
                            cachedItem.mesh !== item.mesh ||
                            cachedItem.w !== (item.w || 0) ||
                            cachedItem.h !== (item.h || 0) ||
                            cachedItem.msSx !== (ms.sx || 0) ||
                            cachedItem.msSy !== (ms.sy || 0) ||
                            cachedItem.msDestx !== (ms.destx || 0) ||
                            cachedItem.msDesty !== (ms.desty || 0) ||
                            cachedItem.msW !== (ms.w || 0) ||
                            cachedItem.msH !== (ms.h || 0)
                        ) {
                            canReuse = false;
                            break;
                        }
                    }
                }
            }

            if (canReuse) {
                for (let i = 0; i < itemsForBatch.length; i++) {
                    const item = itemsForBatch[i];
                    const cachedItem = cached.items[i];
                    item.meshBufferKind = "dynamic-local";
                    item.meshVertexStart = cachedItem.meshVertexStart;
                    item.meshVertexCount = cachedItem.meshVertexCount;
                    item.meshFillVertexStart = cachedItem.meshFillVertexStart;
                    item.meshFillVertexCount = cachedItem.meshFillVertexCount;
                    item.meshEdgeVertexStart = cachedItem.meshEdgeVertexStart;
                    item.meshEdgeVertexCount = cachedItem.meshEdgeVertexCount;
                }
                this._meshMetrics.heldBatchReuses += 1;
                return cached;
            }

            let requiredFloats = 0;
            for (const item of itemsForBatch) {
                this._syncMeshVertexMetadata(item.mesh);
                requiredFloats += this._getMeshRequiredOutputFloats(item.mesh);
            }
            if (requiredFloats > 0 && (!this._heldMeshLocalVertices || this._heldMeshLocalVertexCapacity < requiredFloats)) {
                this._heldMeshLocalVertexCapacity = requiredFloats;
                this._heldMeshLocalVertices = new Float32Array(this._heldMeshLocalVertexCapacity);
            }
            let meshFloatOffset = 0;
            const cachedItems = [];
            for (const item of itemsForBatch) {
                item.meshBufferKind = "dynamic-local";
                item.meshVertexStart = (meshFloatOffset / 7) | 0;
                item.meshVertexCount = this._writeMeshLocalVerticesTo(
                    item,
                    sourceW,
                    sourceH,
                    this._heldMeshLocalVertices,
                    meshFloatOffset,
                    mediaState
                );
                const meshCounts = this._getMeshVertexCounts(item.mesh);
                item.meshFillVertexStart = item.meshVertexStart;
                item.meshFillVertexCount = meshCounts.fillVertexCount;
                item.meshEdgeVertexStart = item.meshVertexStart + item.meshFillVertexCount;
                item.meshEdgeVertexCount = meshCounts.edgeVertexCount;
                meshFloatOffset += item.meshVertexCount * 7;
                const ms = item.pp && item.pp._mediaSample ? item.pp._mediaSample : { sx: 0, sy: 0, destx: 0, desty: 0, w: item.w || 0, h: item.h || 0 };
                cachedItems.push({
                    pp: item.pp,
                    mesh: item.mesh,
                    w: item.w || 0,
                    h: item.h || 0,
                    msSx: ms.sx || 0,
                    msSy: ms.sy || 0,
                    msDestx: ms.destx || 0,
                    msDesty: ms.desty || 0,
                    msW: ms.w || 0,
                    msH: ms.h || 0,
                    meshVertexStart: item.meshVertexStart,
                    meshVertexCount: item.meshVertexCount,
                    meshFillVertexStart: item.meshFillVertexStart,
                    meshFillVertexCount: item.meshFillVertexCount,
                    meshEdgeVertexStart: item.meshEdgeVertexStart,
                    meshEdgeVertexCount: item.meshEdgeVertexCount
                });
            }
            const vertexCount = meshFloatOffset / 7;
            if (vertexCount > 0) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this._meshVertexBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, this._heldMeshLocalVertices.subarray(0, meshFloatOffset), gl.DYNAMIC_DRAW);
                this._meshMetrics.dynamicVertexUploads += 1;
            }
            this._meshVertexBufferVertexCount = vertexCount;
            this._heldMeshBatch = {
                contextKey,
                items: cachedItems,
                vertexCount
            };
            this._meshMetrics.heldBatchRebuilds += 1;
            return this._heldMeshBatch;
        }

        _prepareStaticFallbackBatch(items, sourceW, sourceH, mediaState, sceneState, contextKey) {
            const gl = this.gl;
            const dirtySet = sceneState && sceneState.dirtyPieces instanceof Set ? sceneState.dirtyPieces : null;
            const cached = this._staticFallbackBatch;
            const itemsForBatch = Array.isArray(items) ? items.filter((item) => item && item.maskTexture && item.needsMaskFallback && !item.held) : [];
            let canReuse = !!(cached && cached.contextKey === contextKey && !((sceneState && sceneState.zOrderDirty) || false));
            if (canReuse) {
                if (!cached.items || cached.items.length !== itemsForBatch.length) {
                    canReuse = false;
                } else {
                    for (let i = 0; i < itemsForBatch.length; i++) {
                        const item = itemsForBatch[i];
                        const cachedItem = cached.items[i];
                        const maskUv = item.maskUv || { u0: 0, v0: 0, u1: 0, v1: 0 };
                        const reuseKey = this._getStaticRenderReuseKeyForItem(item);
                        if (
                            !cachedItem ||
                            cachedItem.pp !== item.pp ||
                            cachedItem.maskTexture !== item.maskTexture ||
                            cachedItem.maskSource !== item.maskSource ||
                            cachedItem.maskW !== (item.maskW || item.w) ||
                            cachedItem.maskH !== (item.maskH || item.h) ||
                            cachedItem.u0 !== maskUv.u0 ||
                            cachedItem.v0 !== maskUv.v0 ||
                            cachedItem.u1 !== maskUv.u1 ||
                            cachedItem.v1 !== maskUv.v1 ||
                            cachedItem.reuseKey !== reuseKey ||
                            (dirtySet && dirtySet.has(item.pp))
                        ) {
                            canReuse = false;
                            break;
                        }
                    }
                }
            }

            if (canReuse) {
                for (let i = 0; i < itemsForBatch.length; i++) {
                    const item = itemsForBatch[i];
                    const cachedItem = cached.items[i];
                    item.quadBufferKind = "static";
                    item.pieceVertexStart = cachedItem.pieceVertexStart;
                    item.pieceVertexCount = cachedItem.pieceVertexCount;
                }
                this._fallbackMetrics.staticBatchReuses += 1;
                this.lastStaticFallbackRebuilt = false;
                return cached;
            }

            const requiredFloats = itemsForBatch.length * 54;
            if (requiredFloats > 0 && (!this._staticFallbackBatchedVertices || this._staticFallbackBatchedVertexCapacity < requiredFloats)) {
                this._staticFallbackBatchedVertexCapacity = requiredFloats;
                this._staticFallbackBatchedVertices = new Float32Array(this._staticFallbackBatchedVertexCapacity);
            }
            let quadFloatOffset = 0;
            const cachedItems = [];
            for (const item of itemsForBatch) {
                item.quadBufferKind = "static";
                item.pieceVertexStart = (quadFloatOffset / 9) | 0;
                item.pieceVertexCount = 6;
                this._writePieceVerticesTo(
                    item.pp,
                    item.w,
                    item.h,
                    sourceW,
                    sourceH,
                    this._staticFallbackBatchedVertices,
                    quadFloatOffset,
                    mediaState,
                    item.maskUv,
                    item.edgeOffsetPx,
                    item.hinted ? 1 : 0
                );
                const maskUv = item.maskUv || { u0: 0, v0: 0, u1: 0, v1: 0 };
                const reuseKey = this._getStaticRenderReuseKeyForItem(item);
                cachedItems.push({
                    pp: item.pp,
                    reuseKey,
                    maskTexture: item.maskTexture,
                    maskSource: item.maskSource,
                    maskW: item.maskW || item.w,
                    maskH: item.maskH || item.h,
                    u0: maskUv.u0,
                    v0: maskUv.v0,
                    u1: maskUv.u1,
                    v1: maskUv.v1,
                    pieceVertexStart: item.pieceVertexStart,
                    pieceVertexCount: item.pieceVertexCount
                });
                quadFloatOffset += 54;
            }
            const vertexCount = quadFloatOffset / 9;
            if (vertexCount > 0) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this._staticVertexBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, this._staticFallbackBatchedVertices.subarray(0, quadFloatOffset), gl.STATIC_DRAW);
                this._fallbackMetrics.staticVertexUploads += 1;
            }
            this._staticFallbackBatch = {
                serial: this._cacheSerialCounter++,
                contextKey,
                items: cachedItems,
                vertexCount
            };
            this._fallbackMetrics.staticBatchRebuilds += 1;
            this.lastStaticFallbackRebuilt = true;
            return this._staticFallbackBatch;
        }

        _prepareHeldFallbackBatch(items, sourceW, sourceH, mediaState, sceneState, contextKey) {
            const gl = this.gl;
            const cached = this._heldFallbackBatch;
            const itemsForBatch = Array.isArray(items) ? items.filter((item) => item && item.maskTexture && item.needsMaskFallback && item.held) : [];
            let canReuse = !!(cached && cached.contextKey === contextKey);
            if (canReuse) {
                if (!cached.items || cached.items.length !== itemsForBatch.length) {
                    canReuse = false;
                } else {
                    for (let i = 0; i < itemsForBatch.length; i++) {
                        const item = itemsForBatch[i];
                        const cachedItem = cached.items[i];
                        const maskUv = item.maskUv || { u0: 0, v0: 0, u1: 0, v1: 0 };
                        const ms = item.pp && item.pp._mediaSample ? item.pp._mediaSample : { sx: 0, sy: 0, destx: 0, desty: 0, w: item.w || 0, h: item.h || 0 };
                        if (
                            !cachedItem ||
                            cachedItem.pp !== item.pp ||
                            cachedItem.maskTexture !== item.maskTexture ||
                            cachedItem.maskSource !== item.maskSource ||
                            cachedItem.maskW !== (item.maskW || item.w) ||
                            cachedItem.maskH !== (item.maskH || item.h) ||
                            cachedItem.u0 !== maskUv.u0 ||
                            cachedItem.v0 !== maskUv.v0 ||
                            cachedItem.u1 !== maskUv.u1 ||
                            cachedItem.v1 !== maskUv.v1 ||
                            cachedItem.edgeX !== (((item.edgeOffsetPx && item.edgeOffsetPx.x) || 0)) ||
                            cachedItem.edgeY !== (((item.edgeOffsetPx && item.edgeOffsetPx.y) || 0)) ||
                            cachedItem.hint !== (item.hinted ? 1 : 0) ||
                            cachedItem.w !== (item.w || 0) ||
                            cachedItem.h !== (item.h || 0) ||
                            cachedItem.msSx !== (ms.sx || 0) ||
                            cachedItem.msSy !== (ms.sy || 0) ||
                            cachedItem.msDestx !== (ms.destx || 0) ||
                            cachedItem.msDesty !== (ms.desty || 0) ||
                            cachedItem.msW !== (ms.w || 0) ||
                            cachedItem.msH !== (ms.h || 0)
                        ) {
                            canReuse = false;
                            break;
                        }
                    }
                }
            }

            if (canReuse) {
                for (let i = 0; i < itemsForBatch.length; i++) {
                    const item = itemsForBatch[i];
                    const cachedItem = cached.items[i];
                    item.quadBufferKind = "dynamic-local";
                    item.pieceVertexStart = cachedItem.pieceVertexStart;
                    item.pieceVertexCount = cachedItem.pieceVertexCount;
                    item.shadowVertexStart = -1;
                    item.shadowVertexCount = 0;
                }
                this._fallbackMetrics.heldBatchReuses += 1;
                return cached;
            }

            const requiredFloats = itemsForBatch.length * 54;
            if (requiredFloats > 0 && (!this._heldFallbackLocalVertices || this._heldFallbackLocalVertexCapacity < requiredFloats)) {
                this._heldFallbackLocalVertexCapacity = requiredFloats;
                this._heldFallbackLocalVertices = new Float32Array(this._heldFallbackLocalVertexCapacity);
            }
            let quadFloatOffset = 0;
            const cachedItems = [];
            for (const item of itemsForBatch) {
                item.quadBufferKind = "dynamic-local";
                item.pieceVertexStart = (quadFloatOffset / 9) | 0;
                item.pieceVertexCount = this._writePieceLocalVerticesTo(
                    item,
                    sourceW,
                    sourceH,
                    this._heldFallbackLocalVertices,
                    quadFloatOffset,
                    mediaState
                );
                item.shadowVertexStart = -1;
                item.shadowVertexCount = 0;
                const maskUv = item.maskUv || { u0: 0, v0: 0, u1: 0, v1: 0 };
                const ms = item.pp && item.pp._mediaSample ? item.pp._mediaSample : { sx: 0, sy: 0, destx: 0, desty: 0, w: item.w || 0, h: item.h || 0 };
                cachedItems.push({
                    pp: item.pp,
                    maskTexture: item.maskTexture,
                    maskSource: item.maskSource,
                    maskW: item.maskW || item.w,
                    maskH: item.maskH || item.h,
                    u0: maskUv.u0,
                    v0: maskUv.v0,
                    u1: maskUv.u1,
                    v1: maskUv.v1,
                    edgeX: ((item.edgeOffsetPx && item.edgeOffsetPx.x) || 0),
                    edgeY: ((item.edgeOffsetPx && item.edgeOffsetPx.y) || 0),
                    hint: item.hinted ? 1 : 0,
                    w: item.w || 0,
                    h: item.h || 0,
                    msSx: ms.sx || 0,
                    msSy: ms.sy || 0,
                    msDestx: ms.destx || 0,
                    msDesty: ms.desty || 0,
                    msW: ms.w || 0,
                    msH: ms.h || 0,
                    pieceVertexStart: item.pieceVertexStart,
                    pieceVertexCount: item.pieceVertexCount
                });
                quadFloatOffset += item.pieceVertexCount * 9;
            }
            const vertexCount = quadFloatOffset / 9;
            if (vertexCount > 0) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, this._heldFallbackLocalVertices.subarray(0, quadFloatOffset), gl.DYNAMIC_DRAW);
                this._fallbackMetrics.dynamicVertexUploads += 1;
            }
            this._heldFallbackBatch = {
                contextKey,
                items: cachedItems,
                vertexCount
            };
            this._fallbackMetrics.heldBatchRebuilds += 1;
            return this._heldFallbackBatch;
        }

        _rotateAndTranslate(x, y, c, s, tx, ty) {
            return {
                x: x * c - y * s + tx,
                y: x * s + y * c + ty
            };
        }

        _pruneTextureCache(visibleFrameMark) {
            let prunedAtlasEntry = false;
            for (const [piece, entry] of this._pieceTextureCache.entries()) {
                if (!entry || entry.lastSeenFrame !== visibleFrameMark) {
                    if (this.gl && entry.maskTexture) this.gl.deleteTexture(entry.maskTexture);
                    if (entry && entry.atlasSlot) prunedAtlasEntry = true;
                    this._pieceTextureCache.delete(piece);
                }
            }
            if (prunedAtlasEntry) this._maskAtlasRebuildRequested = true;
        }

        _getPieceAppearance(pp, puzzle) {
            const appearance = {
                edgeOffsetPx: { x: 0, y: 0 },
                edgeWidthPx: 0,
                hinted: !!pp.hinted,
                hintBandPx: Math.max(0.03 * puzzle.scalex, 7)
            };
            const bevelSizeRaw = (typeof globalScope.bevel_size !== "undefined")
                ? parseFloat(globalScope.bevel_size)
                : parseFloat(localStorage.getItem("option_bevel_2") || "0");
            const bevelSize = isFinite(bevelSizeRaw) ? bevelSizeRaw : 0;
            if (bevelSize > 0) {
                const embth = Math.max(0, puzzle.scalex * 0.01 * bevelSize);
                const worldLight = (typeof pp._worldToPieceLocal === "function")
                    ? pp._worldToPieceLocal(embth / 2, -embth / 2)
                    : { x: embth / 2, y: -embth / 2 };
                appearance.edgeOffsetPx = worldLight;
                appearance.edgeWidthPx = embth;
            }
            return appearance;
        }

        _ensureMaskAtlas() {
            const gl = this.gl;
            if (!gl) return false;
            if (!this._maskAtlasMaxSize) {
                this._maskAtlasMaxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
            }
            if (!this._maskAtlasWidth || !this._maskAtlasHeight) {
                const preferred = this._maskAtlasMaxSize >= 4096 ? 4096 : Math.max(1024, Math.min(this._maskAtlasMaxSize, 2048));
                this._maskAtlasWidth = preferred;
                this._maskAtlasHeight = preferred;
            }
            if (!this._maskAtlasTexture) {
                this._maskAtlasTexture = gl.createTexture();
                this._maskAtlasConfigured = false;
            }
            if (!this._maskAtlasTexture) return false;
            this._bindTextureUnit(1, this._maskAtlasTexture);
            if (!this._maskAtlasConfigured) {
                this._configureMaskTextureDefaults(this._maskAtlasTexture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this._maskAtlasWidth, this._maskAtlasHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                this._maskAtlasConfigured = true;
                this._maskAtlasNextX = this._maskAtlasPadding;
                this._maskAtlasNextY = this._maskAtlasPadding;
                this._maskAtlasRowH = 0;
                this._maskAtlasRebuildRequested = false;
            }
            return true;
        }

        _resetMaskAtlas() {
            const gl = this.gl;
            if (!gl) return;
            if (!this._ensureMaskAtlas()) return;
            this._bindTextureUnit(1, this._maskAtlasTexture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this._maskAtlasWidth, this._maskAtlasHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            this._maskAtlasNextX = this._maskAtlasPadding;
            this._maskAtlasNextY = this._maskAtlasPadding;
            this._maskAtlasRowH = 0;
            this._maskAtlasRebuildRequested = false;
            for (const entry of this._pieceTextureCache.values()) {
                if (entry) {
                    entry.atlasSlot = null;
                    entry.atlasUv = null;
                }
            }
            this._staticFallbackBatch = null;
            this.lastStaticFallbackRebuilt = false;
            this._atlasMetrics.rebuilds += 1;
        }

        _allocateMaskAtlasSlot(entry, w, h) {
            if (!this._ensureMaskAtlas()) return false;
            const pad = this._maskAtlasPadding;
            const allocW = Math.max(1, Math.ceil(w)) + pad * 2;
            const allocH = Math.max(1, Math.ceil(h)) + pad * 2;
            if (allocW + pad > this._maskAtlasWidth || allocH + pad > this._maskAtlasHeight) return false;
            let x = this._maskAtlasNextX;
            let y = this._maskAtlasNextY;
            let rowH = this._maskAtlasRowH;
            if (x + allocW + pad > this._maskAtlasWidth) {
                x = pad;
                y += rowH;
                rowH = 0;
            }
            if (y + allocH + pad > this._maskAtlasHeight) return false;
            entry.atlasSlot = { x, y, allocW, allocH, innerX: x + pad, innerY: y + pad };
            entry.atlasUv = {
                u0: (x + pad) / this._maskAtlasWidth,
                v0: (y + pad) / this._maskAtlasHeight,
                u1: (x + pad + w) / this._maskAtlasWidth,
                v1: (y + pad + h) / this._maskAtlasHeight
            };
            this._maskAtlasNextX = x + allocW;
            this._maskAtlasNextY = y;
            this._maskAtlasRowH = Math.max(rowH, allocH);
            return true;
        }

        _uploadMaskToAtlas(pp, entry, w, h) {
            const gl = this.gl;
            if (!gl || !entry || !entry.atlasSlot || !this._ensureMaskAtlas()) return false;
            const slot = entry.atlasSlot;
            const mctx = this._ensureSharedMaskCanvas(slot.allocW, slot.allocH);
            if (!mctx) return false;
            mctx.setTransform(1, 0, 0, 1, 0, 0);
            mctx.clearRect(0, 0, slot.allocW, slot.allocH);
            mctx.save();
            mctx.translate(this._maskAtlasPadding, this._maskAtlasPadding);
            mctx.fillStyle = "#fff";
            mctx.fill(pp.path);
            mctx.restore();
            this._bindTextureUnit(1, this._maskAtlasTexture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, slot.x, slot.y, gl.RGBA, gl.UNSIGNED_BYTE, this._sharedMaskCanvas);
            this._atlasMetrics.uploads += 1;
            return true;
        }

        _ensureStandaloneMaskTexture(pp, entry, w, h, maskVersion) {
            const gl = this.gl;
            if (!gl) return false;
            if (!entry.maskTexture) {
                entry.maskTexture = gl.createTexture();
                entry.maskConfigured = false;
            }
            if (!entry.maskTexture) return false;
            if (entry.maskVersion !== maskVersion || entry.maskW !== w || entry.maskH !== h) {
                if (this._uploadCountThisFrame >= (this._uploadBudgetPerFrame != null ? this._uploadBudgetPerFrame : 12)) {
                    return false;
                }
                this._bindTextureUnit(1, entry.maskTexture);
                if (!entry.maskConfigured) {
                    this._configureMaskTextureDefaults(entry.maskTexture);
                    entry.maskConfigured = true;
                }
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                try {
                    if (pp._maskCanvas) {
                        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pp._maskCanvas);
                    } else {
                        const mctx = this._ensureSharedMaskCanvas(w, h);
                        if (!mctx) return false;
                        mctx.setTransform(1, 0, 0, 1, 0, 0);
                        mctx.clearRect(0, 0, w, h);
                        mctx.fillStyle = "#fff";
                        mctx.fill(pp.path);
                        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._sharedMaskCanvas);
                    }
                } catch (e) {
                    this._handleUploadFailure(e);
                    return false;
                }
                this._uploadCountThisFrame += 1;
                entry.maskVersion = maskVersion;
                entry.maskW = w;
                entry.maskH = h;
            }
            return true;
        }

        _restoreCachedMaskResources(drawItems, sceneState, visibleFrameMark) {
            if (!Array.isArray(drawItems) || drawItems.length === 0) return [];
            const unresolved = [];
            const atlasReady = !!(this._maskAtlasTexture && !this._maskAtlasRebuildRequested);
            for (const item of drawItems) {
                if (!item || !item.pp) continue;
                const pp = item.pp;
                const entry = this._getOrCreatePieceCacheEntry(pp);
                entry.lastSeenFrame = visibleFrameMark;
                const maskVersion = pp._maskVersion != null ? pp._maskVersion : (pp._overlayVersion || 0);
                item.maskTexture = null;
                item.maskSource = null;
                item.maskUv = null;
                item.maskW = item.w;
                item.maskH = item.h;
                if (atlasReady && entry.atlasSlot && entry.atlasUv && entry.maskVersion === maskVersion && entry.maskW === item.w && entry.maskH === item.h) {
                    item.maskTexture = this._maskAtlasTexture;
                    item.maskSource = "atlas";
                    item.maskUv = entry.atlasUv;
                    this._atlasMetrics.atlasMaskUses += 1;
                    this._atlasMetrics.restoredMaskUses += 1;
                } else if (entry.maskTexture && entry.maskVersion === maskVersion && entry.maskW === item.w && entry.maskH === item.h) {
                    item.maskTexture = entry.maskTexture;
                    item.maskSource = "standalone";
                    item.maskUv = { u0: 0, v0: 0, u1: 1, v1: 1 };
                    this._atlasMetrics.standaloneMaskUses += 1;
                    this._atlasMetrics.restoredMaskUses += 1;
                } else {
                    unresolved.push(item);
                    this._atlasMetrics.prepMisses += 1;
                }
                if (item.maskTexture && sceneState && typeof sceneState.clearPieceDirty === "function") {
                    sceneState.clearPieceDirty(pp);
                }
            }
            return unresolved;
        }

        _prepareMaskResources(drawItems, sceneState, visibleFrameMark, allowRetry = true) {
            if (!Array.isArray(drawItems) || drawItems.length === 0) return;
            if (this._maskAtlasRebuildRequested) this._resetMaskAtlas();

            for (const item of drawItems) {
                const pp = item.pp;
                let entry = this._getOrCreatePieceCacheEntry(pp);
                entry.lastSeenFrame = visibleFrameMark;
                const needsAtlasSlot = !entry.atlasSlot || entry.maskW !== item.w || entry.maskH !== item.h;
                if (needsAtlasSlot) {
                    entry.atlasSlot = null;
                    entry.atlasUv = null;
                    if (!this._allocateMaskAtlasSlot(entry, item.w, item.h)) {
                        if (allowRetry) {
                            this._resetMaskAtlas();
                            return this._prepareMaskResources(drawItems, sceneState, visibleFrameMark, false);
                        }
                        break;
                    }
                }
            }

            for (const item of drawItems) {
                const pp = item.pp;
                const entry = this._pieceTextureCache.get(pp);
                if (!entry) continue;
                const maskVersion = pp._maskVersion != null ? pp._maskVersion : (pp._overlayVersion || 0);
                item.maskTexture = null;
                item.maskSource = null;
                item.maskUv = null;
                item.maskW = item.w;
                item.maskH = item.h;

                if (entry.atlasSlot && entry.atlasUv) {
                    if (entry.maskVersion !== maskVersion || entry.maskW !== item.w || entry.maskH !== item.h) {
                        if (this._uploadCountThisFrame < (this._uploadBudgetPerFrame != null ? this._uploadBudgetPerFrame : 12)) {
                            try {
                                if (this._uploadMaskToAtlas(pp, entry, item.w, item.h)) {
                                    this._uploadCountThisFrame += 1;
                                    entry.maskVersion = maskVersion;
                                    entry.maskW = item.w;
                                    entry.maskH = item.h;
                                }
                            } catch (e) {
                                this._handleUploadFailure(e);
                            }
                        }
                    }
                    if (entry.maskVersion === maskVersion && entry.maskW === item.w && entry.maskH === item.h) {
                        item.maskTexture = this._maskAtlasTexture;
                        item.maskSource = "atlas";
                        item.maskUv = entry.atlasUv;
                        this._atlasMetrics.atlasMaskUses += 1;
                    }
                }

                if (!item.maskTexture && this._ensureStandaloneMaskTexture(pp, entry, item.w, item.h, maskVersion)) {
                    item.maskTexture = entry.maskTexture;
                    item.maskSource = "standalone";
                    item.maskUv = { u0: 0, v0: 0, u1: 1, v1: 1 };
                    this._atlasMetrics.standaloneMaskUses += 1;
                }

                if (item.maskTexture && sceneState && typeof sceneState.clearPieceDirty === "function" && entry.maskVersion === maskVersion) {
                    sceneState.clearPieceDirty(pp);
                }
            }
        }


        _resolveMediaState(sceneState) {
            const puzzle = this.puzzle;
            if (!puzzle) return null;
            const sourceCanvas = puzzle.gameCanvas || null;
            const preferredSource = this.mediaSource || puzzle.srcImage || sourceCanvas || null;
            const preferredDims = this._getSourceDimensions(preferredSource);
            const contentW = (typeof puzzle._mediaContentWidth === "number" && puzzle._mediaContentWidth > 0)
                ? puzzle._mediaContentWidth
                : ((typeof puzzle._logicalGameWidth === "number" && typeof puzzle._logicalGameHeight === "number" && puzzle.nx && puzzle.ny)
                    ? puzzle.nx * puzzle.scalex
                    : (sourceCanvas ? sourceCanvas.width : preferredDims.w));
            const contentH = (typeof puzzle._mediaContentHeight === "number" && puzzle._mediaContentHeight > 0)
                ? puzzle._mediaContentHeight
                : ((typeof puzzle._logicalGameWidth === "number" && typeof puzzle._logicalGameHeight === "number" && puzzle.nx && puzzle.ny)
                    ? puzzle.ny * puzzle.scaley
                    : (sourceCanvas ? sourceCanvas.height : preferredDims.h));
            const animatedSource = this._isAnimatedSource(preferredSource);
            const forceUpload = !!animatedSource || sceneState == null || !!(sceneState && sceneState.mediaContentDirty);
            const draw = puzzle._gifDraw || puzzle.drawParams || null;
            const hasMappedSource = !!(
                preferredSource &&
                preferredDims.w > 0 &&
                preferredDims.h > 0 &&
                draw &&
                typeof draw.sx === "number" &&
                typeof draw.sy === "number" &&
                typeof draw.sw === "number" &&
                typeof draw.sh === "number" &&
                typeof draw.dx === "number" &&
                typeof draw.dy === "number" &&
                typeof draw.dw === "number" &&
                typeof draw.dh === "number"
            );

            if (hasMappedSource) {
                return {
                    textureSource: preferredSource,
                    textureW: preferredDims.w,
                    textureH: preferredDims.h,
                    bufferW: sourceCanvas && sourceCanvas.width > 0 ? sourceCanvas.width : Math.max(1, Math.round(draw.dw + draw.dx)),
                    bufferH: sourceCanvas && sourceCanvas.height > 0 ? sourceCanvas.height : Math.max(1, Math.round(draw.dh + draw.dy)),
                    contentW,
                    contentH,
                    forceUpload,
                    sourceKind: "direct",
                    mapping: {
                        sx: draw.sx,
                        sy: draw.sy,
                        sw: Math.max(1, draw.sw),
                        sh: Math.max(1, draw.sh),
                        dx: draw.dx,
                        dy: draw.dy,
                        dw: Math.max(1, draw.dw),
                        dh: Math.max(1, draw.dh)
                    }
                };
            }

            const fallbackSource = preferredSource || sourceCanvas;
            const fallbackDims = this._getSourceDimensions(fallbackSource);
            if (!fallbackSource || fallbackDims.w <= 0 || fallbackDims.h <= 0) return null;
            if (fallbackSource === sourceCanvas && animatedSource && typeof puzzle.renderSourceToGameCanvas === "function" && preferredSource) {
                puzzle.renderSourceToGameCanvas(preferredSource);
            }
            return {
                textureSource: fallbackSource,
                textureW: fallbackDims.w,
                textureH: fallbackDims.h,
                bufferW: sourceCanvas ? sourceCanvas.width : fallbackDims.w,
                bufferH: sourceCanvas ? sourceCanvas.height : fallbackDims.h,
                contentW,
                contentH,
                forceUpload,
                sourceKind: fallbackSource === sourceCanvas ? "surface" : "direct",
                mapping: null
            };
        }

        _getSourceDimensions(source) {
            if (!source) return { w: 0, h: 0 };
            return {
                w: (source.naturalWidth | 0) || (source.videoWidth | 0) || (source.width | 0) || 0,
                h: (source.naturalHeight | 0) || (source.videoHeight | 0) || (source.height | 0) || 0
            };
        }

        _isAnimatedSource(source) {
            return !!(source && typeof source.videoWidth === "number" && typeof source.videoHeight === "number");
        }

        _computeMediaUvPoint(ms, localX, localY, sourceW, sourceH, mediaState) {
            const logicalX = ((typeof ms.sx === "number" ? ms.sx : 0) - (typeof ms.destx === "number" ? ms.destx : 0)) + localX;
            const logicalY = ((typeof ms.sy === "number" ? ms.sy : 0) - (typeof ms.desty === "number" ? ms.desty : 0)) + localY;
            if (mediaState && mediaState.mapping) {
                const mapping = mediaState.mapping;
                const bufferW = mediaState.bufferW > 0 ? mediaState.bufferW : Math.max(1, mapping.dw || sourceW);
                const bufferH = mediaState.bufferH > 0 ? mediaState.bufferH : Math.max(1, mapping.dh || sourceH);
                const contentW = mediaState.contentW > 0 ? mediaState.contentW : bufferW;
                const contentH = mediaState.contentH > 0 ? mediaState.contentH : bufferH;
                const logicalToBufferX = bufferW / Math.max(1, contentW);
                const logicalToBufferY = bufferH / Math.max(1, contentH);
                const sxBuf = logicalX * logicalToBufferX;
                const syBuf = logicalY * logicalToBufferY;
                const tx = (sxBuf - mapping.dx) / Math.max(1, mapping.dw);
                const ty = (syBuf - mapping.dy) / Math.max(1, mapping.dh);
                const sourceX = mapping.sx + tx * mapping.sw;
                const sourceY = mapping.sy + ty * mapping.sh;
                return {
                    u: this._clamp01(sourceX / Math.max(1, sourceW)),
                    v: this._clamp01(sourceY / Math.max(1, sourceH))
                };
            }
            const uw = (mediaState && mediaState.contentW != null && mediaState.contentH != null && mediaState.contentW > 0 && mediaState.contentH > 0)
                ? mediaState.contentW
                : sourceW;
            const uh = (mediaState && mediaState.contentW != null && mediaState.contentH != null && mediaState.contentW > 0 && mediaState.contentH > 0)
                ? mediaState.contentH
                : sourceH;
            return {
                u: this._clamp01(logicalX / Math.max(1, uw)),
                v: this._clamp01(logicalY / Math.max(1, uh))
            };
        }

        _computeMediaUvBounds(ms, sourceW, sourceH, mediaState) {
            if (mediaState && mediaState.mapping) {
                const mapping = mediaState.mapping;
                const bufferW = mediaState.bufferW > 0 ? mediaState.bufferW : Math.max(1, mapping.dw || sourceW);
                const bufferH = mediaState.bufferH > 0 ? mediaState.bufferH : Math.max(1, mapping.dh || sourceH);
                const contentW = mediaState.contentW > 0 ? mediaState.contentW : bufferW;
                const contentH = mediaState.contentH > 0 ? mediaState.contentH : bufferH;
                const logicalToBufferX = bufferW / Math.max(1, contentW);
                const logicalToBufferY = bufferH / Math.max(1, contentH);
                const destx = (typeof ms.destx === "number") ? ms.destx : 0;
                const desty = (typeof ms.desty === "number") ? ms.desty : 0;
                const logicalX0 = ms.sx - destx;
                const logicalY0 = ms.sy - desty;
                const logicalX1 = logicalX0 + ms.w;
                const logicalY1 = logicalY0 + ms.h;
                const sx0Buf = logicalX0 * logicalToBufferX;
                const sy0Buf = logicalY0 * logicalToBufferY;
                const sx1Buf = logicalX1 * logicalToBufferX;
                const sy1Buf = logicalY1 * logicalToBufferY;
                const tx0 = (sx0Buf - mapping.dx) / Math.max(1, mapping.dw);
                const ty0 = (sy0Buf - mapping.dy) / Math.max(1, mapping.dh);
                const tx1 = (sx1Buf - mapping.dx) / Math.max(1, mapping.dw);
                const ty1 = (sy1Buf - mapping.dy) / Math.max(1, mapping.dh);
                const sourceX0 = mapping.sx + tx0 * mapping.sw;
                const sourceY0 = mapping.sy + ty0 * mapping.sh;
                const sourceX1 = mapping.sx + tx1 * mapping.sw;
                const sourceY1 = mapping.sy + ty1 * mapping.sh;
                return {
                    u0: this._clamp01(sourceX0 / Math.max(1, sourceW)),
                    v0: this._clamp01(sourceY0 / Math.max(1, sourceH)),
                    u1: this._clamp01(sourceX1 / Math.max(1, sourceW)),
                    v1: this._clamp01(sourceY1 / Math.max(1, sourceH))
                };
            }

            const dx = (typeof ms.destx === "number") ? ms.destx : 0;
            const dy = (typeof ms.desty === "number") ? ms.desty : 0;
            const uw = (mediaState && mediaState.contentW != null && mediaState.contentH != null && mediaState.contentW > 0 && mediaState.contentH > 0)
                ? mediaState.contentW
                : sourceW;
            const uh = (mediaState && mediaState.contentW != null && mediaState.contentH != null && mediaState.contentW > 0 && mediaState.contentH > 0)
                ? mediaState.contentH
                : sourceH;
            return {
                u0: this._clamp01((ms.sx - dx) / Math.max(1, uw)),
                v0: this._clamp01((ms.sy - dy) / Math.max(1, uh)),
                u1: this._clamp01((ms.sx + ms.w - dx) / Math.max(1, uw)),
                v1: this._clamp01((ms.sy + ms.h - dy) / Math.max(1, uh))
            };
        }

        _clamp01(value) {
            if (!isFinite(value)) return 0;
            if (value < 0) return 0;
            if (value > 1) return 1;
            return value;
        }

        _buildPieceEdgePasses(pp, puzzle) {
            const passes = [];
            const bevelSizeRaw = (typeof globalScope.bevel_size !== "undefined")
                ? parseFloat(globalScope.bevel_size)
                : parseFloat(localStorage.getItem("option_bevel_2") || "0");
            const bevelSize = isFinite(bevelSizeRaw) ? bevelSizeRaw : 0;
            if (bevelSize > 0) {
                const embth = Math.max(0, puzzle.scalex * 0.01 * bevelSize);
                const worldLight = (typeof pp._worldToPieceLocal === "function")
                    ? pp._worldToPieceLocal(embth / 2, -embth / 2)
                    : { x: embth / 2, y: -embth / 2 };
                if (Math.abs(worldLight.x) > 0.001 || Math.abs(worldLight.y) > 0.001) {
                    passes.push({
                        mode: 2.0,
                        offsetPx: { x: worldLight.x, y: worldLight.y },
                        bandPx: 0,
                        tint: [0, 0, 0, 0.35]
                    });
                    passes.push({
                        mode: 2.0,
                        offsetPx: { x: -worldLight.x, y: -worldLight.y },
                        bandPx: 0,
                        tint: [1, 1, 1, 0.35]
                    });
                }
            }
            if (pp.hinted) {
                const hintRgba = this._getHintColorRgba();
                passes.push({
                    mode: 3.0,
                    offsetPx: { x: 0, y: 0 },
                    bandPx: Math.max(0.03 * puzzle.scalex, 7),
                    tint: [hintRgba[0], hintRgba[1], hintRgba[2], Math.max(0.8, hintRgba[3] || 1)]
                });
            }
            return passes;
        }

        _getHintColorRgba() {
            const key = (typeof globalScope.hint_color === "string" && globalScope.hint_color)
                ? globalScope.hint_color
                : "red";
            if (this._cachedHintColorKey === key && this._cachedHintColorRgba) {
                return this._cachedHintColorRgba;
            }
            const parsed = this._parseCssColor(key) || [1, 0, 0, 1];
            this._cachedHintColorKey = key;
            this._cachedHintColorRgba = parsed;
            return parsed;
        }

        _parseCssColor(color) {
            if (!color || typeof document === "undefined") return null;
            if (!this._colorParserCanvas) {
                this._colorParserCanvas = document.createElement("canvas");
                this._colorParserCanvas.width = 1;
                this._colorParserCanvas.height = 1;
                this._colorParserCtx = this._colorParserCanvas.getContext("2d");
            }
            const ctx = this._colorParserCtx;
            if (!ctx) return null;
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = "#000";
            try {
                ctx.fillStyle = color;
            } catch (_e) {
                return null;
            }
            ctx.fillRect(0, 0, 1, 1);
            const data = ctx.getImageData(0, 0, 1, 1).data;
            return [data[0] / 255, data[1] / 255, data[2] / 255, data[3] / 255];
        }


        _setVertexOffset(byteOffset) {
            const gl = this.gl;
            const offset = byteOffset || 0;
            const stride = 36;
            gl.vertexAttribPointer(this._pieceProgram.aPosition, 2, gl.FLOAT, false, stride, offset);
            gl.vertexAttribPointer(this._pieceProgram.aTexCoord, 2, gl.FLOAT, false, stride, offset + 8);
            gl.vertexAttribPointer(this._pieceProgram.aMediaUv, 2, gl.FLOAT, false, stride, offset + 16);
            gl.vertexAttribPointer(this._pieceProgram.aEdgeOffset, 2, gl.FLOAT, false, stride, offset + 24);
            gl.vertexAttribPointer(this._pieceProgram.aHintFlag, 1, gl.FLOAT, false, stride, offset + 32);
        }

        _configureTextureDefaults(texture) {
            const gl = this.gl;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }

        _configureMaskTextureDefaults(texture) {
            const gl = this.gl;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        }

        _bindTextureUnit(unit, texture) {
            const gl = this.gl;
            if (this._activeTextureUnit !== unit) {
                gl.activeTexture(unit === 0 ? gl.TEXTURE0 : gl.TEXTURE1);
                this._activeTextureUnit = unit;
            }
            if (unit === 0 && this._boundTexture0 === texture) return;
            if (unit === 1 && this._boundTexture1 === texture) return;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            if (unit === 0) {
                this._boundTexture0 = texture;
            } else {
                this._boundTexture1 = texture;
            }
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

        _computePieceFrameGeometry(pp, w, h, deg) {
            if (!pp) return null;
            const halfW = w / 2;
            const halfH = h / 2;
            const angle = (pp.rot || 0) * deg * Math.PI / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const absCos = Math.abs(cos);
            const absSin = Math.abs(sin);
            return {
                centerX: (pp.x || 0) + halfW,
                centerY: (pp.y || 0) + halfH,
                halfW,
                halfH,
                cos,
                sin,
                worldHalfW: (halfW * absCos) + (halfH * absSin),
                worldHalfH: (halfW * absSin) + (halfH * absCos)
            };
        }

        _isPieceVisible(frameGeom, dw, dh) {
            if (!frameGeom) return false;
            if (frameGeom.centerX + frameGeom.worldHalfW < 0 || frameGeom.centerY + frameGeom.worldHalfH < 0) return false;
            if (frameGeom.centerX - frameGeom.worldHalfW > dw || frameGeom.centerY - frameGeom.worldHalfH > dh) return false;
            return true;
        }

        _computePieceBounds(pp, w, h, deg, padPx = 0, offsetX = 0, offsetY = 0, frameGeom = null) {
            const geom = frameGeom || this._computePieceFrameGeometry(pp, w, h, deg);
            if (!geom) return null;
            const pad = Math.max(0, padPx || 0);
            const dx = offsetX || 0;
            const dy = offsetY || 0;
            return {
                minX: geom.centerX - geom.worldHalfW - pad + dx,
                minY: geom.centerY - geom.worldHalfH - pad + dy,
                maxX: geom.centerX + geom.worldHalfW + pad + dx,
                maxY: geom.centerY + geom.worldHalfH + pad + dy
            };
        }

        _computeScissorRect(bounds) {
            if (!bounds) return null;
            const displayW = Math.max(1, this._displayWidth || this.canvas.width || 1);
            const displayH = Math.max(1, this._displayHeight || this.canvas.height || 1);
            const bufferW = Math.max(1, this.canvas.width || displayW);
            const bufferH = Math.max(1, this.canvas.height || displayH);
            const scaleX = bufferW / displayW;
            const scaleY = bufferH / displayH;
            const minX = Math.max(0, Math.floor(bounds.minX * scaleX));
            const maxX = Math.min(bufferW, Math.ceil(bounds.maxX * scaleX));
            const minYTop = Math.max(0, Math.floor(bounds.minY * scaleY));
            const maxYTop = Math.min(bufferH, Math.ceil(bounds.maxY * scaleY));
            const width = Math.max(0, maxX - minX);
            const height = Math.max(0, maxYTop - minYTop);
            if (width <= 0 || height <= 0) return null;
            return {
                x: minX,
                y: Math.max(0, bufferH - maxYTop),
                width,
                height
            };
        }

        _clearStencilRect(gl, rect = null, scissorState = null) {
            if (!gl) return;
            gl.stencilMask(0xff);
            if (rect) {
                if (scissorState) {
                    const sameRect = scissorState.enabled
                        && scissorState.x === rect.x
                        && scissorState.y === rect.y
                        && scissorState.width === rect.width
                        && scissorState.height === rect.height;
                    if (!scissorState.enabled) {
                        gl.enable(gl.SCISSOR_TEST);
                        scissorState.enabled = true;
                        this._meshMetrics.stencilScissorStateChanges += 1;
                    }
                    if (!sameRect) {
                        gl.scissor(rect.x, rect.y, rect.width, rect.height);
                        scissorState.x = rect.x;
                        scissorState.y = rect.y;
                        scissorState.width = rect.width;
                        scissorState.height = rect.height;
                        this._meshMetrics.stencilScissorStateChanges += 1;
                    }
                } else {
                    gl.enable(gl.SCISSOR_TEST);
                    gl.scissor(rect.x, rect.y, rect.width, rect.height);
                    gl.clear(gl.STENCIL_BUFFER_BIT);
                    gl.disable(gl.SCISSOR_TEST);
                }
                if (scissorState) {
                    gl.clear(gl.STENCIL_BUFFER_BIT);
                }
                this._meshMetrics.stencilScissoredClears += 1;
            } else {
                if (scissorState && scissorState.enabled) {
                    gl.disable(gl.SCISSOR_TEST);
                    scissorState.enabled = false;
                    this._meshMetrics.stencilScissorStateChanges += 1;
                }
                gl.clear(gl.STENCIL_BUFFER_BIT);
                this._meshMetrics.stencilFullClears += 1;
            }
        }

        _clearStencilForItem(gl, item, shadowOnly = false, scissorState = null) {
            if (!gl || !item) return;
            let baseBounds = item.stencilBounds || null;
            if (!baseBounds && item.pp) {
                baseBounds = this._computePieceBounds(
                    item.pp,
                    item.w,
                    item.h,
                    (globalScope.rotations === 180 ? 90 : globalScope.rotations) || 0,
                    item.stencilPadPx || 2,
                    0,
                    0,
                    item.frameGeom || null
                );
                item.stencilBounds = baseBounds;
            }
            let rect = !shadowOnly ? (item.stencilScissorRect || null) : null;
            if (!shadowOnly && !rect && baseBounds) {
                rect = this._computeScissorRect(baseBounds);
                item.stencilScissorRect = rect;
            }
            if (shadowOnly && baseBounds) {
                rect = this._computeScissorRect({
                    minX: baseBounds.minX + (item.shadowDx || 0),
                    minY: baseBounds.minY + (item.shadowDy || 0),
                    maxX: baseBounds.maxX + (item.shadowDx || 0),
                    maxY: baseBounds.maxY + (item.shadowDy || 0)
                });
            }
            this._clearStencilRect(gl, rect, scissorState);
        }

        _createShader(type, source) {
            const gl = this.gl;
            const shader = gl.createShader(type);
            if (!shader) return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }

        _createProgram(vertexSource, fragmentSource) {
            const gl = this.gl;
            const vs = this._createShader(gl.VERTEX_SHADER, vertexSource);
            const fs = this._createShader(gl.FRAGMENT_SHADER, fragmentSource);
            if (!vs || !fs) return null;
            const program = gl.createProgram();
            if (!program) return null;
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            gl.linkProgram(program);
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                gl.deleteProgram(program);
                return null;
            }
            return program;
        }

        _createProgramInfo(vertexSource, fragmentSource, kind) {
            const gl = this.gl;
            const program = this._createProgram(vertexSource, fragmentSource);
            if (!program) return null;
            const info = {
                program: program,
                aPosition: gl.getAttribLocation(program, "a_position"),
                aTexCoord: gl.getAttribLocation(program, "a_texCoord"),
                aMediaUv: gl.getAttribLocation(program, "a_mediaUv"),
                aEdgeOffset: gl.getAttribLocation(program, "a_edgeOffsetPx"),
                aHintFlag: gl.getAttribLocation(program, "a_hintFlag"),
                aEdgeCoord: gl.getAttribLocation(program, "a_edgeCoord"),
                aEdgeShade: gl.getAttribLocation(program, "a_edgeShade"),
                aHintBandFrac: gl.getAttribLocation(program, "a_hintBandFrac"),
                uResolution: gl.getUniformLocation(program, "u_resolution"),
                uMode: null,
                uMedia: null,
                uMask: null,
                uAlpha: null,
                uTexel: null,
                uSoftness: null,
                uHintTint: null,
                uHintBandPx: null,
                uOffsetPx: null,
                uUseSolidColor: null,
                uSolidAlpha: null,
                uApplyPieceTransform: null,
                uPieceCenterPx: null,
                uPieceHalfSizePx: null,
                uPieceRotationCS: null
            };
            if (kind === "combined") {
                info.uMode = gl.getUniformLocation(program, "u_mode");
                info.uMedia = gl.getUniformLocation(program, "u_media");
                info.uMask = gl.getUniformLocation(program, "u_mask");
                info.uAlpha = gl.getUniformLocation(program, "u_alpha");
                info.uTexel = gl.getUniformLocation(program, "u_texel");
                info.uSoftness = gl.getUniformLocation(program, "u_softness");
                info.uHintTint = gl.getUniformLocation(program, "u_hintTint");
                info.uHintBandPx = gl.getUniformLocation(program, "u_hintBandPx");
                info.uOffsetPx = gl.getUniformLocation(program, "u_offsetPx");
                info.uApplyPieceTransform = gl.getUniformLocation(program, "u_applyPieceTransform");
                info.uPieceCenterPx = gl.getUniformLocation(program, "u_pieceCenterPx");
                info.uPieceHalfSizePx = gl.getUniformLocation(program, "u_pieceHalfSizePx");
                info.uPieceRotationCS = gl.getUniformLocation(program, "u_pieceRotationCS");
            } else if (kind === "mesh") {
                info.uMedia = gl.getUniformLocation(program, "u_media");
                info.uHintTint = gl.getUniformLocation(program, "u_hintTint");
                info.uOffsetPx = gl.getUniformLocation(program, "u_offsetPx");
                info.uUseSolidColor = gl.getUniformLocation(program, "u_useSolidColor");
                info.uSolidAlpha = gl.getUniformLocation(program, "u_solidAlpha");
                info.uApplyPieceTransform = gl.getUniformLocation(program, "u_applyPieceTransform");
                info.uPieceCenterPx = gl.getUniformLocation(program, "u_pieceCenterPx");
                info.uPieceHalfSizePx = gl.getUniformLocation(program, "u_pieceHalfSizePx");
                info.uPieceRotationCS = gl.getUniformLocation(program, "u_pieceRotationCS");
            }
            return info;
        }

        _handleRuntimeFailure(err) {
            this.enabled = false;
            this.supportsPieceRendering = false;
            this.contextLost = true;
            this.failureReason = "webgl runtime error";
            if (!this._fatalErrorLogged && typeof console !== "undefined" && console.warn) {
                this._fatalErrorLogged = true;
                console.warn("[WebGLRenderer] Runtime failure; falling back to canvas2d:", err && err.message ? err.message : err);
            }
        }
    }

    globalScope.JigsawWebGLRenderer = WebGLRenderer;
})(window);

