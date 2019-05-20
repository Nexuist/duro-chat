const utils = require("../utils");

const { call, calls, invalidReply } = lambda;

describe("adminHandler", () => {
  beforeAll(() => {
		utils.dynamo = jest.fn(); // prevent any real database use
  });
  describe("hello", () => {
		it("replies with the admin item", async () => {
			// pass
		});
		it("sets the last connected time", async () => {
			// pass
		});
  });
  describe("ping", () => {
		it("sets the last connected time", async () => {
			// pass
		});
  });
  describe("list", () => {
		it("requires a for argument", async () => {
		// pass
		});
		it("returns a conversation for a valid uuid", async () => {
		// pass
		});
		it("returns an empty list for an unknown uuid", async () => {
		// pass
		});
  });
	describe("send", () => {
		it("adds the message to the conversation", () => {
			// pass
		});
		it("attempts to send response to recipient", () => {
			// pass
		});
	});
});

  //   describe("hello", () => {
  //     it("replies with the last connected time", async () => {
  //       utils.andiItem = jest.fn(async () => {
  //         return {
  //           lastConnected: {
  //             N: 0
  //           }
  //         };
  //       });
  //       let result = await call({
  //         uuid: "bababooey",
  //         action: "hello"
  //       });
  //       expect(result).toEqual(utils.JSONReply("lastConnected", 0));
  //     });
  //   });
  //   describe("register", () => {
  //     utils.createConversation = jest.fn();
  //     let validPayload = {
  //       uuid: "bababooey",
  //       action: "register",
  //       nickname: "andi",
  //       email: "andi@duro.me"
  //     };
  //     it("requires a nickname and email payload", async () => {
  //       let results = await calls([
  //         {
  //           uuid: "bababooey",
  //           action: "register",
  //           nickname: "andi"
  //         },
  //         {
  //           uuid: "bababooey",
  //           action: "register",
  //           email: "andi"
  //         },
  //         validPayload
  //       ]);
  //       expect(results).toEqual([invalidReply, invalidReply, utils.JSONReply("welcome")]);
  //     });
  //     it("creates a conversation for the new uuid", async () => {
  //       let result = await call(validPayload);
  //       expect(result).toEqual(utils.JSONReply("welcome"));
  //       expect(utils.createConversation).toBeCalledWith("bababooey", "andi", "andi@duro.me");
  //     });
  //   });
  //   describe("list", () => {
  //     let fakeMessages = [
  //       {
  //         msg: "baba!",
  //         sender: "user",
  //         timestamp: +new Date(),
  //         connection: "baba!"
  //       },
  //       {
  //         msg: "booey",
  //         sender: "andi",
  //         timestamp: +new Date(),
  //         connection: "booey!"
  //       }
  //     ];
  //     utils.getAllMessagesWith = jest.fn(async uuid => {
  //       if (uuid == "bababooey") {
  //         return fakeMessages;
  //       } else {
  //         return [];
  //       }
  //     });
  //     it("replies with a list of messages for a recognized uuid", async () => {
  //       let result = await call({
  //         uuid: "bababooey",
  //         action: "list"
  //       });
  //       expect(result).toEqual(utils.JSONReply("history", fakeMessages));
  //     });
  //     it("replies with an empty list for an unrecognized uuid", async () => {
  //       let result = await call({
  //         uuid: "bab",
  //         action: "list"
  //       });
  //       expect(result).toEqual(utils.JSONReply("history", []));
  //     });
  //   });
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
});
