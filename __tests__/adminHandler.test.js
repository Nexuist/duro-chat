const utils = require("../utils");

const { call, calls, invalidReply } = lambda;

let payload = {
  uuid: "andi",
  auth: "password"
};

describe("adminHandler", () => {
  beforeAll(() => {
    utils.dynamo = jest.fn(); // prevent any real database use
  });
  describe("hello", () => {
    let andiItem = {
      admin: "item"
    };
    utils.andiItem = jest.fn(async () => andiItem);
    utils.updateLastConnectedTime = jest.fn();
    it("replies with the admin item", async () => {
      let result = await call({
        ...payload,
        action: "hello"
      });
      expect(result).toBe(utils.JSONReply("andiItem", andiItem));
    });
    it("sets the last connected time", async () => {
      let result = await call({
        ...payload,
        action: "hello"
      });
      expect(utils.updateLastConnectedTime).toHaveBeenCalled();
    });
  });
  describe("ping", () => {
    utils.updateLastConnectedTime = jest.fn();
    it("sets the last connected time", async () => {
      let result = await call({
        ...payload,
        action: "ping"
      });
      expect(utils.updateLastConnectedTime).toHaveBeenCalled();
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
    utils.markRead = jest.fn();
    it("requires a for argument, returns a conversation for a valid uuid and marks it read", async () => {
      let results = await calls(
        {
          ...payload,
          action: "list"
        },
        validPayload
      );
      expect(results).toEqual([utils.JSONError(), utils.JSONReply("history", fakeMessages)]);
      expect(utils.markRead).toHaveBeenCalledWith("bababooey");
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
  // describe("send", () => {
  // 	it("adds the message to the conversation", () => {
  // 		// pass
  // 	});
  // 	it("attempts to send response to recipient", () => {
  // 		// pass
  // 	});
  // });
});

//   describe("send", () => {
//     it("requires a message payload", async () => {
//       utils.addMessageToConversation = jest.fn();
//       utils.sendResponseToAndi = jest.fn(() => true);
//       let results = await calls([
//         {
//           uuid: "baba",
//           action: "send"
//         },
//         {
//           uuid: "baba",
//           action: "send",
//           msg: "yeehaw"
//         }
//       ]);
//       expect(results).toEqual([invalidReply, utils.JSONReply("sent")]);
//     });
//     it("adds uuid to unread list, adds message to conversation, attempts to send response to andi", async () => {
//       utils.addMessageToConversation = jest.fn();
//       utils.sendResponseToAndi = jest.fn(() => true);
//       let result = await call({
//         uuid: "baba",
//         action: "send",
//         msg: "yeehaw"
//       });
//       expect(result).toEqual(utils.JSONReply("sent"));
//       expect(utils.addMessageToConversation).toHaveBeenCalledTimes(1);
//       expect(utils.sendResponseToAndi).toHaveBeenCalledTimes(1);
//     });
//   });
