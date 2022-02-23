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
     * synchronize md5 encryption
     * @param data : string */
    static md5_synchronize (data)
    {
        const md5 = crypto.createHash("md5");
        md5.update(data);
        return md5.digest('hex');
    }

    /**
     * simple encryption the encryption can decryption
     * @param data : any
     * */
    static async encryption (data)
    {
        this.#init();
        data = JSON.stringify(data);
        const thread = await this.#thread_pool.get_thread();
        return await thread.execute(() =>
        {
            return Buffer.from(data,"utf-8").toString("base64");
        } , {data});
    }

    /**
     * synchronize simple encryption the encryption can decryption
     * @param data : any
     * */
    static encryption_synchronize (data)
    {
        data = JSON.stringify(data);
        return Buffer.from(data,"utf-8").toString("base64");
    }

    /**
     * simple decryption
     * @param data : string
     * */
    static async decryption (data)
    {
        this.#init();
        data = JSON.stringify(data);
        const thread = await this.#thread_pool.get_thread();
        /** @type string */
        const result = await thread.execute(() =>
                Buffer.from(data,"base64").toString("utf-8")
        , {data});
        return JSON.parse(result);
    }

    /**
     * synchronize simple decryption
     * @param data : string
     * */
    static decryption_synchronize (data)
    {
        const result = Buffer.from(data,"base64").toString("utf-8");
        return JSON.parse(result);
    }

    /**
     * get a random string of specified length\
     * @param model : "any"|"number"|"any_letter"|"uppercase_letter"|"lower_letter"|"number_lower_letter"|"number_uppercase_letter"
     * @param len : number
     * */
    static async random_str (model = "any", len = 6)
    {
        this.#init();
        const thread = await this.#thread_pool.get_thread();
        /** @type string */
        const result = await thread.execute(() =>
        {
            let result = "";
            /** @type string */
            let str;
            switch (model)
            {
                case "any" :
                    str = "zxcvbnmlkjhgfdsaqwertyuiopQWERTYUIOPASDFGHJKLZXCVBNM1234567890";
                    break;
                case "number" :
                    str = "1234567890";
                    break;
                case "number_lower_letter" :
                    str = "zxcvbnmlkjhgfdsaqwertyuiop1234567890";
                    break;
                case "any_letter" :
                    str = "zxcvbnmlkjhgfdsaqwertyuiopQWERTYUIOPASDFGHJKLZXCVBNM";
                    break;
                case "uppercase_letter" :
                    str = "QWERTYUIOPASDFGHJKLZXCVBNM";
                    break;
                case "lower_letter" :
                    str = "zxcvbnmlkjhgfdsaqwertyuiop";
                    break;
                case "number_uppercase_letter" :
                    str = "1234567890QWERTYUIOPASDFGHJKLZXCVBNM";
                    break;
                default :
                    str = "zxcvbnmlkjhgfdsaqwertyuiopQWERTYUIOPASDFGHJKLZXCVBNM1234567890";
            }
            for (let i = 0; i < len; i++)
            {
                result += str[parseInt(Math.random() * str.length + '')];
            }
            return result;
        } , {len , model} , []);
        return result;
    }

    /**
     * async get a random string of specified length\
     * @param model : "any"|"number"|"any_letter"|"uppercase_letter"|"lower_letter"|"number_lower_letter"|"number_uppercase_letter"
     * @param len : number
     * */
    static random_str_synchronize (model = "any", len = 6)
    {
        let result = "";
        /** @type string */
        let str;
        switch (model)
        {
            case "any" :
                str = "zxcvbnmlkjhgfdsaqwertyuiopQWERTYUIOPASDFGHJKLZXCVBNM1234567890";
                break;
            case "number" :
                str = "1234567890";
                break;
            case "number_lower_letter" :
                str = "zxcvbnmlkjhgfdsaqwertyuiop1234567890";
                break;
            case "any_letter" :
                str = "zxcvbnmlkjhgfdsaqwertyuiopQWERTYUIOPASDFGHJKLZXCVBNM";
                break;
            case "uppercase_letter" :
                str = "QWERTYUIOPASDFGHJKLZXCVBNM";
                break;
            case "lower_letter" :
                str = "zxcvbnmlkjhgfdsaqwertyuiop";
                break;
            case "number_uppercase_letter" :
                str = "1234567890QWERTYUIOPASDFGHJKLZXCVBNM";
                break;
            default :
                str = "zxcvbnmlkjhgfdsaqwertyuiopQWERTYUIOPASDFGHJKLZXCVBNM1234567890";
        }
        for (let i = 0; i < len; i++)
        {
            result += str[parseInt(Math.random() * str.length + '')];
        }
        return result;
    }

    static #init ()
    {
        if (Encryption.#thread_pool === null) this.#thread_pool = new Worker_pool(3);
        return;
    }
}

module.exports = Encryption;