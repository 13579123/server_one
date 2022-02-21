const worker_threads = require('worker_threads');
const path = require("path");

/** put back function symbol */
const put_symbol = Symbol();
/** destroy function symbol */
const destroy_symbol = Symbol();

class Worker_pool
{
    /** @type number */
    #limit;
    /** @type Array<Worker_thread> */
    #pool;
    /** @type Array<number> save idle thread queue*/
    #idle_thread_id;
    /** @type Array<(thread)=>void> await queue */
    #await_queue;
    /** @param limit : number thread number of the thread pool */
    constructor (limit = 2)
    {
        this.#limit = limit;
        this.#pool = [];
        this.#idle_thread_id = [];
        this.#await_queue = [];
        for (let i = 0; i < this.#limit; i++)
        {
            this.#idle_thread_id.push(i);
            this.#pool.push(new Worker_thread(i,this));
        }
    }

    /**
     * get a thread object
     * @returns Promise<Worker_thread>  */
    async get_thread ()
    {
        if (this.#idle_thread_id.length > 0)
        {
            return this.#pool[this.#idle_thread_id.splice(0,1)[0]];
        }
        const promise = new Promise((res,rej) =>
        {
            this.#await_queue.push((thread) => res(thread));
        });
        return promise;
    }

    /** destroy the pool */
    async destroy_pool ()
    {
        for (let i = 0; i < this.#pool.length; i++)
        {
            await this.#pool[i][destroy_symbol]();
        }
        return;
    }

    /** dont call */
    [put_symbol] (id)
    {
        if (this.#await_queue.length > 0) this.#await_queue.splice(0,1)[0](this.#pool[id]);
        else if (this.#idle_thread_id.indexOf(id) == -1) this.#idle_thread_id.push(id);
    }

}

class Worker_thread
{
    /** @type worker_threads.Worker */
    #worker;
    /** @type Worker_pool */
    #worker_pool;
    /** @type (Object)=>void */
    __execute_end;
    /** thread id */
    #id;
    constructor(id , worker_pool)
    {
        this.#id = id;
        this.#worker_pool = worker_pool;
        this.#worker = new worker_threads.Worker(path.join(__dirname,"./worker_thread_file.js"));
        this.#worker.on("message", this.#on_worker_message.bind(this));
    }

    /** destroy the thread */
    async [destroy_symbol] ()
    {
        return new Promise((res,rej) =>
        {
            this.#worker.on("exit",() =>
            {
                this.#worker = null;
                res(0);
            });
            this.#worker.postMessage({event : "destroy" , thread_id : this.#id});
        });
    }

    /** execute a function ,the data is can use context
     * @param call : ()=>void
     * @param data : Object
     * */
    async execute (call , data, lib)
    {
        lib = lib || [];
        const promise = new Promise((res,rej) =>
        {
            if (typeof call !== "function") throw new Error("call is not a function");
            if (!Array.isArray(lib)) throw new Error("lib must be a Array")
            this.__execute_end = (value) => res(value);
            this.#worker.postMessage(
            {
                event : "execute",
                function_str : call.toString(),
                context_data : data || {},
                func_name : call.name ,
                lib : lib
            });
        });
        return promise;
    }

    /** @type (value)=>void */
    #on_worker_message (worker)
    {
        if (worker["event"] === "execute_end")
        {
            this.__execute_end(worker['data']);
            this.__execute_end = null;
        }
        else if (worker["event"] === "error") console.log(worker['data']);
        this.#worker_pool[put_symbol](this.#id);
        return void(0);
    }
}


module.exports = Worker_pool;