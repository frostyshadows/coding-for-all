// Import dependencies
import * as bodyParser from "body-parser";
import * as express from "express";
import * as helmet from "helmet";
import {Database} from "./database";
import {isNullOrUndefined} from "util";
import {compareLinks, links, ILink, IOptions} from "./links";
import {log, trace} from "./logging";
import {Messenger} from "./messaging";

// Get page access token from environment variable
const pageAccessToken: string | undefined = process.env.PAGE_ACCESS_TOKEN;
if (isNullOrUndefined(pageAccessToken)) {
    log("Missing page access token in env vars");
    process.exit(1);
}

const app = express().use(bodyParser.json()).use(helmet());
const db = new Database();
const messenger = new Messenger(pageAccessToken as string);

// flag for interest
let askedInterest = false;

// sort links
// organized by interest, then level, then type
links.sort(compareLinks);
trace(JSON.stringify(links));

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
        level,
        interest,
        type: message.text.toLowerCase(),
    };
    log("User options: " + JSON.stringify(options));
    // find a link that matches their profile and requested article type

    try {
        const link = generateRandomLink(interest, level, message.text.toLowerCase());
        messenger.sendResource(senderID, link.link);
    } catch (e) {
        log("No random link matching the given options found");
        // TODO replace this with an contribution message
        messenger.sendHelpMessage(senderID);
    }
}

export function generateRandomLink(level: string, interest: string, type: string): ILink {
    trace("generateRandomLink");
    const start: number = links.findIndex(function (currentLink) {
        return (currentLink.options.interest === interest) &&
            (currentLink.options.level === level) &&
            (currentLink.options.type === type);
    });

    if (start === -1) {
        throw new Error("no article found");
    }

    let end: number = start + 1;
    for (let i = start; i < links.length; i++) {
        if ((links[i].options.interest !== interest) ||
            (links[i].options.level !== level) ||
            (links[i].options.type !== type)) {
            end = i;
            break;
        }
    }

    trace("start index: " + start + ", end index: " + end);
    const randomIndex = Math.floor(Math.random() * (end - start) + start);

    return links[randomIndex];
}

// explain what Coding For Everyone is, then ask user for their experience level
function sendNewUserMessage(senderID: string, message: any) {
    trace("sendNewUserMessage");
    messenger.sendWelcomeMessage(senderID);
    // TODO: might make more sense to ask field of interest first?
    db.insertNewEmptyUser(senderID);
    askExperience(senderID);
}

// ask user what their experience level is
function askExperience(senderID: string) {
    trace("askExperience");
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
    trace("expLevel: " + expLevel);
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
