function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

document.getElementById('hostport').value = parseInt(getUrlParameter('hostport')) || localStorage.getItem("hostport") || "archipelago.gg:38281";
document.getElementById('name').value = getUrlParameter('name') || localStorage.getItem("name") || 'Player1';

document.getElementById("loginbutton").addEventListener("click", pressed_login);

document.getElementById("solobutton").addEventListener("click", pressed_solo);

function pressed_login(){
    localStorage.setItem("hostport", document.getElementById("hostport").value);
    localStorage.setItem("name", document.getElementById("name").value);

    login();
}

function pressed_solo(){
    
    window.possible_merges = [0, 0, 0, 0, 0, 0, 1, 3, 5, 5, 5, 6, 8, 9, 11, 13, 15, 16, 16, 18, 19, 20, 21, 22, 23, 24]

    window.actual_possible_merges = [0, 0, 0, 0, 0, 0, 1, 3, 5, 5, 5, 6, 8, 9, 11, 13, 15, 16, 16, 18, 19, 20, 21, 22, 23, 24]


    closeMenus();

    window.set_puzzle_dim(5, 5);


    window.unlockPiece(13);
    window.unlockPiece(1);
    window.unlockPiece(17);
    window.unlockPiece(25);
    window.unlockPiece(15);
    window.unlockPiece(8);
    window.unlockPiece(18);

    function sendCheck(numberOfMerges){
        let trans = {
            1: 20,
            2: 11,
            3: 21,
            4: 9,
            5: 6,
            6: 3,
            7: 2,
            8: 14,
            9: 16,
            10: 22,
            11: 5,
            12: 4,
            13: 24,
            14: 12,
            15: 10,
            16: 23,
            17: 19,
            18: 7
        }
        let val = trans.hasOwnProperty(numberOfMerges) ? trans[numberOfMerges] : -1;
        if(val > 0){
            window.unlockPiece(val);
        }


    }
    function sendGoal(){
        console.log("You won!")
    }


    window.sendCheck = sendCheck;
    window.sendGoal = sendGoal;

    apstatus = "Playing solo";
    document.getElementById("m6").innerText = apstatus;
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
} from "https://unpkg.com/archipelago.js/dist/index.js";
var client = null;
var apstatus = "?";
var connected = false;

function closeMenus(){
    document.getElementById("login-container").style.display = "none";
    document.getElementById("puzzleDIV").style.display = "block";
}

function connectToServer(firsttime = true) {
    client = new Client();
    client.items.on("itemsReceived", receiveditemsListener);
    client.socket.on("connected", connectedListener);
    client.socket.on("disconnected", disconnectedListener);
    client
    .login(connectionInfo.hostport, connectionInfo.name, connectionInfo.game, {password: connectionInfo.password})
        .then(() => {
            console.log("Connected to the server");
            document.getElementById('loginbutton').value = "Connected to the server";

            closeMenus();
        })
        .catch((error) => {
            console.log("Failed to connect", error)
            document.getElementById('loginbutton').value  = "Failed: "+error;
            document.getElementById('loginbutton').style.backgroundColor = "red";
        });

    // Disconnect from the server when unloading window.
    window.addEventListener("beforeunload", () => {
        if(connected){
            window.saveProgress(false);
        }
        client.disconnect();
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

    if(packet.slot_data.ap_world_version){
        console.log("This apworld version should work", packet.slot_data.ap_world_version)
    }else{
        alert("You are using an older apworld. You will be forwarded to a previous version. If you want to also keep your save-file (placement of pieces) for this seed ("+window.apseed+"_"+window.slot+"), please see pins in the discord channel.")
        window.location.href = "jigsaw-ap-002.netlify.app";
        return;
    }

    connected = true;
    document.getElementById("m6").innerText = apstatus;
    

    console.log("Connected packet:",packet);
    window.set_puzzle_dim(packet.slot_data.nx, packet.slot_data.ny);

    puzzlePieceOrder = packet.slot_data.piece_order;

    window.possible_merges = packet.slot_data.possible_merges;
    window.actual_possible_merges = packet.slot_data.actual_possible_merges;
    console.log("Set merges possibilities")

    let imagePath = "color-icon2.png";
    if(packet.slot_data.orientation < 1){
        imagePath = "https://images.pexels.com/photos/1658967/pexels-photo-1658967.jpeg";
    }
    if(packet.slot_data.orientation > 1){
        imagePath = "https://images.pexels.com/photos/147411/italy-mountains-dawn-daybreak-147411.jpeg";
    }

    window.setImagePath(imagePath);
};

const disconnectedListener = (packet) => {
    connected = false;
    window.saveProgress(false);
    apstatus = "AP: Disconnected. Progress saved, please refresh.";
    document.getElementById("m6").innerText = apstatus;
    menu.open();
};

var lastindex = 0;
function newItems(items, index){
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
}

function openItems(items){
    console.log("let's open item")
    let itemUnlocked = false;
    for (let i = 0; i < items.length; i++) {
        console.log(items[i], puzzlePieceOrder)
        let number_of_pieces = 0;
        if(items[i] == "Puzzle Piece"){
            number_of_pieces = 1;
        }
        if(items[i] == "2 Puzzle Pieces"){
            number_of_pieces = 2;
        }
        for(let c = 0; c < number_of_pieces; c++){
            if(puzzlePieceOrder){
                let piece = puzzlePieceOrder.shift();
                console.log("Unlocking piece", piece);
                if (piece !== undefined) {
                    window.unlockPiece(piece);
                    itemUnlocked = true;
                }
            }
        }
    }
    if(itemUnlocked){
        playNewItemSound();
    }
}

function playNewItemSound() {
    const soundSources = ["Sounds/p1.mp3", "Sounds/p2.mp3", "Sounds/p3.mp3", "Sounds/p4.mp3"];
    const randomSound = soundSources[Math.floor(Math.random() * soundSources.length)];
    const newItemSound = new Audio(randomSound);

    newItemSound.play().catch(function(error) {
        // Handle the error here (e.g., log it or show a warning message)
        console.log("Could not play sound because user hasn't interacted with the website yet");
    });
}

function sendCheck(numberOfMerges){
    console.log(numberOfMerges);
    client.check(234782000 + numberOfMerges);
}
function sendGoal(){
    client.goal();
}

window.sendCheck = sendCheck;
window.sendGoal = sendGoal;

console.log("0.1.0")