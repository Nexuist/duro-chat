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
  - have only one send method with a flag to determine who it's to  
*/

let createConversation = async (uuid, nickname, email, connectionID, ipAddress) => {
  await dynamo("putItem", {
    Item: {
      uuid: { S: uuid },
      timestamp: { N: "0" },
      nickname: { S: nickname },
      email: { S: email },
      connection: { S: connectionID },
      ip: { S: ipAddress }
    }
  });
  await dynamo("updateItem", {
    Key: andiKey,
    UpdateExpression: "SET conversations.#uuid = :nickname",
    ExpressionAttributeNames: { "#uuid": uuid },
    ExpressionAttributeValues: { ":nickname": { S: nickname } }
  });
};

let markUUID = async (uuid, unread) => {
  // remove from unread list by default
  let updateExpression = "DELETE unread :uuid";
  // add to unread list
  if (unread) {
    updateExpression = "ADD unread :uuid";
  }
  await dynamo("updateItem", {
    Key: andiKey,
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: { ":uuid": { SS: [uuid] } }
  });
};

// event.requestContext.connectionId

let updateAdminMetadata = async connectionID =>
  await dynamo("updateItem", {
    Key: andiKey,
    UpdateExpression: "SET #conn = :conn, lastConnected = :timestamp",
    ExpressionAttributeNames: { "#conn": "connection" },
    ExpressionAttributeValues: {
      ":conn": { S: connectionID },
      ":timestamp": { N: `${+new Date()}` }
    }
  });

let addMessageToConversation = async (uuidFrom, uuidTo, msg, connectionID, ipAddress) => {
  // assume message is from user to andi
  let obj = {
    uuid: uuidFrom,
    timestamp: { N: `${+new Date()}` },
    msg: { S: msg },
    type: { S: "to" },
    connection: { S: connectionID },
    ip: { S: ipAddress }
  };
  if (uuidFrom == "andi") {
    // message is from andi
    obj.uuid.S = uuidTo;
    obj.type.S = "from";
    obj.connection.S = "admin";
    obj.ip.S = "admin";
  }
  await dynamo("putItem", { Item: obj });
};

let getAllMessagesWith = async uuid => {
  let query = await dynamo("query", {
    KeyConditionExpression: "#uuid = :uuid",
    ExpressionAttributeNames: {
      "#uuid": "uuid"
    },
    ExpressionAttributeValues: {
      ":uuid": uuid
    }
  });
  if (query.Items.length == 0) return [];
  return query.Items.map(item => ({
    msg: item.msg.S,
    type: item.type.S,
    timestamp: item.timestamp.N,
    connection: item.connection.S
  }));
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
  markUUID,
  updateAdminMetadata,
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
