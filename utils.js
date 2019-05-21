const AWS = require("aws-sdk");

let DDB = new AWS.DynamoDB({ apiVersion: "2012-10-08", region: "us-east-1" });

// Use module.exports.DDB so DDB can be swapped out at test time
let dynamo = async (action, params) =>
  await module.exports.DDB[action]({
    TableName: "DuroLiveChat",
    ...params
  }).promise();

let JSONReply = (type, result, code = 200) => ({
  statusCode: code,
  body: JSON.stringify({
    type,
    result
  })
});

let JSONError = msg => JSONReply("error", msg || "invalid");

let andiKey = {
  uuid: { S: "andi" },
  timestamp: { N: "0" }
};

let andiItem = async () => {
  return (await dynamo("getItem", {
    Key: andiKey
  })).Item;
};

/*
  thoughts to consider when actually implementing methods:
  - should addMessageToConversation have such generic arguments? probably not
  - why is there a markRead when there's no markUnread?
  - addMessageToConversation is used in both user/admin handlers and has to handle the difference itself; why are there two different send methods then?
  ideas:
  - make addMessageToConversation have more specific arguments once an initial implementation is made
  - have only one send method with a flag to determine who it's to
  
*/

let createConversation = async (uuid, nickname, email) => {
  // pass
};

let markRead = async uuid => {
  // pass
};

let updateLastConnectedTime = async () => {
  // pass
};

let addMessageToConversation = async (event, body) => {
  // pass
  // add to unread: utils.addConversationToUnreadList(body.uuid);
};

let getAllMessagesWith = async uuid => {
  // getMessages
};

let sendResponseToAndi = async (event, body, ws) => {
  // reply
  // returns bool
};

let sendResponseToRecipient = async (event, body, ws) => {
  // pass
};

module.exports = {
  JSONReply,
  JSONError,
  DDB,
  dynamo,
  andiItem,
  createConversation,
  getAllMessagesWith,
  markRead,
  updateLastConnectedTime,
  sendResponseToAndi,
  sendResponseToRecipient
};

// let reply = async (connection, body, ws) => {
// try {
//   await ws
//     .postToConnection({
//       ConnectionId: connection,
//       Data: JSON.stringify(body)
//     })
//     .promise();
//   return res("sent");
// } catch (err) {
//   return res("sendError");
// }
// };

// let userHandler = async (event, body, ws) => {
//   switch (body.action) {
//     case "hello":
//       let adminItem = await queries.adminItem();
//       return res("lastConnected", adminItem ? adminItem.lastConnected.N : 0);
//     case "list":
//       let msgs = await queries.getMessages(body.uuid);
//       return res("history", msgs);
//     case "system":
//     case "send":
//       if (!body.nickname || !body.msg) return invalid();
//       await queries.storeUUID(body);
//       await queries.storeMessage(event, body);
//       let connection = (await queries.adminItem()).connection.S;
//       return await reply(
//         connection,
//         {
//           type: "reply",
//           uuid: body.uuid,
//           msg: body.msg,
//           nickname: body.nickname,
//           email: body.email,
//           connection: event.requestContext.connectionId
//         },
//         ws
//       );
//   }
// };
