const AWS = require("aws-sdk");
const utils = require("../utils");

const andiItem = {
  uuid: {
    S: "andi"
  },
  timestamp: {
    N: "0"
  },
  lastConnected: {
    N: "0"
  }
};

describe("test", () => {
  beforeAll(async () => {
    utils.DDB = new AWS.DynamoDB({
      apiVersion: "2012-10-08",
      region: "us-east-1",
      endpoint: "http://localhost:4569"
    });
    await utils.dynamo("deleteTable", {}); // Reset localstack
    await utils.dynamo("createTable", {
      KeySchema: [
        {
          AttributeName: "uuid",
          KeyType: "HASH"
        },
        {
          AttributeName: "timestamp",
          KeyType: "RANGE"
        }
      ],
      AttributeDefinitions: [
        {
          AttributeName: "uuid",
          AttributeType: "S"
        },
        {
          AttributeName: "timestamp",
          AttributeType: "N"
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      }
    });
    await utils.dynamo("putItem", {
      Item: andiItem
    });
  });
  it("returns andi", async () => {
    let result = await utils.andiItem();
    expect(result).toEqual(andiItem);
  });
});
