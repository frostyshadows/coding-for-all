// Import dependencies
import * as bodyParser from "body-parser";
import * as debug from "debug";
import * as express from "express";
import * as helmet from "helmet";
import * as request from "request";
import * as sqlite3 from "sqlite3";
import * as fs from "fs";
import {isNull, isNullOrUndefined} from "util";
import {compareLinks} from "./helpers";


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

const links: ILink[] = JSON.parse(fs.readFileSync("links.json").toString());
// sort links
// organized by interest, then level, then type
links.sort(compareLinks);

db.serialize(function () {
    db.run("CREATE TABLE users (" +
        "senderID TEXT," +
        "ExpLevel TEXT," +
        "Interests TEXT)");
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
        log("message text in handleMessage: " + message.text);
        db.serialize(function () {
            // check if user is already in db
            db.get("SELECT * FROM users WHERE senderID = " + senderID, function (err, row) {
                log("result of SELECT in handleMessage: " + JSON.stringify(row));
                if (row !== undefined) {
                    // if senderID already exists in database
                    // check if it's a quick_reply containing the user's interest
                    if (message.quick_reply && message.quick_reply.payload.split("_")[0] === "interest") {
                        handleInterestMessage(senderID, message.quick_reply.payload.split("_")[1]);
                    } else {
                        sendExistingUserMessage(senderID, row.ExpLevel, row.Interests, message);
                    }
                } else {
                    // if senderID doesn't already exist in the database, welcome user to Coding For Everyone
                    sendNewUserMessage(senderID, message);
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

function sendExistingUserMessage(senderID: PSID, expLevel: ExpLevel, interest: Interest, message: any) {
    trace("sendExistingUserMessage");

    // let user select a different experience level
    if (message.text === "experience") {
        askExperience(senderID);
        return;
    }

    // let user select a different field of interest
    if (message.text === "interest") {
        askInterest(senderID);
        return;
    }

    const options: IOptions = {
        level: expLevel,
        interest,
        type: message.text.toLowerCase(),
    };
    log("User options: " + JSON.stringify(options));
    // find a link that matches their profile and requested article type
    for (const link of links) {
        if (link.options.interest === interest &&
            link.options.level === expLevel &&
            link.options.type === message.text.toLowerCase()) {
            // TODO: pick random link rather than send first one that fits criteria
            const articleLinkBody = {
                text: link.link,
            };
            send({
                type: MessagingType.Response,
                recipient: senderID,
                body: articleLinkBody,
            });
            return;
        }
    }
    sendHelpMessage(senderID);
}

function generateRandomLink(interest: String, expLevel: String, type: String) {
    let max = 0;
    let min = links.length - 1;

    let randomIndex = Math.floor(Math.random() * (max - min + 1) + min);
    let currentLink = links[randomIndex];

    while (currentLink.options.interest !== interest || currentLink.options.level !== expLevel || currentLink.options.type !== type) {
        randomIndex = Math.floor(Math.random() * (max - min + 1) + min);
        currentLink = links[randomIndex];
        if (currentLink.options.interest < interest) {
            min = randomIndex + 1;
        } else if (currentLink.options.interest > interest) {
            max = randomIndex - 1;
        } else {
            if (currentLink.options.level < expLevel) {
                min = randomIndex + 1;
            } else if (currentLink.options.level < expLevel) {
                max = randomIndex - 1;
            } else {
                if (currentLink.options.type < type) {
                    min = randomIndex + 1;
                } else {
                    max = randomIndex - 1;
                }
            }
        }
    }
    return currentLink;

}

// explain what Coding For Everyone is, then ask user for their experience level
function sendNewUserMessage(senderID: PSID, message: any) {
    trace("sendNewUserMessage");
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
    // TODO: might make more sense to ask field of interest first?
    askExperience(senderID);
}
// ask user what their experience level is
function askExperience(senderID: PSID) {
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
        }
    }
}

function handleExpPostback(senderID: PSID, expLevel: string) {
    trace("handleExpPostback");
    db.run("INSERT INTO users VALUES (?,?,?)", senderID, expLevel, "");
    askInterest(senderID);
}

// ask user what their field of interest in Computer Science is
function askInterest(senderID: PSID) {
    const interestBody = {
        text: "Which field of Computer Science would you like to learn more about?",
        quick_replies: [
            {
                content_type: "text",
                title: "Android",
                payload: "interest_android",
            },
            {
                content_type: "text",
                title: "iOS",
                payload: "interest_ios",
            },
            {
                content_type: "text",
                title: "web dev",
                payload: "interest_web",
            },
            {
                content_type: "text",
                title: "AI/ML",
                payload: "interest_ai-ml",
            },
            {
                content_type: "text",
                title: "graphics",
                payload: "interest_graphics",
            },
            {
                content_type: "text",
                title: "security",
                payload: "interest_security",
            },
            {
                content_type: "text",
                title: "UI/UX/HCI",
                payload: "interest_ui-ux-hci",
            },
            {
                content_type: "text",
                title: "databases",
                payload: "interest_databases",
            },
            {
                content_type: "text",
                title: "programming languages",
                payload: "interest_programming-languages",
            },
            {
                content_type: "text",
                title: "networking",
                payload: "interest_networking",
            },
            {
                content_type: "text",
                title: "theory",
                payload: "interest_theory",
            },
        ],
    };
    send({
        type: MessagingType.Response,
        recipient: senderID,
        body: interestBody,
    });
}

function handleInterestMessage(senderID: PSID, interestType: string) {
    trace("handleInterestMessage");
    db.run("UPDATE users SET Interests = ? WHERE senderID = ?", interestType, senderID);
    send({
        type: MessagingType.Response,
        recipient: senderID,
        body: {
            text: "Great, you're all set!",
        },
    });
    sendHelpMessage(senderID);
}

function sendHelpMessage(senderID: PSID) {
    trace("sendHelpMessage");
    send({
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

export interface ILink {
    link: string;
    title: string;
    options: IOptions;
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
    web = "web",
    ai_ml = "ai-ml",
    graphics = "graphics",
    security = "security",
    ui_ux_hci = "ui-ux-hci",
    databases = "databases",
    programming_languages = "programming-languages",
    networking = "networking",
    theory = "theory",
}

enum ArticleType {
    Tutorials = "tutorial",
    Articles = "article",
    Videos = "video",
}
