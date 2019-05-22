const AWS = require("aws-sdk");
const utils = require("../utils");

const { call, calls, invalidReply } = lambda;

let payload = {
  uuid: "andi",
  auth: "password"
};

// prevent any requests from hitting prod
beforeAll(() => {
  utils.DDB = new AWS.DynamoDB({
    apiVersion: "2012-10-08",
    region: "us-east-1",
    endpoint: "http://localhost:4569"
  });
});

describe("adminHandler", () => {
  beforeAll(() => {
    utils.dynamo = jest.fn(); // prevent any real database use
  });
  describe("hello", () => {
    let andiItem = {
      admin: "item"
    };
    utils.andiItem = jest.fn(async () => andiItem);
    utils.updateAdminMetadata = jest.fn();
    it("replies with the admin item", async () => {
      let result = await call({
        ...payload,
        action: "hello"
      });
      expect(result).toEqual(utils.JSONReply("andiItem", andiItem));
    });
    it("sets the admin metadata", async () => {
      let result = await call({
        ...payload,
        action: "hello"
      });
      expect(utils.updateAdminMetadata).toHaveBeenCalledWith("testConnection");
    });
  });
  describe("ping", () => {
    utils.updateAdminMetadata = jest.fn();
    it("sets the admin metadata", async () => {
      let result = await call({
        ...payload,
        action: "ping"
      });
      expect(utils.updateAdminMetadata).toHaveBeenCalledWith("testConnection");
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
    utils.markUUID = jest.fn();
    it("requires a for argument, returns a conversation for a valid uuid and marks it read", async () => {
      let results = await calls([
        {
          ...payload,
          action: "list"
        },
        validPayload
      ]);
      expect(results).toEqual([utils.JSONError(), utils.JSONReply("history", fakeMessages)]);
      expect(utils.markUUID).toHaveBeenCalledWith("bababooey", true);
    });
    it("returns an empty list for an unknown uuid", async () => {
      let result = await call({
        ...payload,
        action: "list",
        for: "baba"
      });
      expect(result).toEqual(utils.JSONReply("history", []));
    });
  });
  describe("send", () => {
    utils.addMessageToConversation = jest.fn();
    utils.sendResponseTo = jest.fn(() => true);
    let validPayload = {
      ...payload,
      action: "send",
      uuidTo: "bababooey",
      connectionTo: "bababooeyConnection",
      msg: "hello"
    };
    it("requires a uuidTo, msg, connectionTo argument", async () => {
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
        {
          ...payload,
          action: "send",
          connectionTo: "wrongTestConnection"
        },
        validPayload
      ]);
      expect(results).toEqual([invalidReply, invalidReply, invalidReply, utils.JSONReply("sent")]);
    });
    it("adds the message to the conversation", async () => {
      let result = await call(validPayload);
      expect(utils.addMessageToConversation).toHaveBeenCalledWith("andi", "bababooey", "hello");
    });
    it("attempts to send response to recipient", async () => {
      let result = await call(validPayload);
      expect(utils.sendResponseTo).toHaveBeenCalledWith("bababooeyConnection", "hello", expect.anything(), "bababooey");
      expect(result).toEqual(utils.JSONReply("sent"));
    });
  });
});
