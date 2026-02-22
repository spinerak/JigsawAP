"use strict";

(function initHitTestService(globalScope) {
    class HitTestService {
        findTopPieceAt(puzzle, eventX, eventY) {
            if (!puzzle || !puzzle.polyPieces || !puzzle.polyPieces.length) return null;

            // Preserve existing behavior: highest z-index first.
            const sorted = puzzle.polyPieces
                .slice()
                .sort((a, b) => a.polypiece_canvas.style.zIndex - b.polypiece_canvas.style.zIndex);

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

