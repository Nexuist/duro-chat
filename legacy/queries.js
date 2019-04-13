const AWS = require("aws-sdk");
const DDB = new AWS.DynamoDB({ apiVersion: "2012-10-08" });

let dynamo = async (action, params) => await DDB[action]({
    TableName: "DuroLiveChat",
    ...params
}).promise();

let andiKey = {
    uuid: { "S": "andi" },
    timestamp: { "N": "0" }
};

let storeMessage = async (event, body) => {
    let messageType = "to";
    if (body.action == "system") messageType = "system";
    await dynamo("putItem", {
        Item: {
            uuid: { "S": body.uuid },
            timestamp: { "N": `${+new Date()}` },
            msg: { "S": body.msg },
            nickname: { "S": body.nickname },
            email: { "S": body.email ? body.email : "none" },
            type: { "S": messageType },
            connection: { "S": event.requestContext.connectionId },
            ip: { "S": event.requestContext.identity.sourceIp }
        }
    });
};

let adminStoreMessage = async (toUUID, msg) => {
    await dynamo("putItem", {
        Item: {
            uuid: { "S": toUUID },
            timestamp: { "N": `${+new Date()}` },
            msg: { "S": msg },
            nickname: { "S": "andi" },
            email: { "S": "andi@duro.me" },
            type: { "S": "from" },
            connection: { "S": "admin" },
            ip: { "S": "admin" }
        }
    });
};

let getMessages = async (uuid) => {
    let result = await dynamo("query", {
        KeyConditionExpression: "#uuid = :uuid",
        ProjectionExpression: "msg, andi, #timestamp, #type, #nickname, #email, #connection",
        ExpressionAttributeNames: {
            "#uuid": "uuid",
            "#timestamp": "timestamp",
            "#type": "type",
            "#nickname": "nickname",
            "#email": "email",
            "#connection": "connection"
        },
        ExpressionAttributeValues: {
            ":uuid": { "S": uuid }
        }
    });
    if (result.Items.length == 0) return [];
    return result.Items.map(item => ({
        msg: item.msg.S,
        type: item.type.S,
        timestamp: item.timestamp.N,
        type: item.type.S,
        nickname: item.nickname.S,
        email: item.email.S,
        connection: item.connection.S
    }));
};

let storeUUID = async (body) => {
    await dynamo("updateItem", {
        Key: andiKey,
        UpdateExpression: "ADD conversations :uuid, unread :uuid",
        ExpressionAttributeValues: { ":uuid": { "SS": [body.uuid] } }
    });
};

let adminItem = async () => {
    return (await dynamo("getItem", {
        Key: andiKey
    })).Item;
};

let adminSetConnection = async (event) => {
    await dynamo("updateItem", {
        Key: andiKey,
        UpdateExpression: "SET #conn = :conn, lastConnected = :timestamp",
        ExpressionAttributeNames: { "#conn": "connection" },
        ExpressionAttributeValues: {
            ":conn": { "S": event.requestContext.connectionId },
            ":timestamp": { "N": `${+new Date()}` }
        }
    });
};

let adminMarkRead = async (forUUID) => {
    await dynamo("updateItem", {
        Key: andiKey,
        UpdateExpression: "DELETE unread :uuid",
        ExpressionAttributeValues: { ":uuid": { "SS": [forUUID] } }
    });
};

module.exports = { getMessages, storeUUID, storeMessage, adminStoreMessage, adminMarkRead, adminSetConnection, adminItem };