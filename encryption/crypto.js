const crypto = require("crypto");

const worker_thread = require("worker_threads");

worker_thread.parentPort.on("message" , on_message);

/**
 * message listen
 * @param value : {{key : string , data : string}}
 * @returns any
 * */
function on_message (value)
{
    switch (value.key)
    {
        case "md5" :
        {
            md5_crypto(value.data);
            break;
        }
        case "encryption" :
        {
            encryption(value.data);
            break;
        }
        case "decryption" :
        {
            decryption(value.data);
            break;
        }
    }
    return;
}

/** md5 crypto
 * @param data : string
 * */
function md5_crypto (data)
{
    const md5 = crypto.createHash("md5");
    md5.update(data);
    worker_thread.parentPort.postMessage({crypto_data : md5.digest('hex')});
}

/** simple encryption
 * @param data : string
 * */
function encryption (data)
{
    worker_thread.parentPort.postMessage({
        crypto_data : Buffer.from(data,"utf-8").toString("base64")
    });
}

/** simple decryption
 * @param data : string
 * */
function decryption (data)
{
    worker_thread.parentPort.postMessage({
        crypto_data : Buffer.from(data,"base64").toString("utf-8")
    });
}