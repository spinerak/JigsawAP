"use strict";

(function initPieceSetupQueue(globalScope) {
    function create(deps) {
        const queue = [];
        let batchSize = 18;
        let totalProcessed = 0;
        let flushCount = 0;

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

        function processPieceSetupQueue(options = null) {
            if (!queue.length) return 0;
            const flushAll = options === true || !!(options && options.flushAll === true);
            const perf = (typeof performance !== "undefined" && performance.now) ? performance : null;
            const cfg = deps.getRendererConfig ? deps.getRendererConfig() : null;
            const budgetMs = (cfg && cfg.perfBudgetMs) ? cfg.perfBudgetMs : 8;
            const startedAt = perf ? perf.now() : 0;
            let processed = 0;
            while (queue.length && (flushAll || processed < batchSize)) {
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
                if (!flushAll && perf && (perf.now() - startedAt) >= budgetMs) break;
            }
            if (perf) {
                const elapsed = perf.now() - startedAt;
                if (!flushAll) {
                    if (elapsed > budgetMs * 1.1) {
                        batchSize = Math.max(4, batchSize - 2);
                    } else if (elapsed < budgetMs * 0.5 && processed >= batchSize) {
                        batchSize = Math.min(64, batchSize + 2);
                    }
                }
                totalProcessed += processed;
                if (flushAll) flushCount += 1;
                if (globalScope.rendererPerf) {
                    globalScope.rendererPerf.setupQueueLength = queue.length;
                    globalScope.rendererPerf.setupBatchSize = batchSize;
                    globalScope.rendererPerf.setupLastElapsedMs = elapsed;
                    globalScope.rendererPerf.setupLastProcessed = processed;
                    globalScope.rendererPerf.setupTotalProcessed = totalProcessed;
                    globalScope.rendererPerf.setupFlushCount = flushCount;
                }
            }
            return processed;
        }

        function flushAllPieceSetup() {
            let processedTotal = 0;
            let safety = 0;
            while (queue.length && safety < 100000) {
                const processed = processPieceSetupQueue({ flushAll: true });
                processedTotal += processed;
                safety++;
                if (processed <= 0) break;
            }
            return processedTotal;
        }

        function hasPendingSetup() {
            return queue.length > 0;
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
            flushAllPieceSetup: flushAllPieceSetup,
            hasPendingSetup: hasPendingSetup,
            startLoop: startLoop
        };
    }

    globalScope.JigsawPieceSetupQueue = { create: create };
})(window);
