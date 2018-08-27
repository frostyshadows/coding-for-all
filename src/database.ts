// Exposes access to SQLite database
import * as sqlite3 from "sqlite3";
import {trace} from "./logging";

export class Database {
    private db: sqlite3.Database;

    constructor() {
        sqlite3.verbose();
        this.db = new sqlite3.Database("users.db");

        this.db.serialize(() => {
            this.db.run("CREATE TABLE IF NOT EXISTS users (" +
                "senderID TEXT," +
                "ExpLevel TEXT," +
                "Interests TEXT)");
        });
    }

    public insertNewEmptyUser(senderID: string) {
        trace("insertNewEmptyUser");
        this.db.run("INSERT INTO users VALUES (?,?,?)", senderID, "", "");
    }

    public checkUserExists(senderID: string, callback: any) {
        trace("checkUserExists");
        this.db.serialize(() => {
            this.db.get("SELECT * FROM users WHERE senderID = " + senderID, callback);
        });
    }

    public updateLevel(senderID: string, level: string) {
        trace("updateLevel");
        this.db.run("UPDATE users SET ExpLevel = ? WHERE senderID = ?", level, senderID);
    }

    public updateInterest(senderID: string, interest: string) {
        trace("updateInterest");
        this.db.run("UPDATE users SET Interests = ? WHERE senderID = ?", interest, senderID);
    }
}
