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

let createConversation = async ({ uuid, nickname, email, connection, ip }) => {
  await dynamo("putItem", {
    Item: {
      uuid: { S: uuid },
      timestamp: { N: "0" },
      nickname: { S: nickname },
      email: { S: email },
      connection: { S: connection },
      lastConnected: { N: `${+new Date()}` },
      ip: { S: ip }
    }
  });
  await dynamo("updateItem", {
    Key: andiKey,
    UpdateExpression: "SET conversations.#uuid = :nickname",
    ExpressionAttributeNames: { "#uuid": uuid },
    ExpressionAttributeValues: { ":nickname": { S: nickname } }
  });
};

let updateConversation = async ({ uuid, connection, ip }) =>
  await dynamo("updateItem", {
    Key: {
      uuid: { S: uuid },
      timestamp: { N: "0" }
    },
    UpdateExpression: "SET #conn = :conn, lastConnected = :timestamp, #ip = :ip",
    ExpressionAttributeNames: { "#conn": "connection", "#ip": "ip" },
    ExpressionAttributeValues: {
      ":conn": { S: connection },
      ":timestamp": { N: `${+new Date()}` },
      ":ip": { S: ip }
    }
  });

let markUUIDUnread = async (uuid, unread) => {
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

let addMessageToConversation = async ({ from, to, msg }) => {
  // assume message is from user to andi
  let time = +new Date();
  let obj = {
    uuid: { S: from },
    timestamp: { N: `${time}` },
    msg: { S: msg },
    type: { S: "to" }
  };
  if (uuidFrom == "andi") {
    // message is from andi
    obj.uuid.S = to;
    obj.type.S = "from";
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

let sendResponse = async ({ from, to, msg, ws }) => {
  let obj = {
    type: "reply",
    msg
  };
  let connectionString = (await dynamo("getItem", {
    Key: {
      uuid: { S: to },
      timestamp: { N: "0" }
    }
  })).Item.connection.S;
  if (to == "andi") obj.uuid = from;
  try {
    await ws
      .postToConnection({
        connectionString: connectionString,
        Data: JSON.stringify(obj)
      })
      .promise();
    return true;
  } catch (err) {
    if (to == "andi") {
      // notify17?
    }
    console.log(err);
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
  markUUIDUnread,
  updateAdminMetadata,
  sendResponseTo
};
