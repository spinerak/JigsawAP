"use strict";

(function initPuzzleSceneState(globalScope) {
    class PuzzleSceneState {
        constructor() {
            this.puzzle = null;
            this.dirtyPieces = new Set();
            this.dirtyRects = [];
            this.version = 0;
            this.mediaContentDirty = true;
            this.zOrderDirty = false;
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

        clearPieceDirty(piece) {
            if (!piece) return;
            this.dirtyPieces.delete(piece);
            this.version++;
        }

        markAllDirty() {
            this.dirtyPieces.clear();
            if (this.puzzle && this.puzzle.polyPieces) {
                for (const pp of this.puzzle.polyPieces) this.dirtyPieces.add(pp);
            }
            this.version++;
        }

        markZOrderDirty() {
            this.zOrderDirty = true;
            this.version++;
        }

        consumeDirtyPieces() {
            this.dirtyPieces.clear();
            this.zOrderDirty = false;
            this.version++;
        }

        hasDirtyPieces() {
            return this.dirtyPieces.size > 0 || this.zOrderDirty;
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

