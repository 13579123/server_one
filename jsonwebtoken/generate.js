let worker = require("worker_threads");

let resultArr = [];

let getNumber = 1;

let data = {};

worker.parentPort.on("message",(value) =>
{
    if (value === "exit")
    {
        resultArr = null;
        resultArr = [];
        data = null;
        data = {}
        getNumber = 1;
        return;
    }
    else if(value === "close")
    {
        worker.parentPort.close();
        return;
    }
    else if (value === "begin")
    {
        createToken();
        worker.parentPort.postMessage("end");
    }
    if (getData(value,"key")) return;
    else if (getData(value,"data")) return;
    else if (getData(value,"options")) return;
});

function getData (value,key)
{
    if (value.key === key)
    {
        data[key] = value.data;
        worker.parentPort.postMessage(getNumber++);
        return true;
    }
    return false;
}

function createToken ()
{
    if (!data.key || typeof data.key !== "string") throw new Error("the key must be a string");
    resultArr.push(createHeader());
    resultArr.push(createBody());
    resultArr.push(createFoot());
    worker.parentPort.postMessage(resultArr[0] + "." + resultArr[1] + "." + resultArr[2]);
}

function createHeader ()
{
    return cryptoDataFunc({ algorithm : data.options['coding'] || "base64" });
}

function createBody ()
{
    data.data["key"] = data.key;
    return cryptoDataFunc(data.data);
}

function createFoot ()
{
    let options =
        {
            /** effective time */
            effectiveTime : data.options["effectiveTime"] || -1,
            /** create Time */
            createTime : Date.now(),
            /** key */
            key : data.key
        };
    return cryptoDataFunc(options);
}

function cryptoDataFunc (cryptoData)
{
    return Buffer.from(JSON.stringify(cryptoData),'utf-8').toString(data.options['coding'] || "base64");
}