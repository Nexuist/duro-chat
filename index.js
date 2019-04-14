const PASSWORD = "2c47df9fcd41fd96fe0638a62a1bd67c";
const AWS = require("aws-sdk");
require("aws-sdk/clients/apigatewaymanagementapi");

let websockets = new AWS.ApiGatewayManagementApi({
  apiVersion: "2018-11-29",
  endpoint: "58yojgvxyi.execute-api.us-east-1.amazonaws.com/dev"
});

exports.handler = async event => {};
