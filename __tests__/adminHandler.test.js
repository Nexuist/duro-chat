const utils = require("../utils");
const { JSONReply } = utils;

const { call, calls, invalidReply } = lambda;
const { DDC } = database;

let payload = {
  uuid: "andi",
  auth: "password"
};

// prevent any requests from hitting prod
beforeAll(() => {
  utils.DynamoDocumentClient = DDC;
});

describe("adminHandler", () => {
  describe("hello", () => {
    let andiItem = {
      admin: "item"
    };
    utils.andiItem = jest.fn(async () => andiItem);
    utils.updateConversation = jest.fn();
    it("replies with the admin item", async () => {
      let result = await call({
        ...payload,
        action: "hello"
      });
      expect(result).toEqual(JSONReply("andiItem", andiItem));
    });
    it("updates the andi conversation", async () => {
      let result = await call({
        ...payload,
        action: "hello"
      });
      expect(utils.updateConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          uuid: "andi",
          connection: "testConnection",
          ip: "127.0.0.1"
        })
      );
    });
  });
  describe("ping", () => {
    utils.updateConversation = jest.fn();
    it("updates the admin conversation", async () => {
      let result = await call({
        ...payload,
        action: "ping"
      });
      expect(utils.updateConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          uuid: "andi",
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
    let validPayload = {
      ...payload,
      action: "list",
      for: "bababooey"
    };
    utils.markUUIDUnread = jest.fn();
    it("requires a for argument, returns a conversation for a valid uuid and marks it read", async () => {
      let results = await calls([
        {
          ...payload,
          action: "list"
        },
        validPayload
      ]);
      expect(results).toEqual([utils.JSONError(), JSONReply("history", fakeMessages)]);
      expect(utils.markUUIDUnread).toHaveBeenCalledWith("bababooey", false);
    });
    it("returns an empty list for an unknown uuid", async () => {
      let result = await call({
        ...payload,
        action: "list",
        for: "baba"
      });
      expect(result).toEqual(JSONReply("history", []));
    });
  });
  describe("send", () => {
    const validPayload = {
      ...payload,
      action: "send",
      uuidTo: "bababooey",
      msg: "hello"
    };
    beforeEach(() => {
      utils.addMessageToConversation = jest.fn();
      utils.sendResponse = jest.fn(() => true);
      utils.isUniqueRequest = jest.fn(() => true);
    });
    it("requires a uuidTo and msg argument", async () => {
      let results = await calls([
        {
          ...payload,
          action: "send"
        },
        {
          ...payload,
          action: "send",
          uuidTo: "bababooey"
        },
        validPayload
      ]);
      expect(results).toEqual([invalidReply, invalidReply, JSONReply("sent")]);
    });
    it("returns if the request is a duplicate", async () => {
      utils.isUniqueRequest = jest.fn(() => false);
      let result = await call(validPayload);
      expect(result).toEqual(JSONReply("duplicate"));
      expect(utils.addMessageToConversation).not.toBeCalled();
      expect(utils.sendResponse).not.toBeCalled();
    });
    it("adds the message to the conversation", async () => {
      let result = await call(validPayload);
      expect(utils.addMessageToConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "andi",
          to: "bababooey",
          msg: "hello"
        })
      );
    });
    it("attempts to send response to recipient", async () => {
      let result = await call(validPayload);
      expect(utils.sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "andi",
          to: "bababooey",
          msg: "hello"
        })
      );
      expect(result).toEqual(JSONReply("sent"));
    });
  });
});
