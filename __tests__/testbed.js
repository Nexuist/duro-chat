/*
    The purpose of this file is to be able to test the entire system using the test database with no mocks in between. There are no official tests here, it is meant for impromptu code execution.
*/
const AWS = require("aws-sdk");
const handler = require("../base").handler;
const utils = require("../utils");

let printCall = async json => {
  let result = await handler({
    requestContext: {
      domainName: "58yojgvxyi.execute-api.us-east-1.amazonaws.com",
      stage: "dev",
      connectionId: "testConnection",
      identity: {
        sourceIp: "127.0.0.1"
      }
    },
    body: JSON.stringify(json)
  });
  console.log(JSON.parse(result.body));
};

let header = msg => console.log(`--- ${msg.toUpperCase()} ---`);

let main = async () => {
  utils.DynamoDocumentClient = new AWS.DynamoDB.DocumentClient({
    apiVersion: "2012-10-08",
    region: "us-east-1",
    endpoint: "http://localhost:4569"
  });
};

main();
