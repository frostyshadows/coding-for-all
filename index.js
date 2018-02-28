"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Import dependencies
const debug = require("debug");
const express = require("express");
const bodyParser = require("body-parser");
// Create Express HTTP server
const app = express().use(bodyParser.json());
const log = debug("coding-for-all");
log("Testing");
// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => log("Webhook is listening"));
// Creates the endpoint for our webhook
app.post("/webhook", (req, res) => {
    const body = req.body;
    // Checks this is an event from a page subscription
    if (body.object === "page") {
        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function (entry) {
            // Gets the message. entry.messaging is an array, but
            // will only ever contain one message, so we get index 0
            const webhookEvent = entry.messaging[0];
            log(webhookEvent.toString());
        });
        // Returns a '200 OK' response to all requests
        res.status(200).send("EVENT_RECEIVED");
    }
    else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
});
// Adds support for GET requests to our webhook
app.get("/webhook", (req, res) => {
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
        }
        else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});
