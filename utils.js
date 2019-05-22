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
  let time = +new Date();
  let obj = {
    uuid: { S: uuidFrom },
    timestamp: { N: `${time}` },
    msg: { S: msg },
    type: { S: "to" },
    connection: { S: connectionID },
    ip: { S: ipAddress }
  };
  if (uuidFrom == "andi") {
    // message is from andi
    obj.uuid.S = uuidTo;
    obj.type.S = "from";
    obj.connection.S = "andi";
    obj.ip.S = "andi";
  }
  await dynamo("putItem", { Item: obj });
  return time;
};

let getAllMessagesWith = async uuid => {
  let query = await dynamo("query", {
    KeyConditionExpression: "#uuid = :uuid",
    ExpressionAttributeNames: {
      "#uuid": "uuid"
    },
    ExpressionAttributeValues: {
      ":uuid": { S: uuid }
    }
  });
  if (query.Items.length == 0) return [];
  query.Items.shift(); // remove the initial conversation creation message
  return query.Items.map(item => ({
    msg: item.msg.S,
    type: item.type.S,
    timestamp: item.timestamp.N,
    connection: item.connection.S
  }));
};

let sendResponseToAndi = async (uuid, msg, ws) => {
  // returns bool
  let andiConnectionID = (await utils.andiItem()).connection.S;
  let obj = {
    type: "reply",
    uuid,
    msg
  };
  try {
    await ws
      .postToConnection({
        ConnectionId: andiConnectionID,
        Data: JSON.stringify(obj)
      })
      .promise();
    return true;
  } catch (err) {
    // notify17?
    return false;
  }
};

let sendResponseToUUID = async (msg, connectionID, ws) => {
  try {
    await ws
      .postToConnection({
        ConnectionId: connectionID,
        Data: JSON.stringify({
          type: "reply",
          msg
        })
      })
      .promise();
    return true;
  } catch (err) {
    return false;
  }
};

module.exports = {
  JSONReply,
  JSONError,
  DDB,
  dynamo,
  andiItem,
  createConversation,
  addMessageToConversation,
  getAllMessagesWith,
  markUUID,
  updateAdminMetadata,
  sendResponseToAndi,
  sendResponseToRecipient
};
