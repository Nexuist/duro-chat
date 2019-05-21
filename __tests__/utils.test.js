const AWS = require("aws-sdk");
const utils = require("../utils");

const andiItem = {
  uuid: {
    S: "andi"
  },
  timestamp: {
    N: "0"
  },
  lastConnected: {
    N: "0"
  }
};

beforeAll(async done => {
  utils.DDB = new AWS.DynamoDB({
    apiVersion: "2012-10-08",
    region: "us-east-1",
    endpoint: "http://localhost:4569"
  });
  try {
    await utils.dynamo("deleteTable", {}); // Reset localstack
  } catch (err) {
    // pass
  }
  await utils.dynamo("createTable", {
    KeySchema: [
      {
        AttributeName: "uuid",
        KeyType: "HASH"
      },
      {
        AttributeName: "timestamp",
        KeyType: "RANGE"
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: "uuid",
        AttributeType: "S"
      },
      {
        AttributeName: "timestamp",
        AttributeType: "N"
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1
    }
  });
  await utils.dynamo("putItem", {
    Item: andiItem
  });
  return done();
});

describe("utils", () => {
  test("andiItem returns the andi item", async () => {
    expect(await utils.andiItem()).toEqual(andiItem);
  });
  test("createConversation creates a new conversation", async () => {
    await utils.createConversation("bababooey", "baba", "booey@email.com");
    let result = await utils.dynamo("getItem", {
      Item: {
        uuid: { S: "babaooey" },
        timestamp: { N: "0" }
      }
    }).Item;
    expect(result).toEqual({
      uuid: { S: "bababooey" },
      timestamp: { N: "0" },
      nickname: { S: "baba" },
      email: { S: "booey@email.com" }
    });
  });
  describe("addMessageToConversation", () => {
    // pass
  });
  describe("getAllMessagesWith", () => {
    // pass
  });
  describe("markRead", () => {
    // pass
  });
  test("updateLastConnectedTime updates the last connected time", async () => {
    // pass
  });
});
