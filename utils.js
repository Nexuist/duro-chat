const AWS = require("aws-sdk");

let DynamoDocumentClient = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-10-08", region: "us-east-1" });

let dynamo = async (action, params) =>
  await module.exports.DynamoDocumentClient[action]({
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
  uuid: "andi",
  timestamp: 0
};

let andiItem = async () => (await dynamo("get", { Key: andiKey })).Item;

let createConversation = async ({ uuid, nickname, email, connection, ip }) => {
  await dynamo("put", {
    Item: {
      uuid,
      timestamp: 0,
      nickname,
      email,
      connection,
      lastConnected: 0,
      ip,
      lastRequestsServed: module.exports.DynamoDocumentClient.createSet(["null"]),
      updates: 0
    }
  });
  await dynamo("update", {
    Key: andiKey,
    UpdateExpression: "SET conversations.#uuid = :nickname",
    ExpressionAttributeNames: { "#uuid": uuid },
    ExpressionAttributeValues: { ":nickname": nickname }
  });
};

let updateConversation = async ({ uuid, connection, ip }) =>
  await dynamo("update", {
    Key: {
      uuid,
      timestamp: 0
    },
    UpdateExpression: "SET #conn = :conn, lastConnected = :timestamp, #ip = :ip",
    ExpressionAttributeNames: { "#conn": "connection", "#ip": "ip" },
    ExpressionAttributeValues: {
      ":conn": connection,
      ":timestamp": +new Date(),
      ":ip": ip
    }
  });

let markUUIDUnread = async (uuid, unread) => {
  // remove from unread list by default
  let updateExpression = "DELETE unread :uuid";
  // add to unread list
  if (unread) {
    updateExpression = "ADD unread :uuid";
  }
  await dynamo("update", {
    Key: andiKey,
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: { ":uuid": module.exports.DynamoDocumentClient.createSet([uuid]) }
  });
};

// Lambda sometimes retries the same event if it didn't work the first time, so this is here to prevent duplicate messages from being sent
let isUniqueRequest = async (uuid, requestID) => {
  let Key = {
    uuid,
    timestamp: 0
  };
  let convo = await dynamo("get", { Key, ProjectionExpression: "lastRequestsServed, updates" });
  if (!convo.Item) return true; // unknown uuid
  let lastRequestsServed = convo.Item.lastRequestsServed.values;
  let updates = convo.Item.updates;
  if (lastRequestsServed.includes(requestID)) return false;
  lastRequestsServed.push(requestID); // add new request
  if (lastRequestsServed.length >= 6) lastRequestsServed.shift(); // drop the oldest saved id if there are too many
  let updateParams = {
    Key,
    UpdateExpression: "SET lastRequestsServed = :newSet, updates = updates + :one",
    ConditionExpression: "updates = :updates",
    ExpressionAttributeValues: {
      ":newSet": module.exports.DynamoDocumentClient.createSet(lastRequestsServed),
      ":updates": updates,
      ":one": 1
    }
  };
  try {
    await dynamo("update", updateParams);
  } catch (err) {
    if (err.code != "ConditionalCheckFailedException") throw err;
    return false; // the conversation was updated by the time we tried to update it, so just invalidate everything
  }
  return true;
};

let addMessageToConversation = async ({ from, to, msg }) => {
  // assume message is from user to andi
  let timestamp = +new Date();
  let obj = {
    uuid: from,
    timestamp,
    msg,
    type: "to"
  };
  if (from == "andi") {
    // message is from andi
    obj.uuid = to;
    obj.type = "from";
  }
  await dynamo("put", { Item: obj });
  return timestamp;
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
  query.Items.shift(); // remove the initial conversation creation message
  return query.Items.map(item => ({
    msg: item.msg,
    type: item.type,
    timestamp: item.timestamp
  }));
};

let sendResponse = async ({ from, to, msg, ws }) => {
  let obj = {
    type: "reply",
    msg
  };
  let connectionString = (await dynamo("get", {
    Key: {
      uuid: to,
      timestamp: 0
    }
  })).Item.connection;
  if (to == "andi") obj.uuid = from;
  try {
    await ws
      .postToConnection({
        ConnectionId: connectionString,
        Data: JSON.stringify(obj)
      })
      .promise();
    return true;
  } catch (err) {
    if (to == "andi") {
      // notify17?
    }
    console.log(from, to, msg);
    console.error(err);
    return false;
  }
};

module.exports = {
  JSONReply,
  JSONError,
  DynamoDocumentClient,
  dynamo,
  andiItem,
  createConversation,
  updateConversation,
  addMessageToConversation,
  getAllMessagesWith,
  markUUIDUnread,
  isUniqueRequest,
  sendResponse
};
