const AWS = require("aws-sdk");
const utils = require("./utils");
const PASSWORD = process.env.PASSWORD;

let ws = null;
let { JSONReply, JSONError } = utils;

// Technically someone can break the function by trying to send a message with a non-registered uuid, but it won't really affect uptime

let userHandler = async ({ event, body, uuid, connection, ip, requestID }) => {
  switch (body.action) {
    case "hello":
      let lastConnected = (await utils.andiItem()).lastConnected;
      return JSONReply("lastConnected", lastConnected);
    case "register":
      if (!body.nickname || !body.email) return JSONError();
      await utils.createConversation({
        uuid,
        nickname: body.nickname,
        email: body.email,
        connection,
        ip
      });
      return JSONReply("welcome");
    case "ping":
      await utils.updateConversation({ uuid, connection, ip });
      return JSONReply("pong");
    case "list":
      return JSONReply("history", await utils.getAllMessagesWith(uuid));
    case "send":
      if (!body.msg) return JSONError();
      let unique = await utils.isUniqueRequest(uuid, requestID);
      if (!unique) return JSONReply("duplicate");
      await utils.addMessageToConversation({
        from: uuid,
        to: "andi",
        msg: body.msg
      });
      await utils.markUUIDUnread(body.uuid, true);
      let sent = await utils.sendResponse({
        from: uuid,
        to: "andi",
        msg: body.msg,
        ws
      });
      return sent ? JSONReply("sent") : JSONReply("sendError");
  }
};

let adminHandler = async ({ event, body, uuid, connection, ip, requestID }) => {
  switch (body.action) {
    case "hello":
      await utils.updateConversation({ uuid, connection, ip });
      return JSONReply("andiItem", await utils.andiItem());
    case "ping":
      await utils.updateConversation({ uuid, connection, ip });
      return JSONReply("pong");
    case "list":
      if (!body.for) return JSONError();
      await utils.markUUIDUnread(body.for, false);
      return JSONReply("history", await utils.getAllMessagesWith(body.for));
    case "send":
      if (!body.msg || !body.uuidTo) return JSONError();
      let unique = await utils.isUniqueRequest(uuid, requestID);
      if (!unique) return JSONReply("duplicate");
      await utils.addMessageToConversation({
        from: "andi",
        to: body.uuidTo,
        msg: body.msg
      });
      let sent = await utils.sendResponse({
        from: "andi",
        to: body.uuidTo,
        msg: body.msg,
        ws
      });
      return sent ? JSONReply("sent") : JSONReply("sendError");
  }
};

let handler = async event => {
  if (!ws) {
    ws = new AWS.ApiGatewayManagementApi({
      apiVersion: "2018-11-29",
      endpoint: event.requestContext.domainName + "/" + event.requestContext.stage
    });
  }
  let body = null;
  try {
    body = JSON.parse(event.body);
    if (!body.action || !body.uuid) throw new Error("missing required keys");
    let args = {
      event,
      body,
      uuid: body.uuid,
      connection: event.requestContext.connectionId,
      ip: event.requestContext.identity.sourceIp,
      requestID: event.requestContext.requestId
    };
    if (body.uuid == "andi") {
      if (!(body.auth == PASSWORD)) throw new Error("incorrect auth");
      return module.exports.adminHandler(args);
    } else {
      return module.exports.userHandler(args);
    }
  } catch (err) {
    return JSONError();
  }
};

// export all 3 so they can be mocked in unit tests
module.exports = {
  handler,
  userHandler,
  adminHandler
};
