"use strict";

(function initHitTestService(globalScope) {
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

            for (let k = sorted.length - 1; k >= 0; k--) {
                const pp = sorted[k];
                if (!pp.path || !pp.polypiece_ctx) continue;
                const cx = pp.x + pp.nx * puzzle.scalex / 2;
                const cy = pp.y + pp.ny * puzzle.scaley / 2;
                const roxy = rotateVector(eventX - cx, eventY - cy, pp.rot);
                if (pp.polypiece_ctx.isPointInPath(pp.path, cx + roxy.x - pp.x, cy + roxy.y - pp.y)) {
                    return pp;
                }
            }
            return null;
        }
    }

    globalScope.JigsawHitTestService = HitTestService;
})(window);

