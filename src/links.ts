// Encapsulates access to the stored links
import {trace} from "./logging";
import * as fs from "fs";

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
