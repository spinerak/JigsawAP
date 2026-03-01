"use strict";

(function initHitTestService(globalScope) {
    let sharedHitTestCanvas = null;
    let sharedHitTestCtx = null;

    function getSharedHitTestContext() {
        if (!sharedHitTestCtx) {
            sharedHitTestCanvas = typeof document !== "undefined" && document.createElement("canvas");
            if (sharedHitTestCanvas) {
                sharedHitTestCanvas.width = 1;
                sharedHitTestCanvas.height = 1;
                sharedHitTestCtx = sharedHitTestCanvas.getContext("2d");
            }
        }
        return sharedHitTestCtx;
    }

    class HitTestService {
        findTopPieceAt(puzzle, eventX, eventY) {
            if (!puzzle || !puzzle.polyPieces || !puzzle.polyPieces.length) return null;
            const perf = globalScope && globalScope.jigsawPerf;
            const startedAt = (perf && typeof perf.nowMs === "function")
                ? perf.nowMs()
                : ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now());
            let tested = 0;

            const version = puzzle._zOrderVersion || 0;
            const useCache = puzzle._sortedPolyPiecesByZ && puzzle._sortedPolyPiecesVersion === version
                && puzzle._sortedPolyPiecesByZ.length === puzzle.polyPieces.length;
            const sorted = useCache ? puzzle._sortedPolyPiecesByZ : puzzle.polyPieces
                .slice()
                .sort((a, b) => {
                    const za = (a._zIndex != null) ? a._zIndex : 0;
                    const zb = (b._zIndex != null) ? b._zIndex : 0;
                    return za - zb;
                });

            const ctx = getSharedHitTestContext();
            for (let k = sorted.length - 1; k >= 0; k--) {
                const pp = sorted[k];
                if (!pp.path) continue;
                const w = pp.nx * puzzle.scalex;
                const h = pp.ny * puzzle.scaley;
                if (w <= 0 || h <= 0) continue;
                const cx = pp.x + w / 2;
                const cy = pp.y + h / 2;
                const dx = eventX - cx;
                const dy = eventY - cy;
                const halfDiag = Math.sqrt(w * w + h * h) * 0.5;
                if ((dx * dx + dy * dy) > (halfDiag * halfDiag)) continue;
                const deg = (globalScope.rotations === 180 ? 90 : globalScope.rotations) || 0;
                const angle = (pp.rot || 0) * deg * Math.PI / 180;
                let hw = w / 2;
                let hh = h / 2;
                if (angle !== 0) {
                    const ac = Math.abs(Math.cos(angle));
                    const as = Math.abs(Math.sin(angle));
                    const aw = hw * ac + hh * as;
                    const ah = hw * as + hh * ac;
                    hw = aw;
                    hh = ah;
                }
                if (Math.abs(dx) > hw || Math.abs(dy) > hh) continue;
                tested++;
                const c = Math.cos(angle);
                const s = Math.sin(angle);
                const localDx = dx * c + dy * s;
                const localDy = -dx * s + dy * c;
                const localX = w / 2 + localDx;
                const localY = h / 2 + localDy;
                const hit = ctx && ctx.isPointInPath(pp.path, localX, localY);
                if (hit) {
                    if (perf && typeof perf.recordHitTest === "function") {
                        const endedAt = (typeof perf.nowMs === "function")
                            ? perf.nowMs()
                            : ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now());
                        perf.recordHitTest(Math.max(0, endedAt - startedAt), tested, true);
                    }
                    return pp;
                }
            }
            if (perf && typeof perf.recordHitTest === "function") {
                const endedAt = (typeof perf.nowMs === "function")
                    ? perf.nowMs()
                    : ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now());
                perf.recordHitTest(Math.max(0, endedAt - startedAt), tested, false);
            }
            return null;
        }
    }

    globalScope.JigsawHitTestService = HitTestService;
})(window);

