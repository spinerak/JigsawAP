"use strict";

(function initMediaBindings(globalScope) {
    function create(deps) {
        let activeCustomVideoEl = null;
        let activeCustomVideoUrl = null;
        let mediaBindToken = 0;

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

        function isGifSource(src) {
            return typeof src === "string" && (
                src.startsWith("data:image/gif") || /\.gif(\?|#|$)/i.test(src)
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

        function setImagePath(path, options = {}) {
            const puzzle = getPuzzle();
            if (!puzzle) return;
            mediaBindToken++;
            const bindToken = mediaBindToken;
            const rendererFacade = getRendererFacade();

            if (!options.preserveVideo) {
                teardownActiveVideoSource();
                if (rendererFacade && rendererFacade.media && rendererFacade.media.stop) rendererFacade.media.stop();
            }

            deps.setImagePath(path);
            const imagePath = deps.getImagePath();
            ensureSynchronizedPreviewSurface();
            puzzle.isGif = isGifSource(imagePath);
            puzzle.imageLoaded = false;
            puzzle._webglStartBlockedReason = "";
            const cfg = deps.getRendererConfig();
            if (cfg) cfg.media = puzzle.isGif ? "gif" : "image";

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
                };
                puzzle.srcImage.addEventListener("error", fallbackOnError, { once: true });
            }

            puzzle.srcImage.src = imagePath;

            if (rendererFacade && !options.skipRendererMediaBind) {
                if (puzzle.isGif) {
                    if (rendererFacade.setGifSource) {
                        rendererFacade.setGifSource(imagePath, puzzle.srcImage).then((ok) => {
                            if (bindToken !== mediaBindToken) return;
                            if (!ok) rendererFacade.setMediaSource(puzzle.srcImage, "gif");
                        }).catch(() => {
                            if (bindToken !== mediaBindToken) return;
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
            }
        }

        async function loadVideoFile(file) {
            teardownActiveVideoSource();
            const rendererFacade = getRendererFacade();
            if (rendererFacade && rendererFacade.media && rendererFacade.media.stop) rendererFacade.media.stop();
            const url = URL.createObjectURL(file);
            const video = document.createElement("video");
            video.src = url;
            video.muted = true;
            video.loop = true;
            video.autoplay = true;
            video.playsInline = true;
            video.preload = "auto";

            const posterDataUrl = await captureVideoPosterDataUrl(video);
            activeCustomVideoEl = video;
            activeCustomVideoUrl = url;
            setImagePath(posterDataUrl, { preserveVideo: true, skipRendererMediaBind: true });
            try { await video.play(); } catch (_e) {}
            const cfg = deps.getRendererConfig();
            if (cfg) cfg.media = "video";
            if (rendererFacade) rendererFacade.setVideoSource(video, "video");
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
            startWebcamSource: startWebcamSource,
            loadInitialFile: loadInitialFile,
            buildLoadFileHandler: buildLoadFileHandler,
            teardownActiveVideoSource: teardownActiveVideoSource
        };
    }

    globalScope.JigsawMediaBindings = { create: create };
})(window);
