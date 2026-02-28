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

            const version = puzzle._zOrderVersion || 0;
            const useCache = puzzle._sortedPolyPiecesByZ && puzzle._sortedPolyPiecesVersion === version
                && puzzle._sortedPolyPiecesByZ.length === puzzle.polyPieces.length;
            const sorted = useCache ? puzzle._sortedPolyPiecesByZ : puzzle.polyPieces
                .slice()
                .sort((a, b) => {
                    const za = (a._zIndex != null) ? a._zIndex : (Number(a.polypiece_canvas && a.polypiece_canvas.style.zIndex) || 0);
                    const zb = (b._zIndex != null) ? b._zIndex : (Number(b.polypiece_canvas && b.polypiece_canvas.style.zIndex) || 0);
                    return za - zb;
                });

            const ctx = getSharedHitTestContext();
            for (let k = sorted.length - 1; k >= 0; k--) {
                const pp = sorted[k];
                if (!pp.path) continue;
                const cx = pp.x + pp.nx * puzzle.scalex / 2;
                const cy = pp.y + pp.ny * puzzle.scaley / 2;
                const roxy = rotateVector(eventX - cx, eventY - cy, pp.rot);
                const localX = cx + roxy.x - pp.x;
                const localY = cy + roxy.y - pp.y;
                const hit = pp.polypiece_ctx
                    ? pp.polypiece_ctx.isPointInPath(pp.path, localX, localY)
                    : (ctx && ctx.isPointInPath(pp.path, localX, localY));
                if (hit) return pp;
            }
            return null;
        }
    }

    globalScope.JigsawHitTestService = HitTestService;
})(window);

