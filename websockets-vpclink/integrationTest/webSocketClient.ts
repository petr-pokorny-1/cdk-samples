import { Config } from "./config";
import {Data, WebSocket} from "ws";

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

    getMessage(): Promise<Data> {
        const me = this;
        return new Promise<Data>((resolve, reject) => {
            me.ws.onmessage = (event) => {
                console.log('Received message');
                console.log(event.data);
                resolve(event.data);
            }

            me.ws.onerror = (err) => {
                console.error('WebSocket error:', err.error);
                console.error('WebSocket error:', err.message);
                reject();
            }
          });
    }

    sendMessage(data: string): Promise<void> {
        const me = this;
        return new Promise<void>((resolve, reject) => {
            me.ws.send (data, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve()
                }
            });
        });
    }

    close() {
        this.ws.close();
    }
}