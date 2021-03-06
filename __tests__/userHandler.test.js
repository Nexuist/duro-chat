const utils = require("../utils");
const { JSONReply } = utils;

const { call, calls, invalidReply } = lambda;
const { DDC } = database;

// prevent any requests from hitting prod
beforeAll(() => {
  utils.DynamoDocumentClient = DDC;
});

describe("userHandler", () => {
  describe("hello", () => {
    it("replies with the last connected time", async () => {
      utils.andiItem = jest.fn(async () => {
        return {
          lastConnected: 0
        };
      });
      let result = await call({
        uuid: "bababooey",
        action: "hello"
      });
      expect(result).toEqual(JSONReply("lastConnected", 0));
    });
  });
  test("ping", async () => {
    utils.updateConversation = jest.fn();
    await call({
      uuid: "bababooey",
      action: "ping"
    });
    expect(utils.updateConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        uuid: "bababooey",
        connection: "testConnection",
        ip: "127.0.0.1"
      })
    );
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
      expect(results).toEqual([invalidReply, invalidReply, JSONReply("welcome")]);
    });
    it("creates a conversation for the new uuid", async () => {
      let result = await call(validPayload);
      expect(result).toEqual(JSONReply("welcome"));
      expect(utils.createConversation).toBeCalledWith(
        expect.objectContaining({
          uuid: "bababooey",
          nickname: "andi",
          email: "andi@duro.me",
          connection: "testConnection",
          ip: "127.0.0.1"
        })
      );
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
      expect(result).toEqual(JSONReply("history", fakeMessages));
    });
    it("replies with an empty list for an unrecognized uuid", async () => {
      let result = await call({
        uuid: "bab",
        action: "list"
      });
      expect(result).toEqual(JSONReply("history", []));
    });
  });
  describe("send", () => {
    beforeEach(() => {
      utils.addMessageToConversation = jest.fn();
      utils.markUUIDUnread = jest.fn();
      utils.isUniqueRequest = jest.fn(() => true);
      utils.sendResponse = jest.fn(() => true);
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
      expect(results).toEqual([invalidReply, JSONReply("sent")]);
      expect(utils.markUUIDUnread).toBeCalledWith("baba", true);
    });
    it("returns if the request is a duplicate", async () => {
      utils.isUniqueRequest = jest.fn(() => false);
      let result = await call({
        uuid: "baba",
        action: "send",
        msg: "yeehaw"
      });
      expect(result).toEqual(JSONReply("duplicate"));
      expect(utils.addMessageToConversation).not.toBeCalled();
      expect(utils.sendResponse).not.toBeCalled();
    });
    it("adds uuid to unread list, adds message to conversation, attempts to send response to andi", async () => {
      let result = await call({
        uuid: "baba",
        action: "send",
        msg: "yeehaw"
      });
      expect(result).toEqual(JSONReply("sent"));
      expect(utils.addMessageToConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "baba",
          to: "andi",
          msg: "yeehaw"
        })
      );
      expect(utils.markUUIDUnread).toHaveBeenCalledWith("baba", true);
      expect(utils.sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ from: "baba", to: "andi", msg: "yeehaw", ws: expect.anything() })
      );
    });
  });
});
