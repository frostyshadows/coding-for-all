// Import dependencies
import * as bodyParser from "body-parser";
import * as express from "express";
import * as helmet from "helmet";
import {isNullOrUndefined} from "util";
import {Database} from "./database";
import {compareLinks, generateRandomLink, ILink, IOptions, links} from "./links";
import {log, trace} from "./logging";
import {Messenger} from "./messaging";

const pageAccessToken: string | undefined = process.env.PAGE_ACCESS_TOKEN;
if (isNullOrUndefined(pageAccessToken)) {
    log("Missing page access token in env vars");
    process.exit(1);
}

const app = express().use(bodyParser.json()).use(helmet());
const db = new Database();
const messenger = new Messenger(pageAccessToken as string);

let askedInterest = false;

// organized by interest, then level, then type
links.sort(compareLinks);
log(JSON.stringify(links));

// Set server port
app.listen(process.env.PORT || 1337, () => log("Webhook is listening"));

// Create POST endpoint for webhook
app.post("/webhook", (req, res) => {
    trace("Post request handled");
    const body = req.body;
    if (body.object === "page") {
        body.entry.forEach((entry: any) => {
            // Gets the message. entry.messaging is an array, but
            // will only ever contain one message, so we get index 0
            const webhookEvent = entry.messaging[0];
            log(webhookEvent.toString());

            const senderID: string = webhookEvent.sender.id;
            if (webhookEvent.message) {
                handleMessage(senderID, webhookEvent.message);
            } else if (webhookEvent.postback) {
                handlePostback(senderID, webhookEvent.postback);
            }
        });
        res.status(200).send("EVENT_RECEIVED");
    } else {
        res.sendStatus(404);
    }

});

// Create GET endpoint for webhook
app.get("/webhook", (req, res) => {
    trace("Get request handled");
    const VERIFY_TOKEN = "hi_russell";

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
        log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Handles message events
function handleMessage(senderID: string, message: any) {
    trace("handleMessage");
    if (message.text) {
        log("message text in handleMessage: " + message.text);
        db.checkUserExists(senderID, (err: any, row: any) => {
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

    } else {
        messenger.sendNoAttachmentsMessage(senderID);
    }
}

function sendExistingUserMessage(senderID: string, level: string, interest: string, message: any) {
    trace("sendExistingUserMessage");

    if (message.text === "experience") {
        return messenger.sendLevelRequest(senderID);
    }
    if (message.text === "interest") {
        return askInterest(senderID);
    }
    if (message.text === "contribute") {
        return messenger.sendContribMessage(senderID);
    }

    const options: IOptions = {
        level,
        interest,
        type: message.text.toLowerCase(),
    };
    log("User options: " + JSON.stringify(options));

    try {
        const link = generateRandomLink(options);
        messenger.sendResource(senderID, link.link);
    } catch (e) {
        log("No random link matching the given options found");
        messenger.sendNoResourceFoundMessage(senderID);
    }
}

// explain what Coding For Everyone is, then ask user for their experience level
function sendNewUserMessage(senderID: string, message: any) {
    trace("sendNewUserMessage");
    messenger.sendWelcomeMessage(senderID);
    // TODO: might make more sense to ask field of interest first?
    db.insertNewEmptyUser(senderID);
    messenger.sendLevelRequest(senderID);
}

function handlePostback(senderID: string, postback: any) {
    trace("handlePostback");
    const payload: string = postback.payload;
    const type: string = payload.split("_")[0];
    const value: string = payload.split("_")[1];
    if (isNullOrUndefined(type) || isNullOrUndefined(value)) {
        messenger.sendGenericErrorMessage(senderID);
    } else {
        switch (type) {
            case "exp":
                handleExpPostback(senderID, value);
                break;
        }
    }
}

function handleExpPostback(senderID: string, expLevel: string) {
    trace("handleExpPostback");
    log("expLevel: " + expLevel);
    db.updateLevel(senderID, expLevel);
    if (!askedInterest) {
        askInterest(senderID);
    }
}

// ask user what their field of interest in Computer Science is
function askInterest(senderID: string) {
    trace("askInterest");
    askedInterest = true;
    messenger.sendInterestRequest(senderID);
}

function handleInterestMessage(senderID: string, interestType: string) {
    trace("handleInterestMessage");
    db.updateInterest(senderID, interestType);
    messenger.sendReadyMessage(senderID);
    messenger.sendHelpMessage(senderID);
}
