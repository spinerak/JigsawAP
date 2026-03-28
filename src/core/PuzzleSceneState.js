"use strict";

(function initPuzzleSceneState(globalScope) {
    class PuzzleSceneState {
        constructor() {
            this.puzzle = null;
            this.dirtyPieces = new Set();
            this.version = 0;
            this.mediaContentDirty = true;
            this.zOrderDirty = false;
            this._orderedPieces = [];
            this._orderedPiecesVersion = -1;
            this._orderedPiecesLength = 0;
            this._metrics = {
                bindCount: 0,
                markPieceDirtyCalls: 0,
                clearPieceDirtyCalls: 0,
                markAllDirtyCalls: 0,
                markZOrderDirtyCalls: 0,
                clearZOrderDirtyCalls: 0,
                consumeDirtyCalls: 0
            };
        }

        bindPuzzle(puzzle) {
            this.puzzle = puzzle || null;
            this._orderedPieces = [];
            this._orderedPiecesVersion = -1;
            this._orderedPiecesLength = 0;
            this._metrics.bindCount += 1;
            this.markAllDirty();
        }

        markPieceDirty(piece) {
            if (!piece) return;
            this.dirtyPieces.add(piece);
            this._metrics.markPieceDirtyCalls += 1;
            this.version++;
        }

        clearPieceDirty(piece) {
            if (!piece) return;
            this.dirtyPieces.delete(piece);
            this._metrics.clearPieceDirtyCalls += 1;
            this.version++;
        }

        markAllDirty() {
            this.dirtyPieces.clear();
            if (this.puzzle && this.puzzle.polyPieces) {
                for (const pp of this.puzzle.polyPieces) this.dirtyPieces.add(pp);
                this._orderedPiecesLength = this.puzzle.polyPieces.length;
            } else {
                this._orderedPiecesLength = 0;
            }
            this._metrics.markAllDirtyCalls += 1;
            this.version++;
        }

        markZOrderDirty() {
            this.zOrderDirty = true;
            this._orderedPiecesVersion = -1;
            this._metrics.markZOrderDirtyCalls += 1;
            this.version++;
        }

        clearZOrderDirty() {
            this.zOrderDirty = false;
            this._metrics.clearZOrderDirtyCalls += 1;
            this.version++;
        }

        consumeDirtyPieces() {
            this.dirtyPieces.clear();
            this.zOrderDirty = false;
            this._metrics.consumeDirtyCalls += 1;
            this.version++;
        }

        hasDirtyPieces() {
            return this.dirtyPieces.size > 0 || this.zOrderDirty;
        }

        dirtyPieceCount() {
            return this.dirtyPieces.size;
        }

        getMetricsSnapshot() {
            return {
                version: this.version,
                dirtyPieceCount: this.dirtyPieces.size,
                zOrderDirty: !!this.zOrderDirty,
                mediaContentDirty: !!this.mediaContentDirty,
                orderedPiecesVersion: this._orderedPiecesVersion,
                orderedPiecesLength: this._orderedPiecesLength,
                bindCount: this._metrics.bindCount,
                markPieceDirtyCalls: this._metrics.markPieceDirtyCalls,
                clearPieceDirtyCalls: this._metrics.clearPieceDirtyCalls,
                markAllDirtyCalls: this._metrics.markAllDirtyCalls,
                markZOrderDirtyCalls: this._metrics.markZOrderDirtyCalls,
                clearZOrderDirtyCalls: this._metrics.clearZOrderDirtyCalls,
                consumeDirtyCalls: this._metrics.consumeDirtyCalls
            };
        }

        getOrderedPieces(puzzleOverride = null) {
            const puzzle = puzzleOverride || this.puzzle;
            if (!puzzle || !Array.isArray(puzzle.polyPieces) || puzzle.polyPieces.length === 0) {
                this._orderedPieces = [];
                this._orderedPiecesVersion = puzzle ? (puzzle._zOrderVersion || 0) : -1;
                this._orderedPiecesLength = 0;
                return this._orderedPieces;
            }
            const version = puzzle._zOrderVersion || 0;
            const pieces = puzzle.polyPieces;
            const puzzleCacheValid = Array.isArray(puzzle._sortedPolyPiecesByZ)
                && puzzle._sortedPolyPiecesVersion === version
                && puzzle._sortedPolyPiecesByZ.length === pieces.length;
            if (puzzleCacheValid) {
                this._orderedPieces = puzzle._sortedPolyPiecesByZ;
                this._orderedPiecesVersion = version;
                this._orderedPiecesLength = pieces.length;
                return this._orderedPieces;
            }
            if (this._orderedPiecesVersion !== version || this._orderedPiecesLength !== pieces.length) {
                this._orderedPieces = pieces.slice().sort((a, b) => {
                    const za = (a && a._zIndex != null) ? a._zIndex : 0;
                    const zb = (b && b._zIndex != null) ? b._zIndex : 0;
                    return za - zb;
                });
                this._orderedPiecesVersion = version;
                this._orderedPiecesLength = pieces.length;
                puzzle._sortedPolyPiecesByZ = this._orderedPieces;
                puzzle._sortedPolyPiecesVersion = version;
            }
            return this._orderedPieces;
        }
    }

    globalScope.JigsawPuzzleSceneState = PuzzleSceneState;
})(window);
