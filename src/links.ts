// Encapsulates access to the stored links
import * as fs from "fs";
import {log, trace} from "./logging";

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

export class Links {
    // Compare two links for sorting, first by interest, then level, then resource type
    private static compareLinks(firstLink: ILink, secondLink: ILink) {
        trace("Links.compareLinks");
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

    public readonly levels: any[];
    public readonly interests: any[];
    private links: ILink[];
    private resourceTypes: any[];

    constructor() {
        this.links = JSON.parse(fs.readFileSync("data/links.json").toString());
        this.levels = JSON.parse(fs.readFileSync("data/valid_levels.json").toString());
        this.interests = JSON.parse(fs.readFileSync("data/valid_interests.json").toString());
        this.resourceTypes = JSON.parse(fs.readFileSync("data/valid_resource_types.json").toString());

        this.links.sort(Links.compareLinks);
    }

    // Return a random link that matches the given options
    // Throws Error if no matching link found
    public generateRandomLink(options: IOptions): ILink {
        trace("Links.generateRandomLink");

        const level = options.level;
        const interest = options.interest;
        const type = options.type;

        const start: number = this.links.findIndex((currentLink) => {
            return (currentLink.options.interest === interest) &&
                (currentLink.options.level === level) &&
                (currentLink.options.type === type);
        });

        if (start === -1) {
            throw new Error("No article found");
        }

        let end: number = start + 1;
        for (let i = start; i < this.links.length; i++) {
            if ((this.links[i].options.interest !== interest) ||
                (this.links[i].options.level !== level) ||
                (this.links[i].options.type !== type)) {
                end = i;
                break;
            }
        }

        log("start index: " + start + ", end index: " + end);
        const randomIndex = Math.floor(Math.random() * (end - start) + start);

        return this.links[randomIndex];
    }

    public checkResourceTypeValidity(type: string): boolean {
        return this.resourceTypes.indexOf(type) !== -1;
    }

}
