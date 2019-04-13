const queries = require("./queries");
const AUTH = "2c47df9fcd41fd96fe0638a62a1bd67c";
const AWS = require("aws-sdk");
require("aws-sdk/clients/apigatewaymanagementapi");

let reply = async (connection, body, ws) => {
  try {
    await ws
      .postToConnection({
        ConnectionId: connection,
        Data: JSON.stringify(body)
      })
      .promise();
    return res("sent");
  } catch (err) {
    return res("sendError");
  }
};

let res = (type, result, code = 200) => ({
  statusCode: code,
  body: JSON.stringify({
    type,
    result
  })
});

let invalid = msg => res("error", msg || "invalid", 400);

let adminHandler = async (event, body, ws) => {
  switch (body.action) {
    case "hello":
      let adminItem = await queries.adminItem();
      await queries.adminSetConnection(event);
      return res("conversations", adminItem);
    case "ping":
      await queries.adminSetConnection(event);
      return res("pong");
    case "list":
      await queries.adminMarkRead(body.for);
      return res("history", await queries.getMessages(body.for));
    case "send":
      await queries.adminStoreMessage(body.uuidTo, body.msg);
      return await reply(
        body.connectionTo,
        {
          type: "reply",
          msg: body.msg
        },
        ws
      );
    default:
      return res("yeehaw");
  }
};

let userHandler = async (event, body, ws) => {
  switch (body.action) {
    case "hello":
      let adminItem = await queries.adminItem();
      return res("lastConnected", adminItem ? adminItem.lastConnected.N : 0);
    case "list":
      let msgs = await queries.getMessages(body.uuid);
      return res("history", msgs);
    case "system":
    case "send":
      if (!body.nickname || !body.msg) return invalid();
      await queries.storeUUID(body);
      await queries.storeMessage(event, body);
      let connection = (await queries.adminItem()).connection.S;
      return await reply(
        connection,
        {
          type: "reply",
          uuid: body.uuid,
          msg: body.msg,
          nickname: body.nickname,
          email: body.email,
          connection: event.requestContext.connectionId
        },
        ws
      );
  }
};

exports.handler = async event => {
  let websockets = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint: event.requestContext.domainName + "/" + event.requestContext.stage
  });
  let body = null;
  try {
    body = JSON.parse(event.body);
    if (!body.action || !body.uuid) throw new Error();
    let authorized = body.auth == AUTH;
    console.log(body);
    if (!authorized && body.uuid == "andi") throw new Error();
    return authorized ? adminHandler(event, body, websockets) : userHandler(event, body, websockets);
  } catch (err) {
    return invalid();
  }
};
