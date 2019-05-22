const AWS = require("aws-sdk");
require("aws-sdk/clients/apigatewaymanagementapi");
const utils = require("./utils");
const PASSWORD = process.env.PASSWORD;

let ws = null;
let { JSONReply, JSONError } = utils;

let userHandler = async (event, body) => {
  let connectionID = event.requestContext.connectionId;
  let ip = event.requestContext.identity.sourceIp;
  switch (body.action) {
    case "hello":
      let lastConnected = (await utils.andiItem()).lastConnected.N;
      return JSONReply("lastConnected", lastConnected);
    case "register":
      if (!body.nickname || !body.email) return JSONError();
      utils.createConversation(body.uuid, body.nickname, body.email, connectionID, ip);
      return JSONReply("welcome");
    case "list":
      return JSONReply("history", await utils.getAllMessagesWith(body.uuid));
    case "send":
      if (!body.msg) return JSONError();
      await utils.addMessageToConversation(body.uuid, "andi", body.msg, connectionID, ip);
      await utils.markUUID(body.uuid, false);
      let sent = await utils.sendResponseTo("andi", body.msg, ws, body.uuid);
      return sent ? JSONReply("sent") : JSONReply("sendError");
  }
};

let adminHandler = async (event, body) => {
  let connectionID = event.requestContext.connectionId;
  switch (body.action) {
    case "hello":
      await utils.updateAdminMetadata(connectionID);
      return JSONReply("andiItem", await utils.andiItem());
    case "ping":
      await utils.updateAdminMetadata(connectionID);
      return JSONReply("pong");
    case "list":
      if (!body.for) return JSONError();
      await utils.markUUID(body.for, true);
      return JSONReply("history", await utils.getAllMessagesWith(body.for));
    case "send":
      if (!body.msg || !body.uuidTo || !body.connectionTo) return JSONError();
      await utils.addMessageToConversation("andi", body.uuidTo, body.msg);
      let sent = await utils.sendResponseTo(body.connectionTo, body.msg, ws, body.uuidTo);
      return sent ? JSONReply("sent") : JSONReply("sendError");
  }
};

exports.handler = async event => {
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
    if (body.uuid == "andi") {
      if (!(body.auth == PASSWORD)) throw new Error("incorrect auth");
      return adminHandler(event, body);
    } else {
      return userHandler(event, body);
    }
  } catch (err) {
    return JSONError();
  }
};
