// DO NOT PUBLISH - password saved in commit history

const ENDPOINT = "58yojgvxyi.execute-api.us-east-1.amazonaws.com/dev";
const PASSWORD = process.env.PASSWORD;

const AWS = require("aws-sdk");
require("aws-sdk/clients/apigatewaymanagementapi");

let websockets = new AWS.ApiGatewayManagementApi({
  apiVersion: "2018-11-29",
  endpoint: ENDPOINT
});

let resReply = (type, result, code = 200) => ({
  statusCode: code,
  body: JSON.stringify({
    type,
    result
  })
});

let invalidReply = msg => resReply("error", msg || "invalid", 400);

let userHandler = (event, body) => {
  return resReply("user", "hello");
};

let adminHandler = (event, body) => {
  return resReply("admin", "hello");
};

exports.handler = async event => {
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
    return invalidReply();
  }
};
