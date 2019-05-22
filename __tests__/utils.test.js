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
    const testUUID = "bababooey-createConversation";
    await utils.createConversation(testUUID, "baba", "booey@email.com", "connString", "127.0.0.1");
    let result = (await utils.dynamo("getItem", {
      Key: {
        uuid: { S: testUUID },
        timestamp: { N: "0" }
      }
    })).Item;
    expect(result).toEqual({
      uuid: { S: testUUID },
      timestamp: { N: "0" },
      nickname: { S: "baba" },
      email: { S: "booey@email.com" },
      connection: { S: "connString" },
      ip: { S: "127.0.0.1" }
    });
    let andiItem = await utils.andiItem();
    expect(andiItem.conversations.M[testUUID].S).toEqual("baba");
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
      const testUUID = "bababooey-markUUID";
      let oldAndiItem = await utils.andiItem();
      await utils.markUUID(testUUID, true);
      let newAndiItem = await utils.andiItem();
      expect(newAndiItem).not.toEqual(oldAndiItem);
      expect(newAndiItem.unread.SS).toEqual(expect.arrayContaining([testUUID]));
    });
    it("removes the uuid from the unread list when unread is false", async () => {
      const testUUID = "bababooey-markUUID-2";
      await utils.markUUID(testUUID, true);
      await utils.markUUID(testUUID, false);
      let andiItem = await utils.andiItem();
      expect(andiItem.unread.SS).not.toEqual(expect.arrayContaining([testUUID]));
    });
    it("doesn't error when marking read if the given uuid doesn't exist", async () => {
      const testUUID = "bababooey-markUUID-3";
      let andiItem = await utils.andiItem();
      // must wrap code in a fn for toThrow to work properly
      expect(async () => await utils.markUUID(testUUID, false)).not.toThrow();
      expect(await utils.andiItem()).toEqual(andiItem);
    });
  });
  describe("addMessageToConversation", () => {
    it("adds a to type message if uuidFrom is not andi", async () => {
      // build a fake conversation
      const testUUID = "bababooey-addMessageToConversation-to";
      await utils.createConversation(testUUID, "tester", "test@test.com", "testConnection", "127.0.0.1");
      let time = await utils.addMessageToConversation(testUUID, "andi", "testing message", "testConnection", "127.0.0.1");
      let result = await utils.dynamo("getItem", {
        Key: {
          uuid: { S: testUUID },
          timestamp: { N: time.toString() }
        }
      });
      expect(result.Item).toBeDefined();
      result = result.Item;
      expect(result).toEqual(
        expect.objectContaining({
          type: { S: "to" },
          msg: { S: "testing message" },
          connection: { S: "testConnection" },
          ip: { S: "127.0.0.1" }
        })
      );
    });
    it("adds a from type message if uuidFrom is andi", async () => {
      // build a fake conversation
      const testUUID = "bababooey-addMessageToConversation-from";
      await utils.createConversation(testUUID, "tester", "test@test.com", "testConnection", "127.0.0.1");
      await utils.addMessageToConversation(testUUID, "andi", "testing message", "testConnection", "127.0.0.1");
      let time = await utils.addMessageToConversation("andi", testUUID, "hello", null, null);
      let result = await utils.dynamo("getItem", {
        Key: {
          uuid: { S: testUUID },
          timestamp: { N: time.toString() }
        }
      });
      expect(result.Item).toBeDefined();
      result = result.Item;
      expect(result).toEqual(
        expect.objectContaining({
          type: { S: "from" },
          msg: { S: "hello" },
          connection: { S: "andi" },
          ip: { S: "andi" }
        })
      );
    });
  });
  describe("getAllMessagesWith", () => {
    it("returns the correct form of messages if the uuid exists", async () => {
      // build a fake conversation
      const testUUID = "bababooey-getAllMessagesWith";
      await utils.createConversation(testUUID, "tester", "test@test.com", "testConnection", "127.0.0.1");
      await utils.addMessageToConversation(testUUID, "andi", "testing message", "testConnection", "127.0.0.1");
      await utils.addMessageToConversation("andi", testUUID, "hello", null, null);
      let messages = await utils.getAllMessagesWith(testUUID);
      expect(messages.length).toEqual(2);
    });
    it("returns an empty list if the uuid does not exist", async () => {
      const testUUID = "bababooey-impossible";
      expect(await utils.getAllMessagesWith(testUUID)).toEqual([]);
    });
  });
  describe("sendMessageTo", () => {
    let ws = {
      postToConnection: jest.fn(obj => {
        return {
          promise: jest.fn()
        };
      })
    };
    let brokenWs = {
      postToConnection: jest.fn(async obj => {
        return {
          promise: jest.fn(() => {
            throw new Error();
          })
        };
      })
    };
    it("sends a message to andi correctly", async () => {
      let andiConnectionString = (await utils.andiItem()).connection.S;
      let result = await utils.sendResponseTo("andi", "test message", ws, "bababooey");
      expect(ws.postToConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          ConnectionId: andiConnectionString,
          Data: JSON.stringify({
            type: "reply",
            msg: "test message",
            uuid: "bababooey"
          })
        })
      );
      expect(result).toBeTruthy();
    });
    it("sends a message from andi correctly", async () => {
      let result = await utils.sendResponseTo("testConnection", "test message", ws);
      expect(ws.postToConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          ConnectionId: "testConnection",
          Data: JSON.stringify({
            type: "reply",
            msg: "test message"
          })
        })
      );
      expect(result).toBeTruthy();
    });
    it("fails gracefully and doesn't error", async () => {
      let r1, r2;
      expect(async () => {
        r1 = await utils.sendResponseTo("andi", "test message", brokenWs, "bababooey");
        r2 = await utils.sendResponseTo("testConnection", "test message", brokenWs);
      }).not.toThrow();
      expect(r1).toBeFalsy();
      expect(r2).toBeFalsy();
    });
  });
});
