// Encapsulates access to Facebook Messenger API
import * as request from "request";
import * as util from "util";
import {interests, levels} from "./links";
import {log, trace} from "./logging";

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

    public sendWelcomeMessage(senderID: string) {
        this.send({
            type: MessagingType.Response,
            recipient: senderID,
            body: {
                text: "Hello, welcome to Coding For Everyone! " +
                    "Whether you're a beginner or a professional programmer, " +
                    "want to go through a whole MOOC or read a 5 minute article, " +
                    "we have something for you. First, we'd like to know little bit about you.",
            },
        });
    }

    public sendHelpMessage(senderID: string) {
        trace("Messenger.sendHelpMessage");
        this.send({
            type: MessagingType.Response,
            recipient: senderID,
            body: {
                text: "Please type 'tutorial' for a tutorial recommendation, " +
                    "'article' for an article recommendation, " +
                    "or 'video' if you would like a video. " +
                    "If you would like to change your experience level, please type 'experience'. " +
                    "To change your area of interest, type 'interest'.",
            },
        });
    }

    public sendReadyMessage(senderID: string) {
        this.send({
            type: MessagingType.Response,
            recipient: senderID,
            body: {
                text: "Great, you're all set!",
            },
        });
    }

    public sendGenericErrorMessage(senderID: string) {
        this.send({
            type: MessagingType.Response,
            recipient: senderID,
            body: {text: "Sorry, something went wrong!"},
        });
    }

    public sendNoAttachmentsMessage(senderID: string) {
        this.send({
            type: MessagingType.Response,
            recipient: senderID,
            body: {text: "Sorry, we don't accept attachments!"},
        });
    }

    public sendResource(senderID: string, link: string) {
        const articleLinkBody = {
            text: link,
        };
        this.send({
            type: MessagingType.Response,
            recipient: senderID,
            body: articleLinkBody,
        });
    }

    public sendLevelRequest(senderID: string) {
        const buttons = [];
        for (const level of levels) {
            buttons.push({
                type: "postback",
                title: level.title,
                payload: util.format("exp_%s", level.value),
            });
        }
        const experienceBody = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: "How much programming experience do you have?",
                        subtitle: "Tap a button to answer.",
                        buttons,
                    }],
                },
            },
        };
        this.send({
            type: MessagingType.Response,
            recipient: senderID,
            body: experienceBody,
        });
    }

    public sendInterestRequest(senderID: string) {
        const quickReplies = [];
        for (const interest of interests) {
            quickReplies.push({
                content_type: "text",
                title: interest.title,
                payload: util.format("interest_%s", interest.value),
            });
        }
        const interestBody = {
            text: "Which field of Computer Science would you like to learn more about?",
            quick_replies: quickReplies,
        };
        this.send({
            type: MessagingType.Response,
            recipient: senderID,
            body: interestBody,
        });
    }

    private send(message: ISendMessage) {
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
