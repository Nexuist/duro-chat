const WebSocket = require("ws");
require("dotenv").config();
const replServer = require("repl");
const ENDPOINT = process.env.ENDPOINT;
const AUTH = process.env.PASSWORD;

const ws = new WebSocket(ENDPOINT);

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

let eval = msg => {
  let shouldSend = true;
  if (!selectedConvo) {
    console.error("\nNo selected conversation!");
    shouldSend = false;
  }
  if (msg.length < 2) {
    console.error("\nMessage too short!");
    shouldSend = false;
  }
  if (shouldSend) send({ action: "send", msg, uuidTo: selectedConvo.uuid });
  repl.displayPrompt();
};

let repl = replServer.start({
  prompt: ">> ",
  eval
});

repl.defineCommand("c", () => send({ action: "hello" })); // trigger conversations list

repl.defineCommand("s", i => {
  selectedConvo = conversations[i];
  repl.setPrompt(`${selectedConvo.nickname} >> `);
  repl.displayPrompt();
  send({ action: "list", for: selectedConvo.uuid });
});

repl.defineCommand("q", () => {
  selectedConvo = null;
  repl.setPrompt(">> ");
  repl.displayPrompt();
  send({ action: "hello" });
});

repl.on("exit", () => {
  console.log("Goodbye.");
  ws.close();
});

ws.on("open", () => {
  console.log("\nConnected to live chat backend.");
  send({ action: "hello" });
  setInterval(() => send({ action: "ping " }), 30000); // ping every 30 seconds
});

ws.on("message", data => {
  let json = JSON.parse(data);
  switch (json.type) {
    case "andiItem":
      conversations = [];
      for (let uuid in json.result.conversations.M) {
        conversations.push({
          uuid,
          nickname: json.result.conversations.M[uuid].S,
          unread: json.result.unread.SS.includes(uuid)
        });
      }
      let i = 0;
      console.log("CONVERSATIONS:");
      for (convo of conversations) {
        console.log(`${i}. ${convo.nickname} ${convo.unread ? "(UNREAD)" : ""}`);
        i++;
      }
      break;
    case "history":
      console.log(`\nHISTORY WITH ${selectedConvo.nickname}:`);
      for (msgObj of json.result) {
        if (msgObj.type == "to") {
          console.log(`< ${msgObj.msg}`);
        } else {
          console.log(`>> ${msgObj.msg}`);
        }
      }
      break;
    case "reply":
      let uuid = json.uuid;
      let msg = json.msg;
      let nickname = conversations.filter(convo => convo.uuid == uuid)[0].nickname;
      console.log(`\n< ${nickname}: ${msg}`);
      break;
    case "sendError":
      console.log("\nX Delivery Error");
      break;
  }
  repl.displayPrompt();
});

ws.on("error", err => {
  console.error(`\nX Connection error: ${err}.`);
  process.exit(1);
});

ws.on("close", () => {
  console.error("\nX Connection to live chat closed.");
  process.exit(1);
});
