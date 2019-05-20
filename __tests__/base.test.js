const utils = require("../utils");

const { call, calls, invalidReply } = lambda;
describe("base", () => {
  beforeAll(() => {
    let andiItem = {
      lastConnected: {
        N: 0
      }
    };
    utils.andiItem = jest.fn(async () => andiItem);
  });
  it("errors if you send nothing", async () => {
    expect(await call(null)).toEqual(invalidReply);
  });
  it("errors if you send gibberish", async () => {
    let r1 = await call("bababooey");
    let r2 = await call({ baba: "booey" });
    expect([r1, r2]).toEqual([invalidReply, invalidReply]);
  });
  it("requires an action and uuid key", async () => {
    let results = await calls([
      { uuid: "bababooey" },
      { action: "hello" },
      {
        uuid: "babaooey",
        action: "hello"
      }
    ]);
    expect(results).toEqual([invalidReply, invalidReply, utils.JSONReply("lastConnected", 0)]);
  });
  it("requires a password for uuid 'andi'", async () => {
    let results = await calls([
      {
        uuid: "andi",
        action: "hello"
      },
      {
        uuid: "andi",
        action: "hello",
        auth: "babaooey"
      },
      {
        uuid: "andi",
        action: "hello",
        auth: "password"
      }
    ]);
    expect(results).toEqual([invalidReply, invalidReply, utils.JSONReply("andiItem", andiItem)]);
  });
});
