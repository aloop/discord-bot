import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default class JSONStore {
    constructor(filePath) {
        this._path = filePath;
    }

    async read() {
        try {
            const contents = await fs.readFile(this._path, {
                encoding: "utf8",
            });

            return JSON.parse(contents);
        } catch (err) {
            console.error(
                `An error occurred while reading "${this._path}"`,
                err
            );
        }

        return [];
    }

    async write(data) {
        try {
            const contents = JSON.stringify(data);
            return await fs.writeFile(this._path, contents);
        } catch (err) {
            console.error(
                `An error occurred while writing "${this._path}"`,
                err
            );
        }
    }
}
