// Encapsulates access to Facebook Messenger API
import * as request from "request";
import * as util from "util";
import {Links} from "./links";
import {log, trace} from "./logging";

// Message to be sent to send API
// See https://developers.facebook.com/docs/messenger-platform/reference/send-api
export interface ISendMessage {
    type: MessagingType;
    recipient: string;
    body: any;
}

// Possible types for a message sent to send API
// See https://developers.facebook.com/docs/messenger-platform/send-messages/#messaging_types
export enum MessagingType {
    Response = "RESPONSE",
    Update = "UPDATE",
    MessageTag = "MESSAGE_TAG",
}

// Send a message via the send api
export class Messenger {
    private pageAccessToken: string;
    private links: Links;

    constructor(pageAccessToken: string, links: Links) {
        this.pageAccessToken = pageAccessToken;
        this.links = links;
    }

    public sendWelcomeMessage(senderID: string) {
        trace("Messenger.sendWelcomeMessage");
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
                    "To change your area of interest, type 'interest'. " +
                    "To find out how to contribute new articles to our list, type 'contribute'.",
            },
        });
    }

    public sendReadyMessage(senderID: string) {
        trace("Messenger.sendReadyMessage");
        this.send({
            type: MessagingType.Response,
            recipient: senderID,
            body: {
                text: "Great, you're all set!",
            },
        });
    }

    public sendGenericErrorMessage(senderID: string) {
        trace("Messenger.sendGenericErrorMessage");
        this.send({
            type: MessagingType.Response,
            recipient: senderID,
            body: {text: "Sorry, something went wrong!"},
        });
    }

    public sendNoAttachmentsMessage(senderID: string) {
        trace("Messenger.sendNoAttachmentsMessage");
        this.send({
            type: MessagingType.Response,
            recipient: senderID,
            body: {text: "Sorry, we don't accept attachments!"},
        });
    }

    public sendResource(senderID: string, link: string) {
        trace("Messenger.sendResource");
        const articleLinkBody = {
            text: link,
        };
        this.send({
            type: MessagingType.Response,
            recipient: senderID,
            body: articleLinkBody,
        });
    }

    public sendNoResourceFoundMessage(senderID: string) {
        trace("Messenger.sendNoResourceFoundMessage");
        this.send({
            type: MessagingType.Response,
            recipient: senderID,
            body: {
                text: "Sorry, it looks like we don't have any resources for you right now. " +
                    "Please check back later!",
            },
        });
    }

    public sendContribMessage(senderID: string) {
        trace("Messenger.sendContribMessage");
        this.send({
            type: MessagingType.Response,
            recipient: senderID,
            body: {
                text: "For details on how to add new articles, " +
                    "please visit us on Github: https://github.com/frostyshadows/coding-for-all/blob/master/README.md",
            },
        });
    }

    public sendInvalidTypeMessage(senderID: string) {
        trace("Messenger.sendInvalidTypeMessage");
        this.send({
            type: MessagingType.Response,
            recipient: senderID,
            body: {
                text: "Sorry, that's not a valid resource type!",
            },
        });
    }

    public sendLevelRequest(senderID: string) {
        trace("Messenger.sendLevelRequest");
        const buttons = [];
        for (const level of this.links.levels) {
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
        trace("Messenger.sendInterestRequest");
        const quickReplies = [];
        for (const interest of this.links.interests) {
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
