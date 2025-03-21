let images = [
    "https://images.squarespace-cdn.com/content/v1/606d159a953867291018f801/1619987265163-9XILMVT3TK4HZ5X6538M/VH_01_1080pjpg.jpg",
    "https://w0.peakpx.com/wallpaper/130/204/HD-wallpaper-pokemon-emerald-starters-awesome-cool-fun-sweet.jpg",
    "https://images5.alphacoders.com/333/thumb-1920-333152.jpg",
    "https://images5.alphacoders.com/137/thumb-1920-1374411.jpg",
    "https://www.psu.com/wp/wp-content/uploads/2020/09/Minecraft-PS4-Wallpapers-16.jpg",
    "https://www.4p.de/wp-content/uploads/sites/13/2025/02/super-mario-64.jpg",
    "https://images5.alphacoders.com/511/511693.jpg",
    "https://www.gamewallpapers.com/wallpapers_slechte_compressie/wallpaper_kingdom_hearts_2_01_1680x1050.jpg",
    "https://wallpapers.com/images/hd/sonic-2-hd-dpqf4ipxbokd3qn0.jpg",
    "https://images7.alphacoders.com/987/987600.png",
    "https://images6.alphacoders.com/121/1217724.jpg",
    "https://steamuserimages-a.akamaihd.net/ugc/789735406717992934/98AFDA51F2AE8FE4CD992CC0D9DD97FDF8705BF0/",
    "https://pbs.twimg.com/media/GIusyQTXsAAOxcp?format=jpg&name=4096x4096",
    "https://images.alphacoders.com/662/thumb-1920-662393.jpg",
    "https://i0.wp.com/www.the-pixels.com/wp-content/uploads/2019/11/The-Legend-of-Zelda-Links-Awakening.png?fit=1920,1080&ssl=1",
    "https://i.postimg.cc/brpDKW61/bWkEzlW.png"
]
window.set_ap_image = false;

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};


document.getElementById('hostport').value = getUrlParameter('hostport') || localStorage.getItem("hostport") || "archipelago.gg:38281";

document.getElementById('name').value = getUrlParameter('name') || localStorage.getItem("name") || 'Player1';

document.getElementById("loginbutton").addEventListener("click", pressed_login);

document.getElementById("solobutton").addEventListener("click", pressed_solo);

document.getElementById("optionsbutton").addEventListener("click", () => {
    window.open('options.html', '_blank');
});

function isMobile() {
    return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) { 
            document.documentElement.webkitRequestFullscreen(); // Safari
        }
        document.getElementById('m11').textContent = 'Exit full screen';
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { 
            document.webkitExitFullscreen(); // Safari
        }
        document.getElementById('m11').textContent = 'Go full screen';
    }
}

// Show the fullscreen button only on mobile devices
window.addEventListener('load', () => {
    if (isMobile()) {
        document.getElementById('m11').style.display = 'block';
        setTimeout(() => window.scrollTo(0, 1), 100); // URL bar hiding trick
    }
});

document.getElementById("m11").addEventListener("click", toggleFullscreen);


function pressed_login(){
    localStorage.setItem("hostport", document.getElementById("hostport").value);
    localStorage.setItem("name", document.getElementById("name").value);

    login();
}

window.play_solo = false;
function pressed_solo(){
    window.play_solo = true;
    
    window.possible_merges = [0, 0, 0, 0, 1, 1, 2, 2, 3, 4, 4, 6, 8, 10, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23]

    window.actual_possible_merges = [0, 0, 0, 0, 1, 1, 2, 2, 3, 4, 4, 6, 8, 10, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23]


    closeMenus();

    window.set_puzzle_dim(6, 4);

    window.unlockPiece(23);
    window.unlockPiece(2);
    window.unlockPiece(12);
    window.unlockPiece(18);
    window.unlockPiece(7);
    window.unlockPiece(13);
    window.unlockPiece(21);
    window.updateMergesLabels();

    function sendCheck(numberOfMerges){
        let trans = {
            1: 3,
            2: 20,
            3: 5,
            4: 4,
            5: 22,
            6: 14,
            7: 11,
            8: 10,
            9: 8,
            10: 15,
            11: 9,
            12: 16,
            13: 17,
            14: 24,
            15: 19,
            16: 1,
            17: 6
        }
        let val = trans.hasOwnProperty(numberOfMerges) ? trans[numberOfMerges] : -1;
        if(val > 0){
            setTimeout(() => {
                window.unlockPiece(val);
                playNewItemSound();
                window.updateMergesLabels();
            }, 300);
        }
    }
    function sendGoal(){
        console.log("You won!")
    }

    setImage(images[Math.floor(Math.random()*images.length)]);


    window.sendCheck = sendCheck;
    window.sendGoal = sendGoal;

    apstatus = "Playing solo";
    document.getElementById("m6").innerText = apstatus;

    document.getElementById("n1").style.display = "none";
}

var connectionInfo = null;
function login() {
    // Create a new Archipelago client
    connectionInfo = {
        hostport: localStorage.getItem("hostport") || "archipelago.gg:38281", // Default hostpost
        game: "Jigsaw", // Replace with the game name for this player.
        name: localStorage.getItem("name") || "Player1", // Default player name
        password: document.getElementById("password").value,
        items_handling: 0b111,
    };

    document.getElementById('loginbutton').value  = "Connecting...";
    document.getElementById('loginbutton').style.backgroundColor = "orange";

    // Connect to the Archipelago server
    connectToServer();
}

// server stuff:
import {
    Client
} from "./archipelago.js";

var client = null;
var apstatus = "?";
window.is_connected = false;

function getAPClient(){
    return client;
}
window.getAPClient = getAPClient;

function closeMenus(){
    document.getElementById("login-container").style.display = "none";
    document.getElementById("puzzleDIV").style.display = "block";
    window.dispatchEvent(new Event("resize"));
}

function connectToServer(firsttime = true) {
    client = new Client();
    client.items.on("itemsReceived", receiveditemsListener);
    client.socket.on("connected", connectedListener);
    client.socket.on("disconnected", disconnectedListener);
    client.socket.on("bounced", bouncedListener);
    
    client.messages.on("message", jsonListener);
    
    client
    .login(connectionInfo.hostport, connectionInfo.name, connectionInfo.game, {password: connectionInfo.password})
        .then(() => {
            console.log("Connected to the server");
            document.getElementById('loginbutton').value = "Connected to the server";

            closeMenus();
        })
        .catch((error) => {
            console.log("Failed to connect", error)
            let errorMessage = "Failed: " + error;
            
            document.getElementById('loginbutton').value = errorMessage;
            document.getElementById('loginbutton').style.backgroundColor = "red";

            document.getElementById('solobutton').value = "Common remedies: refresh room and check login info"
            document.getElementById('solobutton').style.backgroundColor = "red";

            document.getElementById('optionsbutton').value = "Please refresh this page to try again :)"
            document.getElementById('optionsbutton').style.backgroundColor = "red";
        });


}

const receiveditemsListener = (items, index) => {
    console.log("ReceivedItems packet: ", items, index);
    newItems(items, index);
};

let puzzlePieceOrder = [];

const connectedListener = (packet) => {
    apstatus = "AP: Connected";

    window.apseed = packet.slot_data.seed_name;
    window.slot = packet.slot;

    let apworld = packet.slot_data.ap_world_version
    if(!apworld || ["0.0.0", "0.0.1", "0.0.2", "0.0.3", "0.0.4", "0.1.0", "0.1.1"].includes(apworld)){
        if(!localStorage.getItem("referredTo011")){
            alert("You are using an older apworld, you will be forwarded to the backup version. You will only see this message once.")
            localStorage.setItem("referredTo011", true);
        }
        window.location.href = "/index011.html";
        return;
    }
    if(["0.0.6", "0.2.0"].includes(apworld)){
        if(!localStorage.getItem("referredTo020")){
            alert("You are using an older apworld, you will be forwarded to the backup version. You will only see this message once.")
            localStorage.setItem("referredTo020", true);
        }
        window.location.href = "/index020.html";
        return;
    }
    else{
        console.log("This apworld version should work", packet.slot_data.ap_world_version)
    }

    document.getElementById("m6").innerText = apstatus;
    

    console.log("Connected packet:",packet);
    window.set_puzzle_dim(packet.slot_data.nx, packet.slot_data.ny);
    
    puzzlePieceOrder = packet.slot_data.piece_order;

    window.possible_merges = packet.slot_data.possible_merges;
    window.actual_possible_merges = packet.slot_data.actual_possible_merges;

    let imagePath = "https://images.pexels.com/photos/147411/italy-mountains-dawn-daybreak-147411.jpeg";

    if(localStorage.getItem(`image_${window.apseed}_${window.slot}`)){
        imagePath = localStorage.getItem(`image_${window.apseed}_${window.slot}`);
        setImage(imagePath);
    } else {
        if(packet.slot_data.orientation < 1){
            imagePath = "https://images.pexels.com/photos/1658967/pexels-photo-1658967.jpeg";
            setImage(imagePath);  
        }else if (packet.slot_data.orientation == 1){
            imagePath = "https://images.pexels.com/photos/3209471/pexels-photo-3209471.jpeg"
            setImage(imagePath);
        }else if(packet.slot_data.orientation > 1){  // landscape, choose a random one
            let ind = packet.slot_data.which_image;
            console.log("set iamge")
            if(window.apseed == "58032389700599746566"){
                setImage("https://i.postimg.cc/Jh97t1qt/upscalemedia-transformed.jpg")
            }else{
                setImage(images[ind-1]);
            }
        }
    }

    window.loadInitialFile()
    if(getUrlParameter("go") == "LS"){
        window.LoginStart = true;
    }
    window.is_connected = true;

};

function setImage(url){
    function checkImage(url, callback) {
        let img = new Image();
        img.onload = () => callback(true);  // Image loaded successfully
        img.onerror = () => callback(false); // Image failed to load
        img.src = url;
    }
            
    checkImage(url, (isValid) => {
        if (isValid) {
            imagePath = url;
            console.log("Set image!")
        } else {
            console.log("Image is a dead link.");
        }
        window.setImagePath(imagePath);
        console.log("image path set")
        window.choose_ap_image = true;
    });
}

const bouncedListener = (packet) => {
    window.move_piece_bounced(packet.data[0], packet.data[1], packet.data[2]);
}

const disconnectedListener = (packet) => {
    window.is_connected = false;
    apstatus = "AP: Disconnected. Progress saved, please refresh.";
    document.getElementById("m6").innerText = apstatus;
    menu.open();
};

var lastindex = 0;
function newItems(items, index) {
    setTimeout(() => {
        if (items && items.length) {
            if (index > lastindex) {
                console.log("Something strange happened, you should have received more items already... Let's reconnect...");
            }
            var received_items = [];
            for (let i = lastindex - index; i < items.length; i++) {
                const item = items[i]; // Get the current item
                received_items.push(item.toString()); // Add the item name to the 'items' array
            }
            openItems(received_items)
            lastindex = index + items.length;
        } else {
            console.log("No items received in this update...");
        }
    }, 300); // Wait for one second
}

function openItems(items){
    let itemUnlocked = false;
    for (let i = 0; i < items.length; i++) {
        // console.log(items[i], puzzlePieceOrder)
        let number_of_pieces = 0;
        if(items[i] == "Puzzle Piece"){
            number_of_pieces = 1;
        }
        if(items[i] == "2 Puzzle Pieces"){
            number_of_pieces = 2;
        }
        if(items[i] == "5 Puzzle Pieces"){
            number_of_pieces = 5;
        }
        if(items[i] == "10 Puzzle Pieces"){
            number_of_pieces = 10;
        }
        if(items[i] == "25 Puzzle Pieces"){
            number_of_pieces = 25;
        }
        if(items[i] == "100 Puzzle Pieces"){
            number_of_pieces = 100;
        }
        for(let c = 0; c < number_of_pieces; c++){
            if(puzzlePieceOrder){
                let piece = puzzlePieceOrder.shift();
                // console.log("Unlocking piece", piece);
                if (piece !== undefined) {
                    window.unlockPiece(piece, c == number_of_pieces - 1);
                    itemUnlocked = true;
                }
            }
        }
    }
    if(itemUnlocked){
        playNewItemSound();
        window.updateMergesLabels();
    }
}

function playNewItemSound() {
    if(!window.gameplayStarted && !window.play_solo){
        return;
    }
    const soundSources = ["Sounds/p1.mp3", "Sounds/p2.mp3", "Sounds/p3.mp3", "Sounds/p4.mp3"];
    const randomSound = soundSources[Math.floor(Math.random() * soundSources.length)];
    const newItemSound = new Audio(randomSound);

    newItemSound.play().catch(function(error) {
        // Handle the error here (e.g., log it or show a warning message)
        console.log("Could not play sound because user hasn't interacted with the website yet");
    });
}
function playNewMergeSound() {
    const soundSources = ["Sounds/m1.mp3", "Sounds/m2.mp3", "Sounds/m3.mp3", "Sounds/m4.mp3", "Sounds/m5.mp3"];
    const randomSound = soundSources[Math.floor(Math.random() * soundSources.length)];
    const newItemSound = new Audio(randomSound);

    if (!window.lastMergeSoundTime || Date.now() - window.lastMergeSoundTime > 1000) {
        newItemSound.play().catch(function(error) {
            // Handle the error here (e.g., log it or show a warning message)
            console.log("Could not play sound because user hasn't interacted with the website yet");
        });
        window.lastMergeSoundTime = Date.now();
    }
}
window.playNewMergeSound = playNewMergeSound;
function playNewGameSound() {
    const soundSources = ["Sounds/b1.mp3", "Sounds/b2.mp3"];
    const randomSound = soundSources[Math.floor(Math.random() * soundSources.length)];
    const newItemSound = new Audio(randomSound);

    newItemSound.play().catch(function(error) {
        // Handle the error here (e.g., log it or show a warning message)
        console.log("Could not play sound because user hasn't interacted with the website yet");
    });
}
window.playNewGameSound = playNewGameSound;

function sendCheck(numberOfMerges){
    if(window.is_connected){
        client.check(234782000 + numberOfMerges);
    }
}
function sendGoal(){
    client.goal();
}

window.sendCheck = sendCheck;
window.sendGoal = sendGoal;

function cleanLog() {
    var logTextarea = document.getElementById("log");
    
    // Check if logTextarea has more than 2000 children (assumed to be <span> elements)
    if (logTextarea.children.length > 2000) {
        for (var i = 0; i < 1000; i++) {
            if (logTextarea.children[0]) {
                logTextarea.removeChild(logTextarea.children[0]); // Remove the first child
            }
        }
    }
}

var classaddcolor = [
    "rgba(6, 217, 217, 1)",
    "rgba(168, 147, 228, 1)",
    "rgba(98, 122, 198, 1)",
    "rgba(255, 223, 0, 1)",
    "rgba(211, 113, 102, 1)",
    "rgba(255, 172, 28, 1)",
    "rgba(155, 89, 182, 1)",
    "rgba(128, 255, 128, 1)"]
var classaddtext = ["...", "!!", "!", "!!!", "@#!", "!?!", "@!!", "?!@"]
var classadddesc = ["Item class: normal", 
    "Item class: progression", 
    "Item class: useful", 
    "Item class: progression, useful", 
    "Item class: trap", 
    "Item class: progression, trap", 
    "Item class: useful, trap", 
    "progression, useful, trap"]
var classothercolors = [
    "rgba(100, 149, 237, 1)",
    "rgba(0, 255, 127, 1)",
    "rgba(238, 0, 238, 1)",
    "rgba(250, 250, 210, 1)"
]

function adjustColorBrightness(color, amount) {
    const colorParts = color.match(/[\d.]+/g);
    if (colorParts.length === 4) {
        // RGBA color
        let [r, g, b, a] = colorParts.map(Number);
        if(amount <= 0){
            amount = -amount;
            r = r * amount;
            g = g * amount;
            b = b * amount;
        }else{
            r = 255 - (255 - r) * amount;
            g = 255 - (255 - g) * amount;
            b = 255 - (255 - b) * amount;
        }
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    } else if (colorParts.length === 3) {
        // RGB color
        let [r, g, b] = colorParts.map(Number);
        if(amount <= 0){
            amount = -amount;
            r = r * amount;
            g = g * amount;
            b = b * amount;
        }else{
            r = 255 - (255 - r) * amount;
            g = 255 - (255 - g) * amount;
            b = 255 - (255 - b) * amount;
        }
        return `rgb(${r}, ${g}, ${b})`;
    } else {
        throw new Error("Invalid color format");
    }
}

function jsonListener(text, nodes) {
    const adjustColor = 0.5;

    // Plaintext to console, because why not?
    const messageElement = document.createElement("div");
  
    let is_relevant = false;
    let contains_player = false;

    for (const node of nodes) {
        const nodeElement = document.createElement("span");
        nodeElement.innerText = node.text;

        switch (node.type) {
            case "entrance":
                nodeElement.style.color = adjustColorBrightness(classothercolors[0], adjustColor);
                break;

            case "location":
                nodeElement.style.color = adjustColorBrightness(classothercolors[1], adjustColor);
                break;

            case "color":
                // not really correct, but technically the only color nodes the server returns is "green" or "red"
                // so it's fine enough for an example.
                nodeElement.style.color = node.color;
                break;

            case "player":
                contains_player = true;
                nodeElement.style.fontWeight = "bold";
                if (node.player.slot === client.players.self.slot) {
                    // It's us!
                    nodeElement.style.color = adjustColorBrightness(classothercolors[2], adjustColor);
                    is_relevant = true;
                } else {
                    // It's them!
                    nodeElement.style.color = adjustColorBrightness(classothercolors[3], adjustColor);
                }
                nodeElement.innerText = node.player.alias;
                nodeElement.title = "Game: " + node.player.game;
                break;

            case "item": {
                nodeElement.style.fontWeight = "bold";
                let typenumber = node.item.progression + 2 * node.item.useful + 4 * node.item.trap
                nodeElement.style.color = adjustColorBrightness(classaddcolor[typenumber], adjustColor);
                nodeElement.title = classadddesc[typenumber];
            }

            // no special coloring needed
            case "text":
                nodeElement.style.color = adjustColorBrightness("rgba(126,126,126,1)", adjustColor);
            default:
                break;
        }
        messageElement.appendChild(nodeElement);
    }

    var logTextarea = document.getElementById("log");

    logTextarea.appendChild(messageElement);
    
    cleanLog();

    logTextarea.scrollTop = logTextarea.scrollHeight - logTextarea.clientHeight;
}
window.jsonListener = jsonListener;


if(getUrlParameter("go") == "LS"){
    pressed_login();
}

console.log("0.3.0d")