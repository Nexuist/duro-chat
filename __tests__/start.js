const AWS = require("aws-sdk");
const cp = require("child_process");

let dynamo = (module.exports.dynamo = new AWS.DynamoDB({
  region: "us-east-1",
  endpoint: new AWS.Endpoint("http://localhost:8000"),
  maxRetries: 1,
  httpOptions: {
    connectTimeout: 100
  }
}));

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = async () => {
  // There's probably a better way to do this...
  let opts = {
    stdio: ["ignore", "ignore", "ignore"]
  };
  cp.spawnSync("pkill", ["-f", "java -Djava.library.path=./dynamo/DynamoDBLocal_lib"], opts);
  let dynamoInstance = cp.spawn(
    "java",
    ["-Djava.library.path=./dynamo/DynamoDBLocal_lib", "-jar", "./dynamo/DynamoDBLocal.jar", "-sharedDb", "-inMemory"],
    opts
  );
  dynamoInstance.unref();
  await timeout(1500);
  await dynamo
    .createTable({
      TableName: "LandLords",
      AttributeDefinitions: [
        {
          AttributeName: "uuid",
          AttributeType: "S"
        }
      ],
      KeySchema: [
        {
          AttributeName: "uuid",
          KeyType: "HASH"
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 3,
        WriteCapacityUnits: 3
      }
    })
    .promise();
};
