const Worker_pool = require("./../thread/worker_pool")
const crypto = require("crypto");

class Encryption
{
    /** @type Worker_pool */
    static #thread_pool = null;

    /**
     * md5 encryption
     * @param data : string */
    static async md5 (data)
    {
        this.#init();
        const thread = await this.#thread_pool.get_thread();
        return await thread.execute(() =>
        {
            const md5 = crypto.createHash("md5");
            md5.update(data);
            return md5.digest('hex');
        } , {data} , ["crypto"]);
    }

    /**
     * simple encryption the encryption can decryption
     * @param data : any
     * */
    static async encryption (data)
    {
        data = JSON.stringify(data);
        const thread = await this.#thread_pool.get_thread();
        return await thread.execute(() =>
        {
            return Buffer.from(data,"utf-8").toString("base64");
        } , {data});
    }

    /**
     * simple decryption
     * @param data : string
     * */
    static async decryption (data)
    {
        data = JSON.stringify(data);
        const thread = await this.#thread_pool.get_thread();
        const result = await thread.execute(() =>
        {
            return Buffer.from(data,"base64").toString("utf-8");
        } , {data});
        return JSON.parse(result + '');
    }

    static #init ()
    {
        if (Encryption.#thread_pool === null) this.#thread_pool = new Worker_pool(3);
        return;
    }
}

module.exports = Encryption;