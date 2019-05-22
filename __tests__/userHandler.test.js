const AWS = require("aws-sdk");
const utils = require("../utils");

const { call, calls, invalidReply } = lambda;

// prevent any requests from hitting prod
beforeAll(() => {
  utils.DDB = new AWS.DynamoDB({
    apiVersion: "2012-10-08",
    region: "us-east-1",
    endpoint: "http://localhost:4569"
  });
});

describe("userHandler", () => {
  beforeAll(() => {
    utils.dynamo = jest.fn(); // prevent any real database use
  });
  describe("hello", () => {
    it("replies with the last connected time", async () => {
      utils.andiItem = jest.fn(async () => {
        return {
          lastConnected: {
            N: 0
          }
        };
      });
      let result = await call({
        uuid: "bababooey",
        action: "hello"
      });
      expect(result).toEqual(utils.JSONReply("lastConnected", 0));
    });
  });
  describe("register", () => {
    utils.createConversation = jest.fn();
    let validPayload = {
      uuid: "bababooey",
      action: "register",
      nickname: "andi",
      email: "andi@duro.me"
    };
    it("requires a nickname and email payload", async () => {
      let results = await calls([
        {
          uuid: "bababooey",
          action: "register",
          nickname: "andi"
        },
        {
          uuid: "bababooey",
          action: "register",
          email: "andi"
        },
        validPayload
      ]);
      expect(results).toEqual([invalidReply, invalidReply, utils.JSONReply("welcome")]);
    });
    it("creates a conversation for the new uuid", async () => {
      let result = await call(validPayload);
      expect(result).toEqual(utils.JSONReply("welcome"));
      expect(utils.createConversation).toBeCalledWith("bababooey", "andi", "andi@duro.me", "testConnection", "127.0.0.1");
    });
  });
  describe("list", () => {
    let fakeMessages = [
      {
        msg: "baba!",
        sender: "user",
        timestamp: +new Date(),
        connection: "baba!"
      },
      {
        msg: "booey",
        sender: "andi",
        timestamp: +new Date(),
        connection: "booey!"
      }
    ];
    utils.getAllMessagesWith = jest.fn(async uuid => {
      if (uuid == "bababooey") {
        return fakeMessages;
      } else {
        return [];
      }
    });
    it("replies with a list of messages for a recognized uuid", async () => {
      let result = await call({
        uuid: "bababooey",
        action: "list"
      });
      expect(result).toEqual(utils.JSONReply("history", fakeMessages));
    });
    it("replies with an empty list for an unrecognized uuid", async () => {
      let result = await call({
        uuid: "bab",
        action: "list"
      });
      expect(result).toEqual(utils.JSONReply("history", []));
    });
  });
  describe("send", () => {
    beforeAll(() => {
      utils.addMessageToConversation = jest.fn();
      utils.markUUID = jest.fn();
      utils.sendResponseTo = jest.fn(() => true);
    });
    it("requires a message payload", async () => {
      let results = await calls([
        {
          uuid: "baba",
          action: "send"
        },
        {
          uuid: "baba",
          action: "send",
          msg: "yeehaw"
        }
      ]);
      expect(results).toEqual([invalidReply, utils.JSONReply("sent")]);
      expect(utils.markUUID).toBeCalledWith("baba", true);
    });
    it("adds uuid to unread list, adds message to conversation, attempts to send response to andi", async () => {
      let result = await call({
        uuid: "baba",
        action: "send",
        msg: "yeehaw"
      });
      expect(result).toEqual(utils.JSONReply("sent"));
      expect(utils.addMessageToConversation).toHaveBeenCalledWith("baba", "andi", "yeehaw", "testConnection", "127.0.0.1");
      expect(utils.markUUID).toHaveBeenCalledWith("baba", true);
      expect(utils.sendResponseTo).toHaveBeenCalledWith("andi", "yeehaw", expect.anything(), "baba");
    });
  });
});
