import { Config } from "./config";
import { WebSocket } from "ws";

export class WebSocketClient {
    private readonly ws: WebSocket;

    constructor(url: string, token: string) {
        this.ws = new WebSocket(url);
        this.ws.onclose = () => {
            console.log('Disconnected from the server');
        };
    }

    connect(): Promise<void> {
        const me = this;
        return new Promise<void>((resolve, reject) => {
            me.ws.onopen = () => {
                console.log('Connected to the server');
                resolve();
            }

            me.ws.onerror = (err) => {
                console.error('WebSocket error:', err.error);
                console.error('WebSocket error:', err.message);
                reject();
            }
          });
    }

    getMessage(): Promise<void> {
        const me = this;
        return new Promise<void>((resolve, reject) => {
            me.ws.onmessage = (data) => {
                console.log('Received message');
                console.log(data.data);
                resolve();
            }

            me.ws.onerror = (err) => {
                console.error('WebSocket error:', err.error);
                console.error('WebSocket error:', err.message);
                reject();
            }
          });
    }

    close() {
        this.ws.close();
    }
}