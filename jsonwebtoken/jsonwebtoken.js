const path = require("path");
let Thread_pool = require("./../thread/thread_pool");

class Jsonwebtoken
{
    static #isInit = false;
    /** @type Thread_pool */
    static #parse_threads;
    /** @type Thread_pool */
    static #generate_thread;
    static executePoolNumber = 2;
    /** create token
     * @param data : any
     * @param key : string
     * @param options : {effectiveTime:any,coding:any}
     * @returns Promise<string>
     * */
    static generate ( key , data , options = {})
    {
        if (!Jsonwebtoken.#isInit) Jsonwebtoken.#init();
        let promise = new Promise(async (res,rej) =>
        {
            let result = "" , lastV = "";
            /** @type Thread */
            let worker = await this.#generate_thread.getThread();
            worker.postMessage({key : "data" , data : data});

            function errListen (err)
            {
                console.log(err + " : jsonwebtoken.js -- err : 30");
                worker.off("message",generateListener);
                worker.off("error",errListen);
                worker.put_back();
            }
            worker.on("error",errListen);

            /** @type (value:any)=>void */
            function generateListener (value)
            {
                if (value === 1)
                {
                    worker.postMessage({key : "key" , data : key});
                }
                else if (value === 2)
                {
                    worker.postMessage({key : "options" , data : options});
                }
                else if (value === 3)
                {
                    worker.postMessage("begin");
                }
                else if (value === "end")
                {
                    worker.postMessage("exit");
                    worker.off("error",errListen);
                    worker.off("message",generateListener);
                    res(lastV);
                    worker.put_back();
                }
                lastV = value;
            }

            worker.on("message",generateListener);
        })
        return promise;
    }


    /** parse token
     * @param token : string
     * @param key : string
     * @param options : {coding:string}
     * @returns Promise<any>
     * */
    static parse (token , key , options={})
    {
        if (!Jsonwebtoken.#isInit) Jsonwebtoken.#init();
        let promise = new Promise(async (res,rej) =>
        {
            if (!token)
            {
                rej(new Error("can not get token"));
                return;
            }
            if (!key)
            {
                rej(new Error("can not get key"));
                return;
            }

            /** @type Thread */
            let worker = await this.#parse_threads.getThread();

            worker.postMessage({key : "begin" , data : {token , key , options}});

            function errListen (err)
            {
                console.log(err + " : jsonwebtoken.js -- err : 30");
                worker.off("message",parseListener);
                worker.off("error",errListen);
                worker.put_back();
            }
            worker.on("error",errListen);

            /** @type (value:any)=>void */
            function parseListener (value)
            {
                if (value instanceof Error) rej(value);
                else res(value);
                worker.off("message",parseListener);
                worker.off("error",errListen);
                worker.put_back();
            }

            worker.on("message",parseListener);
        });
        return promise;
    }

    static #init ()
    {
        this.#generate_thread = new Thread_pool(path.join(__dirname,"./generate.js"),this.executePoolNumber);
        this.#parse_threads = new Thread_pool(path.join(__dirname,"./parse.js"),this.executePoolNumber);
        this.#isInit = true;
    }

}

module.exports = Jsonwebtoken;