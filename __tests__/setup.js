const utils = require("../utils");
let handler = require("../base").handler;

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

let invalidReply = utils.JSONError();

global.lambda = {
  handler,
  call,
  calls,
  invalidReply
};
