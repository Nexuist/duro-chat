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

let verifyOriginalRequest = (uuid, requestID) => {};

let header = msg => console.log(`--- ${msg.toUpperCase()} ---`);

let main = async () => {
  // let client = new AWS.DynamoDB.DocumentClient({
  //   apiVersion: "2012-10-08",
  //   region: "us-east-1",
  //   endpoint: "http://localhost:4569"
  // });
  // try {
  //   await client
  //     .put({
  //       TableName: "DuroLiveChat",
  //       Item: {
  //         uuid: "tamagotchi",
  //         timestamp: 0,
  //         toasts: 5,
  //         lastRequestsServed: client.createSet(["null"])
  //       }
  //     })
  //     .promise();
  // } catch (ex) {
  //   console.log(ex);
  // }
  // utils.DDB = new AWS.DynamoDB({
  //   apiVersion: "2012-10-08",
  //   region: "us-east-1",
  //   endpoint: "http://localhost:4569"
  // });
  // header("user/hello");
  // await printCall({
  //   uuid: "bababooey",
  //   action: "hello"
  // });
  // header("user/register");
  // await printCall({
  //   uuid: "bababooey-register",
  //   action: "register",
  //   nickname: "baba",
  //   email: "baba@booey.com"
  // });
  // header("user/list");
  // await printCall({
  //   uuid: "bababooey-getAllMessagesWith",
  //   action: "list"
  // });
  // var params = {
  //   TableName: "DuroLiveChat",
  //   Key: {
  //     uuid: { S: "bababooey-createConversation" },
  //     timestamp: { N: "0" }
  //   },
  //   UpdateExpression: "ADD lastRequestsServed :value",
  //   ExpressionAttributeValues: {
  //     ":value": { SS: ["test"] }
  //   },
  //   ReturnValues: "ALL_NEW" // optional (NONE | ALL_OLD | UPDATED_OLD | ALL_NEW | UPDATED_NEW)
  // };
  // await utils.dynamo("updateItem", params);
};

main();
