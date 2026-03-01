"use strict";

window.pieceSides = 4;
const corner_to_shape_dist = 1/3; // distance from corner to shape in hexagonal piece

window.downsize_to_fit = 1;
window.PUZZLE_AREA_SURFACE_MULTIPLIER = 0.75;
window.show_clue = true;
window.rotations = 0;
window.zero_list = [0,0];
window.rendererConfig = {
    mode: "auto", // canvas2d | webgl | auto
    media: "image", // image | gif | video | camera
    autoFallback: true,
    perfBudgetMs: 8
};

var accept_pending_actions = false;
var process_pending_actions = false;
window.jigsawRuntime = window.jigsawRuntime || {};
Object.defineProperty(window.jigsawRuntime, "acceptPendingActions", {
    get: () => accept_pending_actions,
    set: (value) => { accept_pending_actions = !!value; }
});
Object.defineProperty(window.jigsawRuntime, "processPendingActions", {
    get: () => process_pending_actions,
    set: (value) => { process_pending_actions = !!value; }
});

window.jigsawPerf = window.jigsawPerf || (function initJigsawPerfMonitor() {
    let enabled = true;
    let reporterTimer = null;

    function nowMs() {
        return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    }

    function buildTimingBucket() {
        return { count: 0, totalMs: 0, maxMs: 0, lastMs: 0 };
    }

    const stats = {
        frame: buildTimingBucket(),
        render: buildTimingBucket(),
        setupQueue: buildTimingBucket(),
        eventDispatch: buildTimingBucket(),
        queueDelay: buildTimingBucket(),
        dragMove: buildTimingBucket(),
        hitTest: { count: 0, totalMs: 0, maxMs: 0, hitCount: 0, totalCandidates: 0, maxCandidates: 0 },
        pickup: {
            attempts: 0,
            totalAcquireMs: 0,
            maxAcquireMs: 0,
            successful: 0,
            firstMoveSamples: 0,
            firstMoveLagTotalMs: 0,
            firstMoveLagMaxMs: 0,
            pendingStartMs: 0,
            awaitingFirstMove: false
        },
        queue: {
            maxDepth: 0,
            lastDepth: 0
        }
    };

    function resetBucket(bucket) {
        bucket.count = 0;
        bucket.totalMs = 0;
        bucket.maxMs = 0;
        bucket.lastMs = 0;
    }

    function reset() {
        resetBucket(stats.frame);
        resetBucket(stats.render);
        resetBucket(stats.setupQueue);
        resetBucket(stats.eventDispatch);
        resetBucket(stats.queueDelay);
        resetBucket(stats.dragMove);
        stats.hitTest = { count: 0, totalMs: 0, maxMs: 0, hitCount: 0, totalCandidates: 0, maxCandidates: 0 };
        stats.pickup = {
            attempts: 0,
            totalAcquireMs: 0,
            maxAcquireMs: 0,
            successful: 0,
            firstMoveSamples: 0,
            firstMoveLagTotalMs: 0,
            firstMoveLagMaxMs: 0,
            pendingStartMs: 0,
            awaitingFirstMove: false
        };
        stats.queue = { maxDepth: 0, lastDepth: 0 };
    }

    function recordBucket(bucket, ms) {
        if (!enabled) return;
        if (!Number.isFinite(ms) || ms < 0) return;
        bucket.count += 1;
        bucket.totalMs += ms;
        bucket.lastMs = ms;
        if (ms > bucket.maxMs) bucket.maxMs = ms;
    }

    function avg(total, count) {
        return count > 0 ? total / count : 0;
    }

    function snapshot() {
        const rendererPerf = (typeof window !== "undefined" && window.rendererPerf) ? window.rendererPerf : null;
        return {
            enabled,
            frame: {
                count: stats.frame.count,
                avgMs: avg(stats.frame.totalMs, stats.frame.count),
                maxMs: stats.frame.maxMs,
                lastMs: stats.frame.lastMs
            },
            render: {
                count: stats.render.count,
                avgMs: avg(stats.render.totalMs, stats.render.count),
                maxMs: stats.render.maxMs,
                lastMs: stats.render.lastMs
            },
            setupQueue: {
                count: stats.setupQueue.count,
                avgMs: avg(stats.setupQueue.totalMs, stats.setupQueue.count),
                maxMs: stats.setupQueue.maxMs,
                lastMs: stats.setupQueue.lastMs
            },
            queue: {
                lastDepth: stats.queue.lastDepth,
                maxDepth: stats.queue.maxDepth,
                eventDelayAvgMs: avg(stats.queueDelay.totalMs, stats.queueDelay.count),
                eventDelayMaxMs: stats.queueDelay.maxMs,
                eventDelaySamples: stats.queueDelay.count
            },
            eventDispatch: {
                count: stats.eventDispatch.count,
                avgMs: avg(stats.eventDispatch.totalMs, stats.eventDispatch.count),
                maxMs: stats.eventDispatch.maxMs,
                lastMs: stats.eventDispatch.lastMs
            },
            hitTest: {
                count: stats.hitTest.count,
                avgMs: avg(stats.hitTest.totalMs, stats.hitTest.count),
                maxMs: stats.hitTest.maxMs,
                hitCount: stats.hitTest.hitCount,
                avgCandidates: avg(stats.hitTest.totalCandidates, stats.hitTest.count),
                maxCandidates: stats.hitTest.maxCandidates
            },
            pickup: {
                attempts: stats.pickup.attempts,
                successful: stats.pickup.successful,
                acquireAvgMs: avg(stats.pickup.totalAcquireMs, stats.pickup.attempts),
                acquireMaxMs: stats.pickup.maxAcquireMs,
                firstMoveLagAvgMs: avg(stats.pickup.firstMoveLagTotalMs, stats.pickup.firstMoveSamples),
                firstMoveLagMaxMs: stats.pickup.firstMoveLagMaxMs,
                firstMoveLagSamples: stats.pickup.firstMoveSamples
            },
            dragMove: {
                count: stats.dragMove.count,
                avgMs: avg(stats.dragMove.totalMs, stats.dragMove.count),
                maxMs: stats.dragMove.maxMs,
                lastMs: stats.dragMove.lastMs
            },
            rendererPerf
        };
    }

    function printSnapshot() {
        const snap = snapshot();
        if (typeof console !== "undefined" && console.log) {
            console.log("[jigsawPerf] snapshot", snap);
        }
        return snap;
    }

    function stopConsoleReporter() {
        if (reporterTimer) {
            clearInterval(reporterTimer);
            reporterTimer = null;
        }
    }

    function startConsoleReporter(intervalMs = 1000) {
        stopConsoleReporter();
        reporterTimer = setInterval(() => {
            printSnapshot();
        }, Math.max(250, intervalMs | 0));
    }

    return {
        nowMs,
        reset,
        setEnabled(value) {
            enabled = !!value;
            return enabled;
        },
        isEnabled() {
            return enabled;
        },
        recordFrame(ms) {
            recordBucket(stats.frame, ms);
        },
        recordRender(ms) {
            recordBucket(stats.render, ms);
        },
        recordSetupQueue(ms) {
            recordBucket(stats.setupQueue, ms);
        },
        recordEventDispatch(ms) {
            recordBucket(stats.eventDispatch, ms);
        },
        recordQueueDelay(ms) {
            recordBucket(stats.queueDelay, ms);
        },
        markQueueDepth(depth) {
            if (!enabled) return;
            if (!Number.isFinite(depth)) return;
            const d = depth | 0;
            stats.queue.lastDepth = d;
            if (d > stats.queue.maxDepth) stats.queue.maxDepth = d;
        },
        recordDragMove(ms) {
            recordBucket(stats.dragMove, ms);
        },
        recordHitTest(ms, candidates, hit) {
            if (!enabled) return;
            if (Number.isFinite(ms) && ms >= 0) {
                stats.hitTest.count += 1;
                stats.hitTest.totalMs += ms;
                if (ms > stats.hitTest.maxMs) stats.hitTest.maxMs = ms;
            }
            if (Number.isFinite(candidates) && candidates >= 0) {
                stats.hitTest.totalCandidates += candidates;
                if (candidates > stats.hitTest.maxCandidates) stats.hitTest.maxCandidates = candidates;
            }
            if (hit) stats.hitTest.hitCount += 1;
        },
        recordPickupAcquire(ms, found) {
            if (!enabled) return;
            if (!Number.isFinite(ms) || ms < 0) return;
            stats.pickup.attempts += 1;
            stats.pickup.totalAcquireMs += ms;
            if (ms > stats.pickup.maxAcquireMs) stats.pickup.maxAcquireMs = ms;
            if (found) stats.pickup.successful += 1;
        },
        beginPickup(now = nowMs()) {
            if (!enabled) return;
            stats.pickup.pendingStartMs = now;
            stats.pickup.awaitingFirstMove = true;
        },
        recordFirstMove(now = nowMs()) {
            if (!enabled) return;
            if (!stats.pickup.awaitingFirstMove) return;
            const lag = Math.max(0, now - (stats.pickup.pendingStartMs || now));
            stats.pickup.awaitingFirstMove = false;
            stats.pickup.pendingStartMs = 0;
            stats.pickup.firstMoveSamples += 1;
            stats.pickup.firstMoveLagTotalMs += lag;
            if (lag > stats.pickup.firstMoveLagMaxMs) stats.pickup.firstMoveLagMaxMs = lag;
        },
        cancelPendingPickup() {
            stats.pickup.awaitingFirstMove = false;
            stats.pickup.pendingStartMs = 0;
        },
        snapshot,
        printSnapshot,
        startConsoleReporter,
        stopConsoleReporter
    };
})();
window.jigsawRuntime.perf = window.jigsawPerf;

var bevel_size = localStorage.getItem("option_bevel_2");
if (bevel_size === null) bevel_size = 0.1;

/** Fisher-Yates in-place shuffle for uniform random order. */
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
    }
}

// View/cosmetic control wiring is initialized later by src/ui/ViewControls.js.

const viewState = {
    enableZoom: true,
    enablePan: true,
    enableScaling: true,
    zoom: 1,
    panX: 0,
    panY: 0,
    minZoom: 0.05,
    maxZoom: 24,
    zoomStep: 1.2,
    zoomSensitivity: 1,
    panSensitivity: 1,
    panButton: 2,
    fitScaleLocked: null,
    isScalingLocked: false,
    puzzleResolution: "1080p",
    videoFrameIntervalMs: 33,
    showGrayscaleReference: false,
    showPreviewOutline: false,
    useCustomDropLocation: false,
    customDropNormX: 0.1,
    customDropNormY: 0.1,
    dropLocationColor: "#FC8"
};
try {
    const storedDrop = localStorage.getItem("useCustomDropLocation");
    if (storedDrop === "true") viewState.useCustomDropLocation = true;
} catch (_e) {}
try {
    const storedRef = localStorage.getItem("showGrayscaleReference");
    if (storedRef === "true") viewState.showGrayscaleReference = true;
} catch (_e) {}
try {
    const storedOutline = localStorage.getItem("showPreviewOutline");
    if (storedOutline === "true") viewState.showPreviewOutline = true;
} catch (_e) {}
try {
    const stored = localStorage.getItem("puzzleResolution");
    if (stored === "16k" || stored === "8k" || stored === "4k" || stored === "1440p" || stored === "1080p" || stored === "720p" || stored === "540p") {
        viewState.puzzleResolution = stored;
    }
} catch (_e) {}
try {
    const storedVideoFps = localStorage.getItem("videoFrameIntervalMs");
    if (storedVideoFps !== null && storedVideoFps !== "") {
        const ms = parseInt(storedVideoFps, 10);
        if (!isNaN(ms) && ms >= 0) viewState.videoFrameIntervalMs = (ms <= 0 || ms < 33) ? 33 : ms;
    }
} catch (_e) {}
try {
    const storedColor = localStorage.getItem("dropLocationColor");
    if (storedColor && /^#[0-9A-Fa-f]{3}$/.test(storedColor)) viewState.dropLocationColor = storedColor;
} catch (_e) {}
try {
    const savedZoom = localStorage.getItem("viewEnableZoom");
    if (savedZoom !== null) viewState.enableZoom = savedZoom === "true";
} catch (_e) {}
try {
    const savedPan = localStorage.getItem("viewEnablePan");
    if (savedPan !== null) viewState.enablePan = savedPan === "true";
} catch (_e) {}
try {
    const savedScaling = localStorage.getItem("viewEnableScaling");
    if (savedScaling !== null) viewState.enableScaling = savedScaling === "true";
} catch (_e) {}
try {
    const savedPanBtn = localStorage.getItem("viewPanButton");
    if (savedPanBtn !== null) {
        const pb = parseInt(savedPanBtn, 10);
        if (!isNaN(pb) && pb >= 0 && pb <= 2) viewState.panButton = pb;
    }
} catch (_e) {}
try {
    const savedZoomSen = localStorage.getItem("viewZoomSensitivity");
    if (savedZoomSen !== null) {
        const zs = parseFloat(savedZoomSen);
        if (!isNaN(zs)) viewState.zoomSensitivity = Math.max(0.2, Math.min(3, zs));
    }
} catch (_e) {}
try {
    const savedPanSen = localStorage.getItem("viewPanSensitivity");
    if (savedPanSen !== null) {
        const ps = parseFloat(savedPanSen);
        if (!isNaN(ps)) viewState.panSensitivity = Math.max(0.2, Math.min(3, ps));
    }
} catch (_e) {}
window.viewState = viewState;

const displayPrefs = {
    backgroundColor: "#DD9",
    feltOpacity: 0.5,
    playAreaRadius: 64,
    heldPieceShadowDarkness: 0.35
};
try {
    const bg = localStorage.getItem("backgroundColor");
    if (bg !== null && typeof bg === "string" && bg.length >= 4) displayPrefs.backgroundColor = bg;
} catch (_e) {}
try {
    const felt = localStorage.getItem("feltOpacity");
    if (felt !== null) {
        const v = parseFloat(felt);
        if (!isNaN(v)) displayPrefs.feltOpacity = Math.max(0, Math.min(1, v));
    }
} catch (_e) {}
try {
    const radius = localStorage.getItem("playAreaRadius");
    if (radius !== null) {
        const v = parseInt(radius, 10);
        if (!isNaN(v)) displayPrefs.playAreaRadius = Math.max(8, Math.min(256, v));
    }
} catch (_e) {}
try {
    const shadow = localStorage.getItem("heldPieceShadowDarkness");
    if (shadow !== null) {
        const v = parseFloat(shadow);
        if (!isNaN(v)) displayPrefs.heldPieceShadowDarkness = Math.max(0, Math.min(1, v));
    }
} catch (_e) {}
window.displayPrefs = displayPrefs;

function applyDisplayPreferences(container) {
    if (!container) return;
    container.style.backgroundColor = displayPrefs.backgroundColor;
    container.style.setProperty("--felt-opacity", String(displayPrefs.feltOpacity));
    container.style.setProperty("--play-area-radius", displayPrefs.playAreaRadius + "px");
    container.style.setProperty("--held-piece-shadow-darkness", String(displayPrefs.heldPieceShadowDarkness));
}
window.applyDisplayPreferences = applyDisplayPreferences;

function getPuzzleResolution() {
    return viewState.puzzleResolution || "1080p";
}

const MIN_RESIZE_WIDTH = 100;
const MIN_RESIZE_HEIGHT = 100;
const MAX_RESIZE_RETRIES = 20;

function maybeOnResize(puzzle, facade, retryCount) {
    if (!puzzle || !facade) return;
    puzzle.getContainerSize();
    const w = puzzle.contWidth;
    const h = puzzle.contHeight;
    if (typeof w === "number" && typeof h === "number" && w >= MIN_RESIZE_WIDTH && h >= MIN_RESIZE_HEIGHT) {
        facade.onResize(w, h);
        return;
    }
    const count = typeof retryCount === "number" ? retryCount : 0;
    if (count < MAX_RESIZE_RETRIES) {
        requestAnimationFrame(() => maybeOnResize(puzzle, facade, count + 1));
    }
}

function getDropPositionPixels(puz, scatterFraction) {
    if (!puz) return { x: 0, y: 0 };
    const w = puz.contWidth || 1;
    const h = puz.contHeight || 1;
    const nx = viewState.customDropNormX != null ? viewState.customDropNormX : 0.1;
    const ny = viewState.customDropNormY != null ? viewState.customDropNormY : 0.1;
    let cx = nx * w;
    let cy = ny * h;
    if (scatterFraction && scatterFraction > 0) {
        const s = Math.min(scatterFraction * w, scatterFraction * h, w * 0.1, h * 0.1);
        cx += (Math.random() * 2 - 1) * s;
        cy += (Math.random() * 2 - 1) * s;
    }
    return { x: cx, y: cy };
}

const VIEW_DEBUG = false;
function touchDistance(touches) {
    return Math.hypot(touches[1].clientX - touches[0].clientX, touches[1].clientY - touches[0].clientY);
}
function touchMidpoint(touches) {
    return { x: (touches[0].clientX + touches[1].clientX) / 2, y: (touches[0].clientY + touches[1].clientY) / 2 };
}


window.save_loaded = false;
window.ignore_bounce_pieces = [];

function getPolyPieceSyncId(pp) {
    if (!pp) return null;
    if (typeof pp.syncId === "number" && Number.isFinite(pp.syncId)) return pp.syncId;
    // Compatibility fallback: older paths may still expect first-piece identity.
    if (pp.pieces && pp.pieces[0] && typeof pp.pieces[0].index === "number") return pp.pieces[0].index;
    return null;
}

function addIgnoreBouncePiece(index, durationMs = 1000) {
    if (typeof index !== "number" || !Number.isFinite(index)) return;
    if (!window.ignore_bounce_pieces.includes(index)) window.ignore_bounce_pieces.push(index);
    setTimeout(() => {
        const found = window.ignore_bounce_pieces.indexOf(index);
        if (found !== -1) window.ignore_bounce_pieces.splice(found, 1);
    }, durationMs);
}

var puzzle;
var rendererFacade = null;
var hitTestService = null;

let seed = 1;

function random() {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function randomIn(inputNumber) {
    return Math.abs(Math.sin(inputNumber * inputNumber));
}

function setRandomSeed(newSeed) {
    if (typeof newSeed === 'number') {
        seed = newSeed;
    }
}

const mhypot = Math.hypot,
    mrandom = random,
    mmax = Math.max,
    mmin = Math.min,
    mround = Math.round,
    mfloor = Math.floor,
    msqrt = Math.sqrt,
    mabs = Math.abs;
//-----------------------------------------------------------------------------

function clamp(value, min, max) {
    return mmin(max, mmax(min, value));
}

function getResponsiveBaseScale() {
    const cssScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale-factor'));
    if (!Number.isFinite(cssScale) || cssScale <= 0) return 1;
    return 1 / cssScale;
}

function getActiveBaseScale() {
    if (!viewState.enableScaling && viewState.fitScaleLocked) {
        return viewState.fitScaleLocked;
    }
    return getResponsiveBaseScale();
}

function getBaseScaleMultiplier() {
    const activeBase = getActiveBaseScale();
    if (activeBase === 0) return 1;
    return 1 / activeBase;
}

function getEffectivePuzzleAreaAspectRatio(srcImage) {
    // Workspace aspect ratio: use puzzle image aspect only when "Picture" is selected;
    // otherwise use a fixed aspect ratio. This does not change the puzzle's own aspect ratio.
    const scale = window.puzzleAreaScale || "Landscape";
    if (scale === "Picture") {
        if (window.useCanonicalAspectForLayout && window.canonicalPictureAspectRatio != null && Number.isFinite(window.canonicalPictureAspectRatio)) {
            return window.canonicalPictureAspectRatio;
        }
        if (srcImage) {
            const nw = (srcImage.naturalWidth | 0) || (srcImage.videoWidth | 0) || (srcImage.width | 0);
            const nh = (srcImage.naturalHeight | 0) || (srcImage.videoHeight | 0) || (srcImage.height | 0);
            if (nw > 0 && nh > 0) return nw / nh;
        }
        return 16 / 9;
    }
    switch (scale) {
        case "Portrait": return 9 / 16;
        case "Square": return 1;
        case "Landscape":
        default: return 16 / 9;
    }
}

function getZoomedViewScaleMultiplier() {
    return getBaseScaleMultiplier() * viewState.zoom;
}

function getEffectiveZoomStep() {
    return 1 + (viewState.zoomStep - 1) * viewState.zoomSensitivity;
}

function syncLegacyViewGlobals() {
    window.scaleFactor = 1 / getActiveBaseScale();
    window.additional_zoom = viewState.zoom;
}

function alea(min, max) {
    // random number [min..max[ . If no max is provided, [0..min[

    if (typeof max == 'undefined') return min * mrandom();
    return min + (max - min) * mrandom();
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function intAlea(min, max) {
    // random integer number [min..max[ . If no max is provided, [0..min[

    if (typeof max == 'undefined') {
    max = min; min = 0;
    }
    return mfloor(min + (max - min) * mrandom());
} // intAlea

//-----------------------------------------------------------------------------

// Point - - - - - - - - - - - - - - - - - - - -
class Point {
    constructor(x, y) {
    this.x = Number(x);
    this.y = Number(y);
    } // constructor
    copy() {
    return new Point(this.x, this.y);
    }

    distance(otherPoint) {
    return mhypot(this.x - otherPoint.x, this.y - otherPoint.y);
    }
} // class Point

// Segment - - - - - - - - - - - - - - - - - - - -
// those segments are oriented
class Segment {
    constructor(p1, p2) {
    this.p1 = new Point(p1.x, p1.y);
    this.p2 = new Point(p2.x, p2.y);
    }
    dx() {
    return this.p2.x - this.p1.x;
    }
    dy() {
    return this.p2.y - this.p1.y;
    }
    length() {
    return mhypot(this.dx(), this.dy());
    }

    // returns a point at a given distance of p1, positive direction beeing towards p2

    pointOnRelative(coeff) {
    // attention if segment length can be 0
    let dx = this.dx();
    let dy = this.dy();
    return new Point(this.p1.x + coeff * dx, this.p1.y + coeff * dy);
    }
} // class Segment
//-----------------------------------------------------------------------------
// one side of a piece
class Side {
    constructor() {
    this.type = ""; // "d" pour straight line or "z" pour classic
    this.points = []; // real points or Bezier curve points
    // this.scaledPoints will be added when we know the scale
    } // Side

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    reversed() {
    // returns a new Side, copy of current one but reversed
    const ns = new Side();
    ns.type = this.type;
    ns.points = this.points.slice().reverse();
    return ns;
    } // Side.reversed

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    side_scale(puzzle) {
        /* uses actual dimensions of puzzle to compute actual side points
        these points are not shifted by the piece position : the top left corner is at (0,0)
        */
        const coefx = puzzle.scalex;
        const coefy = puzzle.scaley;
        
        this.scaledPoints = this.points.map(p => new Point(p.x * coefx, p.y * coefy));
    } //

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    /*
    draws the path corresponding to a side
    Parameters :
    ctx : canvas context
    shiftx, shifty : position shift (used to create emboss effect)
    withoutMoveTo : to decide whether to do a moveTo to the first point. Without MoveTo
    must be done only for the first side of a piece, not for the following ones
    */

    drawPath(ctx, shiftx, shifty, withoutMoveTo) {

        if (!withoutMoveTo) {
            ctx.moveTo(this.scaledPoints[0].x + shiftx, this.scaledPoints[0].y + shifty);
        }
        if (this.type == "d") {
            ctx.lineTo(this.scaledPoints[1].x + shiftx, this.scaledPoints[1].y + shifty);
        } else { // edge zigzag
            for (let k = 1; k < this.scaledPoints.length - 1; k += 3) {
                ctx.bezierCurveTo(this.scaledPoints[k].x + shiftx, this.scaledPoints[k].y + shifty,
                    this.scaledPoints[k + 1].x + shiftx, this.scaledPoints[k + 1].y + shifty,
                    this.scaledPoints[k + 2].x + shiftx, this.scaledPoints[k + 2].y + shifty);
            } // for k
        } // if jigsaw side

    } // Side.drawPath
} // class Side

//-----------------------------------------------------------------------------
/* modifies a side
    changes it from a straight line (type "d") to a complex one (type "z")
    The change is done towards the opposite side (side between corners ca and cb)
*/

function twist0(side, ca, cb, howFar = 1) {

    const seg0 = new Segment(side.points[0], side.points[1]);
    const dxh = seg0.dx();
    const dyh = seg0.dy();

    let seg1 = new Segment(ca, cb);
    if(howFar < 1){
        seg1 = new Segment(new Point(howFar * ca.x + (1-howFar) * side.points[0].x, howFar * ca.y + (1-howFar) * side.points[0].y), 
            new Point(howFar * cb.x + (1-howFar) * side.points[1].x, howFar * cb.y + (1-howFar) * side.points[1].y));
    }
    const mid0 = seg0.pointOnRelative(0.5);
    const mid1 = seg1.pointOnRelative(0.5);

    const segMid = new Segment(mid0, mid1);
    const dxv = segMid.dx();
    const dyv = segMid.dy();

    const scalex = alea(0.8, 1);
    const scaley = alea(0.9, 1);
    const mid = alea(0.45, 0.55);

    const pa = pointAt(mid - 1 / 12 * scalex, 1 / 12 * scaley);
    const pb = pointAt(mid - 2 / 12 * scalex, 3 / 12 * scaley);
    const pc = pointAt(mid, 4 / 12 * scaley);
    const pd = pointAt(mid + 2 / 12 * scalex, 3 / 12 * scaley);
    const pe = pointAt(mid + 1 / 12 * scalex, 1 / 12 * scaley);

    side.points = [seg0.p1,
    new Point(seg0.p1.x + 5 / 12 * dxh * 0.52,
    seg0.p1.y + 5 / 12 * dyh * 0.52),
    new Point(pa.x - 1 / 12 * dxv * 0.72,
    pa.y - 1 / 12 * dyv * 0.72),
    pa,
    new Point(pa.x + 1 / 12 * dxv * 0.72,
    pa.y + 1 / 12 * dyv * 0.72),

    new Point(pb.x - 1 / 12 * dxv * 0.92,
    pb.y - 1 / 12 * dyv * 0.92),
    pb,
    new Point(pb.x + 1 / 12 * dxv * 0.52,
    pb.y + 1 / 12 * dyv * 0.52),
    new Point(pc.x - 2 / 12 * dxh * 0.40,
    pc.y - 2 / 12 * dyh * 0.40),
    pc,
    new Point(pc.x + 2 / 12 * dxh * 0.40,
    pc.y + 2 / 12 * dyh * 0.40),
    new Point(pd.x + 1 / 12 * dxv * 0.52,
    pd.y + 1 / 12 * dyv * 0.52),
    pd,
    new Point(pd.x - 1 / 12 * dxv * 0.92,
    pd.y - 1 / 12 * dyv * 0.92),
    new Point(pe.x + 1 / 12 * dxv * 0.72,
    pe.y + 1 / 12 * dyv * 0.72),
    pe,
    new Point(pe.x - 1 / 12 * dxv * 0.72,
    pe.y - 1 / 12 * dyv * 0.72),
    new Point(seg0.p2.x - 5 / 12 * dxh * 0.52,
    seg0.p2.y - 5 / 12 * dyh * 0.52),
    seg0.p2];
    side.type = "z";

    function pointAt(coeffh, coeffv) {
    return new Point(seg0.p1.x + coeffh * dxh + coeffv * dxv,
        seg0.p1.y + coeffh * dyh + coeffv * dyv)
    } // pointAt

} // twist0

//-----------------------------------------------------------------------------
/* modifies a side
    changes it from a straight line (type "d") to a complex one (type "z")
    The change is done towards the opposite side (side between corners ca and cb)
*/

function twist1(side, ca, cb, howFar = 1) {

    const seg0 = new Segment(side.points[0], side.points[1]);
    const dxh = seg0.dx();
    const dyh = seg0.dy();

    let seg1 = new Segment(ca, cb);
    if(howFar < 1){
        seg1 = new Segment(new Point(howFar * ca.x + (1-howFar) * side.points[0].x, howFar * ca.y + (1-howFar) * side.points[0].y), 
            new Point(howFar * cb.x + (1-howFar) * side.points[1].x, howFar * cb.y + (1-howFar) * side.points[1].y));
    }
    const mid0 = seg0.pointOnRelative(0.5);
    const mid1 = seg1.pointOnRelative(0.5);

    const segMid = new Segment(mid0, mid1);
    const dxv = segMid.dx();
    const dyv = segMid.dy();

    const pa = pointAt(alea(0.3, 0.35), alea(-0.05, 0.05));
    const pb = pointAt(alea(0.45, 0.55), alea(0.2, 0.3));
    const pc = pointAt(alea(0.65, 0.78), alea(-0.05, 0.05));

    side.points = [seg0.p1,
    seg0.p1, pa, pa,
    pa, pb, pb,
    pb, pc, pc,
    pc, seg0.p2, seg0.p2];
    side.type = "z";

    function pointAt(coeffh, coeffv) {
    return new Point(seg0.p1.x + coeffh * dxh + coeffv * dxv,
        seg0.p1.y + coeffh * dyh + coeffv * dyv)
    } // pointAt

} // twist1

//-----------------------------------------------------------------------------
/* modifies a side
    changes it from a straight line (type "d") to a complex one (type "z")
    The change is done towards the opposite side (side between corners ca and cb)
*/

function twist2(side, ca, cb, howFar = 1) {

    const seg0 = new Segment(side.points[0], side.points[1]);
    const dxh = seg0.dx();
    const dyh = seg0.dy();

    let seg1 = new Segment(ca, cb);
    if(howFar < 1){
        seg1 = new Segment(new Point(howFar * ca.x + (1-howFar) * side.points[0].x, howFar * ca.y + (1-howFar) * side.points[0].y), 
            new Point(howFar * cb.x + (1-howFar) * side.points[1].x, howFar * cb.y + (1-howFar) * side.points[1].y));
    }
    const mid0 = seg0.pointOnRelative(0.5);
    const mid1 = seg1.pointOnRelative(0.5);

    const segMid = new Segment(mid0, mid1);
    const dxv = segMid.dx();
    const dyv = segMid.dy();

    const hmid = alea(0.45, 0.55);
    const vmid = alea(0.4, 0.5)
    const pc = pointAt(hmid, vmid);
    let sega = new Segment(seg0.p1, pc);

    const pb = sega.pointOnRelative(2 / 3);
    sega = new Segment(seg0.p2, pc);
    const pd = sega.pointOnRelative(2 / 3);

    side.points = [seg0.p1, pb, pd, seg0.p2];
    side.type = "z";

    function pointAt(coeffh, coeffv) {
    return new Point(seg0.p1.x + coeffh * dxh + coeffv * dxv,
        seg0.p1.y + coeffh * dyh + coeffv * dyv)
    } // pointAt

} // twist2

//-----------------------------------------------------------------------------
/* modifies a side
    changes it from a straight line (type "d") to a complex one (type "z")
    The change is done towards the opposite side (side between corners ca and cb)
*/

function twist3(side, ca, cb, howFar = 1) {

    side.points = [side.points[0], side.points[1]];

} // twist3


//-----------------------------------------------------------------------------
class Piece {
    constructor(kx, ky, index) {
        this.sides = [];
        for (let i = 0; i < (window.pieceSides); i++) {
            this.sides[i] = new Side();
        }
        this.kx = kx;
        this.ky = ky;
        this.index = index;
        this.drawn = false;
    }

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    piece_scale(puzzle) {
        this.sides.forEach(side => side.side_scale(puzzle));
    } // Piece.scale
} // class Piece
//--------------------------------------------------------------

function rotateVector(x, y, rotations) {
    if(window.rotations == 0) return {x, y};

    let degree_rotate;
    let num_rots = Math.round(360 / window.rotations);
    if(window.rotations == 180){
        num_rots = 4;
        rotations = (rotations + num_rots) % num_rots; // Ensure rotations are within 0-3
        degree_rotate = rotations * 90;
    }else{
        degree_rotate = rotations * window.rotations;
        rotations = (rotations + num_rots) % num_rots; // Ensure rotations are within 0-3
    }
    
    // Calculate current radius and angle
    const radius = Math.sqrt(x * x + y * y);
    let angle = Math.atan2(-y, x);

    // Add the rotation in radians
    angle += degree_rotate * Math.PI / 180;

    // Convert back to x and y
    x = radius * Math.cos(angle);
    y = -radius * Math.sin(angle);
    return { x, y };
}

//--------------------------------------------------------------
class PolyPiece {

    // represents a group of pieces well positionned with respect  to each other.
    // pckxmin, pckxmax, pckymin and pckymax record the lowest and highest kx and ky
    // creates a canvas to draw polypiece on, and appends this canvas to puzzle.container
    constructor(initialPieces, puzzle) {
        this.pckxmin = Math.min(...initialPieces.map(piece => piece.kx));
        this.pckxmax = Math.max(...initialPieces.map(piece => piece.kx)) + 1;
        this.pckymin = Math.min(...initialPieces.map(piece => piece.ky));
        this.pckymax = Math.max(...initialPieces.map(piece => piece.ky)) + 1;
        this.pieces = initialPieces;
        this.puzzle = puzzle;
        this.syncId = (initialPieces && initialPieces[0] && typeof initialPieces[0].index === "number")
            ? initialPieces[0].index
            : null;
        this.listLoops();
        this.hinted = false;
        this.hasMovedEver = false;
        this.unlocked = false;
        this.withdrawn = false;
        this.rot = 0;

        this.polypiece_canvas = null;
        this.polypiece_ctx = null;
    } // PolyPiece

    // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -   -
    /*
    this method
        - adds pieces of otherPoly to this PolyPiece
        - reorders the pieces inside the polypiece
        - adjusts coordinates of new pieces to make them consistent with this polyPiece
        - re-evaluates the z - index of the polyPieces
    */

    merge(otherPoly, notifyMerge = true) {
        if(this == otherPoly){
            return;
        }

        const thisSyncIdBefore = getPolyPieceSyncId(this);
        const otherSyncIdBefore = getPolyPieceSyncId(otherPoly);
        const thisIdentity = (typeof thisSyncIdBefore === "number") ? thisSyncIdBefore : this.pieces[0].index;
        const otherIdentity = (typeof otherSyncIdBefore === "number") ? otherSyncIdBefore : otherPoly.pieces[0].index;
        const changingIndex = Math.max(thisIdentity, otherIdentity);

        const orgpckxmin = this.pckxmin;
        const orgpckymin = this.pckymin;
        const orgpckxmax = this.pckxmax;
        const orgpckymax = this.pckymax;

        const orgcx = this.x + (this.nx-1) * this.puzzle.scalex / 2;
        const orgcy = this.y + (this.ny-1) * this.puzzle.scaley / 2;

        // remove otherPoly from list of polypieces
        const kOther = this.puzzle.polyPieces.indexOf(otherPoly);
        this.puzzle.polyPieces.splice(kOther, 1);

        let forceRedraw = false;
        for (let k = 0; k < otherPoly.pieces.length; ++k) {
            otherPoly.pieces[k].drawn = false;

            if (window.gameplayStarted && notifyMerge) {
                const absorbedId = otherPoly.pieces[k].index;
                const min = Math.min(thisIdentity, absorbedId);
                const max = Math.max(thisIdentity, absorbedId);
                // console.log("merge", max, "to", min);

                addIgnoreBouncePiece(min);
                addIgnoreBouncePiece(max);
                
                change_savedata_datastorage(max, min, true);
                // console.log("done merge", max, "to", min);
            }

            this.pieces.push(otherPoly.pieces[k]);
            // watch leftmost, topmost... pieces
            if (otherPoly.pieces[k].kx < this.pckxmin) {
                this.pckxmin = otherPoly.pieces[k].kx;
                forceRedraw = true;
            }
            if (otherPoly.pieces[k].kx + 1 > this.pckxmax) {
                this.pckxmax = otherPoly.pieces[k].kx + 1;
                forceRedraw = true;
            }
            if (otherPoly.pieces[k].ky < this.pckymin) {
                this.pckymin = otherPoly.pieces[k].ky;
                forceRedraw = true;
            }
            if (otherPoly.pieces[k].ky + 1 > this.pckymax) {
                this.pckymax = otherPoly.pieces[k].ky + 1;
                forceRedraw = true;
            }
            if(this.hinted){
                this.hinted = false;
                // this.polypiece_canvas.classList.remove('hinted');
                forceRedraw = true;
            }
        } // for k

        // sort the pieces by increasing kx, ky

        this.pieces.sort(function (p1, p2) {
            return p1.index - p2.index;
        });
        this.syncId = Math.min(thisIdentity, otherIdentity);

        // redefine consecutive edges
        this.listLoops();

        // Keep merge positioning deterministic even when drawing is deferred.
        this.nx = this.pckxmax - this.pckxmin + 1;
        this.ny = this.pckymax - this.pckymin + 1;

        const r1 =  -(this.pckxmin - orgpckxmin) * this.puzzle.scalex / 2 - (this.pckxmax - orgpckxmax) * this.puzzle.scalex / 2;
        const r2 =  -(this.pckymin - orgpckymin) * this.puzzle.scaley / 2 - (this.pckymax - orgpckymax) * this.puzzle.scaley / 2;
        const r = rotateVector(r1, r2, -this.rot);
        const targetX = orgcx - (this.nx-1) * this.puzzle.scalex / 2 - r.x;
        const targetY = orgcy - (this.ny-1) * this.puzzle.scaley / 2 - r.y;

        // Update logical position now; defer DOM move until merged render completes
        // to avoid visible jumps/flicker while old canvases are still on screen.
        this.x = targetX;
        this.y = targetY;
        this.hasMovedEver = true;

        queuePolyPieceSetup(this, !forceRedraw, true, () => {
            this.moveTo(targetX, targetY);
            const za = (this._zIndex != null) ? this._zIndex : 0;
            const zb = (otherPoly._zIndex != null) ? otherPoly._zIndex : 0;
            const minZ = Math.min(za, zb);
            this._zIndex = minZ;
            this.puzzle._zOrderVersion = (this.puzzle._zOrderVersion || 0) + 1;
        });

        newMerge(changingIndex);

    } // merge

    // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -   -
    ifNear(otherPoly, ignoreCloseness = false, ignoreRotation = false) {

        if(this.pieces.length > otherPoly.pieces.length){
            return otherPoly.ifNear(this, ignoreCloseness, ignoreRotation)
        }

        if(!ignoreRotation && (this.rot - otherPoly.rot + 360) % 360 > 5) return false;

        let puzzle = this.puzzle;

        // coordinates of origin of full picture for this PolyPieces
        let rotated = rotateVector(this.x + this.nx * puzzle.scalex / 2, this.y + this.ny * puzzle.scaley / 2, this.rot);
        let pprotated = rotateVector(otherPoly.x + otherPoly.nx * puzzle.scalex / 2, otherPoly.y + otherPoly.ny * puzzle.scaley / 2, otherPoly.rot);


        let x = rotated.x - puzzle.scalex * (this.pckxmax + this.pckxmin) / 2;
        let y = rotated.y - puzzle.scaley * (this.pckymax + this.pckymin) / 2;

        let ppx = pprotated.x - puzzle.scalex * (otherPoly.pckxmax + otherPoly.pckxmin) / 2;
        let ppy = pprotated.y - puzzle.scaley * (otherPoly.pckymax + otherPoly.pckymin) / 2;


        if(!ignoreCloseness){
            if (((x - ppx)**2 + (y - ppy)**2) >= puzzle.dConnect) return false; // not close enough
        }

        // this and otherPoly are in good relative position, have they a common side ?
        const otherIndices = new Set(otherPoly.pieces.map(p => p.index));
        const hasNeighbor = (n) => n >= 0 && otherIndices.has(n);
        if (window.pieceSides == 6) {
            for (let k = this.pieces.length - 1; k >= 0; --k) {
                let p1 = this.pieces[k].index;
                let col = (p1 % apnx === 0) ? apnx : (p1 % apnx);
                if (hasNeighbor(p1 + apnx) || hasNeighbor(p1 - apnx)) return true;
                if (col != 1) {
                    if (col % 2 == 1) { if (hasNeighbor(p1 - 1 - apnx) || hasNeighbor(p1 - 1)) return true; }
                    else { if (hasNeighbor(p1 - 1 + apnx) || hasNeighbor(p1 - 1)) return true; }
                }
                if (col != apnx) {
                    if (col % 2 == 1) { if (hasNeighbor(p1 + 1 - apnx) || hasNeighbor(p1 + 1)) return true; }
                    else { if (hasNeighbor(p1 + 1 + apnx) || hasNeighbor(p1 + 1)) return true; }
                }
            }
        } else {
            for (let k = this.pieces.length - 1; k >= 0; --k) {
                let p1 = this.pieces[k].index;
                if (hasNeighbor(p1 + apnx) || hasNeighbor(p1 - apnx)) return true;
                if (p1 % apnx != 1 && hasNeighbor(p1 - 1)) return true;
                if (p1 % apnx != 0 && hasNeighbor(p1 + 1)) return true;
            }
        }
        return false;

    } // ifNear

    // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -

    /* algorithm to determine the boundary of a PolyPiece
    input : a table of cells, hopefully defining a 'good' PolyPiece, i.e. all connected together
    every cell is given as an object {kx: indice, ky: indice} representing an element of a 2D array.

    returned value : table of Loops, because the boundary may be made of several
    simple loops : there may be a 'hole' in a PolyPiece
    every loop is a list of consecutive edges,
    every edge if an object {kp: index, edge: b} where kp is the index of the cell ine
    the input array, and edge the side (0(top), 1(right), 2(bottom), 3(left))
    every edge contains kx and ky too, normally not used here

    This method does not depend on the fact that pieces have been scaled or not.
    */

    listLoops() {
        const cellSet = new Set(this.pieces.map(p => `${p.kx},${p.ky}`));
        const that = this;
        function edgeIsCommon(kx, ky, edge) {
            let ogkx = kx;
            let ogky = ky;
            let k;
            if(window.pieceSides == 6) {
                switch (edge) {
                    case 0: ky--; break; // top edge
                    case 1:  // top-right edge
                        if(kx % 2 == 0) {
                            kx++;
                            ky-=1/2;
                        } else {
                            kx++;
                            ky-=1/2;
                        }
                        break;
                    
                    case 2: // bottom-left edge
                        if(kx % 2 == 0) {
                            kx++;
                            ky+=1/2;
                        } else {
                            kx++;
                            ky+=1/2;
                        }
                        break;
                    case 3: ky++; break; // left edge
                    case 4: // bottom-left edge
                        if(kx % 2 == 0) {
                            kx--;
                            ky+=1/2;
                        } else {
                            kx--;
                            ky+=1/2;
                        }
                        break;
                    case 5: // top-left edge
                        if(kx % 2 == 0) {
                            kx--;
                            ky-=1/2;
                        } else {
                            kx--;
                            ky-=1/2;
                        }
                } // switch
            } else {
                switch (edge) {
                    case 0: ky--; break; // top edge
                    case 1: kx++; break; // right edge
                    case 2: ky++; break; // bottom edge
                    case 3: kx--; break; // left edge
                } // switch
            }
            return cellSet.has(`${kx},${ky}`);
        } // function edgeIsCommon

        // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
        // internal : checks if an edge given by kx, ky is in tbEdges
        // return index in tbEdges, or false

        function edgeIsInTbEdges(kx, ky, edge) {
            let k;
            for (k = 0; k < tbEdges.length; k++) {
                if (kx == tbEdges[k].kx && ky == tbEdges[k].ky && edge == tbEdges[k].edge) return k; // found it
            }
            return false; // not found
        } // function edgeIsInTbEdges

        // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -

        let tbLoops = []; // for the result
        let tbEdges = []; // set of edges which are not shared by 2 pieces of input
        let k;
        let kEdge;
        let lp; // for loop during its creation
        let currEdge; // current edge
        let tries; // tries counter
        let edgeNumber; // number of edge found during research
        let potNext;

        // table of tries

        let tbTries;
        if(window.pieceSides == 6) {
            tbTries = [
                // kx % 2 == 0 (even columns shifted DOWN)
                [
                    [ { dkx: 0, dky: 0, edge: 1 }, { dkx: +1, dky: -1/2, edge: 5 } ], // edge 0
                    [ { dkx: 0, dky: 0, edge: 2 }, { dkx: +1, dky: 1/2, edge: 0 } ], // edge 1
                    [ { dkx: 0, dky: 0, edge: 3 }, { dkx: 0, dky: +1, edge: 1 } ],  // edge 2
                    [ { dkx: 0, dky: 0, edge: 4 }, { dkx: -1, dky: 1/2, edge: 2 } ],  // edge 3
                    [ { dkx: 0, dky: 0, edge: 5 }, { dkx: -1, dky: -1/2, edge: 3 } ],  // edge 4
                    [ { dkx: 0, dky: 0, edge: 0 }, { dkx: 0, dky: -1, edge: 4 } ], // edge 5
                ],
                // kx % 2 == 1 (odd columns shifted UP)
                [
                    [ { dkx: 0, dky: 0, edge: 1 }, { dkx: +1, dky: -1/2, edge: 5 } ], // edge 0
                    [ { dkx: 0, dky: 0, edge: 2 }, { dkx: +1, dky: +1/2, edge: 0 } ], // edge 1
                    [ { dkx: 0, dky: 0, edge: 3 }, { dkx: 0, dky: +1, edge: 1 } ], // edge 2
                    [ { dkx: 0, dky: 0, edge: 4 }, { dkx: -1, dky: 1/2, edge: 2 } ], // edge 3
                    [ { dkx: 0, dky: 0, edge: 5 }, { dkx: -1, dky: -1/2, edge: 3 } ], // edge 4 
                    [ { dkx: 0, dky: 0, edge: 0 }, { dkx: 0, dky: -1, edge: 4 } ], // edge 5
                ]
            ];
        }else{
            tbTries = [[
                // if we are on edge 0 (top)
                [
                    { dkx: 0, dky: 0, edge: 1 }, // try # 0
                    { dkx: 1, dky: 0, edge: 0 }, // try # 1
                    { dkx: 1, dky: -1, edge: 3 } // try # 2
                ],
                // if we are on edge 1 (right)
                [
                    { dkx: 0, dky: 0, edge: 2 },
                    { dkx: 0, dky: 1, edge: 1 },
                    { dkx: 1, dky: 1, edge: 0 }
                ],
                // if we are on edge 2 (bottom)
                [
                    { dkx: 0, dky: 0, edge: 3 },
                    { dkx: - 1, dky: 0, edge: 2 },
                    { dkx: - 1, dky: 1, edge: 1 }
                ],
                // if we are on edge 3 (left)
                [
                    { dkx: 0, dky: 0, edge: 0 },
                    { dkx: 0, dky: - 1, edge: 3 },
                    { dkx: - 1, dky: - 1, edge: 2 }
                ],
            ]];
        }

        // create list of not shared edges (=> belong to boundary)
        for (k = 0; k < this.pieces.length; k++) {
            for (kEdge = 0; kEdge < (window.pieceSides); kEdge++) {
                if (!edgeIsCommon(this.pieces[k].kx, this.pieces[k].ky, kEdge)){
                    tbEdges.push({ kx: this.pieces[k].kx, ky: this.pieces[k].ky, edge: kEdge, kp: k });
                }
            } // for kEdge
        } // for k

        while (tbEdges.length > 0) {
            lp = []; // new loop
            currEdge = tbEdges[0];   // we begin with first available edge
            lp.push(currEdge);       // add it to loop
            tbEdges.splice(0, 1);    // remove from list of available sides
            do {
                let parity = 0;
                if(window.pieceSides == 6){
                    if (currEdge.kx % 2 == 1) {
                        parity = 1;
                    }
                }
                let toTry = tbTries[parity][currEdge.edge]; // possible next edges
                for (tries = 0; tries < toTry.length; tries++) {
                    potNext = toTry[tries];
                    edgeNumber = edgeIsInTbEdges(currEdge.kx + potNext.dkx, currEdge.ky + potNext.dky, potNext.edge);
                    
                    if (edgeNumber === false) continue; // can't here
                    // new element in loop
                    currEdge = tbEdges[edgeNumber];     // new current edge
                    lp.push(currEdge);              // add it to loop
                    tbEdges.splice(edgeNumber, 1);  // remove from list of available sides
                    
                    break; // stop tries !
                } // for tries
                if (edgeNumber === false) break; // loop is closed
            } while (1); // do-while exited by break
            tbLoops.push(lp); // add this loop to loops list
        } // while tbEdges...

        // replace components of loops by actual pieces sides
        this.tbLoops = tbLoops.map(loop => loop.map(edge => {
            let cell = this.pieces[edge.kp];
            return cell.sides[edge.edge];
        }));
    } // polyPiece.listLoops

    // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -   -

    drawPath(ctx, shiftx, shifty) {

        //    ctx.beginPath(); No, not for Path2D

        this.tbLoops.forEach(loop => {
            let without = false;
            loop.forEach(side => {
                side.drawPath(ctx, shiftx, shifty, without);
                without = true;
            });
            ctx.closePath();
        });

    } // PolyPiece.drawPath

    // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -   -

    polypiece_drawImage(ignoreRedraw) {

        /* resizes canvas to be bigger than if pieces were perfect rectangles
        so that their shapes actually fit in the canvas
        copies the relevant part of gamePicture clipped by path
        adds shadow and emboss
        */
        //       if (this.pieces[0].kx!=1 ||this.pieces[0].ky!= 1) return;
        puzzle = this.puzzle;
        this.nx = this.pckxmax - this.pckxmin + 1;
        this.ny = this.pckymax - this.pckymin + 1;

        // difference between position in this canvas and position in gameImage

        this.offsx = (this.pckxmin - 0.5) * puzzle.scalex;
        this.offsy = (this.pckymin - 0.5) * puzzle.scaley;

        this.path = new Path2D();
        this.drawPath(this.path, -this.offsx, -this.offsy);

        // console.log("tbLoops", this.pieces.length, this.tbLoops);

        let srcx = this.pckxmin ? ((this.pckxmin - 0.5) * puzzle.scalex) : 0;
        let srcy = this.pckymin ? ((this.pckymin - 0.5) * puzzle.scaley) : 0;

        let destx = ( (this.pckxmin ? 0 : 1 / 2) ) * puzzle.scalex;
        let desty = ( (this.pckymin ? 0 : 1 / 2) ) * puzzle.scaley;

        // console.log(this, puzzle)
        
        if(this.pieces[0].index < 0){
            if(apnx > 1){
                if(this.pckxmin == 0){
                    srcx += puzzle.scalex * (1+(this.pckymin)%2) / 3;
                } else { // if(this.pckxmin == this.apnx - 1){            
                    srcx -= puzzle.scalex * (1+(this.pckymin)%2) / 3;
                }
            }
            if(apny > 1){
                if(this.pckymin == 0){
                    srcy += puzzle.scaley * (1+(this.pckxmin)%2) / 3;
                } else { // if(this.pckymin == this.apny - 1)
                    srcy -= puzzle.scaley * (1+(this.pckxmin)%2) / 3;
                }
            }
        }

        const w = puzzle.scalex * (1 + this.pckxmax - this.pckxmin);
        const h = puzzle.scaley * (1 + this.pckymax - this.pckymin);
        // drawParams dx/dy are already applied when source media is rendered into gameCanvas.
        // Per-piece sampling must stay in gameCanvas coordinates (no second offset).
        this._mediaSample = {
            sx: srcx,
            sy: srcy,
            destx,
            desty,
            w,
            h
        };

        this._overlayVersion = (this._overlayVersion || 0) + 1;
        if (rendererFacade && rendererFacade.sceneState) rendererFacade.sceneState.markPieceDirty(this);
        return;

    } // PolyPiece.polypiece_drawImage

    _drawOverlayOnly(puz, clearCanvas = true) {
        if (!this.polypiece_ctx || !this.polypiece_canvas) return;
        this.polypiece_ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (clearCanvas) {
            this.polypiece_ctx.clearRect(0, 0, this.polypiece_canvas.width, this.polypiece_canvas.height);
        }

        const borders = bevel_size > 0;
        const embth = puz.scalex * 0.01 * bevel_size;
        const worldLight = this._worldToPieceLocal(embth / 2, -embth / 2);

        if (borders) {
            this.polypiece_ctx.save();
            this.polypiece_ctx.translate(worldLight.x, worldLight.y);
            this.polypiece_ctx.lineWidth = embth;
            this.polypiece_ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
            this.polypiece_ctx.stroke(this.path);
            this.polypiece_ctx.translate(-2 * worldLight.x, -2 * worldLight.y);
            this.polypiece_ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
            this.polypiece_ctx.stroke(this.path);
            this.polypiece_ctx.restore();
        }

        if (this.hinted) {
            this.polypiece_ctx.strokeStyle = hint_color;
            this.polypiece_ctx.lineWidth = Math.max(0.03 * puz.scalex, 7);
            this.polypiece_ctx.stroke(this.path);
        }
    }

    /** Draw overlay (borders + hint) to an arbitrary 2D context. ctx must already be in piece-local space (0,0) to (w,h); do not reset transform. Caller may clear first if needed. */
    drawOverlayToContext(ctx, w, h, puz) {
        if (!ctx || !this.path) return;
        const borders = bevel_size > 0;
        const embth = puz.scalex * 0.01 * bevel_size;
        const worldLight = this._worldToPieceLocal(embth / 2, -embth / 2);

        if (borders) {
            ctx.save();
            ctx.translate(worldLight.x, worldLight.y);
            ctx.lineWidth = embth;
            ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
            ctx.stroke(this.path);
            ctx.translate(-2 * worldLight.x, -2 * worldLight.y);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
            ctx.stroke(this.path);
            ctx.restore();
        }

        if (this.hinted) {
            ctx.strokeStyle = hint_color;
            ctx.lineWidth = Math.max(0.03 * puz.scalex, 7);
            ctx.stroke(this.path);
        }
    }

    _worldToPieceLocal(worldDx, worldDy) {
        const deg = (window.rotations === 180 ? 90 : window.rotations) || 0;
        const angle = (this.rot || 0) * deg * Math.PI / 180;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return {
            x: worldDx * c + worldDy * s,
            y: -worldDx * s + worldDy * c
        };
    }

    _ensureWebGLMaskCanvas() {
        if (!this.polypiece_canvas) return;
        const w = this.polypiece_canvas.width | 0;
        const h = this.polypiece_canvas.height | 0;
        if (w <= 0 || h <= 0 || !this.path) return;
        if (!this._maskCanvas) this._maskCanvas = document.createElement("canvas");
        if (this._maskCanvas.width !== w || this._maskCanvas.height !== h) {
            this._maskCanvas.width = w;
            this._maskCanvas.height = h;
        }
        const mctx = this._maskCanvas.getContext("2d");
        mctx.setTransform(1, 0, 0, 1, 0, 0);
        mctx.clearRect(0, 0, w, h);
        mctx.fillStyle = "#fff";
        mctx.fill(this.path);
        this._maskVersion = (this._maskVersion || 0) + 1;
    }

    _applyPieceTransform() {
        // No per-piece canvas; transform is applied by the renderer when drawing.
    }

    moveTo(x, y) {
        this.x = x;
        this.y = y;
        this._applyPieceTransform();
        if (rendererFacade && rendererFacade.sceneState) rendererFacade.sceneState.markPieceDirty(this);
    } //

    moveAwayFromBorder(){
        const cx = this.x + (this.nx) * this.puzzle.scalex / 2;
        const cy = this.y + (this.ny) * this.puzzle.scaley / 2;

        let len = (this.nx) * this.puzzle.scalex / 2 - this.puzzle.scalex;
        let wid = (this.ny) * this.puzzle.scaley / 2 - this.puzzle.scaley;
        if(this.rot == 1 || this.rot == 3){
            len = (this.ny) * this.puzzle.scaley / 2 - this.puzzle.scaley;
            wid = (this.nx) * this.puzzle.scalex / 2 - this.puzzle.scalex;
        }

        let dx = 0
        if(cx - len < 0){
            dx = cx - len;
        }
        if(cx + len > this.puzzle.contWidth){
            dx = cx + len - this.puzzle.contWidth;
        }
        let dy = 0
        if(cy - wid < 0){
            dy = cy - wid;
        }
        if(cy + wid > this.puzzle.contHeight){
            dy = cy + wid - this.puzzle.contHeight;
        }

        if(dx!=0 || dy!=0){
            this.moveTo(this.x - dx, this.y - dy);
        }
    }

    rotateTo(rot){
        this.rotate(null, rot - this.rot);
    }

    rotate(moving, increase = 1) {
        if(window.rotations == 0) return;
        let num_rots = Math.round(360 / window.rotations);
        if(window.rotations == 180){
            num_rots = 4;
        }
        this.rot = ((this.rot + increase + num_rots) % num_rots) | 0;
        this._applyPieceTransform();
        if (rendererFacade && rendererFacade.sceneState) rendererFacade.sceneState.markPieceDirty(this);

        if(moving){
            // Adjust position to ensure the piece stays under the cursor
            const pw = this.polypiece_canvas ? this.polypiece_canvas.width : (this.nx * this.puzzle.scalex);
            const ph = this.polypiece_canvas ? this.polypiece_canvas.height : (this.ny * this.puzzle.scaley);
            const centerX = this.x + (pw / 2);
            const centerY = this.y + (ph / 2);

            const offsetX = moving.xMouse - centerX;
            const offsetY = moving.yMouse - centerY;

            let { x: changeX, y: changeY } = rotateVector(offsetX, offsetY, -increase);
            changeX = offsetX - changeX;
            changeY = offsetY - changeY;

            moving.ppXInit += changeX;
            moving.ppYInit += changeY;

            this.x = this.x + changeX;
            this.y = this.y + changeY;

            this.moveTo(this.x, this.y);
            this.moveAwayFromBorder();
        }
    }

} // class PolyPiece


//-----------------------------------------------------------------------------
class Puzzle {
    /*
        params contains :

    container : mandatory - given by id (string) or element
                it will not be resized in this script

    ONLY ONE Puzzle object should be instanced.
        only "container is mandatory, nbPieces and pictures may be provided to get
        initial default values.
        Once a puzzle is solved (and event if not solved) another game can be played
        by changing the image file or the number of pieces, NOT by invoking new Puzzle
    */

    constructor(params) {

        this.container = (typeof params.container == "string") ?
            document.getElementById(params.container) :
            params.container;

        this._releaseHandled = false;
        this.handleLeave = () => {
            this._releaseHandled = false;
            queueGameEvent({ event: 'leave' });
        };

        /* the following code will add the event Handlers several times if
            new Puzzle objects are created with same container.
            the presence of previous event listeners is NOT detectable
        */
        this.container.addEventListener("mousedown", event => {
            event.preventDefault();
            queueGameEvent({ event: 'touch', button: event.button, position: this.relativeMouseCoordinates(event) });

        });
        this.container.addEventListener("contextmenu", event => {
            event.preventDefault();
        });
        this.container.addEventListener("touchstart", event => {
            event.preventDefault();
            if(event.touches.length == 2) {
                rotateCurrentPiece(); return;
            }
            if (event.touches.length != 1) return;
            let ev = event.touches[0];
            queueGameEvent({ event: 'touch', button: 0, position: this.relativeMouseCoordinates(ev) });
        }, { passive: false });

        this._boundMouseUp = (event) => {
            event.preventDefault();
            // Ignore synthetic mouseup emitted from touch interactions.
            if (event && event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents) {
                return;
            }
            if (this._releaseHandled) this.handleLeave();
        };
        this._boundTouchEnd = (event) => {
            if (event.touches.length == 0 && this._releaseHandled) this.handleLeave();
        };
        this._boundTouchLeave = (event) => {
            if (event.touches.length == 0 && this._releaseHandled) this.handleLeave();
        };
        this._boundTouchCancel = (event) => {
            if (event.touches.length == 0 && this._releaseHandled) this.handleLeave();
        };
        document.addEventListener("mouseup", this._boundMouseUp);
        document.addEventListener("touchend", this._boundTouchEnd);
        document.addEventListener("touchleave", this._boundTouchLeave);
        document.addEventListener("touchcancel", this._boundTouchCancel);

        this._boundPointerDown = (event) => {
            this.container.setPointerCapture(event.pointerId);
        };
        this._boundPointerUp = (event) => {
            // On touch devices, pointerup can fire while another finger is still down.
            // Drop should be controlled by touchend when touches.length reaches 0.
            if (event && event.pointerType === "touch") {
                this.container.releasePointerCapture(event.pointerId);
                return;
            }
            if (this._releaseHandled) this.handleLeave();
            this.container.releasePointerCapture(event.pointerId);
        };
        this.container.addEventListener("pointerdown", this._boundPointerDown);
        this.container.addEventListener("pointerup", this._boundPointerUp);

        this.container.addEventListener("mousemove", event => {
            event.preventDefault();
            // do not accumulate move events in events queue - keep only current one
            if (events.length && events[events.length - 1].event == "move") events.pop();
            queueGameEvent({ event: 'move', button: event.button, position: { clientX: event.clientX, clientY: event.clientY } });
        });
        this.container.addEventListener("touchmove", event => {
            event.preventDefault();
            if (event.touches.length != 1) return;
            let ev = event.touches[0];
            // do not accumulate move events in events queue - keep only current one
            if (events.length && events[events.length - 1].event == "move") events.pop();
            queueGameEvent({ event: 'move', button: 0, position: { clientX: ev.clientX, clientY: ev.clientY } });
        }, { passive: false });

        /* create canvas to contain picture - will be styled later */
        this.gameCanvas = document.createElement('CANVAS');
        this.container.appendChild(this.gameCanvas)

        this.srcImage = new Image();
        this.srcImage.crossOrigin = "anonymous";
        this.imageLoaded = false;
        this._webglStartBlockedReason = "";
        // PolyPiece groups are still the runtime piece containers; keep this
        // initialized for pre-start interactions (preview/pan/click paths).
        this.polyPieces = [];
        this.srcImage.addEventListener("load", () => imageLoaded(this));

        this.scale_zoom = 1;

    } // Puzzle

    destroy() {
        document.removeEventListener("mouseup", this._boundMouseUp);
        document.removeEventListener("touchend", this._boundTouchEnd);
        document.removeEventListener("touchleave", this._boundTouchLeave);
        document.removeEventListener("touchcancel", this._boundTouchCancel);
        this.container.removeEventListener("pointerdown", this._boundPointerDown);
        this.container.removeEventListener("pointerup", this._boundPointerUp);
        if (this.srcImage && this.srcImage.parentElement) {
            this.srcImage.parentElement.removeChild(this.srcImage);
        }
    }

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    getContainerSize() {
        let styl = window.getComputedStyle(this.container);

        /* dimensions of container */
        this.contWidth = parseFloat(styl.width);
        this.contHeight = parseFloat(styl.height);
        if (this._invalidateViewMetricsCache) this._invalidateViewMetricsCache();
    }

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    sizeContainerByAspectRatio(aspectRatio) {
        const puzzleDIV = this.container.parentElement;
        const baseScale = getActiveBaseScale();
        let maxContentW, maxContentH;
        if (puzzleDIV && baseScale > 0) {
            maxContentW = puzzleDIV.clientWidth / baseScale;
            maxContentH = puzzleDIV.clientHeight / baseScale;
        } else {
            this.getContainerSize();
            maxContentW = this.contWidth || 800;
            maxContentH = this.contHeight || 600;
        }
        let contWidth, contHeight;
        if (maxContentW / maxContentH > aspectRatio) {
            contHeight = maxContentH;
            contWidth = maxContentH * aspectRatio;
        } else {
            contWidth = maxContentW;
            contHeight = maxContentW / aspectRatio;
        }
        this.container.style.width = contWidth + 'px';
        this.container.style.height = contHeight + 'px';
        this.getContainerSize();
    }

    _getSourceDimensions(source) {
        if (!source) return { w: 0, h: 0 };
        const w = (source.naturalWidth | 0) || (source.videoWidth | 0) || (source.width | 0) || 0;
        const h = (source.naturalHeight | 0) || (source.videoHeight | 0) || (source.height | 0) || 0;
        return { w, h };
    }

    _getUniformTargetAspect(fallbackAspect) {
        const safeFallback = (Number.isFinite(fallbackAspect) && fallbackAspect > 0) ? fallbackAspect : (16 / 9);
        if (!window.make_pieces_square) return safeFallback;
        if (window.pieceSides === 6) {
            // Regular hex geometry: scalex/scaley should follow sqrt(3)/2 when uniform size is enabled.
            const hexExtentX = this.nx + 7 / 6;
            const hexExtentY = this.ny + 5 / 6;
            if (hexExtentX > 0 && hexExtentY > 0) return (hexExtentX * (Math.sqrt(3) / 2)) / hexExtentY;
            return safeFallback;
        }
        if (this.nx > 0 && this.ny > 0) return this.nx / this.ny;
        return safeFallback;
    }

    _buildDrawParamsForSource(sourceW, sourceH, destW, destH, cropToFit) {
        const sw = Math.max(1, sourceW | 0);
        const sh = Math.max(1, sourceH | 0);
        const dw = Math.max(1, destW | 0);
        const dh = Math.max(1, destH | 0);
        const params = {
            sx: 0,
            sy: 0,
            sw,
            sh,
            dx: 0,
            dy: 0,
            dw,
            dh,
            sourceW: sw,
            sourceH: sh
        };
        if (!cropToFit) return params;
        const srcAspect = sw / sh;
        const dstAspect = dw / dh;
        if (!Number.isFinite(srcAspect) || !Number.isFinite(dstAspect) || srcAspect <= 0 || dstAspect <= 0) return params;
        if (Math.abs(srcAspect - dstAspect) < 1e-6) return params;
        if (srcAspect > dstAspect) {
            // Source too wide: crop left/right.
            const cropW = Math.max(1, Math.round(sh * dstAspect));
            params.sx = Math.max(0, Math.round((sw - cropW) / 2));
            params.sw = Math.min(cropW, sw);
        } else {
            // Source too tall: crop top/bottom.
            const cropH = Math.max(1, Math.round(sw / dstAspect));
            params.sy = Math.max(0, Math.round((sh - cropH) / 2));
            params.sh = Math.min(cropH, sh);
        }
        return params;
    }

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    puzzle_create(coordinates, groups, hasmoved, unlocked) {
        console.log(coordinates, groups, hasmoved, unlocked)

        // Set the seed of Math.random to window.apseed
        if(window.apseed){
            console.log(window.apseed)
            if (typeof window.apseed !== 'number' || !Number.isInteger(window.apseed)) {
                const hash = Array.from(String(window.apseed)).reduce((acc, char) => {
                    return acc * 31 + char.charCodeAt(0);
                }, 0);
                console.log(hash)
                setRandomSeed((hash + window.slot) % 10000);
            } else {
                setRandomSeed((window.apseed + window.slot) % 10000);
            }
        }

        this.container.innerHTML = ""; // forget contents

        /* define the number of rows / columns to have almost square pieces
            and a total number as close as possible to the requested number
        */
        this.getContainerSize();
        this.computenxAndny(apnx, apny);
        /* assuming the width of pieces is 1, computes their height
                (computenxAndny aims at making relativeHeight as close as possible to 1)
        */
        this.relativeHeight = (this.srcImage.naturalHeight / this.ny) / (this.srcImage.naturalWidth / this.nx);

        this.defineShapes({ coeffDecentr: 0.12, twistf: [twist0, twist1, twist2, twist3, twist3, null][document.getElementById("shape").value - 1] });

        this.polyPieces = [];

        if(coordinates.length != groups.length){
            console.log("coordinates and groups do not have the same length?", coordinates, groups)
        }

        for (let key in coordinates) {
            let pieces_in_group = [];
            for (let ind of groups[key]) {
                let w = (ind-1) % window.apnx;
                let h = Math.floor((ind-1) / window.apnx);
                
                if(ind < 0){
                    w = -ind;
                    h = -1;
                }
                if(this.pieces[h][w]){
                    pieces_in_group.push(this.pieces[h][w]);
                    if(ind != key){
                        newMerge(ind, false);
                    }
                }
            }
            if(pieces_in_group.length > 0) {
                let ppp = new PolyPiece(pieces_in_group, this);
                ppp.hasMovedEver = hasmoved[key];
                ppp.unlocked = unlocked[key];
                ppp.moveTo(
                    coordinates[key][0] * puzzle.contWidth, 
                    coordinates[key][1] * puzzle.contHeight
                )
                if(coordinates[key][2]){
                    ppp.rotate(null, coordinates[key][2]);
                }
                this.polyPieces.push(ppp);
            }
        }

        this.evaluateZIndex();

        console.log("done evaluate z index")
    } // Puzzle.create

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /* computes the number of lines and columns of the puzzle,
    finding the best compromise between the requested number of pieces
    and a square shap for pieces
    result in this.nx and this.ny;
    */

    computenxAndny(inx = -1, iny = -1) {

        if(inx > 0){
            this.nx = inx;
            this.ny = iny;
            return;
        }

        const pairs = [];
        for (let nch = 1; nch <= this.nbPieces; nch++) {
            const ncv = Math.round(this.nbPieces / nch);
            if (ncv >= 1) pairs.push([nch, ncv]);
        }

        let best = pairs[0];
        let bestErr = Infinity;

        for (const [nch, ncv] of pairs) {
            let err;
            const ratio = (nch * this.srcImage.naturalHeight) / (ncv * this.srcImage.naturalWidth);
            err = (ratio + 1 / ratio) - 2;
            if (err < bestErr) {
                bestErr = err;
                best = [nch, ncv];
            }
        }

        this.nx = best[0];
        this.ny = best[1];
        this.nbPieces = this.nx * this.ny;

    } // computenxAndny

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    defineShapes(shapeDesc) {
        // define shapes as if the width and height of a piece were 1
        const shapeVal = parseInt(document.getElementById("shape").value, 10) || 1;

        /* first, place the corners of the pieces
            at some distance of their theoretical position, except for edges
        */
        let np;

        if(window.pieceSides == 6){
            this.corners_and_sides_6(shapeDesc, shapeVal);
        }else{
            this.corners_and_sides_4(shapeDesc, shapeVal);
        }

        if(window.fake_pieces_mimic.length >= 1){
            this.pieces[-1] = [];

            for(let i = 0; i < window.fake_pieces_mimic.length; i++){
                let mimic_piece_x = (window.fake_pieces_mimic[i]-1) % this.nx;
                let mimic_piece_y = Math.floor((window.fake_pieces_mimic[i]-1) / this.nx);

                this.pieces[-1][i+1] = np = new Piece(mimic_piece_x, mimic_piece_y, -i - 1);

                for (let sideIndex = 0; sideIndex < this.pieces[mimic_piece_y][mimic_piece_x].sides.length; sideIndex++) {
                    np.sides[sideIndex] = this.pieces[mimic_piece_y][mimic_piece_x].sides[sideIndex];
                }

            }
        }

    } // Puzzle.defineShapes

    corners_and_sides_4(shapeDesc, shapeVal) {

        let { coeffDecentr, twistf } = shapeDesc;
        const corners = [];
        const nx = this.nx, ny = this.ny;
        let np;

        for (let ky = -1; ky <= ny+1; ++ky) {
            corners[ky] = [];
            for (let kx = -1; kx <= nx+1; ++kx) {
                if (shapeVal == 6) {
                    coeffDecentr = randomIn(ky * nx + kx + 1 + 1) * .5;
                }
                if (shapeVal == 5) {
                    coeffDecentr = 0;
                }
                corners[ky][kx] = new Point(kx + alea(-coeffDecentr, coeffDecentr),
                    ky + alea(-coeffDecentr, coeffDecentr));
                if (kx <= 0) corners[ky][kx].x = 0;
                if (kx >= nx) corners[ky][kx].x = nx;
                if (ky <= 0) corners[ky][kx].y = 0;
                if (ky >= ny) corners[ky][kx].y = ny;
            } // for kx
        } // for ky

        // Array of pieces
        this.pieces = [];
        for (let ky = 0; ky < ny; ++ky) {
            this.pieces[ky] = [];
            for (let kx = 0; kx < nx; ++kx) {
                if (shapeVal == 6) {
                    const twistFunctions = [twist0, twist1, twist2, twist3];
                    twistf = twistFunctions[Math.floor(randomIn(ky * nx + kx + 1) * twistFunctions.length)];
                }
                this.pieces[ky][kx] = np = new Piece(kx, ky, ky * nx + kx + 1);
                // top side
                if (ky == 0) {
                    np.sides[0].points = [corners[ky][kx], corners[ky][kx + 1]];
                    np.sides[0].type = "d";
                } else {
                    np.sides[0] = this.pieces[ky - 1][kx].sides[2].reversed();
                }
                // right side
                np.sides[1].points = [corners[ky][kx + 1], corners[ky + 1][kx + 1]];
                np.sides[1].type = "d";
                if (kx < nx - 1) {
                    if (intAlea(2)) // randomly twisted on one side of the side
                    twistf(np.sides[1], corners[ky][kx], corners[ky + 1][kx]);
                    else
                    twistf(np.sides[1], corners[ky][kx + 2], corners[ky + 1][kx + 2]);
                }
                // bottom side
                np.sides[2].points = [corners[ky + 1][kx + 1], corners[ky + 1][kx]];
                np.sides[2].type = "d";
                if (ky < ny - 1) {
                    if (intAlea(2)) // randomly twisted on one side of the side
                    twistf(np.sides[2], corners[ky][kx + 1], corners[ky][kx]);
                    else
                    twistf(np.sides[2], corners[ky + 2][kx + 1], corners[ky + 2][kx]);
                }
                // left side
                if (kx == 0) {
                    np.sides[3].points = [corners[ky + 1][kx], corners[ky][kx]];
                    np.sides[3].type = "d";
                } else {
                    np.sides[3] = this.pieces[ky][kx - 1].sides[1].reversed()
                }
            } // for kx
        } // for ky
    }

    
    corners_and_sides_6(shapeDesc, shapeVal) {

        let { coeffDecentr, twistf } = shapeDesc;
        const corners = [];
        const nx = this.nx, ny = this.ny;

        for (let ky = -1; ky <= 2*ny+2; ++ky) {
            corners[ky] = [];
            for (let kx = -1; kx <= nx+2; ++kx) {
                if (shapeVal == 6) {
                    coeffDecentr = randomIn(ky * nx + kx + 1 + 1) * .5;
                }
                if (shapeVal == 5) {
                    coeffDecentr = 0;
                }
                if(ky % 2 == 0){
                    if(kx % 2 == 0){
                        corners[ky][kx] = new Point(corner_to_shape_dist + kx, ky * 0.5);
                    }else{
                        corners[ky][kx] = new Point(kx, ky * 0.5);
                    }
                }else{
                    if(kx % 2 == 0){
                        corners[ky][kx] = new Point(kx, ky * 0.5);
                    }else{
                        corners[ky][kx] = new Point(kx + corner_to_shape_dist, ky * 0.5);
                    }
                }
                if(ky > 1 && ky < 2*ny && kx > 0 && kx < nx){
                    corners[ky][kx].y += alea(-coeffDecentr, coeffDecentr);
                    corners[ky][kx].x += alea(-coeffDecentr, coeffDecentr);
                }
            }
        }

        let np;

        // Array of pieces
        this.pieces = [];
        for (let ky = 0; ky < ny; ++ky) {
            this.pieces[ky] = [];
        }
        for (let kx = 0; kx < nx; ++kx) {
            for (let ky = 0; ky < ny; ++ky) {
                if (shapeVal == 6) {
                    const twistFunctions = [twist0, twist1, twist2, twist3];
                    twistf = twistFunctions[Math.floor(randomIn(ky * nx + kx + 1) * twistFunctions.length)];
                }
                const upy = (kx % 2 == 1) ? 1 : 0; // offset for odd columns

                this.pieces[ky][kx] = np = new Piece(kx, ky + upy/2, ky * nx + kx + 1);


                const idy0 = 2 * ky + upy;
                const idx0 = kx;
                const c0 = corners[idy0][idx0];
                const idy1 = 2 * ky + upy;
                const idx1 = kx + 1;
                const c1 = corners[idy1][idx1];
                const idy2 = 2 * ky + 1 + upy;
                const idx2 = kx + 1;
                const c2 = corners[idy2][idx2];
                const idy3 = 2 * ky + 2 + upy;
                const idx3 = kx + 1;
                const c3 = corners[idy3][idx3];
                const idy4 = 2 * ky + 2 + upy;
                const idx4 = kx;
                const c4 = corners[idy4][idx4];
                const idy5 = 2 * ky + 1 + upy;
                const idx5 = kx;
                const c5 = corners[idy5][idx5];

                // top side
                np.sides[0].points = [c0, c1];
                np.sides[0].type = "d";
                if(ky > 0){
                    np.sides[0] = this.pieces[ky - 1][kx].sides[3].reversed();
                }

                // top-right side, never already exists because y is iterated first
                np.sides[1].points = [c1, c2];
                np.sides[1].type = "d";
                if(kx < nx - 1 && (ky > 0 || kx % 2 == 1)) { // if not last column, and not first row or odd column
                    if (intAlea(2)){
                        twistf(np.sides[1], corners[idy1-1][idx1+1], corners[idy2-1][idx2+1], 0.6);
                    } else {
                        twistf(np.sides[1], corners[idy1+1][idx1-1], corners[idy2+1][idx2-1], 0.6);
                    }
                }

                // bottom-right side, never already exists because y is iterated first
                np.sides[2].points = [c2, c3];
                np.sides[2].type = "d";
                if(kx < nx - 1 && (ky < ny - 1 || kx % 2 == 0)) { // if not last column, and not last row or even column
                    if (intAlea(2)){
                        twistf(np.sides[2], corners[idy2-1][idx2-1], corners[idy3-1][idx3-1], 0.6);
                    } else {
                        twistf(np.sides[2], corners[idy2+1][idx2+1], corners[idy3+1][idx3+1], 0.6);
                    }
                }

                // bottom side
                np.sides[3].points = [c3, c4];
                np.sides[3].type = "d";
                if(ky < ny - 1){
                    if (intAlea(2)){
                        twistf(np.sides[3], corners[idy3-1][idx3], corners[idy4-1][idx4]);
                    } else {
                        twistf(np.sides[3], corners[idy3+1][idx3], corners[idy4+1][idx4]);
                    }   
                }

                // bottom-left side
                np.sides[4].points = [c4, c5];
                np.sides[4].type = "d";
                if (kx > 0 && (ky < ny - 1 || kx % 2 == 0)) { // if not first column, and not last row or even column
                    if (kx % 2 == 0){
                        np.sides[4] = this.pieces[ky][kx - 1].sides[1].reversed();
                    } else {
                        np.sides[4] = this.pieces[ky + 1][kx - 1].sides[1].reversed();
                    }  
                }

                // top-left side
                np.sides[5].points = [c5, c0];
                np.sides[5].type = "d";
                if (kx > 0 && (ky > 0 || kx % 2 == 1)) { // if not first column, and not first row or odd column
                    if(kx % 2 == 0){
                        np.sides[5] = this.pieces[ky - 1][kx - 1].sides[2].reversed();
                    } else {
                        np.sides[5] = this.pieces[ky][kx - 1].sides[2].reversed();
                    }
                }

            } // for kx
        } // for ky
        console.log("pieces defined", this.pieces);
    }



    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    puzzle_scale() {

        const aspectRatio = getEffectivePuzzleAreaAspectRatio(this.srcImage);

        if (this.srcImage) {
            this.sizeContainerByAspectRatio(aspectRatio);
            const availableW = this.contWidth;
            const availableH = this.contHeight;
            const { w: srcW0, h: srcH0 } = this._getSourceDimensions(this.srcImage);
            const imageAspect = (srcW0 > 0 && srcH0 > 0) ? (srcW0 / srcH0) : aspectRatio;
            const contentAspect = this._getUniformTargetAspect(imageAspect);
            if (availableW / availableH > contentAspect) {
                this.gameHeight = availableH;
                this.gameWidth = availableH * contentAspect;
            } else {
                this.gameWidth = availableW;
                this.gameHeight = availableW / contentAspect;
            }
        } else {
            this.getContainerSize();
            if (this.contWidth / this.contHeight > aspectRatio) {
                this.gameHeight = this.contHeight;
                this.gameWidth = this.contHeight * aspectRatio;
            } else {
                this.gameWidth = this.contWidth;
                this.gameHeight = this.contWidth / aspectRatio;
            }
        }

        /* get a scaled copy of the source picture into a canvas */
        if (!Number.isFinite(this.gameWidth) || this.gameWidth <= 0) this.gameWidth = mmax(1, this.contWidth || 1);
        if (!Number.isFinite(this.gameHeight) || this.gameHeight <= 0) this.gameHeight = mmax(1, this.contHeight || 1);
        /* store logical size before cap so display scale stays constant when only resolution preset changes */
        this._logicalGameWidth = this.gameWidth;
        this._logicalGameHeight = this.gameHeight;
        /* cap internal resolution by puzzle resolution preset (same as render buffer cap) */
        if (typeof getPuzzleResolution === "function" && typeof window.JigsawGetPuzzleResolutionMaxDimensions === "function") {
            const preset = getPuzzleResolution();
            const max = window.JigsawGetPuzzleResolutionMaxDimensions(preset);
            if (max && max.maxW > 0 && max.maxH > 0) {
                const scale = Math.min(max.maxW / this.gameWidth, max.maxH / this.gameHeight, 1);
                this.gameWidth = mmax(1, Math.round(this.gameWidth * scale));
                this.gameHeight = mmax(1, Math.round(this.gameHeight * scale));
            }
        }
        this.gameCanvas = document.createElement('CANVAS');
        this.gameCanvas.width = mmax(1, Math.round(this.gameWidth));
        this.gameCanvas.height = mmax(1, Math.round(this.gameHeight));
        this.gameCtx = this.gameCanvas.getContext("2d");

        let image_enlarge_x=1, image_enlarge_y=1;
        if(window.pieceSides == 6){
            image_enlarge_x = (this.nx + corner_to_shape_dist) / (this.nx);
            image_enlarge_y = (this.ny + 1/2) / (this.ny);
            image_enlarge_x = mmax(image_enlarge_x, image_enlarge_y);
            image_enlarge_y = image_enlarge_x;
        }



        /* scale pieces: use logical size for display so resolution preset only affects quality, not on-screen size */
        // Display-only shrink factor (does not reduce gameCanvas resolution).
        const rawAreaMultiplier = Number(window.PUZZLE_AREA_SURFACE_MULTIPLIER);
        let areaScale = 1;
        if (Number.isFinite(rawAreaMultiplier) && rawAreaMultiplier > 0) {
            // Backward-compatible behavior:
            // - multiplier > 1 : area/surface style shrink (per-axis = 1/sqrt(multiplier))
            // - 0 < multiplier <= 1 : direct per-axis shrink (e.g. 0.9 => 10% workspace)
            areaScale = (rawAreaMultiplier > 1) ? (1 / Math.sqrt(rawAreaMultiplier)) : rawAreaMultiplier;
        }
        const userScale = (Number(window.downsize_to_fit) > 0) ? Number(window.downsize_to_fit) : 1;
        const pieceDisplayScale = Math.min(1, userScale * areaScale);
        this.scalex = pieceDisplayScale * this._logicalGameWidth / this.nx;    // average width of pieces, add zoom here
        this.scaley = pieceDisplayScale * this._logicalGameHeight / this.ny;   // average height of pieces
        this.diff_scalex = 0;
        this.diff_scaley = 0;

        /* hexagonal: scale x/y independently from effective extents to preserve media aspect ratio
           while keeping sampling in-bounds for the full hex footprint. */
        if (window.pieceSides === 6) {
            const hexExtentX = this.nx + 7 / 6;  // corner_to_shape_dist + fake-piece x offset
            const hexExtentY = this.ny + 5 / 6;  // fake-piece y offset
            const hexScaleX = pieceDisplayScale * (this._logicalGameWidth / hexExtentX);
            const hexScaleY = pieceDisplayScale * (this._logicalGameHeight / hexExtentY);
            this.diff_scalex = this.scalex - hexScaleX;
            this.diff_scaley = this.scaley - hexScaleY;
            this.scalex = hexScaleX;
            this.scaley = hexScaleY;
        }

        if(window.make_pieces_square){
            if(window.pieceSides == 4){
                let newx = mmin(this.scalex, this.scaley);
                let newy = newx;
                this.diff_scalex = this.scalex - newx;
                this.diff_scaley = this.scaley - newy;
                this.scalex = newx;
                this.scaley = newy;
                console.log("made pieces square scalex, scaley", this.scalex, this.scaley);
            }else{
                // For hex mode, forcing regular hex geometry here can distort media aspect.
                // Keep the AR-preserving hex scales computed above.
                console.log("kept hex scalex/scaley to preserve media aspect ratio", this.scalex, this.scaley);
            }
        }

        // Keep one canonical media content size for all sampling/conversion paths.
        // Renderers and grayscale preview should convert from this same space.
        if (window.pieceSides === 6) {
            this._mediaContentWidth = (this.nx + 7 / 6) * this.scalex;
            this._mediaContentHeight = (this.ny + 5 / 6) * this.scaley;
        } else {
            this._mediaContentWidth = this.nx * this.scalex;
            this._mediaContentHeight = this.ny * this.scaley;
        }

        console.log(this.diff_scalex, this.gameWidth * window.downsize_to_fit * image_enlarge_x, this.nx)

        // Draw source into buffer at buffer size (gameWidth x gameHeight); display scale is from _logicalGame*.
        const srcDims = this._getSourceDimensions(this.srcImage);
        this.drawParams = this._buildDrawParamsForSource(
            srcDims.w,
            srcDims.h,
            this.gameWidth,
            this.gameHeight,
            !!window.make_pieces_square
        );
        this._gifDraw = this.drawParams;

        this.renderSourceToGameCanvas(this.srcImage);
        

        this.gameCanvas.classList.add("gameCanvas");
        this.gameCanvas.style.zIndex = 100000002;

 
        

        if (Array.isArray(this.pieces)) {
            this.pieces.forEach(row => {
                if (!Array.isArray(row)) return;
                row.forEach(piece => piece.piece_scale(this));
            }); // this.pieces.forEach, safe
        }

        /* calculate offset for centering image in container */
        this.offsx = (this.contWidth - this.gameWidth) / 2;
        this.offsy = (this.contHeight - this.gameHeight) / 2;

        this.refreshConnectionDistance();


    } // Puzzle.scale

    /** Updates only the internal buffer size from the current resolution preset; keeps display size (scalex/scaley) unchanged. */
    applyResolutionPreset() {
        if (this._logicalGameWidth == null || this._logicalGameHeight == null || !this.gameCanvas || !this.gameCtx) return;
        if (!this.srcImage) return;
        let w = this._logicalGameWidth;
        let h = this._logicalGameHeight;
        if (typeof getPuzzleResolution === "function" && typeof window.JigsawGetPuzzleResolutionMaxDimensions === "function") {
            const preset = getPuzzleResolution();
            const max = window.JigsawGetPuzzleResolutionMaxDimensions(preset);
            if (max && max.maxW > 0 && max.maxH > 0) {
                const scale = Math.min(max.maxW / w, max.maxH / h, 1);
                w = mmax(1, Math.round(w * scale));
                h = mmax(1, Math.round(h * scale));
            }
        }
        this.gameWidth = w;
        this.gameHeight = h;
        this.gameCanvas.width = w;
        this.gameCanvas.height = h;
        const srcDims = this._getSourceDimensions(this.srcImage);
        this.drawParams = this._buildDrawParamsForSource(
            srcDims.w,
            srcDims.h,
            w,
            h,
            !!window.make_pieces_square
        );
        this._gifDraw = this.drawParams;
        this.renderSourceToGameCanvas(this.srcImage);
        this.offsx = (this.contWidth - this.gameWidth) / 2;
        this.offsy = (this.contHeight - this.gameHeight) / 2;
    }

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    refreshConnectionDistance() {
        /* computes the distance below which two pieces connect
           depends on the actual size of pieces, with lower limit */
        // Keep merge threshold independent from camera zoom level.
        this.dConnect = 0.85 * mmax(10, mmin(this.scalex, this.scaley) / 10) * getBaseScaleMultiplier();
        this.dConnect *= this.dConnect; // square of distance
    } // Puzzle.refreshConnectionDistance

    getViewMetrics() {
        if (this._viewMetricsCache) return this._viewMetricsCache;
        const br = this.container.getBoundingClientRect();
        const baseScale = getActiveBaseScale();
        const effectiveScale = baseScale * viewState.zoom;
        this._viewMetricsCache = { br, baseScale, effectiveScale };
        return this._viewMetricsCache;
    }

    _invalidateViewMetricsCache() {
        this._viewMetricsCache = null;
    }

    screenToPuzzle(clientX, clientY) {
        const { br, effectiveScale } = this.getViewMetrics();
        return {
            x: (clientX - br.x) / effectiveScale,
            y: (clientY - br.y) / effectiveScale,
            p_x: (clientX - br.x) / br.width,
            p_y: (clientY - br.y) / br.height,
            clientX,
            clientY
        };
    }

    puzzleToScreen(x, y) {
        const { br, effectiveScale } = this.getViewMetrics();
        return {
            x: br.x + x * effectiveScale,
            y: br.y + y * effectiveScale
        };
    }

    relativeMouseCoordinates(event) {

        /* takes mouse coordinates from mouse event
            returns coordinates relative to container, even if page is scrolled or zoommed */

        return this.screenToPuzzle(event.clientX, event.clientY);
    } // Puzzle.relativeMouseCoordinates

    

    evaluateZIndex() {
        if (!Array.isArray(this.polyPieces) || this.polyPieces.length === 0) {
            this._zOrderVersion = (this._zOrderVersion || 0) + 1;
            this._sortedPolyPiecesByZ = [];
            if (rendererFacade && rendererFacade.sceneState) rendererFacade.sceneState.markZOrderDirty();
            return;
        }
        // Keep larger chunks behind smaller chunks while preserving prior order as much as possible.
        // One backward pass is enough after a single merge, making this O(n).
        for (let k = this.polyPieces.length - 1; k > 0; --k) {
            const current = this.polyPieces[k];
            const previous = this.polyPieces[k - 1];
            const currentSize = (current && current.pieces) ? current.pieces.length : 0;
            const previousSize = (previous && previous.pieces) ? previous.pieces.length : 0;
            if (currentSize > previousSize) {
                this.polyPieces[k] = previous;
                this.polyPieces[k - 1] = current;
            }
        }
        // Re-assign zIndex (0-based piece index so no ties when sorting).
        this.polyPieces.forEach((pp, k) => {
            pp._zIndex = k;
        });
        this._zOrderVersion = (this._zOrderVersion || 0) + 1;
        this._sortedPolyPiecesByZ = this.polyPieces.slice();
        this._sortedPolyPiecesVersion = this._zOrderVersion;
        if (rendererFacade && rendererFacade.sceneState) rendererFacade.sceneState.markZOrderDirty();
    } // Puzzle.evaluateZIndex

    renderSourceToGameCanvas(sourceOverride = null) {
        if (!this.gameCtx || !this._gifDraw) return;
      
        const { sx, sy, sw, sh, dx, dy, dw, dh, sourceW, sourceH } = this._gifDraw;
        const source = sourceOverride || this.srcImage;
        if (!source) return;
        const dims = this._getSourceDimensions(source);
        const srcW = Math.max(1, dims.w || sourceW || 1);
        const srcH = Math.max(1, dims.h || sourceH || 1);
        const baseW = Math.max(1, sourceW || srcW);
        const baseH = Math.max(1, sourceH || srcH);
        const scaleX = srcW / baseW;
        const scaleY = srcH / baseH;
        const srcX = Math.max(0, Math.min(srcW - 1, Math.round((sx || 0) * scaleX)));
        const srcY = Math.max(0, Math.min(srcH - 1, Math.round((sy || 0) * scaleY)));
        const srcWDraw = Math.max(1, Math.min(srcW - srcX, Math.round((sw || baseW) * scaleX)));
        const srcHDraw = Math.max(1, Math.min(srcH - srcY, Math.round((sh || baseH) * scaleY)));
        this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
        this.gameCtx.drawImage(source, srcX, srcY, srcWDraw, srcHDraw, dx, dy, dw, dh);
      }

      applyMediaFrame(frameSource, nowMs) {
        if (!frameSource || !this.polyPieces || !this.polyPieces.length) return false;
        const activeRendererName = (rendererFacade && rendererFacade.activeRenderer && rendererFacade.activeRenderer.constructor)
            ? rendererFacade.activeRenderer.constructor.name
            : "";
        const isVideo = !!(frameSource && typeof frameSource.videoWidth === "number");
        const canvas2dWithVideo = activeRendererName === "CanvasRenderer" && isVideo;
        const webglWithVideo = activeRendererName === "WebGLRenderer" && isVideo;
        // For video with WebGL/Canvas2D, the draw is done once per render in the renderer; do not draw here.
        if (!canvas2dWithVideo && !webglWithVideo) {
            this.renderSourceToGameCanvas(frameSource);
        }
        if ((viewState.showGrayscaleReference || viewState.showPreviewOutline) && typeof updateGrayscaleReferenceCanvas === "function") updateGrayscaleReferenceCanvas();
        this._lastMediaFrameMs = nowMs || 0;
        return true;
      }
      
} // class Puzzle
//-----------------------------------------------------------------------------

let loadFile;
let startWebcamSource;
let startLinkCaptureSource;
let mediaBindings = null;

var defaultImagePath = "https://images.pexels.com/photos/147411/italy-mountains-dawn-daybreak-147411.jpeg";
var imagePath = "https://images.pexels.com/photos/147411/italy-mountains-dawn-daybreak-147411.jpeg";

function loadInitialFile() {
    if (mediaBindings && mediaBindings.loadInitialFile) {
        mediaBindings.loadInitialFile();
    } else {
        setImagePath(window.defaultImagePath);
    }
}

//-----------------------------------------------------------------------------
function imageLoaded(puzzle) {
    try {
        const probe = document.createElement("canvas");
        probe.width = 1;
        probe.height = 1;
        const pctx = probe.getContext("2d");
        if (pctx) {
            pctx.drawImage(puzzle.srcImage, 0, 0, 1, 1);
            pctx.getImageData(0, 0, 1, 1);
            puzzle._webglStartBlockedReason = "";
        }
    } catch (_e) {
        puzzle._webglStartBlockedReason = "secure texture upload blocked (CORS)";
    }
    queueGameEvent({ event: "srcImageLoaded" });
    puzzle.imageLoaded = true;
} // imageLoaded

//-----------------------------------------------------------------------------
function fitImage(img, width, height) {
    /* The image is a child of puzzle.container. It will be styled to be as big as possible, not wider than width,
    not higher than height, centered in puzzle.container
    (width and height must be less than or equal to the container dimensions)
    */

    let wn = img.naturalWidth || img.videoWidth || img.width;
    let hn = img.naturalHeight || img.videoHeight || img.height;
    if (!wn || !hn) return;
    let w = width;
    let h = w * hn / wn;
    if (h > height) {
    h = height;
    w = h * wn / hn;
    }
    img.style.position = "absolute";
    img.style.width = w + "px";
    img.style.height = h + "px";
    img.style.top = "50%";
    img.style.left = "50%";
    img.style.transform = "translate(-50%,-50%)";
}

//-----------------------------------------------------------------------------
let animate;
let events = []; // queue for events
let eventQueueHead = 0; // head index to avoid O(n) shift()
let gameStarted = false;
window.gameplayStarted = false;
let manually_load_save_file = false;
let state = 0;

function jigsawPerfNow() {
    return (window.jigsawPerf && typeof window.jigsawPerf.nowMs === "function")
        ? window.jigsawPerf.nowMs()
        : ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now());
}

function queueGameEvent(evt) {
    if (!evt) return;
    if (typeof evt.queuedAt !== "number") evt.queuedAt = jigsawPerfNow();
    events.push(evt);
    if (window.jigsawPerf && typeof window.jigsawPerf.markQueueDepth === "function") {
        window.jigsawPerf.markQueueDepth(events.length - eventQueueHead);
    }
}

syncLegacyViewGlobals();

let tmpImage;
let tmpPreviewCtx = null;
let syncedPreviewCanvas = null;
let syncedPreviewCtx = null;
let lastSyncedPreviewAt = 0;
let hasDrawnStaticSyncedPreview = false;
let prestartPreviewDirty = true; // only redraw prestart when dirty or media animated
let lastPrestartPreviewAt = 0; // throttle animated prestart by framerate
const TARGET_FRAME_MS_ACTIVE = 1000 / 30;
const TARGET_FRAME_MS_STATIC = 1000 / 15;
const TARGET_FRAME_MS_HIDDEN = 1000;
let lastLoopTickMs = 0;
let grayscaleReferenceCanvas = null;
let grayscaleReferenceCtx = null;
let lastGrayscaleUpdateMs = 0;
const GRAYSCALE_VIDEO_INTERVAL_MS = 120;

const PREVIEW_OUTLINE_STROKE_PX = 3;

function updateGrayscaleReferenceCanvas() {
    if (!puzzle || !puzzle.container) return;
    const showGrayscale = !!viewState.showGrayscaleReference;
    const showOutline = !!viewState.showPreviewOutline;
    if (!showGrayscale && !showOutline) {
        if (grayscaleReferenceCanvas && grayscaleReferenceCanvas.parentNode) {
            grayscaleReferenceCanvas.parentNode.removeChild(grayscaleReferenceCanvas);
        }
        grayscaleReferenceCanvas = null;
        grayscaleReferenceCtx = null;
        return;
    }
    if (!puzzle.gameCanvas || !puzzle.gameCtx || typeof puzzle.gameWidth !== "number" || puzzle.gameWidth <= 0 || typeof puzzle.gameHeight !== "number" || puzzle.gameHeight <= 0) return;
    const w = Math.max(1, Math.round(puzzle.gameWidth));
    const h = Math.max(1, Math.round(puzzle.gameHeight));
    const contentW = (typeof puzzle._mediaContentWidth === "number" && puzzle._mediaContentWidth > 0)
        ? puzzle._mediaContentWidth
        : ((puzzle.nx && puzzle.ny) ? puzzle.nx * puzzle.scalex : w);
    const contentH = (typeof puzzle._mediaContentHeight === "number" && puzzle._mediaContentHeight > 0)
        ? puzzle._mediaContentHeight
        : ((puzzle.nx && puzzle.ny) ? puzzle.ny * puzzle.scaley : h);
    const displayW = Math.max(1, Math.round(contentW));
    const displayH = Math.max(1, Math.round(contentH));
    const halfRes = 2;
    const bufW = Math.max(1, Math.floor(w / halfRes));
    const bufH = Math.max(1, Math.floor(h / halfRes));
    if (!grayscaleReferenceCanvas) {
        grayscaleReferenceCanvas = document.createElement("canvas");
        grayscaleReferenceCtx = grayscaleReferenceCanvas.getContext("2d");
        grayscaleReferenceCanvas.className = "grayscale-reference-canvas";
        grayscaleReferenceCanvas.style.position = "absolute";
        grayscaleReferenceCanvas.style.pointerEvents = "none";
        grayscaleReferenceCanvas.style.zIndex = "99999997";
    }
    // Only resize when dimensions change; setting width/height clears the canvas and causes
    // flicker when grayscale is throttled (video/camera) because we clear every frame but draw only every 120ms.
    if (grayscaleReferenceCanvas.width !== bufW || grayscaleReferenceCanvas.height !== bufH) {
        grayscaleReferenceCanvas.width = bufW;
        grayscaleReferenceCanvas.height = bufH;
    }
    grayscaleReferenceCanvas.style.width = displayW + "px";
    grayscaleReferenceCanvas.style.height = displayH + "px";
    const grayscaleLeft = (puzzle.contWidth != null && puzzle.contHeight != null) ? (puzzle.contWidth - displayW) / 2 : (puzzle.offsx || 0);
    const grayscaleTop = (puzzle.contWidth != null && puzzle.contHeight != null) ? (puzzle.contHeight - displayH) / 2 : (puzzle.offsy || 0);
    grayscaleReferenceCanvas.style.left = grayscaleLeft + "px";
    grayscaleReferenceCanvas.style.top = grayscaleTop + "px";
    if (!grayscaleReferenceCtx) return;

    if (showGrayscale) {
        const nowMs = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
        const frameSource = (typeof rendererFacade !== "undefined" && rendererFacade && rendererFacade.media && typeof rendererFacade.media.getFrameSource === "function") ? rendererFacade.media.getFrameSource() : null;
        const mediaStatus = (typeof rendererFacade !== "undefined" && rendererFacade && rendererFacade.media && typeof rendererFacade.media.getStatus === "function") ? rendererFacade.media.getStatus() : null;
        const kind = mediaStatus && mediaStatus.kind ? mediaStatus.kind : "image";
        const isVideoSource = !!(frameSource && typeof frameSource.videoWidth === "number" && typeof frameSource.videoHeight === "number");
        const isAnimated = isVideoSource || kind === "gif-decoded";
        if (!isAnimated || (nowMs - lastGrayscaleUpdateMs) >= GRAYSCALE_VIDEO_INTERVAL_MS) {
            if (isAnimated) lastGrayscaleUpdateMs = nowMs;
            grayscaleReferenceCtx.filter = "grayscale(1) contrast(0.5)";
            if (isVideoSource && frameSource && puzzle._gifDraw) {
                const g = puzzle._gifDraw;
                const vw = Math.max(1, frameSource.videoWidth || 1);
                const vh = Math.max(1, frameSource.videoHeight || 1);
                const dx = g.dx / halfRes;
                const dy = g.dy / halfRes;
                const dw = g.dw / halfRes;
                const dh = g.dh / halfRes;
                const baseW = Math.max(1, g.sourceW || vw);
                const baseH = Math.max(1, g.sourceH || vh);
                const sx = Math.max(0, Math.min(vw - 1, Math.round((g.sx || 0) * (vw / baseW))));
                const sy = Math.max(0, Math.min(vh - 1, Math.round((g.sy || 0) * (vh / baseH))));
                const sw = Math.max(1, Math.min(vw - sx, Math.round((g.sw || baseW) * (vw / baseW))));
                const sh = Math.max(1, Math.min(vh - sy, Math.round((g.sh || baseH) * (vh / baseH))));
                grayscaleReferenceCtx.drawImage(frameSource, sx, sy, sw, sh, dx, dy, dw, dh);
            } else if (kind === "gif-decoded" && frameSource && typeof frameSource.width === "number" && typeof frameSource.height === "number") {
                grayscaleReferenceCtx.drawImage(frameSource, 0, 0, frameSource.width, frameSource.height, 0, 0, bufW, bufH);
            } else {
                grayscaleReferenceCtx.drawImage(puzzle.gameCanvas, 0, 0, w, h, 0, 0, bufW, bufH);
            }
            grayscaleReferenceCtx.filter = "none";
        }
    } else {
        grayscaleReferenceCtx.clearRect(0, 0, bufW, bufH);
    }

    if (showOutline) {
        const L = PREVIEW_OUTLINE_STROKE_PX;
        grayscaleReferenceCtx.strokeStyle = "rgba(0,0,0,0.45)";
        grayscaleReferenceCtx.lineWidth = L;
        let ox, oy, ow, oh;
        if (puzzle._gifDraw && typeof puzzle._gifDraw.dx === "number" && typeof puzzle._gifDraw.dw === "number") {
            const g = puzzle._gifDraw;
            ox = (g.dx || 0) / halfRes;
            oy = (g.dy || 0) / halfRes;
            ow = Math.min(g.dw, w) / halfRes;
            oh = Math.min(g.dh, h) / halfRes;
        } else {
            ox = 0;
            oy = 0;
            ow = bufW;
            oh = bufH;
        }
        grayscaleReferenceCtx.strokeRect(ox + L / 2, oy + L / 2, Math.max(0, ow - L), Math.max(0, oh - L));
    }

    if (!grayscaleReferenceCanvas.parentNode) {
        puzzle.container.insertBefore(grayscaleReferenceCanvas, puzzle.container.firstChild);
    }
}
window.updateGrayscaleReferenceCanvas = updateGrayscaleReferenceCanvas;

let dropLocationTarget = null;
let dropTargetDragState = null;

function applyDropLocationTargetColor(el) {
    if (!el || !viewState.dropLocationColor) return;
    const hex = viewState.dropLocationColor.replace(/^#/, "");
    const r = hex.length === 3 ? (parseInt(hex[0] + hex[0], 16)) : parseInt(hex.slice(0, 2), 16);
    const g = hex.length === 3 ? (parseInt(hex[1] + hex[1], 16)) : parseInt(hex.slice(2, 4), 16);
    const b = hex.length === 3 ? (parseInt(hex[2] + hex[2], 16)) : parseInt(hex.slice(4, 6), 16);
    el.style.borderColor = viewState.dropLocationColor;
    el.style.background = "rgba(" + r + "," + g + "," + b + ",0.2)";
}

function createDropLocationTarget() {
    if (dropLocationTarget) return dropLocationTarget;
    const el = document.createElement("div");
    el.id = "dropLocationTarget";
    el.className = "drop-location-target";
    el.setAttribute("aria-label", "Drop location for new pieces (drag to move)");
    el.title = "Drag to set where new pieces appear";
    el.style.cssText = "position:absolute;width:48px;height:48px;border-radius:50%;border:3px solid;transform:translate(-50%,-50%);pointer-events:auto;z-index:2147483646;box-sizing:border-box;";
    applyDropLocationTargetColor(el);
    function clampNorm(v) { return Math.max(0.02, Math.min(0.98, v)); }
    function updatePositionFromClient(clientX, clientY) {
        if (!puzzle || !puzzle.container) return;
        const br = puzzle.container.getBoundingClientRect();
        if (br.width <= 0 || br.height <= 0) return;
        const normX = clampNorm((clientX - br.left) / br.width);
        const normY = clampNorm((clientY - br.top) / br.height);
        viewState.customDropNormX = normX;
        viewState.customDropNormY = normY;
        el.style.left = (normX * 100) + "%";
        el.style.top = (normY * 100) + "%";
    }
    function onPointerMove(e) {
        if (!dropTargetDragState || !dropTargetDragState.active) return;
        e.preventDefault();
        const clientX = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY != null ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        updatePositionFromClient(clientX, clientY);
    }
    function onPointerUp() {
        if (!dropTargetDragState) return;
        dropTargetDragState.active = false;
        document.removeEventListener("pointermove", onPointerMove, true);
        document.removeEventListener("pointerup", onPointerUp, true);
        document.removeEventListener("pointercancel", onPointerUp, true);
    }
    el.addEventListener("pointerdown", function (e) {
        if (!viewState.useCustomDropLocation || !puzzle || !puzzle.container) return;
        e.preventDefault();
        e.stopPropagation();
        dropTargetDragState = { active: true };
        updatePositionFromClient(e.clientX, e.clientY);
        document.addEventListener("pointermove", onPointerMove, true);
        document.addEventListener("pointerup", onPointerUp, true);
        document.addEventListener("pointercancel", onPointerUp, true);
    });
    dropLocationTarget = el;
    return el;
}

function updateDropLocationTarget() {
    if (!viewState.useCustomDropLocation) {
        if (dropLocationTarget) {
            dropLocationTarget.style.display = "none";
            dropLocationTarget.style.pointerEvents = "none";
        }
        return;
    }
    if (!puzzle || !puzzle.container) return;
    const el = createDropLocationTarget();
    const nx = viewState.customDropNormX != null ? viewState.customDropNormX : 0.1;
    const ny = viewState.customDropNormY != null ? viewState.customDropNormY : 0.1;
    el.style.left = (nx * 100) + "%";
    el.style.top = (ny * 100) + "%";
    el.style.display = "block";
    el.style.pointerEvents = "auto";
    applyDropLocationTargetColor(el);
    if (el.parentNode !== puzzle.container) {
        puzzle.container.appendChild(el);
    }
}
window.updateDropLocationTarget = updateDropLocationTarget;

function getPreviewSourceDimensions(source) {
    if (!source) return { w: 0, h: 0 };
    const w = source.videoWidth || source.naturalWidth || source.width || 0;
    const h = source.videoHeight || source.naturalHeight || source.height || 0;
    return { w: w | 0, h: h | 0 };
}

function resolvePrestartPreviewSource() {
    if (rendererFacade && rendererFacade.media && rendererFacade.media.getFrameSource) {
        const src = rendererFacade.media.getFrameSource();
        if (src) return src;
    }
    return puzzle && puzzle.srcImage ? puzzle.srcImage : null;
}

function ensurePreviewPuzzleDimensions() {
    if (!puzzle || typeof puzzle.computenxAndny !== "function") return;
    if (!(Number.isFinite(apnx) && Number.isFinite(apny) && apnx > 0 && apny > 0)) return;
    if (puzzle.nx !== apnx || puzzle.ny !== apny) {
        puzzle.computenxAndny(apnx, apny);
        puzzle._previewDimsChanged = true;
    }
}

function getPrestartPreviewDisplaySize() {
    if (!puzzle) return { w: 1, h: 1 };
    const w = (typeof puzzle._mediaContentWidth === "number" && puzzle._mediaContentWidth > 0)
        ? puzzle._mediaContentWidth
        : ((typeof puzzle.gameWidth === "number" && puzzle.gameWidth > 0) ? puzzle.gameWidth : (puzzle.contWidth || 1));
    const h = (typeof puzzle._mediaContentHeight === "number" && puzzle._mediaContentHeight > 0)
        ? puzzle._mediaContentHeight
        : ((typeof puzzle.gameHeight === "number" && puzzle.gameHeight > 0) ? puzzle.gameHeight : (puzzle.contHeight || 1));
    return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)) };
}

function layoutPrestartPreviewCanvas() {
    if (!tmpImage || !puzzle) return;
    const display = getPrestartPreviewDisplaySize();
    tmpImage.style.position = "absolute";
    tmpImage.style.width = display.w + "px";
    tmpImage.style.height = display.h + "px";
    tmpImage.style.top = "50%";
    tmpImage.style.left = "50%";
    tmpImage.style.transform = "translate(-50%,-50%)";
}

function drawSyncedPreviewWindowFrame() {
    if (!syncedPreviewCanvas) {
        syncedPreviewCanvas = document.getElementById("prevsync");
        if (!syncedPreviewCanvas) return;
        syncedPreviewCtx = syncedPreviewCanvas.getContext("2d");
    }
    if (!syncedPreviewCtx) return;
    const parent = syncedPreviewCanvas.parentElement;
    if (parent && parent.style && parent.style.display === "none") return;
    const source = resolvePrestartPreviewSource();
    if (!source) return;
    if (source.tagName === "VIDEO" && source.readyState < 2) return;
    const dims = getPreviewSourceDimensions(source);
    if (dims.w <= 0 || dims.h <= 0) return;
    let resized = false;
    if (syncedPreviewCanvas.width !== dims.w || syncedPreviewCanvas.height !== dims.h) {
        syncedPreviewCanvas.width = dims.w;
        syncedPreviewCanvas.height = dims.h;
        resized = true;
    }
    syncedPreviewCtx.clearRect(0, 0, syncedPreviewCanvas.width, syncedPreviewCanvas.height);
    syncedPreviewCtx.drawImage(source, 0, 0, syncedPreviewCanvas.width, syncedPreviewCanvas.height);
    if (resized && typeof window.requestPreviewSyncResize === "function") {
        window.requestPreviewSyncResize();
    }
}

function drawPrestartPreviewFrame() {
    if (!tmpImage || tmpImage.tagName !== "CANVAS" || !tmpPreviewCtx) return;
    const source = resolvePrestartPreviewSource();
    if (!source) return;
    if (source.tagName === "VIDEO" && source.readyState < 2) return;
    if (!puzzle) return;
    ensurePreviewPuzzleDimensions();
    if (puzzle._previewDimsChanged || !(puzzle.gameWidth > 0) || !(puzzle.gameHeight > 0)) {
        puzzle._previewDimsChanged = false;
        if (typeof puzzle.puzzle_scale === "function") puzzle.puzzle_scale();
    }
    const internalW = Math.max(1, Math.round(puzzle.gameWidth || 1));
    const internalH = Math.max(1, Math.round(puzzle.gameHeight || 1));
    if (tmpImage.width !== internalW || tmpImage.height !== internalH) {
        tmpImage.width = internalW;
        tmpImage.height = internalH;
    }
    layoutPrestartPreviewCanvas();
    if (typeof puzzle.renderSourceToGameCanvas === "function") puzzle.renderSourceToGameCanvas(source);
    tmpPreviewCtx.clearRect(0, 0, tmpImage.width, tmpImage.height);
    if (puzzle.gameCanvas) {
        tmpPreviewCtx.drawImage(puzzle.gameCanvas, 0, 0, tmpImage.width, tmpImage.height);
    } else {
        tmpPreviewCtx.drawImage(source, 0, 0, tmpImage.width, tmpImage.height);
    }
}

function loadImageFunction(){
    if (!window.play_solo && window.is_connected && window.puzzleAreaScale === "Picture" && !window.canonicalOAspectFetched) {
        window.canonicalOAspectFetched = true;
        const keyO = `JIG_PROG_${window.slot}_O`;
        const client = window.getAPClient && window.getAPClient();
        if (client && client.storage && typeof client.storage.fetch === "function") {
            client.storage.fetch([keyO]).then(function (results) {
                const val = results && results[keyO];
                if (val != null && val !== "" && Number.isFinite(parseFloat(val))) {
                    window.canonicalPictureAspectRatio = parseFloat(val);
                } else {
                    window.canonicalPictureAspectRatio = null;
                }
            }).catch(function () {
                window.canonicalPictureAspectRatio = null;
            });
        }
    }
    puzzle.container.innerHTML = ""; // forget contents
    tmpImage = document.createElement("canvas");
    tmpPreviewCtx = tmpImage.getContext("2d");
    const source = resolvePrestartPreviewSource();
    const dims = getPreviewSourceDimensions(source);
    tmpImage.width = Math.max(1, dims.w || (puzzle.srcImage.naturalWidth | 0) || 1);
    tmpImage.height = Math.max(1, dims.h || (puzzle.srcImage.naturalHeight | 0) || 1);
    // console.log(puzzle.srcImage.src)
    if (window.puzzleAreaScale && typeof puzzle.sizeContainerByAspectRatio === "function") {
        const ar = getEffectivePuzzleAreaAspectRatio(puzzle.srcImage);
        puzzle.sizeContainerByAspectRatio(ar);
    } else {
        puzzle.getContainerSize();
    }
    ensurePreviewPuzzleDimensions();
    if (typeof puzzle.puzzle_scale === "function") puzzle.puzzle_scale();
    layoutPrestartPreviewCanvas();
    
    tmpImage.style.boxShadow = `${0.02 * puzzle.contWidth}px ${0.02 * puzzle.contWidth}px ${0.02 * puzzle.contWidth}px rgba(0, 0, 0, 0.5)`;
    
    puzzle.container.appendChild(tmpImage);
    drawPrestartPreviewFrame();
    prestartPreviewDirty = false;

    puzzle.prevWidth = puzzle.contWidth;
    puzzle.prevHeight = puzzle.contHeight;
}

if (window.JigsawMediaBindings && typeof window.JigsawMediaBindings.create === "function") {
    mediaBindings = window.JigsawMediaBindings.create({
        getPuzzle: () => puzzle,
        getRendererFacade: () => rendererFacade,
        getRendererConfig: () => window.rendererConfig,
        getImagePath: () => imagePath,
        setImagePath: (value) => { imagePath = value; },
        loadImageFunction: loadImageFunction
    });
    loadFile = mediaBindings.buildLoadFileHandler();
    startWebcamSource = function () { return mediaBindings.startWebcamSource(); };
    startLinkCaptureSource = function (stream) { return mediaBindings.startLinkCaptureSource(stream); };
}
if (!loadFile) loadFile = function () {};
if (!startWebcamSource) startWebcamSource = async function () {};
if (!startLinkCaptureSource) startLinkCaptureSource = async function () {};

let moving; // for information about moved piece
function setMovingState(nextMoving) {
    moving = nextMoving;
    window.moving = nextMoving || null;
    if (!nextMoving && window.jigsawPerf && typeof window.jigsawPerf.cancelPendingPickup === "function") {
        window.jigsawPerf.cancelPendingPickup();
    }
}
setMovingState(null);

function preventZoomWhileHoldingPiece(e) {
    if (moving && moving.pp) e.preventDefault();
}
document.addEventListener("gesturestart", preventZoomWhileHoldingPiece, { passive: false, capture: true });
document.addEventListener("gesturechange", preventZoomWhileHoldingPiece, { passive: false, capture: true });
document.addEventListener("gestureend", preventZoomWhileHoldingPiece, { passive: false, capture: true });
{ // scope for animate
    let stateAfterPan = 50;
    const HELD_Z_INDEX = 2147483647;

    function setHeldPieceState(pp, held) {
        if (!pp) return;
        pp._isHeld = !!held;
        if (held) {
            pp._zIndex = HELD_Z_INDEX;
            puzzle._zOrderVersion = (puzzle._zOrderVersion || 0) + 1;
            if (rendererFacade && rendererFacade.sceneState && rendererFacade.sceneState.markZOrderDirty) {
                rendererFacade.sceneState.markZOrderDirty();
            }
        } else {
            // Restore chunk-size layering on release; avoids permanently pinning large chunks on top.
            if (typeof puzzle.evaluateZIndex === "function") {
                puzzle.evaluateZIndex();
                // Tie-break for equal-size chunks: most recently held chunk should be on top of its size band.
                const pieces = Array.isArray(puzzle.polyPieces) ? puzzle.polyPieces : null;
                if (pieces && pieces.length > 1) {
                    const releasedSize = (pp && pp.pieces) ? pp.pieces.length : 0;
                    const from = pieces.indexOf(pp);
                    if (from >= 0) {
                        let to = from;
                        while (to + 1 < pieces.length) {
                            const next = pieces[to + 1];
                            const nextSize = (next && next.pieces) ? next.pieces.length : 0;
                            if (nextSize !== releasedSize) break;
                            to++;
                        }
                        if (to > from) {
                            pieces.splice(from, 1);
                            pieces.splice(to, 0, pp);
                            for (let k = 0; k < pieces.length; k++) pieces[k]._zIndex = k;
                            puzzle._zOrderVersion = (puzzle._zOrderVersion || 0) + 1;
                            puzzle._sortedPolyPiecesByZ = pieces.slice();
                            puzzle._sortedPolyPiecesVersion = puzzle._zOrderVersion;
                            if (rendererFacade && rendererFacade.sceneState) rendererFacade.sceneState.markZOrderDirty();
                        }
                    }
                }
            } else {
                puzzle._zOrderVersion = (puzzle._zOrderVersion || 0) + 1;
            }
        }
        // Hold state only changes ordering/shadow treatment; avoid expensive geometry/overlay rebuilds here.
        if (rendererFacade && rendererFacade.sceneState) rendererFacade.sceneState.markPieceDirty(pp);
    }

    function applyPanMoveEvent(event) {
        const deltaClientX = event.position.clientX - startDragClientX;
        const deltaClientY = event.position.clientY - startDragClientY;
        if (!puzzle.contWidth || !puzzle.contHeight) puzzle.getContainerSize();
        const baseScale = getActiveBaseScale();
        const panScaleW = (puzzle.contWidth || 1) * baseScale;
        const panScaleH = (puzzle.contHeight || 1) * baseScale;
        viewState.panX += (deltaClientX / panScaleW) * viewState.panSensitivity;
        viewState.panY += (deltaClientY / panScaleH) * viewState.panSensitivity;
        startDragClientX = event.position.clientX;
        startDragClientY = event.position.clientY;
        applyViewTransform(true);
    }

    function applyPieceMoveEvent(event, perfMonitor) {
        const dragMoveStartedAt = jigsawPerfNow();
        if (perfMonitor && typeof perfMonitor.recordFirstMove === "function") {
            perfMonitor.recordFirstMove(dragMoveStartedAt);
        }
        const event2_x = event.position.x;
        const event2_y = event.position.y;
        moving.xMouse = event2_x;
        moving.yMouse = event2_y;
        let to_x = event2_x - moving.xMouseInit + moving.ppXInit;
        let to_y = event2_y - moving.yMouseInit + moving.ppYInit;

        moving.pp.moveTo(to_x, to_y);
        moving.pp.moveAwayFromBorder();
        moving.pp.hasMovedEver = true;
        if (window.gameplayStarted && !window.play_solo) {
            const movingSyncId = getPolyPieceSyncId(moving.pp);
            if(window.rotations == 0){
                if (movingSyncId !== null) change_savedata_datastorage(movingSyncId, [to_x / puzzle.contWidth, to_y / puzzle.contHeight], false);
            }else{
                if (movingSyncId !== null) change_savedata_datastorage(movingSyncId, [to_x / puzzle.contWidth, to_y / puzzle.contHeight, moving.pp.rot], false);
            }
        }
        if (perfMonitor && typeof perfMonitor.recordDragMove === "function") {
            perfMonitor.recordDragMove(jigsawPerfNow() - dragMoveStartedAt);
        }
    }

    function tryBeginPiecePickup(event, perfMonitor) {
        if (!event || event.event !== "touch" || event.button !== 0) return false;
        if (!window.is_connected && !window.play_solo) return false;
        const event_x = event.position.x;
        const event_y = event.position.y;
        const acquireStartedAt = jigsawPerfNow();
        const hitPiece = rendererFacade
            ? rendererFacade.findTopPieceAt(puzzle, event_x, event_y)
            : (hitTestService && hitTestService.findTopPieceAt(puzzle, event_x, event_y));
        if (perfMonitor && typeof perfMonitor.recordPickupAcquire === "function") {
            perfMonitor.recordPickupAcquire(jigsawPerfNow() - acquireStartedAt, !!hitPiece);
        }
        if (!hitPiece) return false;
        setMovingState({
            xMouseInit: event_x,
            yMouseInit: event_y,
            xMouse: event_x,
            yMouse: event_y,
            pp: hitPiece,
            ppXInit: hitPiece.x,
            ppYInit: hitPiece.y
        });
        setHeldPieceState(hitPiece, true);
        if (perfMonitor && typeof perfMonitor.beginPickup === "function") {
            perfMonitor.beginPickup(jigsawPerfNow());
        }
        puzzle._releaseHandled = true;
        state = 55;
        return true;
    }

    function dequeueNextEvent(perfMonitor) {
        const queueLength = events.length - eventQueueHead;
        if (perfMonitor && typeof perfMonitor.markQueueDepth === "function") {
            perfMonitor.markQueueDepth(queueLength);
        }
        if (queueLength <= 0) {
            events.length = 0;
            eventQueueHead = 0;
            return null;
        }
        let evt = events[eventQueueHead++];
        if (evt && typeof evt.queuedAt === "number" && perfMonitor && typeof perfMonitor.recordQueueDelay === "function") {
            perfMonitor.recordQueueDelay(Math.max(0, jigsawPerfNow() - evt.queuedAt));
        }
        // Drain consecutive move bursts so drag follows latest pointer position.
        if (evt && evt.event === "move") {
            while (eventQueueHead < events.length && events[eventQueueHead].event === "move") {
                evt = events[eventQueueHead++];
                if (evt && typeof evt.queuedAt === "number" && perfMonitor && typeof perfMonitor.recordQueueDelay === "function") {
                    perfMonitor.recordQueueDelay(Math.max(0, jigsawPerfNow() - evt.queuedAt));
                }
            }
        }
        if (eventQueueHead >= events.length) {
            events.length = 0;
            eventQueueHead = 0;
        }
        return evt;
    }

    animate = function () {
        requestAnimationFrame(animate);
        const perfMonitor = window.jigsawPerf || null;
        const frameStartedAt = jigsawPerfNow();
        try {
        const nowMs = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
        let event = dequeueNextEvent(perfMonitor);
        // For drag/pan move events, apply input before rendering this frame.
        if (event && event.event === "move") {
            const preRenderDispatchStartedAt = jigsawPerfNow();
            if (state === 52) {
                applyPanMoveEvent(event);
                event = null;
            } else if (state === 55 && moving && moving.pp) {
                if (event.position.x == null || event.position.y == null) {
                    const pos = puzzle.screenToPuzzle(event.position.clientX, event.position.clientY);
                    event.position.x = pos.x;
                    event.position.y = pos.y;
                    event.position.p_x = pos.p_x;
                    event.position.p_y = pos.p_y;
                }
                applyPieceMoveEvent(event, perfMonitor);
                event = null;
            }
            if (!event && perfMonitor && typeof perfMonitor.recordEventDispatch === "function") {
                perfMonitor.recordEventDispatch(jigsawPerfNow() - preRenderDispatchStartedAt);
            }
        } else if (event && state === 50 && tryBeginPiecePickup(event, perfMonitor)) {
            if (perfMonitor && typeof perfMonitor.recordEventDispatch === "function") {
                perfMonitor.recordEventDispatch(Math.max(0, jigsawPerfNow() - (event.queuedAt || jigsawPerfNow())));
            }
            event = null;
        }
        const isPageHidden = typeof document !== "undefined" && document.visibilityState !== "visible";
        const isStatic = !(moving && moving.pp) && !(rendererFacade && typeof rendererFacade.isMediaAnimated === "function" && rendererFacade.isMediaAnimated());
        const currentRenderCapMs = isPageHidden ? TARGET_FRAME_MS_HIDDEN : (isStatic ? TARGET_FRAME_MS_STATIC : TARGET_FRAME_MS_ACTIVE);
        if (rendererFacade && rendererFacade.scheduler) rendererFacade.scheduler.targetFrameMs = currentRenderCapMs;
        const elapsedSinceLoopTick = nowMs - lastLoopTickMs;
        const runRenderPhase = lastLoopTickMs === 0 || elapsedSinceLoopTick >= currentRenderCapMs;
        if (runRenderPhase) {
            lastLoopTickMs = nowMs;
            // Process piece setup (e.g. merge redraws) before rendering so merged polys use updated canvas content this frame.
            const setupStartedAt = jigsawPerfNow();
            if (pieceSetupQueueApi && pieceSetupQueueApi.processPieceSetupQueue) pieceSetupQueueApi.processPieceSetupQueue();
            if (perfMonitor && typeof perfMonitor.recordSetupQueue === "function") {
                perfMonitor.recordSetupQueue(jigsawPerfNow() - setupStartedAt);
            }
            const renderStartedAt = jigsawPerfNow();
            if (rendererFacade) rendererFacade.renderFrame(nowMs);
            if (perfMonitor && typeof perfMonitor.recordRender === "function") {
                perfMonitor.recordRender(jigsawPerfNow() - renderStartedAt);
            }
            if (state < 50) hasDrawnStaticSyncedPreview = false;
            const animated = rendererFacade && typeof rendererFacade.isMediaAnimated === "function" && rendererFacade.isMediaAnimated();
            if (animated) {
                const previewIntervalMs = (rendererFacade && rendererFacade.scheduler) ? rendererFacade.scheduler.targetFrameMs : TARGET_FRAME_MS_ACTIVE;
                if (nowMs - lastSyncedPreviewAt >= previewIntervalMs) {
                    drawSyncedPreviewWindowFrame();
                    lastSyncedPreviewAt = nowMs;
                }
                hasDrawnStaticSyncedPreview = false;
            } else if (state >= 50 && !hasDrawnStaticSyncedPreview) {
                drawSyncedPreviewWindowFrame();
                hasDrawnStaticSyncedPreview = true;
            }
            if (state === 15) {
                const prestartAnimated = rendererFacade && typeof rendererFacade.isMediaAnimated === "function" && rendererFacade.isMediaAnimated();
                if (prestartPreviewDirty) {
                    drawPrestartPreviewFrame();
                    prestartPreviewDirty = false;
                    lastPrestartPreviewAt = nowMs;
                } else if (prestartAnimated) {
                    const intervalMs = (rendererFacade && rendererFacade.scheduler) ? rendererFacade.scheduler.targetFrameMs : TARGET_FRAME_MS_ACTIVE;
                    if (nowMs - lastPrestartPreviewAt >= intervalMs) {
                        drawPrestartPreviewFrame();
                        lastPrestartPreviewAt = nowMs;
                    }
                }
            }
        }

        const eventDispatchStartedAt = event ? jigsawPerfNow() : 0;
        try {
        if (event && event.event === "puzzleAreaScaleChanged" && puzzle) {
            const srcImg = puzzle.srcImage || null;
            const ar = getEffectivePuzzleAreaAspectRatio(srcImg);
            if (state === 15 && tmpImage) {
                puzzle.sizeContainerByAspectRatio(ar);
                puzzle.puzzle_scale();
                layoutPrestartPreviewCanvas();
                prestartPreviewDirty = true;
            } else if (state >= 25) {
                puzzle.puzzle_scale();
                if (rendererFacade) maybeOnResize(puzzle, rendererFacade);
            }
            applyViewTransform();
            return;
        }
        
        // resize event
        if (event && event.event == "resize") {

            if (!viewState.enableScaling) {
                if (puzzle) {
                    puzzle.getContainerSize();
                    puzzle.prevWidth = puzzle.contWidth;
                    puzzle.prevHeight = puzzle.contHeight;
                    applyViewTransform();
                }
                return;
            }

            // remember dimensions of container before resize
            puzzle.getContainerSize();
            if (state == 15 || state > 60) { // resize initial or final picture
                puzzle.puzzle_scale();
                layoutPrestartPreviewCanvas();
                if (state == 15) prestartPreviewDirty = true;
            }
            else if (state >= 25) { // resize pieces
                puzzle.puzzle_scale();
                if (rendererFacade) maybeOnResize(puzzle, rendererFacade);

                const x_change = puzzle.contWidth / puzzle.prevWidth;
                const y_change = puzzle.contHeight / puzzle.prevHeight;

                puzzle.polyPieces.forEach(pp => {
                    pp.moveTo(pp.x * x_change, pp.y * y_change);
                    queuePolyPieceSetup(pp, false, false);
                });
                if (rendererFacade && rendererFacade.sceneState) rendererFacade.sceneState.markAllDirty();
            }
            
            puzzle.prevWidth = puzzle.contWidth;
            puzzle.prevHeight = puzzle.contHeight;

            applyViewTransform();
            if (rendererFacade && puzzle) maybeOnResize(puzzle, rendererFacade);
            if (state >= 25 && typeof updateGrayscaleReferenceCanvas === "function") updateGrayscaleReferenceCanvas();

            return;
        } // resize event

        if(window.goTo8888State){
            state = 8888;
        }

        switch (state) {
            /* initialisation */
            case 0:
                
                if((window.is_connected || window.play_solo) && window.set_ap_image && window.choose_ap_image){
                    state = 10;
                }else{
                    return;
                }
            break;

            case 10: // load image
                document.getElementById("m4").textContent = "Loading image...";
                loadImageFunction();
                document.getElementById("m4").textContent = "Start";
                state = 15;
                return;


            /* wait for choice of number of pieces */
            case 15:
                if (event && event.event == "srcImageLoaded") {
                    // display centered initial image
                    loadImageFunction();
                    return;
                } 
                
                if ((event && event.event == "nbpieces") || (window.LoginStart && window.is_connected) || (window.start_solo_immediately)) {
                    if (!puzzle.imageLoaded || !(puzzle.srcImage.naturalWidth > 0) || !(puzzle.srcImage.naturalHeight > 0)) {
                        document.getElementById("m4").textContent = "Loading image...";
                        return;
                    }
                    document.getElementById("m4").textContent = "Loading pieces...";

                    bevel_size = localStorage.getItem("option_bevel_2");
                    if (bevel_size === null) bevel_size = 0.1;

                    state = 17;
                    if(window.is_connected){
                        if(window.apworld == "0.2.0" || window.apworld == "0.3.0"){
                            localStorage.setItem(`image_${window.apseed}_${window.slot}`, imagePath);
                        }else{
                            const dbRequest = indexedDB.open("ImageDatabase", 1);

                            dbRequest.onupgradeneeded = (event) => {
                                const db = event.target.result;
                                if (!db.objectStoreNames.contains("images")) {
                                    db.createObjectStore("images", { keyPath: "id" });
                                }
                            };

                            dbRequest.onsuccess = (event) => {
                                const db = event.target.result;
                                const transaction = db.transaction(["images"], "readwrite");
                                const store = transaction.objectStore("images");
                                const putRequest = store.put({ id: `${window.apseed}_${window.slot}`, imagePath });

                                putRequest.onsuccess = () => {
                                    console.log("Image successfully saved to IndexedDB.");
                                };

                                putRequest.onerror = () => {
                                    console.log("Error saving image to IndexedDB.");
                                };
                            };

                            dbRequest.onerror = () => {
                                console.log("Error opening IndexedDB.");
                            };
                        }
                    }
                }

                /* allow pan during pre-start (preview) phase */
                if (event && event.event === "touch" && event.button === viewState.panButton && viewState.enablePan) {
                    startDragClientX = event.position.clientX;
                    startDragClientY = event.position.clientY;
                    stateAfterPan = 15;
                    puzzle._releaseHandled = true;
                    state = 52;
                    break;
                }
                
                return;

            
            case 17: // load save!

                if(unlocked_pieces.length == 0){
                    console.log("No unlocked pieces!")
                    return;
                }
                
                state = 18;
                accept_pending_actions = true;

                get_save_data_from_data_storage();

                async function get_save_data_from_data_storage(keys) {
                    window.save_file = {};
                    if(!window.play_solo){
                        let keys = [];
                
                        for (let p = 1; p <= apnx * apny; p++) {
                            keys.push(`JIG_PROG_${window.slot}_${p}`);
                        }
                        if(window.fake_pieces_mimic.length >= 1){
                            for (let p = 1; p <= window.fake_pieces_mimic.length; p++) {
                                keys.push(`JIG_PROG_${window.slot}_${-p}`);
                            }
                        }

                        let client = window.getAPClient();                  

                        await client.storage.notify(keys, (key, value, oldValue) => {
                            console.log("notify", key, value, oldValue);
                            do_action(key, value, oldValue, false);
                        });

                        keys.push(`JIG_PROG_${window.slot}_M`);
                        keys.push(`JIG_PROG_${window.slot}_O`);

                        let results = (await client.storage.fetch(keys, true))
                        console.log("results", results)
                        
                        for (let [key, value] of Object.entries(results)) {
                            let spl = key.split("_")[3];
                            if (spl === "O"){
                                if (value != null && value !== "" && Number.isFinite(parseFloat(value))) {
                                    window.canonicalPictureAspectRatio = parseFloat(value);
                                } else {
                                    window.canonicalPictureAspectRatio = null;
                                }
                                change_savedata_datastorage("O", puzzle.srcImage.width / puzzle.srcImage.height, true);
                            }else{
                                if(value){
                                    if (spl === "M") {
                                        numberOfMergesAtStart = parseInt(value);
                                    }else {
                                        let pp_index = parseInt(spl);
                                        window.save_file[pp_index] = [value, true];
                                    }
                                }
                            }
                            
                        }
                    }

                    let num_rots = Math.round(360 / window.rotations);
                    if (window.rotations == 0) num_rots = 1;

                    (function () { const arr = unlocked_pieces.slice(); shuffleArray(arr); return arr; }()).forEach(index => {
                        if (window.save_file[index] === undefined) {
                            let random_rotation = 0;
                            if (window.rotations == 180){
                                random_rotation = Math.floor(2 * Math.floor((index * 2345.1234) % 2));
                            }else{
                                random_rotation = Math.floor(((index+10) * 2345.1234) % num_rots);
                            }
                            window.save_file[index] = 
                            [
                                [
                                    ((index+1000) * 4321.1234) % 0.10, 
                                    ((index+1000) * 1234.4321) % 0.5, 
                                    random_rotation
                                ], false
                            ];
                        }
                    });

                    (function () { const arr = unlocked_fake_pieces.slice(); shuffleArray(arr); return arr; }()).forEach(index => {
                        if (window.save_file[index] === undefined) {
                            let random_rotation = 0;
                            if (window.rotations == 180){
                                random_rotation = Math.floor(2 * Math.floor(((index+10) * 2345.1234) % 2));
                            }else{
                                random_rotation = Math.floor(((index+10) * 2345.1234) % num_rots);
                            }
                            window.save_file[index] = 
                            [
                                [
                                    ((index+1000) * 4321.1234) % 0.10, 
                                    ((index+1000) * 1234.4321) % 0.5, 
                                    random_rotation
                                ], false
                            ];
                        }
                    });
                    
                    state = 19;
                }
            case 18: // wait for save file
                return;

            // case 18.5:
            //     console.log("waiting 10 seconds")
            //     setTimeout(() => {
            //         state = 19;
            //     }, 10000);
            //     state = 18.7;
            //     return;
            // case 18.7:
            //     return;



            case 19:  // process save file and start game
                window.useCanonicalAspectForLayout = true;
                let coordinates = {};
                let groups = {};
                let hasmoved = {};
                let unlocked = {};
                const remainingIndices = new Set();
                for (let key = 1; key <= window.apnx * window.apny; key++) remainingIndices.add(key);
                if (window.fake_pieces_mimic.length >= 1) {
                    for (let i = 0; i < window.fake_pieces_mimic.length; i++) remainingIndices.add(-1 - i);
                }
                const referToGroupKey = {};

                for (const [key, value] of Object.entries(window.save_file)) {
                    const keyNum = parseInt(key, 10);
                    remainingIndices.delete(keyNum);

                    if (Array.isArray(value[0])) {
                        coordinates[key] = value[0];
                        hasmoved[key] = value[1];
                        groups[key] = [keyNum];
                        referToGroupKey[keyNum] = key;
                        unlocked[key] = true;
                    } else {
                        let refer_to = value[0];
                        let groupKey = referToGroupKey[refer_to];
                        if (groupKey == null) groupKey = Object.keys(groups).find(gk => groups[gk].includes(refer_to));
                        if (groupKey) {
                            groups[groupKey].push(keyNum);
                            referToGroupKey[keyNum] = groupKey;
                        } else {
                            console.log(key, refer_to, "not found, gonna go ahead and put it at 0,0");
                            coordinates[key] = [0, 0];
                            groups[key] = [keyNum];
                            unlocked[key] = true;
                            referToGroupKey[keyNum] = key;
                        }
                    }
                }

                for (const key of remainingIndices) {
                    groups[key] = [key];
                    coordinates[key] = [30, 30];
                    hasmoved[key] = false;
                    unlocked[key] = false;
                }

                console.log("STARTING GAME")
                gameStarted = true;
                menu.open();

                document.getElementById("m2").style.display = "none";
                    document.getElementById("m3").style.display = "none";
                document.getElementById("m3a").style.display = "none";
                document.getElementById("m3b").style.display = "none";
                document.getElementById("m3c").style.display = "none";
                document.getElementById("m4").style.display = "none";
                document.getElementById("m5").style.display = "none";
                const mediaWindow = document.getElementById("draggable6");
                if (mediaWindow) mediaWindow.style.display = "none";

                /* prepare puzzle */
                viewState.customDropNormX = 0.1;
                viewState.customDropNormY = 0.1;
                puzzle.puzzle_create(coordinates, groups, hasmoved, unlocked);



                puzzle_ini = true;

                console.log("done getting backlog of actions")
                
                puzzle.puzzle_scale();
                if (rendererFacade) maybeOnResize(puzzle, rendererFacade);
                let downgradedAtStart = false;
                if (rendererFacade) {
                    if (puzzle._webglStartBlockedReason) {
                        if (rendererFacade.setWebGLUnavailableForSession) {
                            rendererFacade.setWebGLUnavailableForSession(puzzle._webglStartBlockedReason, "prestart-probe");
                        }
                    }
                    const mode = (window.rendererConfig && window.rendererConfig.mode) || "canvas2d";
                    rendererFacade.selectMode(mode, puzzle);
                    maybeOnResize(puzzle, rendererFacade);
                    if (rendererFacade.ensureStartRendererCompatibility) {
                        downgradedAtStart = rendererFacade.ensureStartRendererCompatibility() === true;
                    }
                }

                for (let pp of puzzle.polyPieces) {
                    if (!pp.hasMovedEver) {
                        const newppx = pp.x - puzzle.scalex / 2;
                        const newppy = pp.y - puzzle.scaley / 2;
                        pp.moveTo(newppx, newppy);
                    }
                }

                for (let pp of puzzle.polyPieces) {
                    queuePolyPieceSetup(pp, false, false);
                }
                if (pieceSetupQueueApi && pieceSetupQueueApi.processPieceSetupQueue) {
                    pieceSetupQueueApi.processPieceSetupQueue();
                }
                if (rendererFacade) rendererFacade.renderDirtyPieces();
                if (downgradedAtStart && rendererFacade) {
                    if (pieceSetupQueueApi && pieceSetupQueueApi.processPieceSetupQueue) {
                        pieceSetupQueueApi.processPieceSetupQueue();
                    }
                    if (rendererFacade.sceneState && rendererFacade.sceneState.markAllDirty) {
                        rendererFacade.sceneState.markAllDirty();
                    }
                    rendererFacade.renderDirtyPieces();
                }
                refreshRendererModeControl();
                puzzle.gameCanvas.style.top = puzzle.offsy + "px";
                puzzle.gameCanvas.style.left = puzzle.offsx + "px";
                puzzle.gameCanvas.style.display = "block";

                if (typeof updateGrayscaleReferenceCanvas === "function") updateGrayscaleReferenceCanvas();
                applyViewTransform();

                window.save_loaded = true;

                console.log("pending actions:", pending_actions)

                process_pending_actions = true;
                accept_pending_actions = false;

                try {
                    for(let data of pending_actions){
                        console.log("Pending action", data, pending_actions)
                        do_action(data[0], data[1], data[2], false);
                    }
                } catch (error) {
                    console.error("Error processing pending actions:", error);
                    alert("Error while loading, please refresh the page (and I would appreciate a ping via discord with a screenshot of the debug panel (F12))")
                }

                console.log("DONE WITH INI!", puzzle)

                if (window.play_solo) updateMergesLabels();
                state = 25;
                break;


            case 25: // spread pieces
                puzzle.gameCanvas.style.display = "none"; // hide reference image
                
                state = 40;
                break;

            case 40: // evaluate z index

                shuffleArray(puzzle.polyPieces);
                puzzle.evaluateZIndex();
                state = 45;

                break;

            case 45:
                // run function after ini
                state = 50;
                if (puzzle && typeof updateDropLocationTarget === "function") updateDropLocationTarget();
                window.gameplayStarted = true;
                break;

                /* wait for user grabbing a piece or other action */
            case 50:
                if (!event) return;

                if (!window.is_connected && !window.play_solo) return;

                if (event.event == "leave") {
                    if (moving && moving.pp) setHeldPieceState(moving.pp, false);
                    setMovingState(null);
                }
                
                if (event.event != "touch") return;

                if(event.button == 0){
                    const event_x = event.position.x;
                    const event_y = event.position.y;
                    // console.log(event_x, event_y)
    
                    setMovingState({
                        xMouseInit: event_x,
                        yMouseInit: event_y,
                        xMouse: event_x,
                        yMouse: event_y
                    });
    
                    /* evaluates if contact inside a PolyPiece, by decreasing z-index */
                    const acquireStartedAt = jigsawPerfNow();
                    const hitPiece = rendererFacade
                        ? rendererFacade.findTopPieceAt(puzzle, event_x, event_y)
                        : (hitTestService && hitTestService.findTopPieceAt(puzzle, event_x, event_y));
                    if (perfMonitor && typeof perfMonitor.recordPickupAcquire === "function") {
                        perfMonitor.recordPickupAcquire(jigsawPerfNow() - acquireStartedAt, !!hitPiece);
                    }
                    if (hitPiece) {
                        moving.pp = hitPiece;
                        moving.ppXInit = hitPiece.x;
                        moving.ppYInit = hitPiece.y;
                        setHeldPieceState(hitPiece, true);
                        if (perfMonitor && typeof perfMonitor.beginPickup === "function") {
                            perfMonitor.beginPickup(jigsawPerfNow());
                        }
                        
                        puzzle._releaseHandled = true;
                        state = 55;
                        return;
                    }
                }

                if (!viewState.enablePan) {
                    setMovingState(null);
                    return;
                }
                if (event.button !== viewState.panButton) {
                    setMovingState(null);
                    return;
                }

                startDragClientX = event.position.clientX;
                startDragClientY = event.position.clientY;
                stateAfterPan = 50;

                puzzle._releaseHandled = true;
                state = 52;
                break;

            case 52:  //dragging screen
                if (!event) return;
                switch (event.event) {
                    case "move":
                        applyPanMoveEvent(event);
                        break;
                    case "leave":
                        if (moving && moving.pp) setHeldPieceState(moving.pp, false);
                        setMovingState(null);
                        state = stateAfterPan;
                        break;
                }
                break;

            case 55:  // moving piece
                if (!event) return;
                if (!moving){
                    state = 50;
                    if (puzzle && typeof updateDropLocationTarget === "function") updateDropLocationTarget();
                    return;
                }

                
                switch (event.event) {
                    case "move":
                        applyPieceMoveEvent(event, perfMonitor);
                        break;
                    case "leave":
                        const m = moving.pp;
                        const mRot = rotateVector(m.x + m.nx * puzzle.scalex / 2, m.y + m.ny * puzzle.scaley / 2, m.rot);
                        const mx = mRot.x - puzzle.scalex * (m.pckxmax + m.pckxmin) / 2;
                        const my = mRot.y - puzzle.scaley * (m.pckymax + m.pckymin) / 2;

                        for (let k = puzzle.polyPieces.length - 1; k >= 0; --k) {
                            let pp = puzzle.polyPieces[k];
                            if (pp === m || pp.pieces[0].index < 0 || m.pieces[0].index < 0) continue; // don't match with myself
                            const ppRot = rotateVector(pp.x + pp.nx * puzzle.scalex / 2, pp.y + pp.ny * puzzle.scaley / 2, pp.rot);
                            const ppx = ppRot.x - puzzle.scalex * (pp.pckxmax + pp.pckxmin) / 2;
                            const ppy = ppRot.y - puzzle.scaley * (pp.pckymax + pp.pckymin) / 2;
                            if (((mx - ppx) ** 2 + (my - ppy) ** 2) >= puzzle.dConnect) continue;
                            if (m.ifNear(pp)) { // a match !
                                if (pp.pieces.length > moving.pp.pieces.length || (pp.pieces.length == moving.pp.pieces.length && pp.pieces[0].index > moving.pp.pieces[0].index)) {
                                    pp.merge(moving.pp);
                                    moving.pp = pp; 
                                    setHeldPieceState(moving.pp, true);
                                } else {
                                    moving.pp.merge(pp);
                                    setHeldPieceState(moving.pp, true);
                                }
                            }
                        } // for k

                        if (window.gameplayStarted && !window.play_solo) {
                            const movingSyncId = getPolyPieceSyncId(moving.pp);
                            if(window.rotations == 0){
                                if (movingSyncId !== null) change_savedata_datastorage(movingSyncId, [moving.pp.x / puzzle.contWidth, moving.pp.y / puzzle.contHeight], true);
                            }else{
                                if (movingSyncId !== null) change_savedata_datastorage(movingSyncId, [moving.pp.x / puzzle.contWidth, moving.pp.y / puzzle.contHeight, moving.pp.rot], true);
                            }    
                            
                            if (movingSyncId !== null) addIgnoreBouncePiece(movingSyncId);
                        }

                        if (moving && moving.pp) setHeldPieceState(moving.pp, false);
                        setMovingState(null);

                        // not at its right place
                        state = 50;
                        if (puzzle && typeof updateDropLocationTarget === "function") updateDropLocationTarget();
                        return;
                } // switch (event.event)

                break;

            case 8888:
                return;


            case 9999: break;
            default:
                let st = state;
                state = 9999;  // to display message beyond only once
                throw ("oops, unknown state " + st);
        } // switch(state)
        } finally {
            if (eventDispatchStartedAt > 0 && perfMonitor && typeof perfMonitor.recordEventDispatch === "function") {
                perfMonitor.recordEventDispatch(jigsawPerfNow() - eventDispatchStartedAt);
            }
        }
        } finally {
            if (perfMonitor && typeof perfMonitor.recordFrame === "function") {
                perfMonitor.recordFrame(jigsawPerfNow() - frameStartedAt);
            }
        }
    } // animate
} // scope for animate
//-----------------------------------------------------------------------------

/* analyze menu */
let menu = (function () {
    let menu = { items: [] };
    document.querySelectorAll("#menu li").forEach(menuEl => {
    let kItem = menu.items.length;
    let item = { element: menuEl, kItem: kItem };
    menu.items[kItem] = item;

    });

    menu.open = function () {
    if(!gameStarted){
        document.getElementById("m2").style.display = "block"
        if (window.play_solo) {
            document.getElementById("m3").style.display = "block"
            document.getElementById("m3a").style.display = "block"
            document.getElementById("m3b").style.display = "block"
            document.getElementById("m3c").style.display = "block"
            if (!window.puzzleAreaScale) window.puzzleAreaScale = "Landscape";
            const scaleSelect = document.getElementById("puzzleAreaScale");
            if (scaleSelect) scaleSelect.value = window.puzzleAreaScale;
        } else {
            document.getElementById("m3").style.display = "block"
            document.getElementById("m3a").style.display = "none"
            document.getElementById("m3b").style.display = "none"
            document.getElementById("m3c").style.display = "none"
        }
        document.getElementById("m4").style.display = "block"
        document.getElementById("m5").style.display = "block"
    }
    document.getElementById("m6").style.display = "block"
    document.getElementById("m11a").style.display = "none"
    const tbFullscreen = document.getElementById("taskbarFullscreen");
    const tbView = document.getElementById("taskbarViewControls");
    const tbCosmetic = document.getElementById("taskbarCosmeticControls");
    if (tbFullscreen) tbFullscreen.style.display = "flex";
    if (tbView) tbView.style.display = "flex";
    if (tbCosmetic) tbCosmetic.style.display = "flex";
    if(gameStarted){
        document.getElementById("m9a").style.display = "block"
        document.getElementById("m9").style.display = "block"
        document.getElementById("m10").style.display = "block"
        if (typeof updateDisplayCaptureMenuItemVisibility === "function") updateDisplayCaptureMenuItemVisibility();

        console.log(window.show_clue)
        if(window.show_clue){
            document.getElementById("m13").style.display = "inline-block"
            document.getElementById("m13b").style.display = "inline-block"
            document.getElementById("m13c").style.display = "inline-block"
        }
    }
    menu.opened = true;
    }
    menu.close = function () {
    menu.items.forEach((item, k) => {
        if (k > 0) item.element.style.display = "none"; // never hide element 0
    });
    menu.opened = false;
    }
    document.getElementById("m0").addEventListener("click", () => {
        if (!window.play_solo && !window.is_connected) return;
        if (menu.opened) menu.close(); else menu.open()
    });
    return menu;
})();

document.getElementById("m2").addEventListener("click", () => {
    if (typeof window.restoreDiv6 === "function") window.restoreDiv6();
});

function openSourceWindow(url) {
    const raw = (url || "").trim();
    if (!raw) {
        alert("Please enter a YouTube or Twitch URL.");
        return null;
    }
    const lower = raw.toLowerCase();
    const isYouTube = lower.includes("youtube.com") || lower.includes("youtu.be");
    const isTwitch = lower.includes("twitch.tv");
    if (!isYouTube && !isTwitch) {
        alert("URL must be a YouTube or Twitch link.");
        return null;
    }
    const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, "");
    const target = base + "source.html?url=" + encodeURIComponent(raw);
    const features = "popup,width=960,height=540,toolbar=no,location=no,status=no,menubar=no,scrollbars=no";
    const w = window.open(target, "puzzleSource", features);
    if (!w) alert("Popup blocked—please allow popups for this site.");
    return w;
}

const mediaLoadFileBtn = document.getElementById("mediaLoadFileBtn");
if (mediaLoadFileBtn) {
    mediaLoadFileBtn.addEventListener("click", () => {
        if (typeof loadFile === "function") loadFile();
    });
}
function updateDisplayCaptureMenuItemVisibility() {
    const el = document.getElementById("mChangeCaptureSource");
    if (!el) return;
    const cfg = window.rendererConfig;
    const isDisplay = cfg && cfg.media === "display";
    el.style.display = isDisplay ? "block" : "none";
}

const mediaUseCameraBtn = document.getElementById("mediaUseCameraBtn");
if (mediaUseCameraBtn) {
    mediaUseCameraBtn.addEventListener("click", async () => {
        try {
            await startWebcamSource();
            updateDisplayCaptureMenuItemVisibility();
        } catch (err) {
            console.error("Webcam start failed", err);
            alert("Failed to start webcam.");
        }
    });
}
const mediaLinkUrlInput = document.getElementById("mediaLinkUrlInput");
const mediaOpenSourceWindowBtn = document.getElementById("mediaOpenSourceWindowBtn");
if (mediaOpenSourceWindowBtn && mediaLinkUrlInput) {
    mediaOpenSourceWindowBtn.addEventListener("click", () => {
        openSourceWindow(mediaLinkUrlInput.value);
    });
}
function runDisplayCapture() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert("Capture not allowed or not supported.");
        return Promise.resolve();
    }
    return navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
    }).then((stream) => {
        if (startLinkCaptureSource) return startLinkCaptureSource(stream);
    });
}

const mediaStartCaptureBtn = document.getElementById("mediaStartCaptureBtn");
if (mediaStartCaptureBtn) {
    mediaStartCaptureBtn.addEventListener("click", async () => {
        try {
            await runDisplayCapture();
            updateDisplayCaptureMenuItemVisibility();
        } catch (err) {
            console.error("Display capture failed", err);
            alert("Capture not allowed or not supported.");
        }
    });
}
const mChangeCaptureSource = document.getElementById("mChangeCaptureSource");
if (mChangeCaptureSource) {
    mChangeCaptureSource.addEventListener("click", async () => {
        try {
            const url = prompt("Enter a new YouTube or Twitch URL to open and capture, or cancel to just pick a window/tab again.", mediaLinkUrlInput ? mediaLinkUrlInput.value.trim() || "" : "");
            if (url !== null && url.trim() !== "") {
                const opened = openSourceWindow(url);
                if (opened && mediaLinkUrlInput) mediaLinkUrlInput.value = url.trim();
            }
            await runDisplayCapture();
            updateDisplayCaptureMenuItemVisibility();
        } catch (err) {
            console.error("Display capture failed", err);
            alert("Capture not allowed or not supported.");
        }
    });
}
updateDisplayCaptureMenuItemVisibility();
document.getElementById("m3").addEventListener("click", () => { });
const puzzleAreaScaleEl = document.getElementById("puzzleAreaScale");
if (puzzleAreaScaleEl) {
    puzzleAreaScaleEl.value = "Landscape";
    puzzleAreaScaleEl.addEventListener("change", function () {
        window.puzzleAreaScale = this.value;
        queueGameEvent({ event: "puzzleAreaScaleChanged" });
    });
}
document.getElementById("m4").addEventListener("click", () => {
    if (window.play_solo) {
        const soloSeedEl = document.getElementById("soloSeed");
        const soloPieceCountEl = document.getElementById("soloPieceCount");
        if (soloSeedEl && soloSeedEl.value.trim() !== "") {
            const v = soloSeedEl.value.trim();
            const num = Number(v);
            window.apseed = Number.isInteger(num) ? num : v;
        } else {
            window.apseed = 0;
        }
        const pieceCountVal = soloPieceCountEl ? soloPieceCountEl.value : "";
        const pieceCountNum = Number(pieceCountVal);
        if (pieceCountVal === "" || !Number.isInteger(pieceCountNum) || pieceCountNum < 4 || pieceCountNum > 2500) {
            alert("Pieces must be an integer between 4 and 2500.");
            return;
        }
        const N = clamp(Math.floor(pieceCountNum), 4, 2500);
        puzzle.nbPieces = N;
        puzzle.computenxAndny(0, 0);
        window.set_puzzle_dim(puzzle.nx, puzzle.ny);
        const slot = (typeof window.slot === 'number' && Number.isInteger(window.slot)) ? window.slot : 0;
        if (typeof window.apseed !== 'number' || !Number.isInteger(window.apseed)) {
            const hash = Array.from(String(window.apseed)).reduce((acc, char) => acc * 31 + char.charCodeAt(0), 0);
            setRandomSeed((hash + slot) % 10000);
        } else {
            setRandomSeed((window.apseed + slot) % 10000);
        }
        computeSoloUnlockOrder(apnx, apny);
        buildPossibleMergesForSolo(apnx, apny);
        unlocked_pieces.length = 0;
        const K = Math.min(7, window.soloUnlockOrder.length);
        for (let i = 0; i < K; i++) unlockPiece(window.soloUnlockOrder[i]);
        updateMergesLabels();
    }
    queueGameEvent({ event: "nbpieces", nbpieces: 81 });
});

document.getElementById("m5").addEventListener("click", () => {
    window.open('credits.html', '_blank');
});

document.getElementById("m13").addEventListener("click", () => {  
    askForHint(false);
});
let hint_color = "red";
document.getElementById("m13b").addEventListener("click", () => {  
    if(hint_color == "red"){
        hint_color = "green";
        document.getElementById("m13b").style.backgroundColor = "#00ff00";
    }else if(hint_color == "green"){
        hint_color = "blue";
        document.getElementById("m13b").style.backgroundColor = "#0000ff";
    }else{
        hint_color = "red";
        document.getElementById("m13b").style.backgroundColor = "#ff0000";
    }
});
document.getElementById("m13c").addEventListener("click", () => {  
    removeAllHints();
});


menu.open();

let startDragClientX = 0;
let startDragClientY = 0;
let _viewControlsApi = null;
if (window.JigsawViewControls && typeof window.JigsawViewControls.init === "function") {
    _viewControlsApi = window.JigsawViewControls.init({
        viewState: viewState,
        clamp: clamp,
        getActiveBaseScale: getActiveBaseScale,
        syncLegacyViewGlobals: syncLegacyViewGlobals,
        getEffectiveZoomStep: getEffectiveZoomStep,
        touchDistance: touchDistance,
        touchMidpoint: touchMidpoint,
        rotateCurrentPiece: rotateCurrentPiece,
        events: events,
        getPuzzle: () => puzzle,
        getBevelSize: () => bevel_size,
        setBevelSize: (value) => { bevel_size = value; },
        viewDebug: VIEW_DEBUG
    });
}
const forPuzzleEl = document.getElementById("forPuzzle");
if (forPuzzleEl && typeof applyDisplayPreferences === "function") applyDisplayPreferences(forPuzzleEl);

function applyViewTransform(panOnly) {
    if (_viewControlsApi && _viewControlsApi.applyViewTransform) _viewControlsApi.applyViewTransform(panOnly);
}

function resetView() {
    if (_viewControlsApi && _viewControlsApi.resetView) _viewControlsApi.resetView();
}

function updateViewControlLabels() {
    if (_viewControlsApi && _viewControlsApi.updateViewControlLabels) _viewControlsApi.updateViewControlLabels();
}

function setScalingEnabled(enabled) {
    if (_viewControlsApi && _viewControlsApi.setScalingEnabled) _viewControlsApi.setScalingEnabled(enabled);
}

puzzle = new Puzzle({ container: "forPuzzle" });
if (window.JigsawRendererFacade) {
    rendererFacade = new window.JigsawRendererFacade({
        container: document.getElementById("forPuzzle"),
        config: window.rendererConfig || { mode: "auto", media: "image" },
        getPuzzleResolution: getPuzzleResolution
    });
    rendererFacade.init(puzzle);
    if (rendererFacade.media && typeof viewState.videoFrameIntervalMs === "number") {
        rendererFacade.media.frameIntervalMs = viewState.videoFrameIntervalMs;
    }
    hitTestService = rendererFacade.hitTest || null;
} else if (window.JigsawHitTestService) {
    hitTestService = new window.JigsawHitTestService();
}

let rendererModeApi = null;
if (window.JigsawRendererModeControl && typeof window.JigsawRendererModeControl.create === "function") {
    rendererModeApi = window.JigsawRendererModeControl.create({
        getRendererFacade: () => rendererFacade,
        getPuzzle: () => puzzle,
        getRendererConfig: () => window.rendererConfig,
        setRendererConfig: (cfg) => { window.rendererConfig = cfg; },
        queuePolyPieceSetup: (...args) => queuePolyPieceSetup(...args),
        getPuzzleResolution: getPuzzleResolution,
        setPuzzleResolution: (value) => {
            if (value === "16k" || value === "8k" || value === "4k" || value === "1440p" || value === "1080p" || value === "720p" || value === "540p") {
                viewState.puzzleResolution = value;
                try { localStorage.setItem("puzzleResolution", value); } catch (_e) {}
                if (puzzle && state >= 25) {
                    if (typeof puzzle.applyResolutionPreset === "function") {
                        puzzle.applyResolutionPreset();
                    } else if (typeof puzzle.puzzle_scale === "function") {
                        puzzle.puzzle_scale();
                    }
                    if (rendererFacade) {
                        maybeOnResize(puzzle, rendererFacade);
                        if (rendererFacade.sceneState && rendererFacade.sceneState.markAllDirty) rendererFacade.sceneState.markAllDirty();
                    }
                    if (puzzle.polyPieces) puzzle.polyPieces.forEach(pp => queuePolyPieceSetup(pp, false, false));
                }
            }
        }
    });
    rendererModeApi.initRendererModeControl();
}

function refreshRendererModeControl() {
    if (rendererModeApi && rendererModeApi.refreshRendererModeControl) {
        rendererModeApi.refreshRendererModeControl();
    }
}

let pieceSetupQueueApi = null;
if (window.JigsawPieceSetupQueue && typeof window.JigsawPieceSetupQueue.create === "function") {
    pieceSetupQueueApi = window.JigsawPieceSetupQueue.create({
        getRendererConfig: () => window.rendererConfig,
        getRendererFacade: () => rendererFacade
    });
}

function queuePolyPieceSetup(pp, ignoreRedraw = false, highPriority = false, onDone = null) {
    if (pieceSetupQueueApi && pieceSetupQueueApi.queuePolyPieceSetup) {
        pieceSetupQueueApi.queuePolyPieceSetup(pp, ignoreRedraw, highPriority, onDone);
    } else if (pp) {
        pp.polypiece_drawImage(ignoreRedraw);
        if (onDone) {
            try { onDone(); } catch (_e) {}
        }
    }
}

requestAnimationFrame(animate);

// ap stuff:

var apnx;
var apny;
function set_puzzle_dim(x, y){
    apnx = x;
    apny = y;
    document.getElementById("m9a").innerText = "Merges: " + numberOfMerges + "/" + (apnx * apny - 1);
}
window.set_puzzle_dim = set_puzzle_dim

/** Returns grid-neighbor piece indices (1-based) for piece p. Uses same rules as ifNear. */
function getPieceNeighbors(p, apnx, apny) {
    const N = apnx * apny;
    const out = [];
    if (window.pieceSides === 6) {
        const col = (p % apnx === 0) ? apnx : (p % apnx);
        const cand = [
            p + apnx, p - apnx,
            p - 1, p + 1,
            col !== 1 ? (col % 2 === 1 ? p - 1 - apnx : p - 1 + apnx) : null,
            col !== apnx ? (col % 2 === 1 ? p + 1 - apnx : p + 1 + apnx) : null
        ];
        cand.forEach(n => { if (n != null && n >= 1 && n <= N) out.push(n); });
    } else {
        [p + apnx, p - apnx].forEach(n => { if (n >= 1 && n <= N) out.push(n); });
        if (p % apnx !== 1) out.push(p - 1);
        if (p % apnx !== 0) out.push(p + 1);
    }
    return out;
}

/**
 * Merge simulation board: simulates placing pieces in order and tracks cumulative merge count.
 * Used only to build possible_merges / actual_possible_merges for local play.
 * Index i = cell (i % width, i // width) (column, row).
 */
class PuzzleBoard {
    constructor(width, height, hexagonal) {
        const size = width * height;
        this.board = Array(size).fill(null);
        this.mergesCount = 0;
        this.clusters = {};
        const maxIsolated = (size >> 1) + (size % 2);
        this._unusedIds = [];
        for (let id = 0; id < maxIsolated; id++) this._unusedIds.push(id);

        // Precompute adjacency for each index (0-based). Index i => column i % width, row i / width.
        this.adjacentPieces = [];
        for (let i = 0; i < size; i++) {
            const x = i % width;
            const y = (i / width) | 0;
            const neighbors = [];
            if (x > 0) neighbors.push(i - 1);
            if (x < width - 1) neighbors.push(i + 1);
            if (y > 0) neighbors.push(i - width);
            if (y < height - 1) neighbors.push(i + width);
            if (hexagonal) {
                if (x % 2 === 0) {
                    neighbors.push(i - width - 1, i - width + 1);
                } else {
                    neighbors.push(i + width - 1, i + width + 1);
                }
            }
            this.adjacentPieces[i] = neighbors.filter(n => n >= 0 && n < size);
        }
    }

    addPiece(pieceIndex) {
        const adjIds = new Set();
        for (const n of this.adjacentPieces[pieceIndex]) {
            const id = this.board[n];
            if (id != null) adjIds.add(id);
        }
        const numAdjacent = adjIds.size;

        if (numAdjacent === 0) {
            const id = this._unusedIds.pop();
            this.board[pieceIndex] = id;
            this.clusters[id] = [pieceIndex];
            return;
        }
        if (numAdjacent === 1) {
            const id = [...adjIds][0];
            this.board[pieceIndex] = id;
            this.clusters[id].push(pieceIndex);
            this.mergesCount += 1;
            return;
        }
        // 2+ adjacent: merge into largest
        let largestId = null;
        let largestSize = -1;
        for (const id of adjIds) {
            const len = this.clusters[id].length;
            if (len > largestSize) {
                largestSize = len;
                largestId = id;
            }
        }
        this.board[pieceIndex] = largestId;
        this.clusters[largestId].push(pieceIndex);
        for (const id of adjIds) {
            if (id === largestId) continue;
            const pieces = this.clusters[id];
            for (const idx of pieces) {
                this.board[idx] = largestId;
                this.clusters[largestId].push(idx);
            }
            delete this.clusters[id];
            this._unusedIds.push(id);
        }
        this.mergesCount += numAdjacent;
    }
}

/** BFS unlock order for solo: sets window.soloUnlockOrder; returns order. */
function computeSoloUnlockOrder(apnx, apny) {
    const N = apnx * apny;
    const indices = [];
    for (let i = 1; i <= N; i++) indices.push(i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const numSeeds = Math.min(3, N);
    const seeds = indices.slice(0, numSeeds);
    const order = [];
    const visited = new Set(seeds);
    const queue = [...seeds];
    while (queue.length) {
        const p = queue.shift();
        order.push(p);
        for (const n of getPieceNeighbors(p, apnx, apny)) {
            if (!visited.has(n) && n >= 1 && n <= N) {
                visited.add(n);
                queue.push(n);
            }
        }
    }
    window.soloUnlockOrder = order;
    return order;
}

function buildPossibleMergesForSolo(nx, ny) {
    const hexagonal = (window.pieceSides === 6);
    const order = window.soloUnlockOrder;
    if (!order || order.length !== nx * ny) return;
    const board = new PuzzleBoard(nx, ny, hexagonal);
    const possible_merges = [0];
    const actual_possible_merges = [0];
    for (let k = 0; k < order.length; k++) {
        board.addPiece(order[k] - 1);
        possible_merges.push(board.mergesCount);
        actual_possible_merges.push(board.mergesCount);
    }
    window.possible_merges = possible_merges;
    window.actual_possible_merges = actual_possible_merges;
}

function findPolyPieceUsingPuzzlePiece(index, needsToBeFirst = false){
    for (let i = 0; i < puzzle.polyPieces.length; i++) {
        if(needsToBeFirst){
            if(puzzle.polyPieces[i].pieces[0].index == index){
                return puzzle.polyPieces[i];
            }
        }else{
            if (puzzle.polyPieces[i].pieces.some(piece => piece.index === index)) {
                return puzzle.polyPieces[i];
            }
        }
    }
    return null;
}

function findPolyPieceBySyncId(syncId) {
    if (typeof syncId !== "number" || !Number.isFinite(syncId)) return null;
    for (let i = 0; i < puzzle.polyPieces.length; i++) {
        if (getPolyPieceSyncId(puzzle.polyPieces[i]) === syncId) return puzzle.polyPieces[i];
    }
    return null;
}

var puzzle_ini = false;
var unlocked_pieces = [];

function applyUnlockDropAndRotation(pp, index) {
    const drop = getDropPositionPixels(puzzle, 0.03);
    pp.moveTo(drop.x - puzzle.scalex * 0.5, drop.y - puzzle.scaley * 0.5);
    if (window.rotations > 0) {
        const num_rots = Math.round(360 / window.rotations);
        const random_rotation = window.rotations == 180
            ? Math.floor(2 * Math.floor(((index + 10) * 2345.1234) % 2))
            : Math.floor(((index + 10) * 2345.1234) % num_rots);
        pp.rotateTo(random_rotation);
    }
    pp.unlocked = true;
}

function unlockPiece(index) {
    unlocked_pieces.push(index);

    if(process_pending_actions){
        let pp = findPolyPieceUsingPuzzlePiece(index);
        if(!pp){
            console.log("PolyPiece not found for index", index);
            return;
        }
        applyUnlockDropAndRotation(pp, index);
    }else if (accept_pending_actions){
        console.log("Adding to pending actions", index)
        pending_actions.push([`x_x_x_${index}`, "unlock", "x"]);
    }
}

var unlocked_fake_pieces = [];
function unlockFakePiece() {
    if(unlocked_fake_pieces.length >= window.fake_pieces_mimic.length){
        console.log("No more fake pieces to unlock!");
        return;
    }
    let index = - unlocked_fake_pieces.length - 1;
    unlocked_fake_pieces.push(index);
    console.log("unlock fake piece", index)
    
    if(process_pending_actions){
        let pp = findPolyPieceUsingPuzzlePiece(index);
        console.log(pp)
        applyUnlockDropAndRotation(pp, index);
    }else if (accept_pending_actions){
        console.log("Adding to pending actions", index)
        pending_actions.push([`x_x_x_${index}`, "unlock", "x"]);
        console.log(pending_actions)
    }
    console.log(puzzle.polyPieces)
}

function doSwapTrap(){
    let pps = getRandomPiece(2, 10);
    if(pps.length < 2) return;
    let pp1 = pps[0];
    let pp2 = pps[1];
    let x1 = pp1.x;
    let y1 = pp1.y;
    let x2 = pp2.x;
    let y2 = pp2.y;
    pp1.moveTo(x2, y2);
    pp2.moveTo(x1, y1);
    pp1.moveAwayFromBorder();
    pp2.moveAwayFromBorder();
    if(window.rotations == 0){
        const pp1Sync = getPolyPieceSyncId(pp1);
        const pp2Sync = getPolyPieceSyncId(pp2);
        if (pp1Sync !== null) change_savedata_datastorage(pp1Sync, [pp1.x / puzzle.contWidth, pp1.y / puzzle.contHeight], true);
        if (pp2Sync !== null) change_savedata_datastorage(pp2Sync, [pp2.x / puzzle.contWidth, pp2.y / puzzle.contHeight], true);
    }else{
        const pp1Sync = getPolyPieceSyncId(pp1);
        const pp2Sync = getPolyPieceSyncId(pp2);
        if (pp1Sync !== null) change_savedata_datastorage(pp1Sync, [pp1.x / puzzle.contWidth, pp1.y / puzzle.contHeight, pp1.rot], true);
        if (pp2Sync !== null) change_savedata_datastorage(pp2Sync, [pp2.x / puzzle.contWidth, pp2.y / puzzle.contHeight, pp2.rot], true);
    }   
}
function doRotateTrap(){
    let pps = getRandomPiece(1, 10);
    if(pps.length < 1) return;
    let pp = pps[0];
    if(window.rotations > 0){
        if(window.rotations == 180){
            pp.rotate(false, 2);
        }else{
            let num_rots = Math.round(360 / window.rotations);
            pp.rotate(false, Math.round(Math.random() * (num_rots)));
        }
        pp.moveAwayFromBorder();
        const ppSync = getPolyPieceSyncId(pp);
        if (ppSync !== null) change_savedata_datastorage(ppSync, [pp.x / puzzle.contWidth, pp.y / puzzle.contHeight, pp.rot], true);
    }
}

function getRandomPiece(numberOfPieces, maxcluster) {
    if(!puzzle || !puzzle.polyPieces) return [];
    const singlePieces = puzzle.polyPieces.filter(pp => pp.pieces.length <= maxcluster);
    const singleUnlockedPieces = singlePieces.filter(pp => pp.unlocked);
    const shuffled = singleUnlockedPieces.slice();
    shuffleArray(shuffled);
    return shuffled.slice(0, numberOfPieces);
}

function updateMergesLabels(){
    const logicVal = (window.possible_merges && window.possible_merges[unlocked_pieces.length] !== undefined)
        ? window.possible_merges[unlocked_pieces.length] : "?";
    const possibleVal = (window.actual_possible_merges && window.actual_possible_merges[unlocked_pieces.length] !== undefined)
        ? window.actual_possible_merges[unlocked_pieces.length] : "?";
    try {
        document.getElementById("m9").innerText = "Merges in logic: " + logicVal;
    } catch (e) {
        document.getElementById("m9").innerText = "Merges in logic: ?";
    }
    try {
        document.getElementById("m10").innerText = "Merges possible: " + possibleVal;
    } catch (e) {
        document.getElementById("m10").innerText = "Merges possible: ?";
    }
}

window.unlockPiece = unlockPiece;
window.unlockFakePiece = unlockFakePiece;
window.updateMergesLabels = updateMergesLabels;
window.doSwapTrap = doSwapTrap;
window.doRotateTrap = doRotateTrap;

var mergedKeys = [];

function newMerge(key, playSound = true){
    if (mergedKeys.includes(key)) return;
    mergedKeys.push(key);
    
    let newRecord = false;
    
    numberOfMerges += 1;
    
    if(numberOfMerges > numberOfMergesAtStart){
        window.sendCheck(numberOfMerges);
        // console.log("Send check for", numberOfMerges)
        if(numberOfMerges == apnx * apny - 1){
            window.sendGoal();
        }
        newRecord = true;
    }
        
    if(newRecord){
        change_savedata_datastorage("M", numberOfMerges, true);
    }
    document.getElementById("m9a").innerText = "Merges: " + numberOfMerges + "/" + (apnx * apny - 1);
    if (window.play_solo) updateMergesLabels();
    if(playSound){
        window.playNewMergeSound();
    }
}

var numberOfMerges = 0;
var numberOfMergesAtStart = 0;


function setImagePath(l, options = {}) {
    if (mediaBindings && mediaBindings.setImagePath) mediaBindings.setImagePath(l, options);
    updateDisplayCaptureMenuItemVisibility();
}
window.setImagePath = setImagePath;

async function loadVideoUrl(url) {
    if (mediaBindings && mediaBindings.loadVideoUrl) {
        return mediaBindings.loadVideoUrl(url);
    }
    throw new Error("Video URL loading is unavailable.");
}
window.loadVideoUrl = loadVideoUrl;

function setRendererMode(mode) {
    if (rendererModeApi && rendererModeApi.setRendererMode) rendererModeApi.setRendererMode(mode);
}
window.setRendererMode = setRendererMode;

window.runRendererPerfBench = function runRendererPerfBench(durationMs = 5000) {
    if (rendererModeApi && rendererModeApi.runRendererPerfBench) {
        return rendererModeApi.runRendererPerfBench(durationMs);
    }
    return Promise.resolve({ samples: 0, avgFrameMs: 0, avgDrawCalls: 0, avgMediaUploads: 0 });
};

let pending_actions = [];
window.jigsawRuntime.pendingActions = pending_actions;
let archipelagoBridge = null;
if (window.JigsawArchipelagoBridge && typeof window.JigsawArchipelagoBridge.create === "function") {
    archipelagoBridge = window.JigsawArchipelagoBridge.create({
        getAcceptPendingActions: () => accept_pending_actions,
        getProcessPendingActions: () => process_pending_actions,
        getPendingActions: () => pending_actions,
        getMoving: () => moving,
        setMoving: (value) => { moving = value; },
        getPuzzle: () => puzzle,
        findPolyPieceUsingPuzzlePiece: (idx, first) => findPolyPieceUsingPuzzlePiece(idx, first),
        findPolyPieceBySyncId: (syncId) => findPolyPieceBySyncId(syncId),
        getPolyPieceSyncId: (pp) => getPolyPieceSyncId(pp),
        markPieceDirty: (pp) => { if (rendererFacade && rendererFacade.sceneState) rendererFacade.sceneState.markPieceDirty(pp); }
    });
}

function move_piece_bounced(data){ // pp_index, x, y, (r)
    if (archipelagoBridge && archipelagoBridge.movePieceBounced) {
        archipelagoBridge.movePieceBounced(data);
    } else {
        do_action(`x_x_x_${data[0]}`, data[1], window.zero_list, true);
    }
}
window.move_piece_bounced = move_piece_bounced;

async function change_savedata_datastorage(key, value, final) {
    if (archipelagoBridge && archipelagoBridge.changeSavedataDatastorage) {
        return archipelagoBridge.changeSavedataDatastorage(key, value, final);
    }
}

function do_action(key, value, oldValue, bounce){
    if (archipelagoBridge && archipelagoBridge.doAction) {
        archipelagoBridge.doAction(key, value, oldValue, bounce);
    }
}

function removeAllHints(){
    puzzle.polyPieces.forEach(pp => {
        if(pp.hinted){
            pp.hinted = false;
            pp.polypiece_drawImage(false);
        }
    });
}

function askForHint(alsoConnect = false){
    if(!window.play_solo && !window.is_connected) return;
    const shuffledIndices = [...Array(puzzle.polyPieces.length).keys()];
    shuffleArray(shuffledIndices);
    for (let i = 0; i < shuffledIndices.length; i++) {
        for (let j = i + 1; j < shuffledIndices.length; j++) {
            let k = shuffledIndices[i];
            let l = shuffledIndices[j];

            let pp1 = puzzle.polyPieces[k];
            let pp2 = puzzle.polyPieces[l];
            if (pp1 == pp2) continue; // don't match with myself
            if (!pp1.unlocked) continue;
            if (!pp2.unlocked) continue;
            if (pp1.pieces[0].index < 0) continue;
            if (pp2.pieces[0].index < 0) continue;
            
            if (pp1.ifNear(pp2, true, true)) { // a match !
                console.log("MATCH FOUND!", pp1, pp2);
                if(!alsoConnect){
                    if(!pp1.hinted){
                        pp1.hinted = true;
                        pp1.polypiece_drawImage(false);
                        return;
                    }
                    if(!pp2.hinted){
                        pp2.hinted = true;
                        pp2.polypiece_drawImage(false);
                        return;
                    }
                }else{
                    if (pp1.pieces.length > pp2.pieces.length  || (pp1.pieces.length == pp2.pieces.length && pp1.pieces[0].index > pp2.pieces[0].index)) {
                        pp1.merge(pp2);
                        console.log(pp1)
                    } else {
                        pp2.merge(pp1);
                        console.log(pp2)
                    }
                    console.log('merged')
                    return;
                }
            }
        }
    } // for k
    document.getElementById("m13").textContent = "That's it💡";
    setTimeout(() => {
        document.getElementById("m13").textContent = "Clue 💡✏️";
    }, 2000);
}


function rotateCurrentPiece(counter = false){
    if(!moving || typeof moving === 'undefined'){
        return;
    }
    if(!moving.pp){
        console.log("SOMETHING WEIRD HAPPENS?", moving)
        return;
    }

    // console.log(moving, counter)
    if(window.rotations > 0){
        if(window.rotations == 180){
            moving.pp.rotate(moving, 2);
        }else{
            if(counter){
                moving.pp.rotate(moving, -1);
            }else{
                moving.pp.rotate(moving);
            }
        }
        const movingSyncId = getPolyPieceSyncId(moving.pp);
        if (movingSyncId !== null) change_savedata_datastorage(movingSyncId, [moving.pp.x / puzzle.contWidth, moving.pp.y / puzzle.contHeight, moving.pp.rot], false);
    }
    
}

document.addEventListener('keydown', function(event) {
    if(event.key === 'R' || event.key === 'r' || event.key === ' '){
        rotateCurrentPiece();
    }
});


// drawer

function withdraw(numToWithdraw){
    if (puzzle && puzzle.polyPieces) {
        // Get the number of pieces to withdraw from the select dropdown
        let piecesToWithdraw = puzzle.polyPieces.filter(pp => !pp.hasMovedEver && pp.unlocked && !pp.withdrawn);

        if (numToWithdraw !== "all") {
            numToWithdraw = parseInt(numToWithdraw, 10);
            shuffleArray(piecesToWithdraw);
            piecesToWithdraw = piecesToWithdraw.slice(0, numToWithdraw);
        }

        piecesToWithdraw.forEach(pp => {
            pp.moveTo(-10 * puzzle.contWidth, -10 * puzzle.contHeight);
            pp.withdrawn = true;
        });
        // Update the value of the span with id "pcsStored" to count
        const pcsStoredSpan = document.getElementById('pcsStored');
        if (pcsStoredSpan) {
            const am = puzzle.polyPieces.filter(pp => !pp.hasMovedEver && pp.unlocked && pp.withdrawn).length
            pcsStoredSpan.textContent = am;
            if (am > 0) {
                // Hide the control button with id "control-btn3a"
                const btn = document.getElementById('control-btn3a');
                if (btn) {
                    btn.style.display = "none";
                }
                pcsStoredSpan.style.color = "red";
                pcsStoredSpan.style.fontWeight = "bold";
            }
        }
        
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const btnWithdraw = document.getElementById('btnWithdraw');
    const btnWithdrawAll = document.getElementById('btnWithdrawAll');
    const btnDeposit = document.getElementById('btnDeposit');
    btnWithdraw.addEventListener('click', function() {
        let numToWithdraw = document.getElementById('numPieces').value;
        withdraw(numToWithdraw);
    });
    btnWithdrawAll.addEventListener('click', function() {
        withdraw("all");
    });
    btnDeposit.addEventListener('click', function() {
        const select = document.getElementById('depositPosition');
        const value = select.value;

        if (puzzle && puzzle.polyPieces) {
            let x = 0, y = 0;
            switch (value) {
                case "1": // Top-left corner
                    x = 0.1;
                    y = 0.1;
                    break;
                case "2": // Top-left area
                    x = 0.3;
                    y = 0.3;
                    break;
                case "3": // Top edge
                    x = 0.7;
                    y = 0.1;
                    break;
                case "4": // Top area
                    x = 0.7;
                    y = 0.3;
                    break;
                case "5": // Left edge
                    x = 0.1;
                    y = 0.7;
                    break;
                case "6": // Left area
                    x = 0.3;
                    y = 0.7;
                    break;
                case "8": // Drop location (custom or default) - handled in forEach below
                    x = 0;
                    y = 0;
                    break;
                case "7": // Anywhere
                default:
                    x = 0.7;
                    y = 0.7;
                    break;
            }
            // Get the number of pieces to deposit from the select dropdown
            let numToDeposit = document.getElementById('numPieces').value;
            let piecesToDeposit = puzzle.polyPieces.filter(pp => !pp.hasMovedEver && pp.unlocked && pp.withdrawn);

            if (numToDeposit !== "all") {
                numToDeposit = parseInt(numToDeposit, 10);
                shuffleArray(piecesToDeposit);
                piecesToDeposit = piecesToDeposit.slice(0, numToDeposit);
            }

            piecesToDeposit.forEach(pp => {
                if (value === "8") {
                    const d = getDropPositionPixels(puzzle, 0.05);
                    pp.moveTo(d.x - puzzle.scalex * 0.5, d.y - puzzle.scaley * 0.5);
                } else {
                    pp.moveTo(Math.random() * x * puzzle.contWidth, Math.random() * y * puzzle.contHeight);
                }
                pp.withdrawn = false;
            });

            // Update the value of the span with id "pcsStored" to count
            const pcsStoredSpan = document.getElementById('pcsStored');
            if (pcsStoredSpan) {
                let am = puzzle.polyPieces.filter(pp => !pp.hasMovedEver && pp.unlocked && pp.withdrawn).length
                pcsStoredSpan.textContent = am;
                
                if (am == 0) {
                    // Hide the control button with id "control-btn3a"
                    const btn = document.getElementById('control-btn3a');
                    if (btn) {
                        btn.style.display = "block";
                    }
                    pcsStoredSpan.style.color = "black"
                    pcsStoredSpan.style.fontWeight = "normal";
                }
            }
        }
    });
    
});