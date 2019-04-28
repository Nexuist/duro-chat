const AWS = require("aws-sdk");
require("aws-sdk/clients/apigatewaymanagementapi");
const utils = require("./utils");
const PASSWORD = process.env.PASSWORD;

let ws = null;

let userHandler = (event, body) => {
  return utils.JSONReply("user", "hello");
};

let adminHandler = (event, body) => {
  return utils.JSONReply("admin", "hello");
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
    return utils.JSONError();
  }
};
