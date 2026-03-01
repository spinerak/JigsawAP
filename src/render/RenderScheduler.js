"use strict";

(function initRenderScheduler(globalScope) {
    class RenderScheduler {
        constructor({ targetFrameMs = 1000 / 30, maxRenderMs = 8 } = {}) {
            this.targetFrameMs = targetFrameMs;
            this.maxRenderMs = maxRenderMs;
            this.lastFrameAt = 0;
            this.enabled = true;
        }

        shouldRender(nowMs) {
            if (!this.enabled) return false;
            if (this.lastFrameAt === 0) {
                this.lastFrameAt = nowMs;
                return true;
            }
            if (nowMs - this.lastFrameAt >= this.targetFrameMs) {
                this.lastFrameAt = nowMs;
                return true;
            }
            return false;
        }
    }

    globalScope.JigsawRenderScheduler = RenderScheduler;
})(window);

