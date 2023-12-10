import NomlandNode from "./index.node";
import "dotenv/config";

async function test() {
    const nom = new NomlandNode(
        "test-app",
        process.env.APP_ADMIN as `0x${string}`
    );
    const data = await nom.getFeeds(57762, "关于社交的一切");
    console.log(data.curationNotes.map((n) => n.n.content));
}

async function main() {
    test();
}

main();
