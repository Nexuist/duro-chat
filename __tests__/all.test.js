let handler;

beforeAll(() => {
  process.env = Object.assign(process.env, {
    PASSWORD: "password"
  });
  handler = require("../index").handler;
});

let call = async json =>
  await handler({
    requestContext: {
      domainName: "58yojgvxyi.execute-api.us-east-1.amazonaws.com",
      stage: "dev"
    },
    body: JSON.stringify(json)
  });

let calls = async inputs => {
  let results = [];
  for (input of inputs) {
    results.push(await call(input));
  }
  return results;
};

let resReply = (type, result, code = 200) => ({
  statusCode: code,
  body: JSON.stringify({
    type,
    result
  })
});

let invalidReply = resReply("error", "invalid", 400);

describe("baseHandler", () => {
  it("errors if you send nothing", async () => {
    expect(await handler(null)).toEqual(invalidReply);
  });
  it("errors if you send gibberish", async () => {
    let r1 = await handler("bababooey");
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
    expect(results).toEqual([invalidReply, invalidReply, resReply("user", "hello")]);
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
    expect(results).toEqual([invalidReply, invalidReply, resReply("admin", "hello")]);
  });
});

// go through legacy code & figure out what to test for
describe("userHandler", () => {});

describe("adminHandler", () => {});
