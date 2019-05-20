const AWS = require("aws-sdk");
require("aws-sdk/clients/apigatewaymanagementapi");
const utils = require("./utils");
const PASSWORD = process.env.PASSWORD;

let ws = null;
let { JSONReply, JSONError } = utils;

let userHandler = async (event, body) => {
  switch (body.action) {
    case "hello":
      let lastConnected = (await utils.andiItem()).lastConnected.N;
      return JSONReply("lastConnected", lastConnected);
    case "register":
      if (!body.nickname || !body.email) return JSONError();
      utils.createConversation(body.uuid, body.nickname, body.email);
      return JSONReply("welcome");
    case "list":
      return JSONReply("history", await utils.getAllMessagesWith(body.uuid));
    case "send":
      // TODO: refactor utils to use params instead of event/body
      if (!body.msg) return JSONError();
      await utils.addMessageToConversation(event, body);
      let sent = await utils.sendResponseToAndi(event, body, ws);
      return sent ? JSONReply("sent") : JSONReply("sendError");
  }
};

let adminHandler = async (event, body) => {
  switch (body.action) {
    case "hello":
      await utils.updateLastConnectedTime();
      return JSONReply("andiItem", await utils.andiItem());
    case "ping":
      await utils.updateLastConnectedTime();
      return JSONReply("pong");
    case "list":
      if (!body.for) return JSONError();
      await utils.markRead(body.for);
      return JSONReply("history", await utils.getAllMessagesWith(body.for));
    case "send":
      if (!body.msg || !body.for) return JSONError();
      await utils.addMessageToConversation(event, body);
      let sent = await utils.sendResponseToRecipient(event, body, ws);
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
