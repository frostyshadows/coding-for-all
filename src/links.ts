// Encapsulates access to the stored links
import {trace} from "./logging";

export interface ILink {
    link: string;
    title: string;
    options: IOptions;
}

export interface IOptions {
    level: Level;
    interest: Interest;
    type: ResourceType;
}

export enum Level {
    None = "none",
    Some = "some",
    Lots = "lots",
}

export enum Interest {
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

export enum ResourceType {
    Tutorials = "tutorial",
    Articles = "article",
    Videos = "video",
}

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
