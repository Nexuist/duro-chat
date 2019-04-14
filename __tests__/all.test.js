const handler = require("../index").handler;

let empty = async () => {
  expect(2).toBe(3);
};

describe("baseHandler", () => {
  it("errors if you send nothing", empty);
  it("errors if you send gibberish", empty);
  it("correctly identifies an admin", empty);
  it("prevents anyone from being an admin unless they specify the password", empty);
});

// go through legacy code & figure out what to test for
describe("userHandler", () => {});

describe("adminHandler", () => {});
