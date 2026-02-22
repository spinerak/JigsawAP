"use strict";

(function initArchipelagoBridge(globalScope) {
    function create(deps) {
        async function changeSavedataDatastorage(key, value, final) {
            if (globalScope.play_solo) return;
            const keyName = `JIG_PROG_${globalScope.slot}_${key}`;

            if (key === "O") {
                const client = globalScope.getAPClient();
                client.storage.prepare(keyName, value).default().commit();
                return;
            }
            if (key === "M") {
                const client = globalScope.getAPClient();
                client.storage.prepare(keyName, 0).replace(value).commit();
                return;
            }

            if (final) {
                const client = globalScope.getAPClient();
                let currentValue = await client.storage.fetch([keyName], true);
                currentValue = currentValue[keyName];
                if (currentValue === null) {
                    client.storage.prepare(keyName, globalScope.zero_list).replace(value).commit();
                } else if (Array.isArray(currentValue) && Array.isArray(value)) {
                    client.storage.prepare(keyName, globalScope.zero_list).replace(value).commit();
                } else if (typeof currentValue === "number" && typeof value === "number") {
                    client.storage.prepare(keyName, 999999).replace(Math.min(currentValue, value)).commit();
                } else if (!Array.isArray(value)) {
                    client.storage.prepare(keyName, globalScope.zero_list).replace(value).commit();
                }
            } else {
                const client = globalScope.getAPClient();
                if (!globalScope.bounceTimeout) {
                    client.bounce({ "slots": [globalScope.slot] }, [key, value]);
                    globalScope.bounceTimeout = setTimeout(() => {
                        globalScope.bounceTimeout = null;
                    }, 1000);
                }
            }
        }

        function doAction(key, value, oldValue, bounce) {
            if (deps.getAcceptPendingActions()) {
                if (!bounce) {
                    deps.getPendingActions().push([key, value, oldValue]);
                    console.log("Add pending action", key, value, deps.getPendingActions());
                }
                return;
            }
            if (!deps.getProcessPendingActions()) return;

            const ppIndex = parseInt(key.split("_")[3]);
            const moving = deps.getMoving();
            const movingThatPiece = moving && moving.pp && moving.pp.pieces && moving.pp.pieces[0].index == ppIndex;

            const pp = deps.findPolyPieceUsingPuzzlePiece(ppIndex, true);
            if (!pp) {
                console.log("Ignore action not found", pp, ppIndex);
                return;
            }
            if (Array.isArray(value) || value == "unlock") {
                if (movingThatPiece) return;
                let x = 0;
                let y = 0;
                let r = 0;
                if (value == "unlock") {
                    let numRots = Math.round(360 / globalScope.rotations);
                    if (globalScope.rotations == 0) numRots = 1;
                    let randomRotation = 0;
                    if (globalScope.rotations == 180) {
                        randomRotation = Math.floor(2 * Math.floor((ppIndex * 2345.1234) % 2));
                    } else {
                        randomRotation = Math.floor((ppIndex * 2345.1234) % numRots);
                    }
                    x = ((ppIndex + 10) * 43.2345) % 0.05;
                    y = ((ppIndex + 10) * 73.6132) % 0.05;
                    r = randomRotation;
                } else {
                    if (value.length == 3) {
                        x = value[0];
                        y = value[1];
                        r = value[2];
                    } else if (value.length == 2) {
                        x = value[0];
                        y = value[1];
                        r = 0;
                    }
                }
                const puzzle = deps.getPuzzle();
                if (pp && puzzle) {
                    if (!bounce || (bounce && !globalScope.ignore_bounce_pieces.includes(ppIndex))) {
                        pp.moveTo(x * puzzle.contWidth, y * puzzle.contHeight);
                        pp.rotateTo(r);
                        pp.hasMovedEver = true;
                    }
                }
            } else {
                value = parseInt(value);
                if (typeof oldValue === "number") return;

                if (movingThatPiece || (moving && moving.pp && moving.pp.pieces && moving.pp.pieces[0].index == value)) {
                    if (moving && moving.pp && moving.pp.polypiece_canvas) moving.pp.polypiece_canvas.classList.remove("moving");
                    deps.setMoving(null);
                }
                const pp2 = deps.findPolyPieceUsingPuzzlePiece(value);
                if (pp != pp2) {
                    console.log("merging because of action", key, value, bounce);
                    if (pp.pieces.length > pp2.pieces.length || (pp.pieces.length == pp2.pieces.length && pp.pieces[0].index > pp2.pieces[0].index)) {
                        pp.merge(pp2);
                    } else {
                        pp2.merge(pp);
                    }
                }
            }
        }

        function movePieceBounced(data) {
            doAction(`x_x_x_${data[0]}`, data[1], globalScope.zero_list, true);
        }

        return {
            changeSavedataDatastorage: changeSavedataDatastorage,
            doAction: doAction,
            movePieceBounced: movePieceBounced
        };
    }

    globalScope.JigsawArchipelagoBridge = { create: create };
})(window);
