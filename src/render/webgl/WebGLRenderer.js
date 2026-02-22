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
            this._mediaProgram = null;
            this._overlayProgram = null;
            this._shadowProgram = null;
            this._vertexBuffer = null;
            this._pieceTextureCache = new Map();
            this._mediaTexture = null;
            this._mediaTextureW = 0;
            this._mediaTextureH = 0;
            this._mediaTextureConfigured = false;
            this._onContextLost = null;
            this._onContextRestored = null;
            this._fatalErrorLogged = false;
            this.failureReason = "";
            this.mediaSource = null;
            this._boundProgram = null;
            this._boundTexture0 = null;
            this._boundTexture1 = null;
            this._frameCounter = 0;
            this._sortedPieces = [];
            this._sortedPiecesVersion = -1;
            this.lastDrawCount = 0;
            this.lastMediaUploads = 0;
        }

        init(puzzle) {
            this.puzzle = puzzle || null;
            if (!this.container) return false;
            this.canvas.width = this.container.clientWidth || 1;
            this.canvas.height = this.container.clientHeight || 1;
            if (!this.canvas.parentElement) this.container.appendChild(this.canvas);
            this.gl = this.canvas.getContext("webgl2") || this.canvas.getContext("webgl");
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
                    this.supportsPieceRendering = this.enabled;
                };
                this.canvas.addEventListener("webglcontextlost", this._onContextLost);
                this.canvas.addEventListener("webglcontextrestored", this._onContextRestored);
                this._eventsBound = true;
            }
            this.enabled = this._initResources();
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

        resize(width, height) {
            this.canvas.width = Math.max(1, Math.round(width));
            this.canvas.height = Math.max(1, Math.round(height));
            if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }

        renderFrame() {
            if (!this.enabled || !this.gl) return;
            try {
                const gl = this.gl;
                gl.viewport(0, 0, this.canvas.width, this.canvas.height);
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                if (!this.puzzle || !this._mediaProgram || !this._overlayProgram || !this._shadowProgram) return;

                const sourceCanvas = this.puzzle.gameCanvas || null;
                if (!sourceCanvas || !this._updateMediaTexture(sourceCanvas)) return;

                const pieces = this._getSortedPieces();

                gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
                const activePieces = new Set();
                const drawItems = [];
                for (const pp of pieces) {
                    const pieceCanvas = pp.polypiece_canvas;
                    if (!pieceCanvas) continue;
                    const w = pieceCanvas.width | 0;
                    const h = pieceCanvas.height | 0;
                    if (w <= 0 || h <= 0) continue;
                    if (!pp._mediaSample) continue;
                    if (!this._isPieceVisible(pp, w, h)) continue;
                    activePieces.add(pp);

                    const cache = this._ensurePieceTextures(pp);
                    if (!cache || !cache.maskTexture || !cache.overlayTexture) continue;
                    const vertices = this._buildPieceVertices(pp, w, h, sourceCanvas.width || 1, sourceCanvas.height || 1);
                    const held = !!pp._isHeld;
                    drawItems.push({
                        vertices: vertices,
                        shadowVertices: held ? this._buildShadowVertices(vertices, Math.max(6, w * 0.05), Math.max(6, h * 0.06)) : null,
                        maskTexture: cache.maskTexture,
                        overlayTexture: cache.overlayTexture,
                        maskW: cache.maskW || w,
                        maskH: cache.maskH || h,
                        held: held,
                        heldShadowAlpha: Math.max(0, Math.min(1, parseFloat(localStorage.getItem("heldPieceShadowDarkness") || "0.35") * 0.95))
                    });
                }

                if (drawItems.length) {
                    for (const item of drawItems) {
                        if (item.held && item.shadowVertices) {
                            this._bindProgram(this._shadowProgram);
                            this._bindTextureUnit(0, item.maskTexture);
                            gl.uniform1i(this._shadowProgram.uMask, 0);
                            gl.uniform1f(this._shadowProgram.uAlpha, item.heldShadowAlpha);
                            gl.uniform2f(
                                this._shadowProgram.uTexel,
                                1 / Math.max(1, item.maskW),
                                1 / Math.max(1, item.maskH)
                            );
                            gl.uniform1f(this._shadowProgram.uSoftness, 3.0);
                            gl.bufferData(gl.ARRAY_BUFFER, item.shadowVertices, gl.STREAM_DRAW);
                            gl.drawArrays(gl.TRIANGLES, 0, 6);
                        }

                        this._bindProgram(this._mediaProgram);
                        this._bindTextureUnit(0, this._mediaTexture);
                        gl.uniform1i(this._mediaProgram.uMedia, 0);
                        this._bindTextureUnit(1, item.maskTexture);
                        gl.uniform1i(this._mediaProgram.uMask, 1);
                        gl.bufferData(gl.ARRAY_BUFFER, item.vertices, gl.STREAM_DRAW);
                        gl.drawArrays(gl.TRIANGLES, 0, 6);

                        this._bindProgram(this._overlayProgram);
                        this._bindTextureUnit(0, item.overlayTexture);
                        gl.uniform1i(this._overlayProgram.uOverlay, 0);
                        gl.bufferData(gl.ARRAY_BUFFER, item.vertices, gl.STREAM_DRAW);
                        gl.drawArrays(gl.TRIANGLES, 0, 6);
                    }
                }
                this._frameCounter++;
                if ((this._frameCounter % 30) === 0) this._pruneTextureCache(activePieces);
                this.lastDrawCount = drawItems.length * 2 + drawItems.reduce((acc, item) => acc + (item.held ? 1 : 0), 0);
                this.lastMediaUploads = this._mediaUploadsThisFrame || 0;
            } catch (e) {
                this._handleRuntimeFailure(e);
            }
        }

        renderDirtyPieces(sceneState) {
            if (sceneState && sceneState.hasDirtyPieces && !sceneState.hasDirtyPieces()) return;
            if (sceneState && sceneState.consumeDirtyPieces) sceneState.consumeDirtyPieces();
            this.renderFrame();
        }

        destroy() {
            this.enabled = false;
            this.supportsPieceRendering = false;
            if (this.gl) {
                for (const entry of this._pieceTextureCache.values()) {
                    if (entry.maskTexture) this.gl.deleteTexture(entry.maskTexture);
                    if (entry.overlayTexture) this.gl.deleteTexture(entry.overlayTexture);
                }
                this._pieceTextureCache.clear();
                if (this._vertexBuffer) this.gl.deleteBuffer(this._vertexBuffer);
                if (this._mediaTexture) this.gl.deleteTexture(this._mediaTexture);
                if (this._mediaProgram && this._mediaProgram.program) this.gl.deleteProgram(this._mediaProgram.program);
                if (this._overlayProgram && this._overlayProgram.program) this.gl.deleteProgram(this._overlayProgram.program);
                if (this._shadowProgram && this._shadowProgram.program) this.gl.deleteProgram(this._shadowProgram.program);
            }
            this._vertexBuffer = null;
            this._mediaTexture = null;
            this._mediaTextureW = 0;
            this._mediaTextureH = 0;
            this._mediaProgram = null;
            this._overlayProgram = null;
            this._shadowProgram = null;
            if (this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas);
            this.gl = null;
        }

        _initResources() {
            if (!this.gl) return false;
            const gl = this.gl;
            if (this._vertexBuffer) gl.deleteBuffer(this._vertexBuffer);
            if (this._mediaTexture) gl.deleteTexture(this._mediaTexture);
            if (this._mediaProgram && this._mediaProgram.program) gl.deleteProgram(this._mediaProgram.program);
            if (this._overlayProgram && this._overlayProgram.program) gl.deleteProgram(this._overlayProgram.program);
            if (this._shadowProgram && this._shadowProgram.program) gl.deleteProgram(this._shadowProgram.program);
            for (const entry of this._pieceTextureCache.values()) {
                if (entry.maskTexture) gl.deleteTexture(entry.maskTexture);
                if (entry.overlayTexture) gl.deleteTexture(entry.overlayTexture);
            }
            this._pieceTextureCache.clear();
            this._mediaTexture = null;
            this._mediaTextureW = 0;
            this._mediaTextureH = 0;
            this._mediaTextureConfigured = false;
            this._boundProgram = null;
            this._boundTexture0 = null;
            this._boundTexture1 = null;

            const vertexSrc = `
                attribute vec2 a_position;
                attribute vec2 a_texCoord;
                attribute vec2 a_mediaUv;
                uniform vec2 u_resolution;
                varying vec2 v_texCoord;
                varying vec2 v_mediaUv;
                void main() {
                    vec2 zeroToOne = a_position / u_resolution;
                    vec2 clipSpace = zeroToOne * 2.0 - 1.0;
                    gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
                    v_texCoord = a_texCoord;
                    v_mediaUv = a_mediaUv;
                }
            `;
            const mediaFragSrc = `
                precision mediump float;
                varying vec2 v_texCoord;
                varying vec2 v_mediaUv;
                uniform sampler2D u_media;
                uniform sampler2D u_mask;
                void main() {
                    vec4 media = texture2D(u_media, v_mediaUv);
                    float alpha = texture2D(u_mask, v_texCoord).a;
                    gl_FragColor = vec4(media.rgb, media.a * alpha);
                }
            `;
            const overlayFragSrc = `
                precision mediump float;
                varying vec2 v_texCoord;
                uniform sampler2D u_overlay;
                void main() {
                    gl_FragColor = texture2D(u_overlay, v_texCoord);
                }
            `;
            const shadowFragSrc = `
                precision mediump float;
                varying vec2 v_texCoord;
                uniform sampler2D u_mask;
                uniform float u_alpha;
                uniform vec2 u_texel;
                uniform float u_softness;
                void main() {
                    vec2 d = u_texel * u_softness;
                    float alpha = 0.0;
                    alpha += texture2D(u_mask, v_texCoord).a * 0.227027;
                    alpha += texture2D(u_mask, v_texCoord + vec2( d.x, 0.0)).a * 0.1945946;
                    alpha += texture2D(u_mask, v_texCoord + vec2(-d.x, 0.0)).a * 0.1945946;
                    alpha += texture2D(u_mask, v_texCoord + vec2(0.0,  d.y)).a * 0.1945946;
                    alpha += texture2D(u_mask, v_texCoord + vec2(0.0, -d.y)).a * 0.1945946;
                    alpha += texture2D(u_mask, v_texCoord + vec2( d.x,  d.y)).a * 0.1216216;
                    alpha += texture2D(u_mask, v_texCoord + vec2(-d.x,  d.y)).a * 0.1216216;
                    alpha += texture2D(u_mask, v_texCoord + vec2( d.x, -d.y)).a * 0.1216216;
                    alpha += texture2D(u_mask, v_texCoord + vec2(-d.x, -d.y)).a * 0.1216216;
                    alpha = alpha * 0.62;
                    gl_FragColor = vec4(0.0, 0.0, 0.0, alpha * u_alpha);
                }
            `;
            this._mediaProgram = this._createProgramInfo(vertexSrc, mediaFragSrc, "media");
            this._overlayProgram = this._createProgramInfo(vertexSrc, overlayFragSrc, "overlay");
            this._shadowProgram = this._createProgramInfo(vertexSrc, shadowFragSrc, "shadow");
            if (!this._mediaProgram || !this._overlayProgram || !this._shadowProgram) return false;
            this._vertexBuffer = gl.createBuffer();
            if (!this._vertexBuffer) return false;
            gl.disable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            return true;
        }

        _updateMediaTexture(sourceCanvas) {
            const gl = this.gl;
            this._mediaUploadsThisFrame = 0;
            if (!this._mediaTexture) {
                this._mediaTexture = gl.createTexture();
                if (!this._mediaTexture) return false;
                this._mediaTextureConfigured = false;
            }
            this._bindTextureUnit(0, this._mediaTexture);
            if (!this._mediaTextureConfigured) {
                this._configureTextureDefaults(this._mediaTexture);
                this._mediaTextureConfigured = true;
            }
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            try {
                const sw = sourceCanvas.width | 0;
                const sh = sourceCanvas.height | 0;
                if (sw <= 0 || sh <= 0) return false;
                if (this._mediaTextureW !== sw || this._mediaTextureH !== sh) {
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
                    this._mediaTextureW = sw;
                    this._mediaTextureH = sh;
                    this._mediaUploadsThisFrame = 1;
                } else {
                    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
                    this._mediaUploadsThisFrame = 1;
                }
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

        _buildPieceVertices(pp, w, h, sourceW, sourceH) {
            const cx = pp.x + w / 2;
            const cy = pp.y + h / 2;
            const deg = (globalScope.rotations === 180 ? 90 : globalScope.rotations) || 0;
            const angle = (pp.rot || 0) * deg * Math.PI / 180;
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const hw = w / 2;
            const hh = h / 2;
            const ms = pp._mediaSample || { sx: 0, sy: 0, destx: 0, desty: 0, w: w, h: h };
            const u0 = (ms.sx - ms.destx) / sourceW;
            const u1 = (ms.sx + ms.w - ms.destx) / sourceW;
            const v0 = (ms.sy - ms.desty) / sourceH;
            const v1 = (ms.sy + ms.h - ms.desty) / sourceH;
            const tl = this._rotateAndTranslate(-hw, -hh, c, s, cx, cy);
            const tr = this._rotateAndTranslate(hw, -hh, c, s, cx, cy);
            const bl = this._rotateAndTranslate(-hw, hh, c, s, cx, cy);
            const br = this._rotateAndTranslate(hw, hh, c, s, cx, cy);
            return new Float32Array([
                tl.x, tl.y, 0, 0, u0, v0,
                tr.x, tr.y, 1, 0, u1, v0,
                bl.x, bl.y, 0, 1, u0, v1,
                bl.x, bl.y, 0, 1, u0, v1,
                tr.x, tr.y, 1, 0, u1, v0,
                br.x, br.y, 1, 1, u1, v1
            ]);
        }

        _buildShadowVertices(vertices, shadowDx, shadowDy) {
            const out = new Float32Array(vertices);
            for (let i = 0; i < out.length; i += 6) {
                out[i] += shadowDx;
                out[i + 1] += shadowDy;
            }
            return out;
        }

        _rotateAndTranslate(x, y, c, s, tx, ty) {
            return {
                x: x * c - y * s + tx,
                y: x * s + y * c + ty
            };
        }

        _pruneTextureCache(activePieces) {
            for (const [piece, entry] of this._pieceTextureCache.entries()) {
                if (!activePieces.has(piece)) {
                    if (this.gl && entry.maskTexture) this.gl.deleteTexture(entry.maskTexture);
                    if (this.gl && entry.overlayTexture) this.gl.deleteTexture(entry.overlayTexture);
                    this._pieceTextureCache.delete(piece);
                }
            }
        }

        _ensurePieceTextures(pp) {
            const gl = this.gl;
            let entry = this._pieceTextureCache.get(pp);
            if (!entry) {
                entry = {
                    maskTexture: gl.createTexture(),
                    overlayTexture: gl.createTexture(),
                    maskVersion: -1,
                    overlayVersion: -1,
                    maskConfigured: false,
                    overlayConfigured: false,
                    maskW: 0,
                    maskH: 0
                };
                this._pieceTextureCache.set(pp, entry);
            }
            if (!entry.maskTexture || !entry.overlayTexture) return null;

            if (!pp._maskCanvas && pp.path && pp.polypiece_canvas) {
                const w = pp.polypiece_canvas.width | 0;
                const h = pp.polypiece_canvas.height | 0;
                if (w > 0 && h > 0) {
                    pp._maskCanvas = document.createElement("canvas");
                    pp._maskCanvas.width = w;
                    pp._maskCanvas.height = h;
                    const mctx = pp._maskCanvas.getContext("2d");
                    mctx.clearRect(0, 0, w, h);
                    mctx.fillStyle = "#fff";
                    mctx.fill(pp.path);
                    pp._maskVersion = (pp._maskVersion || 0) + 1;
                }
            }

            if (pp._maskCanvas && entry.maskVersion !== (pp._maskVersion || 0)) {
                this._bindTextureUnit(1, entry.maskTexture);
                if (!entry.maskConfigured) {
                    this._configureTextureDefaults(entry.maskTexture);
                    entry.maskConfigured = true;
                }
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                try {
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pp._maskCanvas);
                } catch (e) {
                    this._handleUploadFailure(e);
                    return null;
                }
                entry.maskVersion = pp._maskVersion || 0;
                entry.maskW = pp._maskCanvas.width | 0;
                entry.maskH = pp._maskCanvas.height | 0;
            }

            if (pp.polypiece_canvas && entry.overlayVersion !== (pp._overlayVersion || 0)) {
                this._bindTextureUnit(0, entry.overlayTexture);
                if (!entry.overlayConfigured) {
                    this._configureTextureDefaults(entry.overlayTexture);
                    entry.overlayConfigured = true;
                }
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                try {
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pp.polypiece_canvas);
                } catch (e) {
                    this._handleUploadFailure(e);
                    return null;
                }
                entry.overlayVersion = pp._overlayVersion || 0;
            }
            return entry;
        }

        _bindProgram(programInfo) {
            const gl = this.gl;
            if (this._boundProgram !== programInfo.program) {
                gl.useProgram(programInfo.program);
                this._boundProgram = programInfo.program;
            }
            gl.enableVertexAttribArray(programInfo.aPosition);
            gl.vertexAttribPointer(programInfo.aPosition, 2, gl.FLOAT, false, 24, 0);
            gl.enableVertexAttribArray(programInfo.aTexCoord);
            gl.vertexAttribPointer(programInfo.aTexCoord, 2, gl.FLOAT, false, 24, 8);
            if (programInfo.aMediaUv >= 0) {
                gl.enableVertexAttribArray(programInfo.aMediaUv);
                gl.vertexAttribPointer(programInfo.aMediaUv, 2, gl.FLOAT, false, 24, 16);
            }
            gl.uniform2f(programInfo.uResolution, this.canvas.width, this.canvas.height);
        }

        _configureTextureDefaults(texture) {
            const gl = this.gl;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }

        _bindTextureUnit(unit, texture) {
            const gl = this.gl;
            gl.activeTexture(unit === 0 ? gl.TEXTURE0 : gl.TEXTURE1);
            if (unit === 0 && this._boundTexture0 === texture) return;
            if (unit === 1 && this._boundTexture1 === texture) return;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            if (unit === 0) {
                this._boundTexture0 = texture;
            } else {
                this._boundTexture1 = texture;
            }
        }

        _getSortedPieces() {
            const puzzle = this.puzzle;
            if (!puzzle) return [];
            const version = puzzle._zOrderVersion || 0;
            if (this._sortedPiecesVersion !== version || this._sortedPieces.length !== (puzzle.polyPieces || []).length) {
                this._sortedPieces = (puzzle.polyPieces || []).slice();
                this._sortedPieces.sort((a, b) => {
                    const za = Number(a.polypiece_canvas && a.polypiece_canvas.style.zIndex) || 0;
                    const zb = Number(b.polypiece_canvas && b.polypiece_canvas.style.zIndex) || 0;
                    return za - zb;
                });
                this._sortedPiecesVersion = version;
            }
            return this._sortedPieces;
        }

        _isPieceVisible(pp, w, h) {
            const deg = (globalScope.rotations === 180 ? 90 : globalScope.rotations) || 0;
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
            if (cx - hw > this.canvas.width || cy - hh > this.canvas.height) return false;
            return true;
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
                uResolution: gl.getUniformLocation(program, "u_resolution"),
                uMedia: null,
                uMask: null,
                uOverlay: null,
                uAlpha: null,
                uTexel: null,
                uSoftness: null
            };
            if (kind === "media") {
                info.uMedia = gl.getUniformLocation(program, "u_media");
                info.uMask = gl.getUniformLocation(program, "u_mask");
            } else if (kind === "overlay") {
                info.uOverlay = gl.getUniformLocation(program, "u_overlay");
            } else if (kind === "shadow") {
                info.uMask = gl.getUniformLocation(program, "u_mask");
                info.uAlpha = gl.getUniformLocation(program, "u_alpha");
                info.uTexel = gl.getUniformLocation(program, "u_texel");
                info.uSoftness = gl.getUniformLocation(program, "u_softness");
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

