import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { SubscriberStore } from "./store";

type SubscriberRecord = {
  email: string;
  createdAt: string;
};

export class JsonlSubscriberStore implements SubscriberStore {
  constructor(private readonly options: { filePath: string }) {}

  async add(email: string): Promise<{ email: string; inserted: boolean }> {
    await mkdir(dirname(this.options.filePath), { recursive: true });
    const records = await this.readRecords();

    if (records.some((record) => record.email === email)) {
      return { email, inserted: false };
    }

    const nextRecord: SubscriberRecord = {
      email,
      createdAt: new Date().toISOString(),
    };
    const nextContent = `${records.map((record) => JSON.stringify(record)).join("\n")}${
      records.length > 0 ? "\n" : ""
    }${JSON.stringify(nextRecord)}\n`;

    await writeFile(this.options.filePath, nextContent, "utf8");
    return { email, inserted: true };
  }

  private async readRecords(): Promise<SubscriberRecord[]> {
    let content: string;
    try {
      content = await readFile(this.options.filePath, "utf8");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }

    return content
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as SubscriberRecord);
  }
}
