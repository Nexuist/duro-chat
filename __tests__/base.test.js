const AWS = require("aws-sdk");
const base = require("../base");
const utils = require("../utils");

const { call, calls, invalidReply } = lambda;

const andiItem = {
  lastConnected: {
    N: 0
  }
};

// prevent any requests from hitting prod
beforeAll(() => {
  utils.DDB = new AWS.DynamoDB({
    apiVersion: "2012-10-08",
    region: "us-east-1",
    endpoint: "http://localhost:4569"
  });
});

describe("base", () => {
  beforeAll(() => {
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
  it("calls userHandler with the correct arguments", async () => {
    base.userHandler = jest.fn();
    let result = await call({
      uuid: "bababoeey",
      action: "hello"
    });
    // connection and ip are defined in setup.js
    expect(base.userHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.anything(),
        body: expect.anything(),
        uuid: "bababoeey",
        connection: "testConnection",
        ip: "127.0.0.1"
      })
    );
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
