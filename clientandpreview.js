
const draggable1 = document.getElementById('draggable1');
const taskbar1 = document.getElementById('taskbar1');
const prevsync = document.getElementById('prevsync');
let offsetX1, offsetY1, isDragging1 = false;

draggable1.addEventListener('mousedown', (e) => {
    isDragging1 = true;
    offsetX1 = e.clientX - draggable1.offsetLeft;
    offsetY1 = e.clientY - draggable1.offsetTop;
});

draggable1.addEventListener('touchstart', (e) => {
    isDragging1 = true;
    const touch = e.touches[0];
    offsetX1 = touch.clientX - draggable1.offsetLeft;
    offsetY1 = touch.clientY - draggable1.offsetTop;
});

function handleDrag(draggable, isDragging, offsetX, offsetY, e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const newLeft = Math.max(0, Math.min(window.innerWidth - draggable.offsetWidth - 5, clientX - offsetX));
    const newTop = Math.max(0, Math.min(window.innerHeight - draggable.offsetHeight - 5, clientY - offsetY));
    
    draggable.style.left = (newLeft / window.innerWidth) * 100 + 'vw';
    draggable.style.top = (newTop / window.innerHeight) * 100 + 'vh';

    adjustedPosition(draggable);
}

document.addEventListener('mousemove', (e) => handleDrag(draggable1, isDragging1, offsetX1, offsetY1, e));
document.addEventListener('touchmove', (e) => handleDrag(draggable1, isDragging1, offsetX1, offsetY1, e));

document.addEventListener('mouseup', () => { isDragging1 = false; });

document.addEventListener('touchend', () => { isDragging1 = false; });

function restoreDiv1() {
    draggable1.style.display = (draggable1.style.display === 'none') ? 'block' : 'none';
    if (draggable1.style.display === 'block' || draggable1.style.display === '') {
        taskbar1.style.backgroundColor = '#909090'; // lighter color
        
        var logTextarea = document.getElementById("log");
        logTextarea.scrollTop = logTextarea.scrollHeight - logTextarea.clientHeight;
    } else {
        taskbar1.style.backgroundColor = ''; // reset to default
    }
}

const draggable2 = document.getElementById('draggable2');
const taskbar2 = document.getElementById('taskbar2');
const draggable3 = document.getElementById('draggable3');
const taskbar3 = document.getElementById('taskbar3');
const draggable4 = document.getElementById('draggable4');
const taskbarViewControls = document.getElementById('taskbarViewControls');
const draggable5 = document.getElementById('draggable5');
const taskbarCosmeticControls = document.getElementById('taskbarCosmeticControls');
const draggable6 = document.getElementById('draggable6');
let offsetX2, offsetY2, isDragging2 = false;
let offsetX3, offsetY3, isDragging3 = false;
let offsetX4, offsetY4, isDragging4 = false;
let offsetX5, offsetY5, isDragging5 = false;
let offsetX6, offsetY6, isDragging6 = false;

draggable2.addEventListener('mousedown', (e) => {
    isDragging2 = true;
    offsetX2 = e.clientX - draggable2.offsetLeft;
    offsetY2 = e.clientY - draggable2.offsetTop;
});

draggable2.addEventListener('touchstart', (e) => {
    isDragging2 = true;
    const touch = e.touches[0];
    offsetX2 = touch.clientX - draggable2.offsetLeft;
    offsetY2 = touch.clientY - draggable2.offsetTop;
});

draggable3.addEventListener('mousedown', (e) => {
    isDragging3 = true;
    offsetX3 = e.clientX - draggable3.offsetLeft;
    offsetY3 = e.clientY - draggable3.offsetTop;
});

draggable3.addEventListener('touchstart', (e) => {
    isDragging3 = true;
    const touch = e.touches[0];
    offsetX3 = touch.clientX - draggable3.offsetLeft;
    offsetY3 = touch.clientY - draggable3.offsetTop;
});

function isInteractiveControl(el) {
    return el && el.closest('input, button, select, textarea, label');
}
if (draggable4) {
    draggable4.addEventListener('mousedown', (e) => {
        if (isInteractiveControl(e.target)) return;
        isDragging4 = true;
        offsetX4 = e.clientX - draggable4.offsetLeft;
        offsetY4 = e.clientY - draggable4.offsetTop;
    });
    draggable4.addEventListener('touchstart', (e) => {
        if (isInteractiveControl(e.target)) return;
        isDragging4 = true;
        const touch = e.touches[0];
        offsetX4 = touch.clientX - draggable4.offsetLeft;
        offsetY4 = touch.clientY - draggable4.offsetTop;
    });
}
if (draggable5) {
    draggable5.addEventListener('mousedown', (e) => {
        if (isInteractiveControl(e.target)) return;
        isDragging5 = true;
        offsetX5 = e.clientX - draggable5.offsetLeft;
        offsetY5 = e.clientY - draggable5.offsetTop;
    });
    draggable5.addEventListener('touchstart', (e) => {
        if (isInteractiveControl(e.target)) return;
        isDragging5 = true;
        const touch = e.touches[0];
        offsetX5 = touch.clientX - draggable5.offsetLeft;
        offsetY5 = touch.clientY - draggable5.offsetTop;
    });
}
if (draggable6) {
    draggable6.addEventListener('mousedown', (e) => {
        if (isInteractiveControl(e.target)) return;
        isDragging6 = true;
        offsetX6 = e.clientX - draggable6.offsetLeft;
        offsetY6 = e.clientY - draggable6.offsetTop;
    });
    draggable6.addEventListener('touchstart', (e) => {
        if (isInteractiveControl(e.target)) return;
        isDragging6 = true;
        const touch = e.touches[0];
        offsetX6 = touch.clientX - draggable6.offsetLeft;
        offsetY6 = touch.clientY - draggable6.offsetTop;
    });
}

document.addEventListener('mousemove', (e) => {
    handleDrag(draggable2, isDragging2, offsetX2, offsetY2, e);
    if (draggable4) handleDrag(draggable4, isDragging4, offsetX4, offsetY4, e);
    if (draggable5) handleDrag(draggable5, isDragging5, offsetX5, offsetY5, e);
    if (draggable6) handleDrag(draggable6, isDragging6, offsetX6, offsetY6, e);
});
document.addEventListener('touchmove', (e) => {
    handleDrag(draggable2, isDragging2, offsetX2, offsetY2, e);
    if (draggable4) handleDrag(draggable4, isDragging4, offsetX4, offsetY4, e);
    if (draggable5) handleDrag(draggable5, isDragging5, offsetX5, offsetY5, e);
    if (draggable6) handleDrag(draggable6, isDragging6, offsetX6, offsetY6, e);
});

document.addEventListener('mouseup', () => { isDragging2 = false; isDragging4 = false; isDragging5 = false; isDragging6 = false; });
document.addEventListener('touchend', () => { isDragging2 = false; isDragging4 = false; isDragging5 = false; isDragging6 = false; });

document.addEventListener('mousemove', (e) => handleDrag(draggable3, isDragging3, offsetX3, offsetY3, e));
document.addEventListener('touchmove', (e) => handleDrag(draggable3, isDragging3, offsetX3, offsetY3, e));

document.addEventListener('mouseup', () => { isDragging3 = false; });
document.addEventListener('touchend', () => { isDragging3 = false; });


function sizePreviewToImageAspectRatio() {
    const sync = document.getElementById('prevsync');
    let ratio = 0;
    if (sync && sync.width && sync.height) {
        ratio = sync.width / sync.height;
    }
    if (!ratio || !isFinite(ratio)) return;
    const maxW = window.innerWidth * 0.8;
    const maxH = window.innerHeight * 0.8;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
        h = maxH;
        w = h * ratio;
    }
    draggable2.style.width = `${(w / window.innerWidth) * 100}vw`;
    draggable2.style.height = `${(h / window.innerHeight) * 100}vh`;
    adjustedSize(draggable2);
}
window.requestPreviewSyncResize = function requestPreviewSyncResize() {
    if (!draggable2 || draggable2.style.display === 'none' || draggable2.style.display === '') return;
    const sizeKey = window.is_connected ? `draggable2Size_${window.apseed}_${window.slot}` : 'draggable2Size';
    if (!localStorage.getItem(sizeKey)) sizePreviewToImageAspectRatio();
};

function restoreDiv2() {
    draggable2.style.display = (draggable2.style.display === 'none') ? 'block' : 'none';
    if (draggable2.style.display === 'block' || draggable2.style.display === '') {
        taskbar2.style.backgroundColor = '#909090'; // lighter color
        const sizeKey = window.is_connected ? `draggable2Size_${window.apseed}_${window.slot}` : 'draggable2Size';
        if (!localStorage.getItem(sizeKey)) sizePreviewToImageAspectRatio();
    } else {
        taskbar2.style.backgroundColor = ''; // reset to default
    }
}
function restoreDiv3() {
    // Only show/hide draggable3 if pcsStored is 0
    const pcsStoredValue = document.getElementById('pcsStored')?.textContent?.trim();
    if (pcsStoredValue !== "0") return;
    
    draggable3.style.display = (draggable3.style.display === 'none') ? 'block' : 'none';
    if (draggable3.style.display === 'block' || draggable3.style.display === '') {
        taskbar3.style.backgroundColor = '#909090'; // lighter color
    } else {
        taskbar3.style.backgroundColor = ''; // reset to default
    }
}

function setMinSizeToContent(draggable, options = {}) {
    if (!draggable) return;
    const enforceHeight = options.enforceHeight !== false;
    const enforceWidth = options.enforceWidth !== false;
    const setExplicitHeight = options.setExplicitHeight === true;
    requestAnimationFrame(() => {
        const panel = draggable.querySelector('.view-controls-window-panel, .cosmetic-window-panel, .media-window-panel');
        const resizer = draggable.querySelector('.resizer.corner');
        const panelH = panel ? panel.scrollHeight : 0;
        const panelW = panel ? panel.scrollWidth : 0;
        const resizerH = resizer ? resizer.offsetHeight : 0;
        if (enforceHeight) {
            const heightPx = Math.ceil(panelH + resizerH) + 'px';
            draggable.style.minHeight = heightPx;
            if (setExplicitHeight) {
                draggable.style.height = heightPx;
            }
        }
        if (enforceWidth) {
            // Add a small buffer for borders/scrollbars so controls don't clip.
            draggable.style.minWidth = Math.ceil(panelW + 8) + 'px';
        }
    });
}

function restoreDiv4() {
    if (!draggable4 || !taskbarViewControls) return;
    draggable4.style.display = (draggable4.style.display === 'none') ? 'block' : 'none';
    if (draggable4.style.display === 'block' || draggable4.style.display === '') {
        taskbarViewControls.style.backgroundColor = '#909090';
        setMinSizeToContent(draggable4, { enforceHeight: true, enforceWidth: false });
    } else {
        taskbarViewControls.style.backgroundColor = '';
    }
}

function restoreDiv5() {
    if (!draggable5 || !taskbarCosmeticControls) return;
    draggable5.style.display = (draggable5.style.display === 'none') ? 'block' : 'none';
    if (draggable5.style.display === 'block' || draggable5.style.display === '') {
        taskbarCosmeticControls.style.backgroundColor = '#909090';
        /* Do not enforce height: cosmetic window has fixed height and scrolls; enforcing would set minHeight to full content and make the window full-screen tall */
        setMinSizeToContent(draggable5, { enforceHeight: false, enforceWidth: true });
    } else {
        taskbarCosmeticControls.style.backgroundColor = '';
    }
}
function restoreDiv6() {
    if (!draggable6) return;
    draggable6.style.display = (draggable6.style.display === 'none') ? 'block' : 'none';
    if (draggable6.style.display === 'block' || draggable6.style.display === '') {
        setMinSizeToContent(draggable6, { enforceHeight: true, enforceWidth: false, setExplicitHeight: true });
    }
}

document.getElementById('control-btn1').addEventListener('click', restoreDiv1);
document.getElementById('taskbar1').addEventListener('click', restoreDiv1);
document.getElementById('control-btn2a').addEventListener('click', restoreDiv2);
document.getElementById('taskbar2').addEventListener('click', restoreDiv2);
document.getElementById('control-btn3a').addEventListener('click', restoreDiv3);
document.getElementById('taskbar3').addEventListener('click', restoreDiv3);
const controlBtn4 = document.getElementById('control-btn4');
const controlBtn5 = document.getElementById('control-btn5');
const controlBtn6 = document.getElementById('control-btn6');
if (controlBtn4) {
    controlBtn4.addEventListener('click', restoreDiv4);
    controlBtn4.addEventListener('mousedown', (e) => e.stopPropagation());
}
if (taskbarViewControls) taskbarViewControls.addEventListener('click', restoreDiv4);
if (controlBtn5) {
    controlBtn5.addEventListener('click', restoreDiv5);
    controlBtn5.addEventListener('mousedown', (e) => e.stopPropagation());
}
if (taskbarCosmeticControls) taskbarCosmeticControls.addEventListener('click', restoreDiv5);
if (controlBtn6) {
    controlBtn6.addEventListener('click', restoreDiv6);
    controlBtn6.addEventListener('mousedown', (e) => e.stopPropagation());
}
window.restoreDiv6 = restoreDiv6;

// Call restore functions when pressing number keys 1, 2, 3 (ignore when typing in inputs)
document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const tag = active && active.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (active && active.isContentEditable)) return;

    if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1') restoreDiv1();
    if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2') restoreDiv2();
    if (e.key === '3' || e.code === 'Digit3' || e.code === 'Numpad3') restoreDiv3();
});


// const resizerRight1 = document.getElementById('resizerRight1');
// const resizerBottom1 = document.getElementById('resizerBottom1');
const resizerCorner1 = document.getElementById('resizerCorner1');

// const resizerRight2 = document.getElementById('resizerRight2');
// const resizerBottom2 = document.getElementById('resizerBottom2');
const resizerCorner2 = document.getElementById('resizerCorner2');
const resizerCorner4 = document.getElementById('resizerCorner4');
const resizerCorner5 = document.getElementById('resizerCorner5');
const resizerCorner6 = document.getElementById('resizerCorner6');

// enableResizing1(resizerRight1, true, false);
// enableResizing1(resizerBottom1, false, true);
enableResizing1(resizerCorner1, true, true);
// enableResizing2(resizerRight2, true, false);
// enableResizing2(resizerBottom2, false, true);
enableResizing2(resizerCorner2, true, true);
if (resizerCorner4 && draggable4) enableResizing1(resizerCorner4, true, true, draggable4);
if (resizerCorner5 && draggable5) enableResizing1(resizerCorner5, true, true, draggable5);
if (resizerCorner6 && draggable6) enableResizing1(resizerCorner6, true, true, draggable6);

function enableResizing1(resizer, horizontal, vertical, target) {
    const el = target || draggable1;
    let resizing = false;
    let startX, startY, startWidth, startHeight;
    resizer.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        resizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = el.offsetWidth;
        startHeight = el.offsetHeight;
    });

    resizer.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        resizing = true;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        startWidth = el.offsetWidth;
        startHeight = el.offsetHeight;
    });

    document.addEventListener('mousemove', (e) => {
        if (!resizing) return;
        if (horizontal) {
            const newWidth = startWidth + (e.clientX - startX);
            const maxWidth = window.innerWidth - el.offsetLeft - 5;
            el.style.width = `${(Math.min(newWidth, maxWidth) / window.innerWidth) * 100}vw`;
            adjustedSize(el);
        }
        if (vertical) {
            const newHeight = startHeight + (e.clientY - startY);
            const maxHeight = window.innerHeight - el.offsetTop - 5;
            el.style.height = `${(Math.min(newHeight, maxHeight) / window.innerHeight) * 100}vh`;
            adjustedSize(el);
        }
    });

    document.addEventListener('touchmove', (e) => {
        if (!resizing) return;
        const touch = e.touches[0];
        if (horizontal) {
            const newWidth = startWidth + (touch.clientX - startX);
            const maxWidth = window.innerWidth - el.offsetLeft - 5;
            el.style.width = `${(Math.min(newWidth, maxWidth) / window.innerWidth) * 100}vw`;
            adjustedSize(el);
        }
        if (vertical) {
            const newHeight = startHeight + (touch.clientY - startY);
            const maxHeight = window.innerHeight - el.offsetTop - 5;
            el.style.height = `${(Math.min(newHeight, maxHeight) / window.innerHeight) * 100}vh`;
            adjustedSize(el);
        }
    });

    document.addEventListener('mouseup', () => { resizing = false; });
    document.addEventListener('touchend', () => { resizing = false; });
}

function enableResizing2(resizer, horizontal, vertical) {
    let resizing = false;
    let startX, startY, startWidth, startHeight;

    function getPreviewAspectRatio() {
        const sync = document.getElementById('prevsync');
        if (sync && sync.width && sync.height) return sync.width / sync.height;
        return startWidth && startHeight ? startWidth / startHeight : 16 / 10;
    }

    function applyResize2(clientX, clientY) {
        const ratio = getPreviewAspectRatio();
        const maxW = window.innerWidth - draggable2.offsetLeft - 5;
        const maxH = window.innerHeight - draggable2.offsetTop - 5;
        let newWidth = Math.max(0, startWidth + (clientX - startX));
        newWidth = Math.min(newWidth, maxW, maxH * ratio);
        const newHeight = newWidth / ratio;
        draggable2.style.width = `${(newWidth / window.innerWidth) * 100}vw`;
        draggable2.style.height = `${(newHeight / window.innerHeight) * 100}vh`;
        adjustedSize(draggable2);
    }

    resizer.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        resizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = draggable2.offsetWidth;
        startHeight = draggable2.offsetHeight;
    });

    resizer.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        resizing = true;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        startWidth = draggable2.offsetWidth;
        startHeight = draggable2.offsetHeight;
    });

    document.addEventListener('mousemove', (e) => {
        if (!resizing) return;
        if (horizontal && vertical) {
            applyResize2(e.clientX, e.clientY);
        } else {
            if (horizontal) {
                const newWidth = startWidth + (e.clientX - startX);
                const maxWidth = window.innerWidth - draggable2.offsetLeft - 5;
                draggable2.style.width = `${(Math.min(newWidth, maxWidth) / window.innerWidth) * 100}vw`;
                adjustedSize(draggable2);
            }
            if (vertical) {
                const newHeight = startHeight + (e.clientY - startY);
                const maxHeight = window.innerHeight - draggable2.offsetTop - 5;
                draggable2.style.height = `${(Math.min(newHeight, maxHeight) / window.innerHeight) * 100}vh`;
                adjustedSize(draggable2);
            }
        }
    });

    document.addEventListener('touchmove', (e) => {
        if (!resizing) return;
        const touch = e.touches[0];
        if (horizontal && vertical) {
            applyResize2(touch.clientX, touch.clientY);
        } else {
            if (horizontal) {
                const newWidth = startWidth + (touch.clientX - startX);
                const maxWidth = window.innerWidth - draggable2.offsetLeft - 5;
                draggable2.style.width = `${(Math.min(newWidth, maxWidth) / window.innerWidth) * 100}vw`;
                adjustedSize(draggable2);
            }
            if (vertical) {
                const newHeight = startHeight + (touch.clientY - startY);
                const maxHeight = window.innerHeight - draggable2.offsetTop - 5;
                draggable2.style.height = `${(Math.min(newHeight, maxHeight) / window.innerHeight) * 100}vh`;
                adjustedSize(draggable2);
            }
        }
    });

    document.addEventListener('mouseup', () => { resizing = false; });
    document.addEventListener('touchend', () => { resizing = false; });
}
function adjustedSize(draggable) {
    if (draggable === draggable1) {
        const widthVW = parseFloat(draggable.style.width);
        const heightVH = parseFloat(draggable.style.height);
        // console.log(`Draggable1 Size: ${widthVW}vw, ${heightVH}vh`);
        localStorage.setItem('draggable1Size', JSON.stringify({ width: `${widthVW}vw`, height: `${heightVH}vh` }));
        if(window.is_connected){
            const suffix = `_${window.apseed}_${window.slot}`;
            localStorage.setItem('draggable1Size' + suffix, JSON.stringify({ width: `${widthVW}vw`, height: `${heightVH}vh` }));
        }
    }
    if (draggable === draggable2) {
        const widthVW = parseFloat(draggable.style.width);
        const heightVH = parseFloat(draggable.style.height);
        localStorage.setItem('draggable2Size', JSON.stringify({ width: `${widthVW}vw`, height: `${heightVH}vh` }));
        if(window.is_connected){
            const suffix = `_${window.apseed}_${window.slot}`;
            localStorage.setItem('draggable2Size' + suffix, JSON.stringify({ width: `${widthVW}vw`, height: `${heightVH}vh` }));
        }
    }
    if (draggable === draggable4) {
        const widthVW = parseFloat(draggable.style.width);
        const heightVH = parseFloat(draggable.style.height);
        localStorage.setItem('draggable4Size', JSON.stringify({ width: `${widthVW}vw`, height: `${heightVH}vh` }));
    }
    if (draggable === draggable5) {
        const widthVW = parseFloat(draggable.style.width);
        const heightVH = parseFloat(draggable.style.height);
        localStorage.setItem('draggable5Size', JSON.stringify({ width: `${widthVW}vw`, height: `${heightVH}vh` }));
    }
    if (draggable === draggable6) {
        const widthVW = parseFloat(draggable.style.width);
        const heightVH = parseFloat(draggable.style.height);
        localStorage.setItem('draggable6Size', JSON.stringify({ width: `${widthVW}vw`, height: `${heightVH}vh` }));
    }
}

function adjustedPosition(draggable) {
    if (draggable === draggable1) {
        const leftVW = parseFloat(draggable.style.left);
        const topVH = parseFloat(draggable.style.top);
        // console.log(`Draggable1 Position: ${leftVW}vw, ${topVH}vh`);
        localStorage.setItem('draggable1Position', JSON.stringify({ width: `${leftVW}vw`, height: `${topVH}vh` }));
        if(window.is_connected){
            const suffix = `_${window.apseed}_${window.slot}`;
            localStorage.setItem('draggable1Position' + suffix, JSON.stringify({ width: `${leftVW}vw`, height: `${topVH}vh` }));
        }
    }
    if (draggable === draggable2) {
        const leftVW = parseFloat(draggable.style.left);
        const topVH = parseFloat(draggable.style.top);
        // console.log(`Draggable2 Position: ${leftVW}vw, ${topVH}vh`);
        localStorage.setItem('draggable2Position', JSON.stringify({ width: `${leftVW}vw`, height: `${topVH}vh` }));
        if(window.is_connected){
            const suffix = `_${window.apseed}_${window.slot}`;
            localStorage.setItem('draggable2Position' + suffix, JSON.stringify({ width: `${leftVW}vw`, height: `${topVH}vh` }));
        }
    }
    if (draggable === draggable3) {
        const leftVW = parseFloat(draggable.style.left);
        const topVH = parseFloat(draggable.style.top);
        localStorage.setItem('draggable3Position', JSON.stringify({ width: `${leftVW}vw`, height: `${topVH}vh` }));
        if(window.is_connected){
            const suffix = `_${window.apseed}_${window.slot}`;
            localStorage.setItem('draggable3Position' + suffix, JSON.stringify({ width: `${leftVW}vw`, height: `${topVH}vh` }));
        }
    }
    if (draggable === draggable4) {
        const leftVW = parseFloat(draggable.style.left);
        const topVH = parseFloat(draggable.style.top);
        localStorage.setItem('draggable4Position', JSON.stringify({ width: `${leftVW}vw`, height: `${topVH}vh` }));
    }
    if (draggable === draggable5) {
        const leftVW = parseFloat(draggable.style.left);
        const topVH = parseFloat(draggable.style.top);
        localStorage.setItem('draggable5Position', JSON.stringify({ width: `${leftVW}vw`, height: `${topVH}vh` }));
    }
    if (draggable === draggable6) {
        const leftVW = parseFloat(draggable.style.left);
        const topVH = parseFloat(draggable.style.top);
        localStorage.setItem('draggable6Position', JSON.stringify({ width: `${leftVW}vw`, height: `${topVH}vh` }));
    }
}

function getPreviousSizeAndPosition() {
    let ids = ['draggable1Position', 'draggable1Size', 'draggable2Position', 'draggable2Size', 'draggable3Position', 'draggable3Size'];
    if(window.is_connected){
        const suffix = `_${window.apseed}_${window.slot}`;
        ids = [
            `draggable1Position${suffix}`,
            `draggable1Size${suffix}`,
            `draggable2Position${suffix}`,
            `draggable2Size${suffix}`,
            `draggable3Position${suffix}`,
            `draggable3Size${suffix}`
        ];
    }
    // Load saved positions and sizes from localStorage
    if (localStorage.getItem(ids[0])) {
        const draggable1Position = JSON.parse(localStorage.getItem(ids[0]));
        draggable1.style.left = `${draggable1Position.width}`;
        draggable1.style.top = `${draggable1Position.height}`;
    }
    if (localStorage.getItem(ids[1])) {
        const draggable1Size = JSON.parse(localStorage.getItem(ids[1]));
        draggable1.style.width = `${draggable1Size.width}`;
        draggable1.style.height = `${draggable1Size.height}`;
    }
    if (localStorage.getItem(ids[2])) {
        const draggable2Position = JSON.parse(localStorage.getItem(ids[2]));
        draggable2.style.left = `${draggable2Position.width}`;
        draggable2.style.top = `${draggable2Position.height}`;
    }
    if (localStorage.getItem(ids[3])) {
        const draggable2Size = JSON.parse(localStorage.getItem(ids[3]));
        draggable2.style.width = `${draggable2Size.width}`;
        draggable2.style.height = `${draggable2Size.height}`;
    }
    if (localStorage.getItem(ids[4])) {
        const draggable3Position = JSON.parse(localStorage.getItem(ids[4]));
        draggable3.style.left = `${draggable3Position.width}`;
        draggable3.style.top = `${draggable3Position.height}`;
    }
    if (draggable4 && localStorage.getItem('draggable4Position')) {
        const pos = JSON.parse(localStorage.getItem('draggable4Position'));
        draggable4.style.left = pos.width;
        draggable4.style.top = pos.height;
    }
    if (draggable4 && localStorage.getItem('draggable4Size')) {
        const sz = JSON.parse(localStorage.getItem('draggable4Size'));
        draggable4.style.width = sz.width;
        draggable4.style.height = sz.height;
    }
    if (draggable5 && localStorage.getItem('draggable5Position')) {
        const pos = JSON.parse(localStorage.getItem('draggable5Position'));
        draggable5.style.left = pos.width;
        draggable5.style.top = pos.height;
    }
    if (draggable5 && localStorage.getItem('draggable5Size')) {
        const sz = JSON.parse(localStorage.getItem('draggable5Size'));
        draggable5.style.width = sz.width;
        draggable5.style.height = sz.height;
    }
    if (draggable6 && localStorage.getItem('draggable6Position')) {
        const pos = JSON.parse(localStorage.getItem('draggable6Position'));
        draggable6.style.left = pos.width;
        draggable6.style.top = pos.height;
    }
    if (draggable6 && localStorage.getItem('draggable6Size')) {
        const sz = JSON.parse(localStorage.getItem('draggable6Size'));
        draggable6.style.width = sz.width;
        draggable6.style.height = sz.height;
    }
}
window.getPreviousSizeAndPosition = getPreviousSizeAndPosition;
// Call the function to set the initial size and position
getPreviousSizeAndPosition();


function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (message) {
        
        if(window.is_connected){
            window.sendText(message); // Send the message to the server
        }
        
        messageInput.value = ''; // Clear the input field
    }
}

// Add event listener for the button click
document.getElementById('sendButton').addEventListener('click', sendMessage);

// Add event listener for the "Enter" key press
document.getElementById('messageInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

