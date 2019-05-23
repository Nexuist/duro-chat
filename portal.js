const WebSocket = require("ws");
require("dotenv").config();
const readline = require("readline");
const ENDPOINT = process.env.ENDPOINT;
const AUTH = process.env.PASSWORD;

const ws = new WebSocket(ENDPOINT);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let conversations = [];
let selectedConvo = null;

let send = obj => {
  ws.send(
    JSON.stringify({
      uuid: "andi",
      auth: AUTH,
      ...obj
    })
  );
};

ws.on("open", () => {
  console.log("Connected to live chat backend.");
  send({ action: "hello" });
  setInterval(() => send({ action: "ping " }), 30000); // ping every 30 seconds
});

ws.on("message", data => {
  let json = JSON.parse(data);
  switch (json.type) {
    case "reply":
      let uuid = json.uuid;
      let msg = json.msg;
      let nickname = conversations.filter(convo => convo.uuid == uuid)[0].nickname;
      console.log(`MSG FROM ${nickname}: ${msg}\n`);
      break;
    case "andiItem":
      console.log("CONVERSATIONS:");
      conversations = [];
      for (let uuid in json.result.conversations.M) {
        conversations.push({
          uuid,
          nickname: json.result.conversations.M[uuid].S,
          unread: json.result.unread.SS.includes(uuid)
        });
      }
      let i = 0;
      for (convo of conversations) {
        console.log(`${i}. ${convo.nickname} ${convo.unread ? "(UNREAD)" : ""}`);
        i++;
      }
      let pickConversation = () =>
        rl.question("Pick a conversation: ", i => {
          if (i >= 0 && i < conversations.length) {
            selectedConvo = conversations[i];
            console.log(`--- HISTORY WITH ${selectedConvo.nickname} ---`);
            send({ action: "list", for: selectedConvo.uuid });
          } else {
            pickConversation();
          }
        });
      pickConversation();
      break;
    case "history":
      let connection = null;
      for (msgObj of json.result) {
        if (msgObj.type == "to") {
          console.log(`< ${msgObj.msg}`);
          connection = msgObj.connection; // set connection to last connection used by sender
        } else {
          console.log(`>> ${msgObj.msg}`);
        }
      }
      // it's not really a repl, but I didn't know what to call it
      let repl = () =>
        rl.question(">> ", msg => {
          if (msg == "/q") {
            selectedConvo = null;
            return send({ action: "hello" }); // back to convos
          } else {
            if (msg.length < 1) return repl(); // don't send empty messages
            send({ action: "send", msg, uuidTo: selectedConvo.uuid, connectionTo: connection });
            repl();
          }
        });
      repl();
      break;
    case "sendError":
      console.log("X Delivery Error\n");
      break;
  }
});

ws.on("error", err => {
  console.log(`X Connection error: ${err}.`);
  process.exit(1);
});

ws.on("close", () => {
  console.log("X Connection to live chat closed.");
  process.exit(1);
});
