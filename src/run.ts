import { parseRecord } from "./index.node";
import "dotenv/config";

async function test() {
    const result = await parseRecord(
        "https://www.xiaoyuzhoufm.com/episode/6572ee8eb81e5be7d2f566ba",
        "elephant"
    );
    console.log(result);
}

async function main() {
    test();
}

main();
