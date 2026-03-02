"use strict";

(function initMediaBindings(globalScope) {
    function create(deps) {
        let activeCustomVideoEl = null;
        let activeCustomVideoUrl = null;
        let mediaBindToken = 0;
        const corsNoticeShown = new Set();
        const corsSuppressStorageKey = "jigsawSuppressCorsNoticesSession";
        let suppressCorsNoticesForSession = false;
        let corsModalEl = null;
        let corsModalTitleEl = null;
        let corsModalBodyEl = null;
        let corsModalSuppressCheckboxEl = null;

        try {
            suppressCorsNoticesForSession = globalScope.sessionStorage &&
                globalScope.sessionStorage.getItem(corsSuppressStorageKey) === "1";
        } catch (_e) {
            suppressCorsNoticesForSession = false;
        }

        function ensureSynchronizedPreviewSurface() {
            const sync = document.getElementById("prevsync");
            if (sync) sync.style.display = "block";
        }

        function getRendererFacade() {
            return deps.getRendererFacade ? deps.getRendererFacade() : null;
        }

        function getPuzzle() {
            return deps.getPuzzle ? deps.getPuzzle() : null;
        }

        function tryRestoreWebGLIfSourceSafe() {
            const puzzle = getPuzzle();
            const facade = getRendererFacade();
            if (!puzzle || !facade || !facade.webglDowngraded) return;
            if (puzzle._webglStartBlockedReason) return;
            const cfg = deps.getRendererConfig && deps.getRendererConfig();
            const preferredMode = (cfg && cfg.mode) || "auto";
            if (typeof facade.retryWebGLAfterDowngrade === "function") {
                facade.retryWebGLAfterDowngrade(preferredMode);
            }
        }

        function isGifSource(src) {
            return typeof src === "string" && (
                src.startsWith("data:image/gif") || /\.gif(\?|#|$)/i.test(src)
            );
        }

        function isCrossOriginHttpUrl(src) {
            try {
                const u = new URL(src, globalScope.location.href);
                const isHttp = u.protocol === "http:" || u.protocol === "https:";
                return isHttp && u.origin !== globalScope.location.origin;
            } catch (_e) {
                return false;
            }
        }

        function ensureCorsModal() {
            if (corsModalEl) return;
            const overlay = document.createElement("div");
            overlay.style.position = "fixed";
            overlay.style.inset = "0";
            overlay.style.background = "rgba(0, 0, 0, 0.6)";
            overlay.style.zIndex = "2147483647";
            overlay.style.display = "none";
            overlay.style.alignItems = "center";
            overlay.style.justifyContent = "center";
            overlay.setAttribute("role", "dialog");
            overlay.setAttribute("aria-modal", "true");
            overlay.setAttribute("aria-label", "CORS notice");

            const card = document.createElement("div");
            card.style.width = "min(92vw, 680px)";
            card.style.maxHeight = "80vh";
            card.style.overflow = "auto";
            card.style.background = "#1f2430";
            card.style.color = "#f5f7ff";
            card.style.border = "1px solid rgba(255, 255, 255, 0.2)";
            card.style.borderRadius = "10px";
            card.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.45)";
            card.style.padding = "18px 18px 14px";
            card.addEventListener("click", (evt) => evt.stopPropagation());

            const title = document.createElement("div");
            title.style.fontSize = "20px";
            title.style.fontWeight = "700";
            title.style.marginBottom = "10px";

            const body = document.createElement("div");
            body.style.whiteSpace = "pre-wrap";
            body.style.lineHeight = "1.45";
            body.style.fontSize = "14px";

            const actions = document.createElement("div");
            actions.style.display = "flex";
            actions.style.justifyContent = "flex-end";
            actions.style.marginTop = "14px";

            const optionsRow = document.createElement("label");
            optionsRow.style.display = "flex";
            optionsRow.style.alignItems = "center";
            optionsRow.style.gap = "8px";
            optionsRow.style.marginTop = "12px";
            optionsRow.style.userSelect = "none";
            optionsRow.style.fontSize = "13px";
            optionsRow.style.opacity = "0.95";

            const suppressCheckbox = document.createElement("input");
            suppressCheckbox.type = "checkbox";
            suppressCheckbox.checked = suppressCorsNoticesForSession;
            suppressCheckbox.addEventListener("change", () => {
                suppressCorsNoticesForSession = !!suppressCheckbox.checked;
                try {
                    if (globalScope.sessionStorage) {
                        if (suppressCorsNoticesForSession) {
                            globalScope.sessionStorage.setItem(corsSuppressStorageKey, "1");
                        } else {
                            globalScope.sessionStorage.removeItem(corsSuppressStorageKey);
                        }
                    }
                } catch (_e) {}
            });

            const suppressText = document.createElement("span");
            suppressText.textContent = "Don't show this again this session";
            optionsRow.appendChild(suppressCheckbox);
            optionsRow.appendChild(suppressText);

            const closeBtn = document.createElement("button");
            closeBtn.type = "button";
            closeBtn.textContent = "Close";
            closeBtn.style.background = "#4caf50";
            closeBtn.style.color = "#ffffff";
            closeBtn.style.border = "none";
            closeBtn.style.borderRadius = "6px";
            closeBtn.style.padding = "8px 14px";
            closeBtn.style.cursor = "pointer";
            closeBtn.addEventListener("click", () => {
                overlay.style.display = "none";
            });

            actions.appendChild(closeBtn);
            card.appendChild(title);
            card.appendChild(body);
            card.appendChild(optionsRow);
            card.appendChild(actions);
            overlay.appendChild(card);
            overlay.addEventListener("click", () => {
                overlay.style.display = "none";
            });

            const parent = document.body || document.documentElement;
            if (parent) parent.appendChild(overlay);

            corsModalEl = overlay;
            corsModalTitleEl = title;
            corsModalBodyEl = body;
            corsModalSuppressCheckboxEl = suppressCheckbox;
        }

        function showCorsNoticeOnce(key, title, message) {
            if (suppressCorsNoticesForSession) return;
            if (!key || corsNoticeShown.has(key)) return;
            corsNoticeShown.add(key);
            ensureCorsModal();
            if (!corsModalEl || !corsModalTitleEl || !corsModalBodyEl) return;
            if (corsModalSuppressCheckboxEl) corsModalSuppressCheckboxEl.checked = suppressCorsNoticesForSession;
            corsModalTitleEl.textContent = title || "CORS notice";
            corsModalBodyEl.textContent = message || "";
            corsModalEl.style.display = "flex";
        }

        function showCorsDowngradeNotice(mediaKind, sourceUrl) {
            const kindLabel = mediaKind === "video" ? "video" : "image";
            const suffix = sourceUrl ? `\n\nSource: ${sourceUrl}` : "";
            showCorsNoticeOnce(
                `downgrade:${kindLabel}:${sourceUrl || ""}`,
                "Cross-origin media: renderer downgraded",
                `This ${kindLabel} URL is hosted on a different origin and blocks secure texture upload.\n\nThe puzzle should still work, but rendering has been downgraded from WebGL to Canvas2D for this media source.\n\nRamifications: lower performance, higher CPU use, and fewer renderer optimizations on larger puzzles.${suffix}`
            );
        }

        function showGifAnimationUnavailableNotice(sourceUrl, reason = "") {
            const isCors = reason === "cors";
            const suffix = sourceUrl ? `\n\nSource: ${sourceUrl}` : "";
            showCorsNoticeOnce(
                `gif-unsupported:${reason}:${sourceUrl || ""}`,
                "Animated GIF limitation",
                isCors
                    ? `This animated GIF URL blocks cross-origin frame access.\n\nResult: full animated GIF playback is not available for this source (you may only see a static frame).\n\nYou can try another image URL, or save the GIF to your computer and load it with "Select image".${suffix}`
                    : `This animated GIF could not be decoded for frame-by-frame playback in the current browser setup.\n\nResult: full animated GIF playback is not available for this source (you may only see a static frame).\n\nYou can try another image URL, or save the GIF to your computer and load it with "Select image".${suffix}`
            );
        }

        function teardownActiveVideoSource() {
            if (activeCustomVideoEl) {
                try { activeCustomVideoEl.pause(); } catch (_e) {}
                activeCustomVideoEl.src = "";
                activeCustomVideoEl.load();
            }
            if (activeCustomVideoUrl) {
                try { URL.revokeObjectURL(activeCustomVideoUrl); } catch (_e) {}
            }
            activeCustomVideoEl = null;
            activeCustomVideoUrl = null;
        }

        async function captureVideoPosterDataUrl(video) {
            if (!video) throw new Error("No video source available.");
            if (video.readyState < 2) {
                await new Promise((resolve, reject) => {
                    video.addEventListener("loadeddata", resolve, { once: true });
                    video.addEventListener("error", () => reject(new Error("Video failed to load.")), { once: true });
                });
            }
            const w = Math.max(1, video.videoWidth || 1);
            const h = Math.max(1, video.videoHeight || 1);
            const c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            const ctx = c.getContext("2d");
            if (!ctx) throw new Error("Failed to create canvas context for video poster.");
            ctx.drawImage(video, 0, 0, w, h);
            return c.toDataURL("image/png");
        }

        async function waitForVideoReady(video, timeoutMs = 10000) {
            if (!video) throw new Error("No video element provided.");
            if (video.readyState >= 2) return;
            await new Promise((resolve, reject) => {
                const onReady = () => {
                    cleanup();
                    resolve();
                };
                const onError = () => {
                    cleanup();
                    reject(new Error("Video failed to load."));
                };
                const onTimeout = () => {
                    cleanup();
                    reject(new Error("Video load timed out."));
                };
                const cleanup = () => {
                    video.removeEventListener("loadeddata", onReady);
                    video.removeEventListener("canplay", onReady);
                    video.removeEventListener("error", onError);
                    clearTimeout(timer);
                };
                video.addEventListener("loadeddata", onReady, { once: true });
                video.addEventListener("canplay", onReady, { once: true });
                video.addEventListener("error", onError, { once: true });
                const timer = globalScope.setTimeout(onTimeout, Math.max(1000, timeoutMs | 0));
            });
        }

        function buildFallbackPosterDataUrl(video) {
            const w = Math.max(1, video && video.videoWidth ? video.videoWidth : 1);
            const h = Math.max(1, video && video.videoHeight ? video.videoHeight : 1);
            const c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            const ctx = c.getContext("2d");
            if (ctx) {
                ctx.fillStyle = "#111";
                ctx.fillRect(0, 0, w, h);
            }
            return c.toDataURL("image/png");
        }

        function markWebGLBlockedIfVideoTainted(video) {
            const puzzle = getPuzzle();
            if (!puzzle || !video) return;
            try {
                const probe = document.createElement("canvas");
                probe.width = 1;
                probe.height = 1;
                const ctx = probe.getContext("2d");
                if (!ctx) return;
                ctx.drawImage(video, 0, 0, 1, 1);
                ctx.getImageData(0, 0, 1, 1);
                if (!puzzle._webglStartBlockedReason) puzzle._webglStartBlockedReason = "";
            } catch (_e) {
                puzzle._webglStartBlockedReason = "secure texture upload blocked (CORS)";
                showCorsDowngradeNotice("video", video && video.currentSrc ? video.currentSrc : video.src);
            }
        }

        async function bindVideoElement(video, options = {}) {
            const rendererFacade = getRendererFacade();
            if (!options.preserveExistingMedia) {
                teardownActiveVideoSource();
                if (rendererFacade && rendererFacade.media && rendererFacade.media.stop) rendererFacade.media.stop();
            }

            await waitForVideoReady(video);

            let posterDataUrl = null;
            try {
                posterDataUrl = await captureVideoPosterDataUrl(video);
            } catch (_e) {
                posterDataUrl = buildFallbackPosterDataUrl(video);
            }

            activeCustomVideoEl = video;
            activeCustomVideoUrl = options.objectUrl || null;
            setImagePath(posterDataUrl, { preserveVideo: true, skipRendererMediaBind: true });
            markWebGLBlockedIfVideoTainted(video);

            try { await video.play(); } catch (_e) {}
            const cfg = deps.getRendererConfig();
            if (cfg) cfg.media = options.kind || "video";
            if (rendererFacade) rendererFacade.setVideoSource(video, options.kind || "video");
            tryRestoreWebGLIfSourceSafe();
        }

        function setImagePath(path, options = {}) {
            const puzzle = getPuzzle();
            if (!puzzle) return;
            mediaBindToken++;
            const bindToken = mediaBindToken;
            const rendererFacade = getRendererFacade();
            const forcedKind = options && typeof options.forceMediaKind === "string"
                ? options.forceMediaKind.toLowerCase()
                : "";

            if (!options.preserveVideo) {
                teardownActiveVideoSource();
                if (rendererFacade && rendererFacade.media && rendererFacade.media.stop) rendererFacade.media.stop();
            }

            deps.setImagePath(path);
            const imagePath = deps.getImagePath();
            ensureSynchronizedPreviewSurface();
            puzzle.isGif = forcedKind === "gif" ? true : isGifSource(imagePath);
            puzzle.imageLoaded = false;
            puzzle._webglStartBlockedReason = "";
            const cfg = deps.getRendererConfig();
            if (cfg) cfg.media = (forcedKind === "image" || forcedKind === "gif") ? forcedKind : (puzzle.isGif ? "gif" : "image");

            let isCrossOriginHttp = false;
            try {
                const u = new URL(imagePath, globalScope.location.href);
                const isHttp = u.protocol === "http:" || u.protocol === "https:";
                const isCrossOrigin = u.origin !== globalScope.location.origin;
                isCrossOriginHttp = isHttp && isCrossOrigin;
                if (isHttp && isCrossOrigin) {
                    puzzle.srcImage.crossOrigin = "anonymous";
                } else {
                    puzzle.srcImage.removeAttribute("crossorigin");
                }
            } catch (_e) {
                puzzle.srcImage.removeAttribute("crossorigin");
            }

            if (puzzle.srcImage.parentElement) puzzle.srcImage.parentElement.removeChild(puzzle.srcImage);
            if (isCrossOriginHttp) {
                const fallbackOnError = function fallbackOnError() {
                    puzzle.srcImage.removeEventListener("error", fallbackOnError);
                    puzzle.srcImage.removeAttribute("crossorigin");
                    puzzle._webglStartBlockedReason = "secure texture upload blocked (CORS)";
                    puzzle.imageLoaded = false;
                    puzzle.srcImage.src = imagePath;
                    if (puzzle.isGif) {
                        showGifAnimationUnavailableNotice(imagePath, "cors");
                    } else {
                        showCorsDowngradeNotice("image", imagePath);
                    }
                };
                puzzle.srcImage.addEventListener("error", fallbackOnError, { once: true });
            }

            puzzle.srcImage.src = imagePath;

            if (rendererFacade && !options.skipRendererMediaBind) {
                if (puzzle.isGif) {
                    if (rendererFacade.setGifSource) {
                        rendererFacade.setGifSource(imagePath, puzzle.srcImage).then((ok) => {
                            if (bindToken !== mediaBindToken) return;
                            if (!ok) {
                                let reason = "";
                                try {
                                    const st = rendererFacade && rendererFacade.media && rendererFacade.media.getStatus
                                        ? rendererFacade.media.getStatus()
                                        : null;
                                    reason = st && st.failureReason ? String(st.failureReason) : "";
                                } catch (_e) {}
                                showGifAnimationUnavailableNotice(imagePath, reason);
                                rendererFacade.setMediaSource(puzzle.srcImage, "gif");
                            }
                        }).catch(() => {
                            if (bindToken !== mediaBindToken) return;
                            const reason = isCrossOriginHttpUrl(imagePath) ? "cors" : "decode";
                            showGifAnimationUnavailableNotice(imagePath, reason);
                            rendererFacade.setMediaSource(puzzle.srcImage, "gif");
                        });
                    } else {
                        rendererFacade.setMediaSource(puzzle.srcImage, "gif");
                    }
                } else {
                    rendererFacade.setMediaSource(puzzle.srcImage, "image");
                }
            }
            // Do not render immediately from a not-yet-loaded image.
            // Startup/state machine will react to srcImage load event.
            if (puzzle.srcImage.complete && (puzzle.srcImage.naturalWidth | 0) > 0 && (puzzle.srcImage.naturalHeight | 0) > 0) {
                deps.loadImageFunction();
                tryRestoreWebGLIfSourceSafe();
            }
        }

        async function loadVideoFile(file) {
            const url = URL.createObjectURL(file);
            const video = document.createElement("video");
            video.src = url;
            video.muted = true;
            video.loop = true;
            video.autoplay = true;
            video.playsInline = true;
            video.preload = "auto";
            await bindVideoElement(video, { objectUrl: url, kind: "video" });
        }

        async function loadVideoUrl(url) {
            if (typeof url !== "string" || !url) throw new Error("Video URL is required.");

            const createVideoEl = (withCors) => {
                const video = document.createElement("video");
                video.src = url;
                video.muted = true;
                video.loop = true;
                video.autoplay = true;
                video.playsInline = true;
                video.preload = "auto";
                if (withCors) video.crossOrigin = "anonymous";
                return video;
            };

            const crossOriginHttp = isCrossOriginHttpUrl(url);
            if (crossOriginHttp) {
                try {
                    await bindVideoElement(createVideoEl(true), { kind: "video" });
                    return;
                } catch (_e) {
                    // Retry without CORS so playback can continue even if poster extraction is tainted.
                }
            }
            await bindVideoElement(createVideoEl(false), { kind: "video" });
        }

        async function startWebcamSource() {
            const rendererFacade = getRendererFacade();
            if (!rendererFacade || !rendererFacade.setCameraStream) {
                throw new Error("Camera source is not available in current renderer setup.");
            }
            teardownActiveVideoSource();
            if (rendererFacade.media && rendererFacade.media.stop) rendererFacade.media.stop();
            const cameraVideo = await rendererFacade.setCameraStream({ video: true, audio: false });
            const posterDataUrl = await captureVideoPosterDataUrl(cameraVideo);
            setImagePath(posterDataUrl, { preserveVideo: true, skipRendererMediaBind: true });
            const cfg = deps.getRendererConfig();
            if (cfg) cfg.media = "camera";
            rendererFacade.setVideoSource(cameraVideo, "camera");
            tryRestoreWebGLIfSourceSafe();
        }

        async function startLinkCaptureSource(stream) {
            const rendererFacade = getRendererFacade();
            if (!rendererFacade || !rendererFacade.setDisplayStream) {
                throw new Error("Display capture is not available in current renderer setup.");
            }
            teardownActiveVideoSource();
            if (rendererFacade.media && rendererFacade.media.stop) rendererFacade.media.stop();
            const displayVideo = await rendererFacade.setDisplayStream(stream);
            if (!displayVideo) throw new Error("Failed to attach display stream.");
            const posterDataUrl = await captureVideoPosterDataUrl(displayVideo);
            setImagePath(posterDataUrl, { preserveVideo: true, skipRendererMediaBind: true });
            const cfg = deps.getRendererConfig();
            if (cfg) cfg.media = "display";
            rendererFacade.setVideoSource(displayVideo, "display");
            tryRestoreWebGLIfSourceSafe();
        }

        function loadInitialFile() {
            setImagePath(globalScope.defaultImagePath);
        }

        function buildLoadFileHandler() {
            const elFile = document.createElement("input");
            elFile.setAttribute("type", "file");
            elFile.setAttribute("multiple", "multiple");
            elFile.style.display = "none";
            elFile.addEventListener("change", function getFile() {
                if (this.files.length === 0) return;
                const randomIndex = Math.floor(Math.random() * this.files.length);
                const picked = this.files[randomIndex];
                if (picked && typeof picked.type === "string" && picked.type.startsWith("video/")) {
                    loadVideoFile(picked).catch((err) => {
                        console.error("Video load failed", err);
                        alert("Failed to load video file.");
                    });
                    return;
                }
                const reader = new FileReader();
                reader.addEventListener("load", () => {
                    setImagePath(reader.result);
                });
                reader.readAsDataURL(picked);
            });
            return function loadFile() {
                elFile.setAttribute("accept", "image/*,video/*");
                elFile.value = null;
                elFile.click();
            };
        }

        return {
            isGifSource: isGifSource,
            setImagePath: setImagePath,
            loadVideoFile: loadVideoFile,
            loadVideoUrl: loadVideoUrl,
            startWebcamSource: startWebcamSource,
            startLinkCaptureSource: startLinkCaptureSource,
            loadInitialFile: loadInitialFile,
            buildLoadFileHandler: buildLoadFileHandler,
            teardownActiveVideoSource: teardownActiveVideoSource
        };
    }

    globalScope.JigsawMediaBindings = { create: create };
})(window);
