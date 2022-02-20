const Worker_pool = require("./../thread/worker_pool");

class Jsonwebtoken
{
    /** @type Worker_pool */
    static #thread_pool = null;
    static executePoolNumber = 2;

    /** create token
     * @param data : any
     * @param key : string
     * @param options : {effectiveTime:any,coding:any}
     * @returns Promise<string>
     * */
    static async generate ( key , data , options = {})
    {
        this.#init();
        const thread = await this.#thread_pool.get_thread();
        return await thread.execute(() =>
        {
            const token_arr = [];
            const coding = options['coding'] || "base64";
            /** header */
            token_arr[0] = Buffer.from(JSON.stringify({ algorithm : coding }),'utf-8').toString(coding);
            /** body */
            data['key'] = key;
            token_arr[1] = Buffer.from(JSON.stringify(data),'utf-8').toString(coding)
            /** foot */
            let option =
                {
                    /** effective time */
                    effectiveTime : options["effectiveTime"] || -1,
                    /** create Time */
                    createTime : Date.now(),
                    /** key */
                    key : key
                };
            token_arr[2] = Buffer.from(JSON.stringify(option),'utf-8').toString(coding)
            return token_arr[0] + "." + token_arr[1] + "." + token_arr[2];
        } , {key , data , options} , []);
    }

    /** parse token
     * @param token : string
     * @param key : string
     * @param options : {coding:BufferEncoding}
     * @returns Promise<any>
     * */
    static async parse (token , key , options={})
    {
        if (!token) throw new Error("token is not defined");
        else if (!key) throw new Error("key is not defined");
        this.#init();
        const thread = await this.#thread_pool.get_thread();
        return await thread.execute(() =>
        {
            /** @type BufferEncoding */
            const coding = options.coding || "base64";
            const tokens = token.split(".");
            const foot = JSON.parse(Buffer.from(tokens[2],coding).toString("utf-8"));
            if (foot.key !== key) throw new Error("key is error");
            if ((foot.effectiveTime !== -1) && (Date.now() - foot.createTime >= foot.effectiveTime))
                throw new Error("expired token");
            const data = JSON.parse(Buffer.from(tokens[1],coding).toString("utf-8"));
            if (!data["key"] || data["key"] !== key) throw new Error("parse err , token is unlawful");
            delete data["key"];
            return data;
        } , {token , key , options} , []);
    }

    static #init ()
    {
        if (this.#thread_pool === null) this.#thread_pool = new Worker_pool(this.executePoolNumber);
        return;
    }
}

module.exports = Jsonwebtoken;