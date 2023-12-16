import { IUser } from "./user.interface";
import { Config, getConfig } from "./config";
import { Users } from "./users";
import { WebSocketClient } from "./webSocketClient";

(async () => {
    try {
        const config = await getConfig();
        console.log("Configuration", config);

        const users = new Users(config);

        const user: IUser = {
            login: "admin@test.com",
            password: "Password123#",
            givenName: "Admin",
            familyName: "User"
        };
        await users.createUser(user);
        await users.addUserToRole(user.login, "Admin");


        let token = await users.getToken(user.login, user.password);
        console.log("Id token", token);
        await testWebSocket(config, token);
    } catch (error) {
        console.error("Error:", error);
    }
})();

async function testWebSocket(config: Config, token: string) {
    const webSocketUrl = `${config.wsApiUrl}?Authorization=${token}`;
    console.log("WebSocket URL", webSocketUrl);

    const ws = new WebSocketClient(webSocketUrl, token);
    await ws.connect();
    console.log("Getting message promise..");
    const messagePromise = ws.getMessage();
    console.log("Sending message...");
    await ws.sendMessage('{"action": "message", "data": "data-value"}');
    console.log("Waiting for response...");
    const response = await messagePromise;
    console.log("Response:", response);
    ws.close();
}

async function delay(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}
