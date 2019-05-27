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

const createFakeConversation = async uuid => {
  await utils.createConversation({
    uuid,
    nickname: "baba",
    email: "booey@email.com",
    connection: "connString",
    ip: "127.0.0.1"
  });
};

let main = async () => {
  utils.DynamoDocumentClient = new AWS.DynamoDB.DocumentClient({
    apiVersion: "2012-10-08",
    region: "us-east-1"
    // endpoint: "http://localhost:4569"
  });
  let testUUID = "bababooey-isUniqueRequest-idempotent";
  await utils.dynamo("delete", {
    Key: {
      uuid: testUUID,
      timestamp: 0
    }
  });
  await createFakeConversation(testUUID);
  // run these all concurrently to simulate multiple requests at once
  let r1, r2, r3;
  utils.isUniqueRequest(testUUID, "23").then(r => (r1 = r));
  utils.isUniqueRequest(testUUID, "23").then(r => (r2 = r));
  utils.isUniqueRequest(testUUID, "23").then(r => (r3 = r));
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(r1, r2, r3);
  console.log(
    (await utils.dynamo("get", {
      Key: {
        uuid: testUUID,
        timestamp: 0
      }
    })).Item
  );
};

main();
