const Thread_pool = require("./../thread/thread_pool")
const path = require("path");

module.exports = class Encryption
{
    /** @type Thread_pool */
    static #thread_pool = null;

    /**
     * md5 encryption
     * @param data : string */
    static async md5 (data)
    {
        return await Encryption.#bind("md5",data);
    }

    /**
     * simple encryption the encryption can decryption
     * @param data : any
     * */
    static async encryption (data)
    {
        return await Encryption.#bind("encryption",JSON.stringify(data));
    }

    /**
     * simple decryption
     * @param data : string
     * */
    static async decryption (data)
    {
        return JSON.parse(await Encryption.#bind("decryption",data));
    }

    /** @param type : "md5"|"encryption"|"decryption"
     * @returns Promise<string>
     * */
    static async #bind (type , data)
    {
        const promise = new Promise(async (res, rej) =>
        {
            if (this.#thread_pool === null) this.#__init();
            const thread = await Encryption.thread_pool.getThread();

            function err_listen (err)
            {
                console.log(err);
                thread.off("message", encryption_listen);
                thread.off("error", err_listen);
                thread.put_back()
            }
            thread.on("error",err_listen);

            /** md5 crypto */
            function encryption_listen (value)
            {
                if (value instanceof Error) throw value;
                else res(value['crypto_data']);
                thread.off("message", encryption_listen);
                thread.off("error", err_listen);
                thread.put_back()
            }
            thread.on("message", encryption_listen);

            thread.postMessage({key: type, data: data});
        });
        return promise;
    }

    /** create thread_pool */
    static #__init ()
    {
        this.thread_pool = new Thread_pool(path.join(__dirname,"crypto.js"));
    }
};