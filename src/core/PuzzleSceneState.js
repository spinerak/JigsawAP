"use strict";

(function initPuzzleSceneState(globalScope) {
    class PuzzleSceneState {
        constructor() {
            this.puzzle = null;
            this.dirtyPieces = new Set();
            this.dirtyRects = [];
            this.version = 0;
        }

        bindPuzzle(puzzle) {
            this.puzzle = puzzle || null;
            this.markAllDirty();
        }

        markPieceDirty(piece) {
            if (!piece) return;
            this.dirtyPieces.add(piece);
            this.version++;
        }

        markAllDirty() {
            this.dirtyPieces.clear();
            if (this.puzzle && this.puzzle.polyPieces) {
                for (const pp of this.puzzle.polyPieces) this.dirtyPieces.add(pp);
            }
            this.version++;
        }

        consumeDirtyPieces() {
            const out = Array.from(this.dirtyPieces);
            this.dirtyPieces.clear();
            return out;
        }

        hasDirtyPieces() {
            return this.dirtyPieces.size > 0;
        }

        dirtyPieceCount() {
            return this.dirtyPieces.size;
        }

        addDirtyRect(rect) {
            if (!rect) return;
            this.dirtyRects.push(rect);
            this.version++;
        }

        consumeDirtyRects() {
            const out = this.dirtyRects.slice();
            this.dirtyRects.length = 0;
            return out;
        }
    }

    globalScope.JigsawPuzzleSceneState = PuzzleSceneState;
})(window);

