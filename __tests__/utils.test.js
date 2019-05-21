const AWS = require("aws-sdk");
const utils = require("../utils");

const andiItem = {
  uuid: { S: "andi" },
  timestamp: { N: "0" },
  lastConnected: { N: "0" },
  conversations: { M: {} },
  unread: { SS: ["null"] },
  connection: { S: "null" }
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
    await utils.createConversation("bababooey", "baba", "booey@email.com", "connString", "127.0.0.1");
    let result = (await utils.dynamo("getItem", {
      Key: {
        uuid: { S: "bababooey" },
        timestamp: { N: "0" }
      }
    })).Item;
    expect(result).toEqual({
      uuid: { S: "bababooey" },
      timestamp: { N: "0" },
      nickname: { S: "baba" },
      email: { S: "booey@email.com" },
      connection: { S: "connString" },
      ip: { S: "127.0.0.1" }
    });
    let andiItem = await utils.andiItem();
    expect(andiItem.conversations.M).toEqual(
      expect.objectContaining({
        bababooey: { S: "baba" }
      })
    );
  });
  test("updateAdminMetadata updates the last connected time and connection string", async () => {
    let time = +new Date();
    await utils.updateAdminMetadata("testConnectionString");
    let andiItem = await utils.andiItem();
    expect(+andiItem.lastConnected.N).not.toBeLessThan(time);
    expect(andiItem.connection.S).toEqual("testConnectionString");
  });
  describe("markUUID", () => {
    it("adds the uuid to the unread list when unread is true", async () => {
      let oldAndiItem = await utils.andiItem();
      await utils.markUUID("bababooster", true);
      let newAndiItem = await utils.andiItem();
      expect(newAndiItem).not.toEqual(oldAndiItem);
      expect(newAndiItem.unread.SS).toEqual(expect.arrayContaining(["bababooster"]));
    });
    it("removes the uuid from the unread list when unread is false", async () => {
      await utils.markUUID("babaoooey", true);
      await utils.markUUID("babaoooey", false);
      let andiItem = await utils.andiItem();
      expect(andiItem.unread.SS).not.toEqual(expect.arrayContaining(["babaoooey"]));
    });
    it("doesn't error when marking read if the given uuid doesn't exist", async () => {
      let andiItem = await utils.andiItem();
      // must wrap code in a fn for toThrow to work properly
      expect(async () => await utils.markUUID("booey", false)).not.toThrow();
      expect(await utils.andiItem()).toEqual(andiItem);
    });
  });
  describe("addMessageToConversation", () => {
    // pass
  });
  describe("getAllMessagesWith", () => {
    // pass
  });
});
