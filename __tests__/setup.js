const AWS = require("aws-sdk");
const utils = require("../utils");
let handler = require("../base").handler;

let call = async json =>
  await handler({
    requestContext: {
      domainName: "58yojgvxyi.execute-api.us-east-1.amazonaws.com",
      stage: "dev",
      connectionId: "testConnection",
      identity: {
        sourceIp: "127.0.0.1"
      },
      requestId: "testRequestID"
    },
    body: JSON.stringify(json)
  });

let calls = async inputs => {
  let results = [];
  for (input of inputs) {
    results.push(await call(input));
  }
  return results;
};

let invalidReply = utils.JSONError();

global.lambda = {
  handler,
  call,
  calls,
  invalidReply
};

const DynamoParams = {
  apiVersion: "2012-10-08",
  region: "us-east-1",
  endpoint: "http://localhost:4569"
};

const DDB = new AWS.DynamoDB(DynamoParams);

const DDC = new AWS.DynamoDB.DocumentClient(DynamoParams);

global.database = {
  DDB,
  DDC
};
