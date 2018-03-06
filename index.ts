// Import dependencies
import * as bodyParser from "body-parser";
import * as debug from "debug";
import * as express from "express";
import * as helmet from "helmet";
import * as request from "request";
import {isNullOrUndefined} from "util";

// Create Express HTTP server
const app: express.Application = express().use(bodyParser.json()).use(helmet());

// Setup logging
const log = debug("codingforall::debug");
const trace = debug("codingforall::trace");

// Get page access token from environment variable
const pageAccessToken: string | undefined = process.env.PAGE_ACCESS_TOKEN;
if (isNullOrUndefined(pageAccessToken)) {
    log("Missing page access token in env vars");
    process.exit(1);
}

// Set server port
app.listen(process.env.PORT || 1337, () => log("Webhook is listening"));

// Create POST endpoint for webhook
app.post("/webhook", (req, res) => {
    trace("Post request handled");
    const body = req.body;
    // Checks if this is an event from a page subscription
    if (body.object === "page") {
        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function (entry: any) {
            // Gets the message. entry.messaging is an array, but
            // will only ever contain one message, so we get index 0
            const webhookEvent = entry.messaging[0];
            log(webhookEvent.toString());

            // Get the sender PSID
            const senderID: string = webhookEvent.sender.id;
            // Route event to appropriate handler
            if (webhookEvent.message) {
                handleMessage(senderID, webhookEvent.message);
            } else if (webhookEvent.postback) {
                handlePostback(senderID, webhookEvent.postback);
            }
        });

        // Returns a '200 OK' response to all requests
        res.status(200).send("EVENT_RECEIVED");
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }

});

// Create GET endpoint for webhook
app.get("/webhook", (req, res) => {
    trace("Get request handled");
    // Your verify token. Should be a random string.
    const VERIFY_TOKEN = "hi_russell";

    // Parse the query params
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
        // Checks the mode and token sent is correct
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            // Responds with the challenge token from the request
            log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(403);
    }
});

// Handles message events
function handleMessage(senderID: PSID, message: any) {
    trace("handleMessage");
    let responseBody = {};
    if (message.text) {
        responseBody = { text: "You sent the message: " + message.text + ". Now send me an image!" };
    } else if (message.attachments) {
        const attachmentUrl: string = message.attachments[0].payload.url;
        responseBody = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: "Is this the right picture?",
                        subtitle: "Tap a button to answer.",
                        image_url: attachmentUrl,
                        buttons: [
                            {
                                type: "postback",
                                title: "Yes!",
                                payload: "yes",
                            },
                            {
                                type: "postback",
                                title: "No!",
                                payload: "no",
                            },
                        ],
                    }],
                },
            },
        };
    } else {
        responseBody = { text: "Message had no text." };
    }

    send({
        type: MessagingType.Response,
        recipient: senderID,
        body: responseBody,
    });
}

// Handles postback events
function handlePostback(senderID: PSID, postback: any) {
    trace("handlePostback");
    const payload = postback.payload;
    let responseBody = {};
    if (payload === "yes") {
        responseBody = { text: "Thanks!" };
    } else if (payload === "no") {
       responseBody = { text: "Oops, try sending another image." };
    }
    send({
        type: MessagingType.Response,
        recipient: senderID,
        body: responseBody,
    });
}

// Send a message via the send api
function send(message: ISendMessage) {
    trace("send");
    request({
        uri: "https://graph.facebook.com/v2.6/me/messages",
        qs: {access_token: pageAccessToken},
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

type PSID = string;

// Message to be sent to send api
// See https://developers.facebook.com/docs/messenger-platform/reference/send-api
interface ISendMessage {
    type: MessagingType;
    recipient: PSID;
    // TODO make this type safe somehow
    body: any;
}

// Possible types for a message sent to send api
// See https://developers.facebook.com/docs/messenger-platform/send-messages/#messaging_types
enum MessagingType {
    Response = "RESPONSE",
    Update = "UPDATE",
    MessageTag = "MESSAGE_TAG",
}
