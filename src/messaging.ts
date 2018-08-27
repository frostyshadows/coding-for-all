// Encapsulates access to Facebook Messenger API
import {trace, log} from "./logging";
import * as request from "request";

// Message to be sent to send api
// See https://developers.facebook.com/docs/messenger-platform/reference/send-api
export interface ISendMessage {
    type: MessagingType;
    recipient: string;
    // TODO make this type safe somehow
    body: any;
}

// Possible types for a message sent to send api
// See https://developers.facebook.com/docs/messenger-platform/send-messages/#messaging_types
export enum MessagingType {
    Response = "RESPONSE",
    Update = "UPDATE",
    MessageTag = "MESSAGE_TAG",
}

// Send a message via the send api
export class Messenger {
    private pageAccessToken: string;

    constructor(pageAccessToken: string) {
        this.pageAccessToken = pageAccessToken;
    }

    public send(message: ISendMessage) {
        trace("Messenger.send");
        request({
            uri: "https://graph.facebook.com/v2.6/me/messages",
            qs: {access_token: this.pageAccessToken},
            method: "POST",
            json: {
                messaging_type: message.type,
                recipient: {id: message.recipient},
                message: message.body,
            },
        }, (err, res, body) => {
            if (err) {
                log("Unable to send message: " + err);
            } else {
                log("Message sent successfully");
            }
        });
    }
}
