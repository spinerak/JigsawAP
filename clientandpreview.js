
const draggable1 = document.getElementById('draggable1');
const taskbar1 = document.getElementById('taskbar1');
const previm = document.getElementById('previm');
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

function minimizeDiv1() {
    draggable1.style.display = 'none';
    taskbar1.style.display = 'flex';
}

function restoreDiv1() {
    draggable1.style.display = 'block';
    taskbar1.style.display = 'none';
}

const draggable2 = document.getElementById('draggable2');
const taskbar2 = document.getElementById('taskbar2');
let offsetX2, offsetY2, isDragging2 = false;

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

document.addEventListener('mousemove', (e) => handleDrag(draggable2, isDragging2, offsetX2, offsetY2, e));
document.addEventListener('touchmove', (e) => handleDrag(draggable2, isDragging2, offsetX2, offsetY2, e));

document.addEventListener('mouseup', () => { isDragging2 = false; });
document.addEventListener('touchend', () => { isDragging2 = false; });

function minimizeDiv2() {
    draggable2.style.display = 'none';
    taskbar2.style.display = 'flex';
}

function restoreDiv2() {
    draggable2.style.display = 'block';
    taskbar2.style.display = 'none';
}


document.getElementById('control-btn1').addEventListener('click', minimizeDiv1);
document.getElementById('taskbar1').addEventListener('click', restoreDiv1);
document.getElementById('control-btn2a').addEventListener('click', minimizeDiv2);
document.getElementById('taskbar2').addEventListener('click', restoreDiv2);


// const resizerRight1 = document.getElementById('resizerRight1');
// const resizerBottom1 = document.getElementById('resizerBottom1');
const resizerCorner1 = document.getElementById('resizerCorner1');

// const resizerRight2 = document.getElementById('resizerRight2');
// const resizerBottom2 = document.getElementById('resizerBottom2');
const resizerCorner2 = document.getElementById('resizerCorner2');

// enableResizing1(resizerRight1, true, false);
// enableResizing1(resizerBottom1, false, true);
enableResizing1(resizerCorner1, true, true);
// enableResizing2(resizerRight2, true, false);
// enableResizing2(resizerBottom2, false, true);
enableResizing2(resizerCorner2, true, true);

function enableResizing1(resizer, horizontal, vertical) {
    let resizing = false;
    let startX, startY, startWidth, startHeight;
    resizer.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        resizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = draggable1.offsetWidth;
        startHeight = draggable1.offsetHeight;
    });

    resizer.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        resizing = true;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        startWidth = draggable1.offsetWidth;
        startHeight = draggable1.offsetHeight;
    });

    document.addEventListener('mousemove', (e) => {
        if (!resizing) return;
        if (horizontal) {
            const newWidth = startWidth + (e.clientX - startX);
            const maxWidth = window.innerWidth - draggable1.offsetLeft - 5;
            draggable1.style.width = `${(Math.min(newWidth, maxWidth) / window.innerWidth) * 100}vw`;
            adjustedSize(draggable1);
        }
        if (vertical) {
            const newHeight = startHeight + (e.clientY - startY);
            const maxHeight = window.innerHeight - draggable1.offsetTop - 5;
            draggable1.style.height = `${(Math.min(newHeight, maxHeight) / window.innerHeight) * 100}vh`;
            adjustedSize(draggable1);
        }
    });

    document.addEventListener('touchmove', (e) => {
        if (!resizing) return;
        const touch = e.touches[0];
        if (horizontal) {
            const newWidth = startWidth + (touch.clientX - startX);
            const maxWidth = window.innerWidth - draggable1.offsetLeft - 5;
            draggable1.style.width = `${(Math.min(newWidth, maxWidth) / window.innerWidth) * 100}vw`;
            adjustedSize(draggable1);
        }
        if (vertical) {
            const newHeight = startHeight + (touch.clientY - startY);
            const maxHeight = window.innerHeight - draggable1.offsetTop - 5;
            draggable1.style.height = `${(Math.min(newHeight, maxHeight) / window.innerHeight) * 100}vh`;
            adjustedSize(draggable1);
        }
    });

    document.addEventListener('mouseup', () => { resizing = false; });
    document.addEventListener('touchend', () => { resizing = false; });
}

function enableResizing2(resizer, horizontal, vertical) {
    let resizing = false;
    let startX, startY, startWidth, startHeight;
    
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
    });

    document.addEventListener('touchmove', (e) => {
        if (!resizing) return;
        const touch = e.touches[0];
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
    });

    document.addEventListener('mouseup', () => { resizing = false; });
    document.addEventListener('touchend', () => { resizing = false; });
}
function adjustedSize(draggable) {
    if (draggable === draggable1) {
        const widthVW = parseFloat(draggable.style.width);
        const heightVH = parseFloat(draggable.style.height);
        console.log(`Draggable1 Size: ${widthVW}vw, ${heightVH}vh`);
        localStorage.setItem('draggable1Size', JSON.stringify({ width: `${widthVW}vw`, height: `${heightVH}vh` }));
    }
    if (draggable === draggable2) {
        const widthVW = parseFloat(draggable.style.width);
        const heightVH = parseFloat(draggable.style.height);
        console.log(`Draggable2 Size: ${widthVW}vw, ${heightVH}vh`);
        localStorage.setItem('draggable2Size', JSON.stringify({ width: `${widthVW}vw`, height: `${heightVH}vh` }));
    }
}

function adjustedPosition(draggable) {
    if (draggable === draggable1) {
        const leftVW = parseFloat(draggable.style.left);
        const topVH = parseFloat(draggable.style.top);
        console.log(`Draggable1 Position: ${leftVW}vw, ${topVH}vh`);
        localStorage.setItem('draggable1Position', JSON.stringify({ width: `${leftVW}vw`, height: `${topVH}vh` }));
    }
    if (draggable === draggable2) {
        const leftVW = parseFloat(draggable.style.left);
        const topVH = parseFloat(draggable.style.top);
        console.log(`Draggable2 Position: ${leftVW}vw, ${topVH}vh`);
        localStorage.setItem('draggable2Position', JSON.stringify({ width: `${leftVW}vw`, height: `${topVH}vh` }));
    }
}

// Load saved positions and sizes from localStorage
if (localStorage.getItem('draggable1Position')) {
    const draggable1Position = JSON.parse(localStorage.getItem('draggable1Position'));
    draggable1.style.left = `${draggable1Position.width}`;
    draggable1.style.top = `${draggable1Position.height}`;
}
if (localStorage.getItem('draggable1Size')) {
    const draggable1Size = JSON.parse(localStorage.getItem('draggable1Size'));
    draggable1.style.width = `${draggable1Size.width}`;
    draggable1.style.height = `${draggable1Size.height}`;
}
if (localStorage.getItem('draggable2Position')) {
    const draggable2Position = JSON.parse(localStorage.getItem('draggable2Position'));
    draggable2.style.left = `${draggable2Position.width}`;
    draggable2.style.top = `${draggable2Position.height}`;
}
if (localStorage.getItem('draggable2Size')) {
    const draggable2Size = JSON.parse(localStorage.getItem('draggable2Size'));
    draggable2.style.width = `${draggable2Size.width}`;
    draggable2.style.height = `${draggable2Size.height}`;
}

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
