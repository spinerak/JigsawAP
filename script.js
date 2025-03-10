"use strict";

var downsize_to_fit = 0.85;
window.save_loaded = false;

var puzzle, autoStart;

const mhypot = Math.hypot,
    mrandom = Math.random,
    mmax = Math.max,
    mmin = Math.min,
    mround = Math.round,
    mfloor = Math.floor,
    msqrt = Math.sqrt,
    mabs = Math.abs;
//-----------------------------------------------------------------------------

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

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function arrayShuffle(array) {
    /* randomly changes the order of items in an array
    only the order is modified, not the elements
    */
    let k1, temp;
    for (let k = array.length - 1; k >= 1; --k) {
    k1 = intAlea(0, k + 1);
    temp = array[k];
    array[k] = array[k1];
    array[k1] = temp;
    } // for k
    return array
} // arrayShuffle

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

function twist0(side, ca, cb) {

    const seg0 = new Segment(side.points[0], side.points[1]);
    const dxh = seg0.dx();
    const dyh = seg0.dy();

    const seg1 = new Segment(ca, cb);
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

function twist1(side, ca, cb) {

    const seg0 = new Segment(side.points[0], side.points[1]);
    const dxh = seg0.dx();
    const dyh = seg0.dy();

    const seg1 = new Segment(ca, cb);
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

function twist2(side, ca, cb) {

    const seg0 = new Segment(side.points[0], side.points[1]);
    const dxh = seg0.dx();
    const dyh = seg0.dy();

    const seg1 = new Segment(ca, cb);
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

function twist3(side, ca, cb) {

    side.points = [side.points[0], side.points[1]];

} // twist3

function twist4(side, ca, cb) {
    side.points[0].x = Math.round(side.points[0].x)
    side.points[0].y = Math.round(side.points[0].y)
    side.points[1].x = Math.round(side.points[1].x)
    side.points[1].y = Math.round(side.points[1].y)
    side.points = [side.points[0], side.points[1]];

} // twist3


//-----------------------------------------------------------------------------
class Piece {
    constructor(kx, ky, index) { // object with 4 sides
        this.ts = new Side(); // top side
        this.rs = new Side(); // right side
        this.bs = new Side(); // bottom side
        this.ls = new Side(); // left side
        this.kx = kx;
        this.ky = ky;
        this.index = index
    }

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    piece_scale(puzzle) {
        this.ts.side_scale(puzzle);
        this.rs.side_scale(puzzle);
        this.bs.side_scale(puzzle);
        this.ls.side_scale(puzzle);
    } // Piece.scale
} // class Piece
//--------------------------------------------------------------
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
        this.listLoops();

        this.polypiece_canvas = document.createElement('CANVAS');
        // size and z-index will be defined later
        puzzle.container.appendChild(this.polypiece_canvas);
        this.polypiece_canvas.classList.add('polypiece');
        this.polypiece_ctx = this.polypiece_canvas.getContext("2d");
    } // PolyPiece

    // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -   -
    /*
    this method
        - adds pieces of otherPoly to this PolyPiece
        - reorders the pieces inside the polypiece
        - adjusts coordinates of new pieces to make them consistent with this polyPiece
        - re-evaluates the z - index of the polyPieces
    */

    merge(otherPoly) {

        const orgpckxmin = this.pckxmin;
        const orgpckymin = this.pckymin;

        // remove otherPoly from list of polypieces
        const kOther = this.puzzle.polyPieces.indexOf(otherPoly);
        this.puzzle.polyPieces.splice(kOther, 1);

        // remove other canvas from container
        if (this.puzzle.container.contains(otherPoly.polypiece_canvas)) {
            this.puzzle.container.removeChild(otherPoly.polypiece_canvas);
        } else {
            console.log("The canvas is not a child of the container??", this, otherPoly);
        }

        for (let k = 0; k < otherPoly.pieces.length; ++k) {

            if (window.gameplayStarted) {
                // console.log("merge", otherPoly.pieces[k].index, "to", this.pieces[0].index);
                const client = window.getAPClient();
                const min = Math.min(this.pieces[0].index, otherPoly.pieces[k].index)
                const max = Math.max(this.pieces[0].index, otherPoly.pieces[k].index)
                
                change_savedata_datastorage(max, min, true);
            }

            this.pieces.push(otherPoly.pieces[k]);
            // watch leftmost, topmost... pieces
            if (otherPoly.pieces[k].kx < this.pckxmin) this.pckxmin = otherPoly.pieces[k].kx;
            if (otherPoly.pieces[k].kx + 1 > this.pckxmax) this.pckxmax = otherPoly.pieces[k].kx + 1;
            if (otherPoly.pieces[k].ky < this.pckymin) this.pckymin = otherPoly.pieces[k].ky;
            if (otherPoly.pieces[k].ky + 1 > this.pckymax) this.pckymax = otherPoly.pieces[k].ky + 1;
        } // for k

        // sort the pieces by increasing kx, ky

        this.pieces.sort(function (p1, p2) {
            if (p1.ky < p2.ky) return -1;
            if (p1.ky > p2.ky) return 1;
            if (p1.kx < p2.kx) return -1;
            if (p1.kx > p2.kx) return 1;
            return 0; // should not occur
        });

        // redefine consecutive edges
        this.listLoops();

        this.polypiece_drawImage();
        this.moveTo(this.x + this.puzzle.scalex * (this.pckxmin - orgpckxmin),
            this.y + this.puzzle.scaley * (this.pckymin - orgpckymin));

        if(window.gameplayStarted){
            // console.log("move after merge")
            change_savedata_datastorage(this.pieces[0].index, [this.x / puzzle.contWidth, this.y / puzzle.contHeight], true);
        }

        this.puzzle.evaluateZIndex();

        newMerge();


    } // merge

    // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -   -
    ifNear(otherPoly) {

        let p1, p2;
        let puzzle = this.puzzle;

        // coordinates of origin of full picture for this PolyPieces
        let x = this.x - puzzle.scalex * this.pckxmin;
        let y = this.y - puzzle.scaley * this.pckymin;

        let ppx = otherPoly.x - puzzle.scalex * otherPoly.pckxmin;
        let ppy = otherPoly.y - puzzle.scaley * otherPoly.pckymin;
        if (mhypot(x - ppx, y - ppy) >= puzzle.dConnect) return false; // not close enough

        // this and otherPoly are in good relative position, have they a common side ?
        for (let k = this.pieces.length - 1; k >= 0; --k) {
            p1 = this.pieces[k];
            for (let ko = otherPoly.pieces.length - 1; ko >= 0; --ko) {
            p2 = otherPoly.pieces[ko];
            if (p1.kx == p2.kx && mabs(p1.ky - p2.ky) == 1) return true; // true neighbors found
            if (p1.ky == p2.ky && mabs(p1.kx - p2.kx) == 1) return true; // true neighbors found
            } // for k
        } // for k

        // nothing matches

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

        // internal : checks if an edge given by kx, ky is common with another cell
        // returns true or false
        const that = this;
        function edgeIsCommon(kx, ky, edge) {
            let k;
            switch (edge) {
            case 0: ky--; break; // top edge
            case 1: kx++; break; // right edge
            case 2: ky++; break; // bottom edge
            case 3: kx--; break; // left edge
            } // switch
            for (k = 0; k < that.pieces.length; k++) {
            if (kx == that.pieces[k].kx && ky == that.pieces[k].ky) return true; // we found the neighbor
            }
            return false; // not a common edge
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
        let kEdge; // to count 4 edges
        let lp; // for loop during its creation
        let currEdge; // current edge
        let tries; // tries counter
        let edgeNumber; // number of edge found during research
        let potNext;

        // table of tries

        let tbTries = [
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
        ];

        // create list of not shared edges (=> belong to boundary)
        for (k = 0; k < this.pieces.length; k++) {
            for (kEdge = 0; kEdge < 4; kEdge++) {
            if (!edgeIsCommon(this.pieces[k].kx, this.pieces[k].ky, kEdge))
                tbEdges.push({ kx: this.pieces[k].kx, ky: this.pieces[k].ky, edge: kEdge, kp: k })
            } // for kEdge
        } // for k

        while (tbEdges.length > 0) {
            lp = []; // new loop
            currEdge = tbEdges[0];   // we begin with first available edge
            lp.push(currEdge);       // add it to loop
            tbEdges.splice(0, 1);    // remove from list of available sides
            do {
            for (tries = 0; tries < 3; tries++) {
                potNext = tbTries[currEdge.edge][tries];
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
            if (edge.edge == 0) return cell.ts;
            if (edge.edge == 1) return cell.rs;
            if (edge.edge == 2) return cell.bs;
            return cell.ls;
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

    polypiece_drawImage() {

        /* resizes canvas to be bigger than if pieces were perfect rectangles
        so that their shapes actually fit in the canvas
        copies the relevant part of gamePicture clipped by path
        adds shadow and emboss
        */
        //       if (this.pieces[0].kx!=1 ||this.pieces[0].ky!= 1) return;
        puzzle = this.puzzle;
        this.nx = this.pckxmax - this.pckxmin + 1;
        this.ny = this.pckymax - this.pckymin + 1;
        
        this.polypiece_canvas.width = this.nx * puzzle.scalex;  // make canvas big enough to fit all pieces
        this.polypiece_canvas.height = this.ny * puzzle.scaley;

        // difference between position in this canvas and position in gameImage

        this.offsx = (this.pckxmin - 0.5) * puzzle.scalex;
        this.offsy = (this.pckymin - 0.5) * puzzle.scaley;

        this.path = new Path2D();
        this.drawPath(this.path, -this.offsx, -this.offsy);


        // make shadow
        this.polypiece_ctx.fillStyle = 'none';
        this.polypiece_ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.polypiece_ctx.shadowBlur = 4 * window.scaleFactor;
        this.polypiece_ctx.shadowOffsetX = 4 * window.scaleFactor;
        this.polypiece_ctx.shadowOffsetY = 4 * window.scaleFactor;
        this.polypiece_ctx.fill(this.path);
        this.polypiece_ctx.shadowColor = 'rgba(0, 0, 0, 0)'; // stop shadow effect


        this.pieces.forEach((pp, kk) => {

            this.polypiece_ctx.save();


            const path = new Path2D();
            const shiftx = -this.offsx;
            const shifty = -this.offsy;
            pp.ts.drawPath(path, shiftx, shifty, false);
            pp.rs.drawPath(path, shiftx, shifty, true);
            pp.bs.drawPath(path, shiftx, shifty, true);
            pp.ls.drawPath(path, shiftx, shifty, true);
            path.closePath();

            this.polypiece_ctx.clip(path);
            // do not copy from negative coordinates, does not work for all browsers
            const srcx = pp.kx ? ((pp.kx - 0.5) * puzzle.scalex) : 0;
            const srcy = pp.ky ? ((pp.ky - 0.5) * puzzle.scaley) : 0;

            const destx = (pp.kx ? 0 : puzzle.scalex / 2) + (pp.kx - this.pckxmin) * puzzle.scalex;
            const desty = (pp.ky ? 0 : puzzle.scaley / 2) + (pp.ky - this.pckymin) * puzzle.scaley;

            let w = 2 * puzzle.scalex;
            let h = 2 * puzzle.scaley;
            if (srcx + w > puzzle.gameCanvas.width) w = puzzle.gameCanvas.width - srcx;
            if (srcy + h > puzzle.gameCanvas.height) h = puzzle.gameCanvas.height - srcy;


            this.polypiece_ctx.drawImage(puzzle.gameCanvas, srcx, srcy, w, h, destx, desty, w, h);

            this.polypiece_ctx.translate(puzzle.embossThickness / 2, -puzzle.embossThickness / 2);
            this.polypiece_ctx.lineWidth = puzzle.embossThickness;
            this.polypiece_ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
            this.polypiece_ctx.stroke(path);

            this.polypiece_ctx.translate(-puzzle.embossThickness, puzzle.embossThickness);
            this.polypiece_ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
            this.polypiece_ctx.stroke(path);
            this.polypiece_ctx.restore();
        });


    } // PolyPiece.polypiece_drawImage


    moveTo(x, y) {
        // sets the left, top properties (relative to container) of this.canvas
        this.x = x;
        this.y = y;
        this.polypiece_canvas.style.left = x + 'px';
        this.polypiece_canvas.style.top = y + 'px';
    } //

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

        this.autoStart = false;

        this.container = (typeof params.container == "string") ?
            document.getElementById(params.container) :
            params.container;

        /* the following code will add the event Handlers several times if
            new Puzzle objects are created with same container.
            the presence of previous event listeners is NOT detectable
        */
        this.container.addEventListener("mousedown", event => {
            event.preventDefault();
            events.push({ event: 'touch', position: this.relativeMouseCoordinates(event) });
        });
        this.container.addEventListener("touchstart", event => {
            event.preventDefault();
            if (event.touches.length != 1) return;
            let ev = event.touches[0];
            events.push({ event: 'touch', position: this.relativeMouseCoordinates(ev) });
        }, { passive: false });

        this.container.addEventListener("mouseup", event => {
            event.preventDefault();
            handleLeave();
        });
        this.container.addEventListener("touchend", handleLeave);
        this.container.addEventListener("touchleave", handleLeave);
        this.container.addEventListener("touchcancel", handleLeave);

        this.container.addEventListener("mousemove", event => {
            event.preventDefault();
            // do not accumulate move events in events queue - keep only current one
            if (events.length && events[events.length - 1].event == "move") events.pop();
            events.push({ event: 'move', position: this.relativeMouseCoordinates(event) })
        });
        this.container.addEventListener("touchmove", event => {
            event.preventDefault();
            if (event.touches.length != 1) return;
            let ev = event.touches[0];
            // do not accumulate move events in events queue - keep only current one
            if (events.length && events[events.length - 1].event == "move") events.pop();
            events.push({ event: 'move', position: this.relativeMouseCoordinates(ev) });
        }, { passive: false });

        /* create canvas to contain picture - will be styled later */
        this.gameCanvas = document.createElement('CANVAS');
        this.container.appendChild(this.gameCanvas)

        this.srcImage = new Image();
        this.imageLoaded = false;
        this.srcImage.addEventListener("load", () => imageLoaded(this));

        function handleLeave() {
            events.push({ event: 'leave' }); //
        }

    } // Puzzle

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    getContainerSize() {
        let styl = window.getComputedStyle(this.container);

        /* dimensions of container */
        this.contWidth = parseFloat(styl.width);
        this.contHeight = parseFloat(styl.height);
        
    }

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    puzzle_create(coordinates, groups) {

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

        this.defineShapes({ coeffDecentr: 0.12, twistf: [twist0, twist1, twist2, twist3, twist4][document.getElementById("shape").value - 1] });

        this.polyPieces = [];

        if(coordinates.length != groups.length){
            console.log("coordinates and groups do not have the same length?", coordinates, groups)
        }

        for (let key in coordinates) {
            let pieces_in_group = [];
            for (let ind of groups[key]) {
                let w = (ind-1) % window.apnx;
                let h = Math.floor((ind-1) / window.apnx);
                pieces_in_group.push(this.pieces[h][w]);
            }
            newMerge(pieces_in_group.length - 1);
            let ppp = new PolyPiece(pieces_in_group, this);
            ppp.moveTo(coordinates[key][0] * puzzle.contWidth, coordinates[key][1] * puzzle.contHeight)
            this.polyPieces.push(ppp);
        }

        this.evaluateZIndex();

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

        let kx, ky, width = this.srcImage.naturalWidth, height = this.srcImage.naturalHeight, npieces = this.nbPieces;
        let err, errmin = 1e9;
        let ncv, nch;


        let nHPieces = mround(msqrt(npieces * width / height));
        let nVPieces = mround(npieces / nHPieces);
        
        /* based on the above estimation, we will try up to + / - 2 values
            and evaluate (arbitrary) quality criterion to keep best result
        */

        for (ky = 0; ky < 5; ky++) {
            ncv = nVPieces + ky - 2;
            for (kx = 0; kx < 5; kx++) {
            nch = nHPieces + kx - 2;
            err = nch * height / ncv / width;
            err = (err + 1 / err) - 2; // error on pieces dimensions ratio)
            err += mabs(1 - nch * ncv / npieces); // adds error on number of pieces

            if (err < errmin) { // keep smallest error
                errmin = err;
                this.nx = nch;
                this.ny = ncv;
            }
            } // for kx
        } // for ky

    } // computenxAndny

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    defineShapes(shapeDesc) {
    // define shapes as if the width and height of a piece were 1

    /* first, place the corners of the pieces
        at some distance of their theoretical position, except for edges
    */

    let { coeffDecentr, twistf } = shapeDesc;

    const corners = [];
    const nx = this.nx, ny = this.ny;
    let np;

    for (let ky = -1; ky <= ny+1; ++ky) {
        corners[ky] = [];
        for (let kx = -1; kx <= nx+1; ++kx) {
        corners[ky][kx] = new Point(kx + alea(-coeffDecentr, coeffDecentr),
            ky + alea(-coeffDecentr, coeffDecentr));
        if (kx == 0) corners[ky][kx].x = 0;
        if (kx == nx) corners[ky][kx].x = nx;
        if (ky == 0) corners[ky][kx].y = 0;
        if (ky == ny) corners[ky][kx].y = ny;
        } // for kx
    } // for ky

    // Array of pieces
    this.pieces = [];
    for (let ky = 0; ky < ny; ++ky) {
        this.pieces[ky] = [];
        for (let kx = 0; kx < nx; ++kx) {
            this.pieces[ky][kx] = np = new Piece(kx, ky, ky * nx + kx + 1);
            // top side
            if (ky == 0) {
                np.ts.points = [corners[ky][kx], corners[ky][kx + 1]];
                np.ts.type = "d";
            } else {
                np.ts = this.pieces[ky - 1][kx].bs.reversed();
            }
            // right side
            np.rs.points = [corners[ky][kx + 1], corners[ky + 1][kx + 1]];
            np.rs.type = "d";
            if (kx < nx - 1) {
                if (intAlea(2)) // randomly twisted on one side of the side
                twistf(np.rs, corners[ky][kx], corners[ky + 1][kx]);
                else
                twistf(np.rs, corners[ky][kx + 2], corners[ky + 1][kx + 2]);
            }
            // left side
            if (kx == 0) {
                np.ls.points = [corners[ky + 1][kx], corners[ky][kx]];
                np.ls.type = "d";
            } else {
                np.ls = this.pieces[ky][kx - 1].rs.reversed()
            }
            // bottom side
            np.bs.points = [corners[ky + 1][kx + 1], corners[ky + 1][kx]];
            np.bs.type = "d";
            if (ky < ny - 1) {
                if (intAlea(2)) // randomly twisted on one side of the side
                twistf(np.bs, corners[ky][kx + 1], corners[ky][kx]);
                else
                twistf(np.bs, corners[ky + 2][kx + 1], corners[ky + 2][kx]);
            }
        } // for kx
    } // for ky

    } // Puzzle.defineShapes

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    puzzle_scale() {

        // we suppose we want the picture to fill 90% on width or height and less or same on other dimension
        // this 90% might be changed and depend on the number of columns / rows.

        // suppose image fits in height
        puzzle.getContainerSize();

        const aspectRatio = this.srcImage.naturalWidth / this.srcImage.naturalHeight;
        if (this.contWidth / this.contHeight > aspectRatio) {
            this.gameHeight = this.contHeight;
            this.gameWidth = this.contHeight * aspectRatio;
        } else {
            this.gameWidth = this.contWidth;
            this.gameHeight = this.contWidth / aspectRatio;
        }

        // this.gameWidth *= 2;
        // this.gameHeight *= 2;


        /* get a scaled copy of the source picture into a canvas */
        this.gameCanvas = document.createElement('CANVAS');
        this.gameCanvas.width = this.gameWidth;
        this.gameCanvas.height = this.gameHeight;
        this.gameCtx = this.gameCanvas.getContext("2d");

        // this.gameCtx.scale(3,3)
        
        this.gameCtx.drawImage(this.srcImage, 0, 0, this.gameWidth * downsize_to_fit, this.gameHeight * downsize_to_fit); //safe

        this.gameCanvas.classList.add("gameCanvas");
        this.gameCanvas.style.zIndex = 500;

        /* scale pieces */
        this.scalex = downsize_to_fit * this.gameWidth / this.nx;    // average width of pieces
        this.scaley = downsize_to_fit * this.gameHeight / this.ny;   // average height of pieces
        

        this.pieces.forEach(row => {
            row.forEach(piece => piece.piece_scale(this));
        }); // this.pieces.forEach, safe

        /* calculate offset for centering image in container */
        this.offsx = (this.contWidth - this.gameWidth) / 2;
        this.offsy = (this.contHeight - this.gameHeight) / 2;

        /* computes the distance below which two pieces connect
            depends on the actual size of pieces, with lower limit */
        this.dConnect = mmax(10, mmin(this.scalex, this.scaley) / 10) * window.scaleFactor;

        /* computes the thickness used for emboss effect */
        // from 2 (scalex = 0)  to 5 (scalex = 200), not more than 5
        this.embossThickness = mmin(2 + this.scalex / 200 * (5 - 2), 5) * window.scaleFactor * 0.75;



    } // Puzzle.scale

    //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    relativeMouseCoordinates(event) {

    /* takes mouse coordinates from mouse event
        returns coordinates relative to container, even if page is scrolled or zoommed */

    const br = this.container.getBoundingClientRect();
    return {
        x: event.clientX - br.x,
        y: event.clientY - br.y
    };
    } // Puzzle.relativeMouseCoordinates

    

    evaluateZIndex() {

    /* re-evaluates order of polypieces in puzzle after a merge
        the polypieces must be in decreasing order of size(number of pieces),
        preserving the previous order as much as possible
    */
    for (let k = this.polyPieces.length - 1; k > 0; --k) {
        if (this.polyPieces[k].pieces.length > this.polyPieces[k - 1].pieces.length) {
        // swap pieces if not in right order
        [this.polyPieces[k], this.polyPieces[k - 1]] = [this.polyPieces[k - 1], this.polyPieces[k]];
        }
    }
    // re-assign zIndex
    this.polyPieces.forEach((pp, k) => {
        pp.polypiece_canvas.style.zIndex = k + 10;
    });
    this.zIndexSup = this.polyPieces.length + 10; // higher than 'normal' zIndices
    } // Puzzle.evaluateZIndex
} // class Puzzle
//-----------------------------------------------------------------------------

let loadFile;
{ // scope for loadFile

    let options;

    let elFile = document.createElement('input');
    elFile.setAttribute('type', 'file');
    elFile.style.display = 'none';
    elFile.addEventListener("change", getFile);

    function getFile() {

    if (this.files.length == 0) {
        //      returnLoadFile ({fail: 'no file'});
        return;
    }
    let file = this.files[0];
    let reader = new FileReader();

    reader.addEventListener('load', () => {
        puzzle.srcImage.src = reader.result;
        document.getElementById("previm").src = puzzle.srcImage.src;
    });
    reader.readAsDataURL(this.files[0]);

    } // getFile

    loadFile = function (ooptions) {
    elFile.setAttribute("accept", "image/*");
    elFile.value = null; // else, re-selecting the same file does not trigger "change"
    elFile.click();

    } // loadFile
} //  // scope for loadFile

var imagePath = "landscape.jpeg";
function loadInitialFile() {
    puzzle.srcImage.src = imagePath;
    document.getElementById("previm").src = imagePath;
    console.log("IMAGE LOADED")
    window.set_ap_image = true;
}
//-----------------------------------------------------------------------------
function imageLoaded(puzzle) {
    events.push({ event: "srcImageLoaded" });
    puzzle.imageLoaded = true;
} // imageLoaded

//-----------------------------------------------------------------------------
function fitImage(img, width, height) {
    /* The image is a child of puzzle.container. It will be styled to be as big as possible, not wider than width,
    not higher than height, centered in puzzle.container
    (width and height must be less than or equal to the container dimensions)
    */

    let wn = img.naturalWidth;
    let hn = img.naturalHeight;
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
let gameStarted = false;
window.gameplayStarted = false;
let manually_load_save_file = false;


// Fetch scale factor from CSS
window.scaleFactor = getComputedStyle(document.documentElement).getPropertyValue('--scale-factor').trim();

{ // scope for animate
    let state = 0;
    let moving; // for information about moved piece
    let tmpImage;

    animate = function () {
    requestAnimationFrame(animate);

    let event;
    
    if (events.length) event = events.shift(); // read event from queue
    if (event && event.event == "reset") state = 0;
    if (event && event.event == "srcImageLoaded") state = 0;
    // resize event
    if (event && event.event == "resize") {

        // remember dimensions of container before resize
        puzzle.getContainerSize();
        if (state == 15 || state > 60) { // resize initial or final picture
            fitImage(tmpImage, puzzle.contWidth * downsize_to_fit, puzzle.contHeight * downsize_to_fit);
        }
        else if (state >= 25) { // resize pieces
            
            const x_change = puzzle.contWidth / puzzle.prevWidth;
            const y_change = puzzle.contHeight / puzzle.prevHeight;

            puzzle.puzzle_scale();
            
            puzzle.polyPieces.forEach(pp => {
                console.log("resize move")
                
                let nx = pp.x;
                let ny = pp.y;

                pp.moveTo(nx, ny);
                pp.polypiece_drawImage();


                pp.moveTo(pp.x * x_change, pp.y * y_change);

            }); // puzzle.polypieces.forEach
        }
        
        puzzle.prevWidth = puzzle.contWidth;
        puzzle.prevHeight = puzzle.contHeight;

        return;
    } // resize event

    switch (state) {
        /* initialisation */
        case 0:
            state = 10;
        break;

        /* wait for image loaded and other required parameters*/
        case 10:
            if (!puzzle.imageLoaded) return;
            
                // display centered initial image
                puzzle.container.innerHTML = ""; // forget contents
                tmpImage = document.createElement("img");
                tmpImage.src = puzzle.srcImage.src;
                puzzle.getContainerSize();
                fitImage(tmpImage, puzzle.contWidth * 0.90, puzzle.contHeight * 0.90);
                tmpImage.style.boxShadow = `${4 * window.scaleFactor}px ${4 * window.scaleFactor}px ${4 * window.scaleFactor}px rgba(0, 0, 0, 0.5)`;
                puzzle.container.appendChild(tmpImage);
                
                puzzle.prevWidth = puzzle.contWidth;
                puzzle.prevHeight = puzzle.contHeight;

                state = 15;
            break;

        /* wait for choice of number of pieces */
        case 15:
            if (autoStart) event = { event: "nbpieces", nbpieces: 12 }; // auto start
            autoStart = false; // not twice
            // if (!event) return;
            if ((event && event.event == "nbpieces") || (window.LoginStart && window.is_connected)) {
                state = 17;
            }
            if (event && event.event == "srcImageLoaded") {
                state = 10;
                return;
            } else return;

        
        case 17: // load save!

            if(unlocked_pieces.length == 0){
                return;
            }
            if(!window.set_ap_image){
                state = 15;
                return;
            }
            
            state = 18;
            get_save_data_from_data_storage();

            async function get_save_data_from_data_storage(keys) {
                window.save_file = {};
                if(!window.play_solo){
                    let keys = [];
            
                    for (let p = 1; p <= apnx * apny; p++) {
                        keys.push(`JIG_PROG_${window.slot}_${p}`);
                    }

                    let client = window.getAPClient();                  

                    await client.storage.notify(keys, (key, value, oldValue) => {
                        do_action(key, value, false);
                    });

                    let results = (await client.storage.fetch(keys, true))
                    
                    for (let [key, value] of Object.entries(results)) {
                        if(value){
                            let pp_index = parseInt(key.split("_")[3]);
                            window.save_file[pp_index] = value
                        }
                    }
                }

                unlocked_pieces.forEach(index => {
                    if (window.save_file[index] === undefined) {
                        window.save_file[index] = [0, 0];
                    }
                });
                
                state = 19;
            }
        case 18: // wait for save file
            return;

        case 19:  // process save file and start game
            let coordinates = {}
            let groups = {}

            let all_indices = []

            for (let key = 1; key <= window.apnx * window.apny; key++) {
                all_indices.push(key);
            }

            for (let [key, value] of Object.entries(window.save_file)) {
                all_indices = all_indices.filter(index => index !== parseInt(key));

                if (Array.isArray(value)) {
                    coordinates[key] = value;
                    groups[key] = [parseInt(key)];
                } else {
                    let refer_to = value;
                    let groupKey = Object.keys(groups).find(groupKey => groups[groupKey].includes(refer_to));
                    if (groupKey) {
                        groups[groupKey].push(parseInt(key));
                    } else {
                        console.log(refer_to, "not found")
                    }
                }
            }

            for(let key of all_indices){
                groups[key] = [key];
                coordinates[key] = [2,2];
            }

            console.log("STARTING GAME")
            gameStarted = true;
            menu.open();

            document.getElementById("m1").style.display = "none";
            document.getElementById("m2").style.display = "none";
            document.getElementById("m3").style.display = "none";
            document.getElementById("m4").style.display = "none";
            document.getElementById("m5").style.display = "none";
            document.getElementById("m10b").style.display = "none";

            /* prepare puzzle */
            puzzle.puzzle_create(coordinates, groups); // create shape of pieces, independant of size

            window.save_loaded = true;

            for(let data of pending_actions){
                do_action(data[0], data[1], false);
            }

            puzzle_ini = true;
            
            puzzle.puzzle_scale();
            puzzle.polyPieces.forEach(pp => {
                pp.polypiece_drawImage();
            }); // puzzle.polypieces.forEach
            puzzle.gameCanvas.style.top = puzzle.offsy + "px";
            puzzle.gameCanvas.style.left = puzzle.offsx + "px";
            puzzle.gameCanvas.style.display = "block";

            state = 25;
            break;


        case 25: // spread pieces
            puzzle.gameCanvas.style.display = "none"; // hide reference image
            
            state = 40;
            break;

        case 40: // evaluate z index
            puzzle.evaluateZIndex();
            state = 45;

            break;

        case 45:
            // run function after ini
            state = 50;
            
            window.gameplayStarted = true;            
            break;

            /* wait for user grabbing a piece or other action */
        case 50:
            if (!event) return;

            if (!window.is_connected && !window.play_solo) return;
            
            if (event.event != "touch") return;

            const event_x = event.position.x * window.scaleFactor;
            const event_y = event.position.y * window.scaleFactor;

            moving = {
                xMouseInit: event_x,
                yMouseInit: event_y
            }

            /* evaluates if contact inside a PolyPiece, by decreasing z-index */
            for (let k = puzzle.polyPieces.length - 1; k >= 0; --k) {
                let pp = puzzle.polyPieces[k];
                if (pp.polypiece_ctx.isPointInPath(pp.path, event_x - pp.x, event_y - pp.y)) {
                    moving.pp = pp;
                    moving.ppXInit = pp.x;
                    moving.ppYInit = pp.y;
                    // move selected piece to top of polypieces stack
                    puzzle.polyPieces.splice(k, 1);
                    puzzle.polyPieces.push(pp);
                    pp.polypiece_canvas.style.zIndex = puzzle.zIndexSup; // to foreground
                    state = 55;
                    return;
                }

            } // for k
            break;

        case 55:  // moving piece
            if (!event) return;

            
            switch (event.event) {
                case "move":
                    const event2_x = event.position.x * window.scaleFactor;
                    const event2_y = event.position.y * window.scaleFactor;
                    let to_x = event2_x - moving.xMouseInit + moving.ppXInit;
                    let to_y = event2_y - moving.yMouseInit + moving.ppYInit;
                    to_x = mmin(
                        mmax(
                            to_x, 
                            - (moving.pp.nx-1) * puzzle.scalex
                        ),
                        puzzle.contWidth - puzzle.scalex
                    );
                    to_y = mmin(
                        mmax(
                            to_y, 
                            - (moving.pp.ny-1) * puzzle.scaley
                        ),
                        puzzle.contHeight - puzzle.scaley
                    );

                    
                    moving.pp.moveTo(to_x, to_y);
                    if (window.gameplayStarted && !window.play_solo) {
                        // console.log("move piece", moving.pp.pieces[0].index, moving.pp);                        
                        change_savedata_datastorage(moving.pp.pieces[0].index, [to_x / puzzle.contWidth, to_y / puzzle.contHeight], false);
                    }

                    break;
                case "leave":
                    // check if moved polypiece is close to a matching other polypiece
                    // check repeatedly since polypieces moved by merging may come close to other polypieces
                    let doneSomething;
                    let doneSomethingAtAll = false;
                    do {
                        doneSomething = false;
                        for (let k = puzzle.polyPieces.length - 1; k >= 0; --k) {
                            let pp = puzzle.polyPieces[k];
                            if (pp == moving.pp) continue; // don't match with myself
                            if (moving.pp.ifNear(pp)) { // a match !
                                // compare polypieces sizes to move smallest one
                                if (pp.pieces.length > moving.pp.pieces.length) {
                                    pp.merge(moving.pp);
                                    moving.pp = pp; // memorize piece to follow
                                } else {
                                    moving.pp.merge(pp);
                                }
                                doneSomething = true;
                                doneSomethingAtAll = true;
                                break;
                            }
                        } // for k

                    } while (doneSomething);

                    if (!doneSomethingAtAll && window.gameplayStarted && !window.play_solo) {
                        // console.log("move piece", moving.pp.pieces[0].index, moving.pp);                        
                        change_savedata_datastorage(moving.pp.pieces[0].index, [moving.pp.x / puzzle.contWidth, moving.pp.y / puzzle.contHeight], true);
                    }

                    // not at its right place
                    puzzle.evaluateZIndex();
                    state = 50;
                    
                    return;
            } // switch (event.event)

            break;


        case 9999: break;
        default:
            let st = state;
            state = 9999;  // to display message beyond only once
            throw ("oops, unknown state " + st);
    } // switch(state)
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
        document.getElementById("m1").style.display = "block"
        document.getElementById("m2").style.display = "block"
        document.getElementById("m3").style.display = "block"
        document.getElementById("m4").style.display = "block"
        document.getElementById("m5").style.display = "block"
        
        document.getElementById("m10b").style.display = "block"
    }
    document.getElementById("m6").style.display = "block"
    if(gameStarted){
        document.getElementById("m9a").style.display = "block"
        document.getElementById("m9").style.display = "block"
        document.getElementById("m10").style.display = "block"
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

    document.getElementById("m1").addEventListener("click", loadInitialFile);
    document.getElementById("m2").addEventListener("click", loadFile);
    document.getElementById("m3").addEventListener("click", () => { });
    document.getElementById("m4").addEventListener("click", () => events.push({ event: "nbpieces", nbpieces: 81 }));

    document.getElementById("m5").addEventListener("click", () => {
    window.open('credits.html', '_blank');
    });

    const colors = ["#ffd", "#aa9", "#886", "#553", "#220", "#725", "#990", "#a31", "#342"];
    window.currentColorIndex = localStorage.getItem("backgroundColorIndex") || 0;

    document.getElementById("m10b").addEventListener("click", () => {
        const forPuzzleElement = document.getElementById("forPuzzle");
        window.currentColorIndex = (window.currentColorIndex + 1) % colors.length;
        
        forPuzzleElement.style.backgroundColor = colors[window.currentColorIndex];
        localStorage.setItem("backgroundColorIndex", window.currentColorIndex);

        const jsonList = [{ type: "text", text: "Example text with new background" }];
        window.jsonListener("", jsonList);
    });

    // Set the initial background color from localStorage if available
    window.addEventListener("load", () => {
    const savedColorIndex = localStorage.getItem("backgroundColorIndex");
    if (savedColorIndex !== null) {
        document.getElementById("forPuzzle").style.backgroundColor = colors[savedColorIndex];
    }
    });

    const widthsOfPreview = [4, 8, 16, 32, 64];
    document.getElementById("n0").addEventListener("click", () => {
        savedIndexPreview = (savedIndexPreview + 1) % widthsOfPreview.length;
        updatePreviewAndClient();
    });

    let savedIndexPreview = localStorage.getItem("widthOfPreviewIndex");
    // Set the initial width from localStorage if available
    window.addEventListener("load", () => {
        if (savedIndexPreview == null) {
            savedIndexPreview = 0;
        }
        const element = document.getElementById("previm");
        element.style.width = widthsOfPreview[savedIndexPreview] + "vw";
    });

    const widthsOfClient = [4, 8, 16, 32, 2];
    const textsizeOfClient = [.3, .6, 1.2, 1.4, 0.15];
    document.getElementById("n1").addEventListener("click", () => {
        savedIndexClient = (savedIndexClient + 1) % widthsOfClient.length;
        updatePreviewAndClient();
    });

    let savedIndexClient = localStorage.getItem("widthsOfClientIndex");
    
    // Set the initial width from localStorage if available
    window.addEventListener("load", () => {
        if (savedIndexClient == null) {
            savedIndexClient = 0;
        }
        const element = document.getElementById("log");
        element.style.width = widthsOfClient[savedIndexClient] + "vw";
        element.style.fontSize = textsizeOfClient[savedIndexClient] + "vw"; 
    });

    function updatePreviewAndClient(){
        let element = document.getElementById("previm");
        element.style.width = widthsOfPreview[savedIndexPreview] + "vw";
        localStorage.setItem("widthOfPreviewIndex", savedIndexPreview);
        
        element = document.getElementById("log");
        element.style.width = Math.max(widthsOfClient[savedIndexClient], widthsOfPreview[savedIndexPreview]) + "vw";
        element.style.fontSize = textsizeOfClient[savedIndexClient] + "vw";
        localStorage.setItem("widthsOfClientIndex", savedIndexClient);

    }

    return menu;
})();

menu.open();

window.addEventListener("resize", event => {
    // do not accumulate resize events in events queue - keep only current one
    if (events.length && events[events.length - 1].event == "resize") return;;
    events.push({ event: "resize" });
});

// Add zoom functionality
let scale = 1;
const zoomSensitivity = 0.1;



puzzle = new Puzzle({ container: "forPuzzle" });


loadInitialFile();
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


function findPolyPieceUsingPuzzlePiece(index){
    for (let i = 0; i < puzzle.polyPieces.length; i++) {
        if (puzzle.polyPieces[i].pieces.some(piece => piece.index === index)) {
            return puzzle.polyPieces[i];
        }
    }
    console.log(puzzle.polyPieces, index)
    return null;
}

var puzzle_ini = false;
var unlocked_pieces = [];

function unlockPiece(index) {
    unlocked_pieces.push(index);

    if(puzzle_ini){
        let pp = findPolyPieceUsingPuzzlePiece(index);
        pp.moveTo(
            (index*43.2345) % (0.05 * puzzle.gameWidth),
            (index*73.6132) % (0.05 * puzzle.gameHeight)
        );
    }
}

function updateMergesLabels(){
    document.getElementById("m9").innerText = "Merges in logic: " + window.possible_merges[unlocked_pieces.length];
    document.getElementById("m10").innerText = "Merges possible: " + window.actual_possible_merges[unlocked_pieces.length];
}

window.unlockPiece = unlockPiece;
window.updateMergesLabels = updateMergesLabels

function newMerge(add = 1){
    if(add < 1){
        return;
    }
    for(let i = 0; i<add; i++){
        numberOfMerges += 1;
        console.log("numberOfMerges:", numberOfMerges);
        window.sendCheck(numberOfMerges);
        if(numberOfMerges == apnx * apny - 1){
            window.sendGoal();
        }
    }
    document.getElementById("m9a").innerText = "Merges: " + numberOfMerges + "/" + (apnx * apny - 1);
    window.playNewMergeSound();
}

var numberOfMerges = 0;

function setImagePath(l){
    imagePath = l;
    loadInitialFile();
    document.getElementById("previm").src = imagePath
}
window.setImagePath = setImagePath;

function move_piece_bounced(pp_index, x, y){
    do_action(`x_x_x_${pp_index}`, [x,y], true);
}

window.move_piece_bounced = move_piece_bounced;

function change_savedata_datastorage(key, value, final) {
    if(window.play_solo) return;

    if(final){
        const client = window.getAPClient();
        client.storage.prepare(`JIG_PROG_${window.slot}_${key}`, 0).replace(value).commit();
    }else{
        const client = window.getAPClient();
        if (!window.bounceTimeout) {
            client.bounce({"slots": [window.slot]}, [key, value[0], value[1]]);
            window.bounceTimeout = setTimeout(() => {
                window.bounceTimeout = null;
            }, 40);
        }
    }
}

let pending_actions = []
function do_action(key, value, bounce){
    console.log(key, value, bounce)
    if(!window.save_loaded){
        if(!bounce){
            pending_actions.push([key, value]);
        }
    } else {
        let pp_index = parseInt(key.split("_")[3]);
        const pp = findPolyPieceUsingPuzzlePiece(pp_index);
        if (Array.isArray(value)) {
            const [x, y] = value;
            if (pp) {
                // console.log(pp_index, "to", x, y)
                pp.moveTo(x * puzzle.contWidth, y * puzzle.contHeight);
                pp.movedToDesiredPlace = true;
            }
        } else {
            value = parseInt(value);
            const pp2 = findPolyPieceUsingPuzzlePiece(value);
            if(pp != pp2){
                pp.merge(pp2);
            }
        }
    }
}