// Encapsulates access to the stored links
import * as fs from "fs";
import {log, trace} from "./logging";

export const links: ILink[] = JSON.parse(fs.readFileSync("data/links.json").toString());
export const levels = JSON.parse(fs.readFileSync("data/valid_levels.json").toString());
export const interests = JSON.parse(fs.readFileSync("data/valid_interests.json").toString());
export const resourceTypes = JSON.parse(fs.readFileSync("data/valid_resource_types.json").toString());

export interface ILink {
    link: string;
    title: string;
    options: IOptions;
}

export interface IOptions {
    level: string;
    interest: string;
    type: string;
}

// Return a random link that matches the given options
// Throws Error if no matching link found
export function generateRandomLink(options: IOptions): ILink {
    trace("generateRandomLink");

    const level = options.level;
    const interest = options.interest;
    const type = options.type;

    const start: number = links.findIndex((currentLink) => {
        return (currentLink.options.interest === interest) &&
            (currentLink.options.level === level) &&
            (currentLink.options.type === type);
    });

    if (start === -1) {
        throw new Error("No article found");
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

    log("start index: " + start + ", end index: " + end);
    const randomIndex = Math.floor(Math.random() * (end - start) + start);

    return links[randomIndex];
}

// Compare two links for sorting, first by interest, then level, then resource type
export function compareLinks(firstLink: ILink, secondLink: ILink) {
    trace("compareLinks");
    if (firstLink.options.interest < secondLink.options.interest) {
        return -1;
    } else if (firstLink.options.interest > secondLink.options.interest) {
        return 1;
    } else {
        if (firstLink.options.level < secondLink.options.level) {
            return -1;
        } else if (firstLink.options.level < secondLink.options.level) {
            return 1;
        } else {
            if (firstLink.options.type < secondLink.options.type) {
                return -1;
            } else {
                return 1;
            }
        }
    }
}
