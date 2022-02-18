let worker = require("worker_threads");

worker.parentPort.on("message",(value) =>
{
    if (value === "exit")
    {
        return;
    }
    else if(value === "close")
    {
        worker.parentPort.close();
        return;
    }
    else if (value.key === "begin")
    {
        /** @type string */
        let token = value.data.token , key = value.data.key;
        /** @type {{coding:string}} */
        let options = value.data.options;

        let tokens = token.split(".");

        /** @type {{ effectiveTime:number, createTime:number, key: string}} */
        let foot = parseFoot(tokens[2],options.coding || "base64");
        if (foot.key !== key)
        {
            worker.parentPort.postMessage(new Error("key is error"));
            return;
        }
        if ((foot.effectiveTime !== -1) && (Date.now() - foot.createTime >= foot.effectiveTime))
        {
            worker.parentPort.postMessage(new Error("expired token"));
            return;
        }

        let body = parseBody(tokens[1],options.coding || "base64" , key);

        worker.parentPort.postMessage(body);
    }
});

/**
 * @param foot : string
 * */
function parseFoot (foot,coding)
{
    return JSON.parse(Buffer.from(foot,coding).toString("utf-8"));
}

/**
 * @param body : string
 * */
function parseBody (body,coding , key)
{
    const data = JSON.parse(Buffer.from(body,coding).toString("utf-8"));
    if (!data["key"] || data["key"] !== key) throw new Error("parse err , token is unlawful");
    delete data["key"];
    return data;
}