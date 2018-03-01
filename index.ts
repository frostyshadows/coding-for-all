// Import dependencies
import * as bodyParser from "body-parser";
import * as debug from "debug";
import * as express from "express";
import * as helmet from "helmet";

// Create Express HTTP server
const app: express.Application = express().use(bodyParser.json()).use(helmet());

const log = debug("codingforall::debug");
const trace = debug("codingforall::trace");

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => log("Webhook is listening"));

// Creates the endpoint for our webhook
app.post("/webhook", (req, res) => {
    trace("Post request handled");
    const body = req.body;
    // Checks this is an event from a page subscription
    if (body.object === "page") {
        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function (entry: any) {
            // Gets the message. entry.messaging is an array, but
            // will only ever contain one message, so we get index 0
            const webhookEvent = entry.messaging[0];
            log(webhookEvent.toString());
        });

        // Returns a '200 OK' response to all requests
        res.status(200).send("EVENT_RECEIVED\n");
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }

});

// Adds support for GET requests to our webhook
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
            log("WEBHOOK_VERIFIED\n");
            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(403);
    }
});
