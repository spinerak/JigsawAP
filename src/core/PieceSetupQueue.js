"use strict";

(function initPieceSetupQueue(globalScope) {
    function create(deps) {
        const queue = [];
        let batchSize = 18;

        function queuePolyPieceSetup(pp, ignoreRedraw = false, highPriority = false, onDone = null) {
            if (!pp) return;
            if (onDone) {
                if (!pp._setupCallbacks) pp._setupCallbacks = [];
                pp._setupCallbacks.push(onDone);
            }
            if (pp._pendingSetupIgnoreRedraw === undefined) {
                pp._pendingSetupIgnoreRedraw = ignoreRedraw;
            } else {
                pp._pendingSetupIgnoreRedraw = pp._pendingSetupIgnoreRedraw && ignoreRedraw;
            }
            if (pp._setupQueued) return;
            pp._setupQueued = true;
            if (highPriority) queue.unshift(pp);
            else queue.push(pp);
        }

        function processPieceSetupQueue() {
            if (!queue.length) return;
            const perf = (typeof performance !== "undefined" && performance.now) ? performance : null;
            const cfg = deps.getRendererConfig ? deps.getRendererConfig() : null;
            const budgetMs = (cfg && cfg.perfBudgetMs) ? cfg.perfBudgetMs : 8;
            const startedAt = perf ? perf.now() : 0;
            let processed = 0;
            while (queue.length && processed < batchSize) {
                const pp = queue.shift();
                pp._setupQueued = false;
                const ignoreRedraw = pp._pendingSetupIgnoreRedraw === undefined ? false : pp._pendingSetupIgnoreRedraw;
                pp._pendingSetupIgnoreRedraw = undefined;
                try {
                    pp.polypiece_drawImage(ignoreRedraw);
                    const facade = deps.getRendererFacade ? deps.getRendererFacade() : null;
                    if (facade && facade.sceneState) facade.sceneState.markPieceDirty(pp);
                    if (pp._setupCallbacks && pp._setupCallbacks.length) {
                        const callbacks = pp._setupCallbacks;
                        pp._setupCallbacks = [];
                        callbacks.forEach((fn) => {
                            try { fn(); } catch (_e) {}
                        });
                    }
                } catch (_e) {}
                processed++;
                if (perf && (perf.now() - startedAt) >= budgetMs) break;
            }
            if (perf) {
                const elapsed = perf.now() - startedAt;
                if (elapsed > budgetMs * 1.1) {
                    batchSize = Math.max(4, batchSize - 2);
                } else if (elapsed < budgetMs * 0.5 && processed >= batchSize) {
                    batchSize = Math.min(64, batchSize + 2);
                }
                if (globalScope.rendererPerf) {
                    globalScope.rendererPerf.setupQueueLength = queue.length;
                    globalScope.rendererPerf.setupBatchSize = batchSize;
                    globalScope.rendererPerf.setupLastElapsedMs = elapsed;
                }
            }
        }

        function startLoop() {
            (function pieceSetupLoop() {
                requestAnimationFrame(pieceSetupLoop);
                processPieceSetupQueue();
            })();
        }

        return {
            queuePolyPieceSetup: queuePolyPieceSetup,
            processPieceSetupQueue: processPieceSetupQueue,
            startLoop: startLoop
        };
    }

    globalScope.JigsawPieceSetupQueue = { create: create };
})(window);
