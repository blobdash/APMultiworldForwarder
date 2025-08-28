const WebSocket = require('ws');
const uuid = require('uuid');
const config = require('./config.json')
let storage = {};

let queue = [];

try {
    if(config.queueMode) setInterval(processQueue, config.queueDelay);
    let client = new WebSocket(config.room);
    client.onopen = () => {
        console.log('Successfully opened websocket.');
        client.send(JSON.stringify([{
            "cmd": "Connect",
            "game": config.game,
            "password": config.roompw,
            "name": config.user,
            "uuid": uuid.v4(),
            "version": config.version,
            "items_handling": 3,
            "tags": ["TextOnly"],
            "slot_data": true
        }]), (error) => console.error(error));
    };
    client.onclose = (reason) => {
        console.log(`Closed websocket (reason : ${reason.code})`);
    };
    client.onmessage = (event) => {
        const parsedEvent = JSON.parse(event.data);
        for(const item of parsedEvent) {
            switch(item.cmd) {
                case 'Connected':
                    // Happens on connect; need to store player data from this connection
                    storage.players = item.players;
                    storage.slot_info = item.slot_info;
                    client.send(JSON.stringify([{
                        "cmd": "GetDataPackage"
                    }]), (error) => console.error(error));
                    break;
                case 'PrintJSON':
                    if(item.type !== 'Tutorial') {
                        // print received, format it and send it to webhook
                        sendMessage(item);
                    }
                    break;
                case 'DataPackage':
                    // Received location and items mapping, storing
                    storage.games = item.data.games;
                    break;
                case 'RoomInfo':
                case 'ReceivedItems':
                    break;
                default:
                    console.log(JSON.stringify(item));
            }
        }
    };
    client.onerror = (error) => {
        console.log(`wserr : ${error.message}`);
    };
} catch (error) {
    console.log(`Couldn't connect to websocket : ${error.message}`);
}

const colorMapping = {
    0: 29089,
    1: 6488225,
    2: 1769633,
    4: 13893632,
    null: 29089
}

function sendMessage(event) {
    let buffer = "";
    let color = 7566195;
    for(const textPart of event.data) {
        if(textPart.type) {
            switch(textPart.type) {
                case 'player_id':
                    buffer += storage.slot_info[textPart.text].name;
                    break;
                case 'item_id':
                    const gameOfItem = storage.slot_info[`${textPart.player}`].game;
                    const entries = Object.entries(storage.games[gameOfItem].item_name_to_id);
                    buffer += entries.find(entry => entry[1] === Number(textPart.text))[0];
                    color = colorMapping[textPart.flags];
                    break;
                case 'location_id':
                    const gameOfLocation = storage.slot_info[`${textPart.player}`].game;
                    const entr = Object.entries(storage.games[gameOfLocation].location_name_to_id);
                    buffer += entr.find(entry => entry[1] === Number(textPart.text))[0];
                    break;
                case 'hint_status':
                    // ignore text type
                    break;
                default:
                    console.error(`Unhandled type : ${textPart.type}`);
                    break;
            }
        } else {
            buffer += textPart.text;
        }
    };
    if(config.queueMode) {
        queue.push({
            "description": `${buffer}`,
            "fields": [],
            "color": `${color}`
        });
    } else {
        const whook = {
            content: "",
            embeds: [
                {
                    "description": `${buffer}`,
                    "fields": [],
                    "color": `${color}`
                },
            ],
            username: config.webhook_user,
            avatar_url: config.webhook_img
        };
        fetch(config.webhook, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(whook)
        });
    }
}

async function processQueue() {
    if(queue.length > 0) {
        const whook = {
            content: "",
            embeds: queue.slice(0, 10),
            username: config.webhook_user,
            avatar_url: config.webhook_img
        };
        const response = await fetch(config.webhook, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(whook)
        });
        if(response.status === 204) {
            // post was successful; remove items from queue.
            queue = queue.slice(10);
        }
    }
}