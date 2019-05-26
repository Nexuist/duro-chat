const AWS = require("aws-sdk");
const utils = require("../utils");

const { DDB, DDC } = database;

const andiItem = {
  uuid: "andi",
  timestamp: 0,
  lastConnected: 0,
  conversations: {},
  unread: DDC.createSet(["null"]),
  connection: "null"
};

beforeAll(async () => {
  utils.DynamoDocumentClient = DDC;
  const dynamo = async (action, params) => {
    await DDB[action]({
      TableName: "DuroLiveChat",
      ...params
    }).promise();
  };
  try {
    await dynamo("deleteTable", {}); // Reset localstack
  } catch (err) {
    // pass
  }
  await dynamo("createTable", {
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
  await utils.dynamo("put", { Item: andiItem });
});

describe("utils", () => {
  test("andiItem returns the andi item", async () => {
    expect(await utils.andiItem()).toEqual(andiItem);
  });
  test("createConversation creates a new conversation", async () => {
    const testUUID = "bababooey-createConversation";
    await utils.createConversation({
      uuid: testUUID,
      nickname: "baba",
      email: "booey@email.com",
      connection: "connString",
      ip: "127.0.0.1"
    });
    let result = (await utils.dynamo("get", {
      Key: {
        uuid: testUUID,
        timestamp: 0
      }
    })).Item;
    expect(result).toEqual({
      uuid: testUUID,
      timestamp: 0,
      nickname: "baba",
      lastConnected: expect.any(Number),
      email: "booey@email.com",
      connection: "connString",
      ip: "127.0.0.1",
      lastRequestsServed: DDC.createSet(["null"])
    });
    let andiItem = await utils.andiItem();
    expect(andiItem.conversations[testUUID]).toEqual("baba");
  });
  test("updateConversation updates the last connected time, connection string, and IP address", async () => {
    let time = +new Date();
    await utils.updateConversation({
      uuid: "andi",
      connection: "testConnectionString",
      ip: "127.0.0.2"
    });
    let andiItem = await utils.andiItem();
    expect(+andiItem.lastConnected).not.toBeLessThan(time);
    expect(andiItem.connection).toEqual("testConnectionString");
    expect(andiItem.ip).toEqual("127.0.0.2");
  });
  describe("markUUIDUnread", () => {
    it("adds the uuid to the unread list when unread is true", async () => {
      const testUUID = "bababooey-markUUIDUnread";
      let oldAndiItem = await utils.andiItem();
      await utils.markUUIDUnread(testUUID, true);
      let newAndiItem = await utils.andiItem();
      expect(newAndiItem).not.toEqual(oldAndiItem);
      expect(newAndiItem.unread.values).toEqual(expect.arrayContaining([testUUID]));
    });
    it("removes the uuid from the unread list when unread is false", async () => {
      const testUUID = "bababooey-markUUIDUnread-2";
      await utils.markUUIDUnread(testUUID, true);
      await utils.markUUIDUnread(testUUID, false);
      let andiItem = await utils.andiItem();
      expect(andiItem.unread).not.toEqual(expect.arrayContaining([testUUID]));
    });
    it("doesn't error when marking read if the given uuid doesn't exist", async () => {
      const testUUID = "bababooey-markUUIDUnread-3";
      let andiItem = await utils.andiItem();
      // must wrap code in a fn for toThrow to work properly
      expect(async () => await utils.markUUIDUnread(testUUID, false)).not.toThrow();
      expect(await utils.andiItem()).toEqual(andiItem);
    });
  });
  describe("addMessageToConversation", () => {
    it("adds a to type message if uuidFrom is not andi", async () => {
      // build a fake conversation
      const testUUID = "bababooey-addMessageToConversation-to";
      await utils.createConversation({
        uuid: testUUID,
        nickname: "baba",
        email: "booey@email.com",
        connection: "connString",
        ip: "127.0.0.1"
      });
      let timestamp = await utils.addMessageToConversation({ from: testUUID, to: "andi", msg: "testing message" });
      let result = await utils.dynamo("get", {
        Key: {
          uuid: testUUID,
          timestamp
        }
      });
      expect(result.Item).toBeDefined();
      result = result.Item;
      expect(result).toEqual(
        expect.objectContaining({
          type: "to",
          msg: "testing message"
        })
      );
    });
    it("adds a from type message if uuidFrom is andi", async () => {
      // build a fake conversation
      const testUUID = "bababooey-addMessageToConversation-from";
      await utils.createConversation({
        uuid: testUUID,
        nickname: "baba",
        email: "booey@email.com",
        connection: "connString",
        ip: "127.0.0.1"
      });
      await utils.addMessageToConversation({ from: testUUID, to: "andi", msg: "testing message" });
      let timestamp = await utils.addMessageToConversation({ from: "andi", to: testUUID, msg: "hello" });
      let result = await utils.dynamo("get", {
        Key: {
          uuid: testUUID,
          timestamp
        }
      });
      expect(result.Item).toBeDefined();
      result = result.Item;
      expect(result).toEqual(
        expect.objectContaining({
          type: "from",
          msg: "hello"
        })
      );
    });
  });
  describe("getAllMessagesWith", () => {
    it("returns the correct form of messages if the uuid exists", async () => {
      // build a fake conversation
      const testUUID = "bababooey-getAllMessagesWith";
      await utils.createConversation({
        uuid: testUUID,
        nickname: "baba",
        email: "booey@email.com",
        connection: "connString",
        ip: "127.0.0.1"
      });
      await utils.addMessageToConversation({ from: testUUID, to: "andi", msg: "testing message" });
      await utils.addMessageToConversation({ from: "andi", to: testUUID, msg: "hello" });
      let messages = await utils.getAllMessagesWith(testUUID);
      expect(messages.length).toEqual(2);
    });
    it("returns an empty list if the uuid does not exist", async () => {
      const testUUID = "bababooey-impossible";
      expect(await utils.getAllMessagesWith(testUUID)).toEqual([]);
    });
  });
  describe("sendResponse", () => {
    let ws, brokenWs;
    beforeAll(() => {
      ws = {
        postToConnection: jest.fn(obj => {
          return {
            promise: jest.fn()
          };
        })
      };
      brokenWs = {
        postToConnection: jest.fn(obj => {
          return {
            promise: jest.fn(() => {
              throw new Error();
            })
          };
        })
      };
    });
    it("sends a message to andi correctly", async () => {
      let andiConnectionString = (await utils.andiItem()).connection;
      let result = await utils.sendResponse({
        from: "bababooey",
        to: "andi",
        msg: "test message",
        ws
      });
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
      let result = await utils.sendResponse({
        from: "andi",
        to: "bababooey-createConversation",
        msg: "test message",
        ws
      });
      expect(ws.postToConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          ConnectionId: "connString",
          Data: JSON.stringify({
            type: "reply",
            msg: "test message"
          })
        })
      );
      expect(result).toBeTruthy();
    });
    it("fails gracefully and doesn't error", async () => {
      console.log = jest.fn();
      console.error = jest.fn();
      let r1 = await utils.sendResponse({
        from: "bababooey",
        to: "andi",
        msg: "test message",
        ws: brokenWs
      });
      let r2 = await utils.sendResponse({
        from: "andi",
        to: "bababooey-createConversation",
        msg: "test message",
        ws: brokenWs
      });
      expect(r1).toBeFalsy();
      expect(r2).toBeFalsy();
      expect(console.log).toHaveBeenCalledTimes(2);
      expect(console.error).toHaveBeenCalledTimes(2);
      console.log.mockRestore();
      console.error.mockRestore();
    });
  });
});
