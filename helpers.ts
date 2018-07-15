/**
 * Created by sherryuan on 2018-07-14.
 */

import {ILink} from "./index";

export function compareLinks(firstLink: ILink, secondLink: ILink ) {
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
