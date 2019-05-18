const AWS = require("aws-sdk");
const DDB = new AWS.DynamoDB({ apiVersion: "2012-10-08", region: "us-east-1" });

let dynamo = async (action, params) =>
  await DDB[action]({
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

//       await utils.addConversationToUnreadList(body.uuid);

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

let createConversation = async (uuid, nickname, email) => {};

let getAllMessagesWith = async uuid => {
  // getMessages
};

let addToUnread = async uuid => {
  // storeUUID
};

let sendResponseToAndi = async (event, body, ws) => {
  // reply
};

module.exports = {
  JSONReply,
  JSONError,
  dynamo,
  andiItem
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
