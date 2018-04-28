// Import dependencies
import * as bodyParser from "body-parser";
import * as debug from "debug";
import * as express from "express";
import * as helmet from "helmet";
import * as request from "request";
import * as sqlite3 from "sqlite3";
import * as fs from 'fs';
import {isNull, isNullOrUndefined} from "util";

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

// set up sqlite
// TODO: use file for persistent db
sqlite3.verbose();
const db = new sqlite3.Database(":memory:");

const links: ILink[] = JSON.parse(fs.readFileSync('links.json').toString());

db.serialize(function () {
    db.run("CREATE TABLE users (" +
        "senderID TEXT," +
        "ExpLevel TEXT," +
        "Interests TEXT)");
});

db.serialize(function () {
    db.run("CREATE TABLE articles (" +
        "interest TEXT," +
        "url TEXT," +
        "length TEXT)");
});

// db.close();

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
    if (message.text) {
        db.serialize(function () {
            // check if user is already in db
            db.get("SELECT * FROM users WHERE senderID = " + senderID, function (err, row) {
                log("result of SELECT in handleMessage: " + JSON.stringify(row));
                if (row !== undefined) {
                    // if senderID already exists in database
                    existingUserMessage(senderID, row.ExpLevel, row.Interests, message);

                } else {
                    // if senderID doesn't already exist in the database, welcome user to Coding For Everyone
                    newUserMessage(senderID, message);
                }
            });
        });

    } else {
        send({
            type: MessagingType.Response,
            recipient: senderID,
            body: {text: "Sorry, we don't accept attachments!"},
        });
    }
}

function existingUserMessage(senderID: PSID, expLevel: ExpLevel, interest: Interest, message: any) {
    switch (message.text.toLowerCase()) {
        case "tutorial":
            // TODO: send tutorial
            break;
        case "article": {
            // options should be the user's level and interest, and the article type that they requested
            const options: IOptions = {
                "level": expLevel,
                "interest": interest,
                "type": "art"
            };
            log("user's options: " + JSON.stringify(options));
            for (let link of links) {
                if (link.options === options) {
                    // TODO: pick random link rather than send first one that fits criteria
                    const articleLinkBody = {
                        "type":"web_url",
                        "url":link.link,
                        "title":link.title,
                        "messenger_extensions": "false",
                    }
                    log("sending article");
                    send({
                        type: MessagingType.Response,
                        recipient: senderID,
                        body: articleLinkBody,
                    });
                }
                break;
            }
        }
        case "video":
            // TODO: send video
            break;
        default:
            helpMessage(senderID);
    }
}

function newUserMessage(senderID: PSID, message: any) {
    send({
        type: MessagingType.Response,
        recipient: senderID,
        body: {
            text: "Hello, welcome to Coding For Everyone! " +
            "Whether you're a beginner or a professional programmer, " +
            "want to go through a whole MOOC or read a 5 minute article, " +
            "we have something for you. First, we'd like to know little bit about you.",
        },
    });
    const experienceBody = {
        attachment: {
            type: "template",
            payload: {
                template_type: "generic",
                elements: [{
                    title: "How much programming experience do you have?",
                    subtitle: "Tap a button to answer.",
                    buttons: [
                        {
                            type: "postback",
                            title: "None",
                            payload: "exp_none",
                        },
                        {
                            type: "postback",
                            title: "Some",
                            payload: "exp_some",
                        },
                        {
                            type: "postback",
                            title: "Lots",
                            payload: "exp_lots",
                        },
                    ],
                }],
            },
        },
    };
    send({
        type: MessagingType.Response,
        recipient: senderID,
        body: experienceBody,
    });
}

// Handles postback events
function handlePostback(senderID: PSID, postback: any) {
    trace("handlePostback");
    const payload: string = postback.payload;
    const type: string = payload.split("_")[0];
    const value: string = payload.split("_")[1];
    if (isNullOrUndefined(type) || isNullOrUndefined(value)) {
        send({
            type: MessagingType.Response,
            recipient: senderID,
            body: {text: "Sorry, something went wrong!"},
        });
    } else {
        switch (type) {
            case "exp":
                handleExpPostback(senderID, value);
                break;
            case "interest":
                handleInterestPostback(senderID, value);
        }
    }
}

function handleExpPostback(senderID: PSID, expLevel: string) {
    trace("handleExpPostback");
    // save sender and their experience level to users table
    db.run("INSERT INTO users VALUES (?,?,?)", senderID, expLevel, "");

    // ask about area of interest
    const interestBody = {
        attachment: {
            type: "template",
            payload: {
                template_type: "generic",
                elements: [{
                    title: "Android",
                    buttons: [
                        {
                            type: "postback",
                            title: "Select",
                            payload: "interest_android",
                        },
                    ],
                },
                    {
                        title: "iOS",
                        buttons: [
                            {
                                type: "postback",
                                title: "Select",
                                payload: "interest_iOS",
                            },
                        ],
                    },
                ],
            },
        },
    };

    send({
        type: MessagingType.Response,
        recipient: senderID,
        body: interestBody,
    });
}

function handleInterestPostback(senderID: PSID, interestType: string) {
    trace("handleInterestPostback");
    // update users table with interest
    db.run("UPDATE users SET Interests = ? WHERE senderID = ?", interestType, senderID );
    send({
        type: MessagingType.Response,
        recipient: senderID,
        body: {
            text: "Great, you're all set!",
        },
    });
    helpMessage(senderID);
}

function helpMessage(senderID: PSID) {
    send({
        type: MessagingType.Response,
        recipient: senderID,
        body: {
            text: "Please type 'tutorial' for a tutorial recommendation, " +
            "'article' for an article recommentation, " +
            "or 'video' if you would like a video. " +
            "If you would like to change your experience level, please type 'experience'." +
            "To change your area of interest, type 'interest'.",
        },
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

interface ILink {
    link: String;
    title: String;
    options: IOptions
}

// Possible types for a message sent to send api
// See https://developers.facebook.com/docs/messenger-platform/send-messages/#messaging_types
enum MessagingType {
    Response = "RESPONSE",
    Update = "UPDATE",
    MessageTag = "MESSAGE_TAG",
}

interface IOptions {
    level: ExpLevel;
    interest: Interest;
    type: ArticleType;
}

enum ExpLevel {
    None = "none",
    Some = "some",
    Lots = "lots",
}

enum Interest {
    Android = "android",
    iOS = "ios",
}

enum ArticleType {
    Tutorials = "tut",
    Articles = "art",
    Videos = "vid",
}
