const worker_threads = require("worker_threads");

/**
 *  @abandoned
 */
class Thread_pool
{
    pool_number;
    /** @type Array<Thread> */
    thread_pool;
    /** @type string */
    file_name;
    /** @type Array<number> */
    can_use_id;
    /** await function queue
     * @type Array<(thread)=>void>*/
    await_queue;

    constructor(file , pool_number , option)
    {
        if (!file) throw new Error("file cannot be empty");
        this.file_name = file;
        this.pool_number = pool_number || 2;
        this.thread_pool = [];
        this.can_use_id = [];
        this.await_queue = [];
        for (let i = 0; i < this.pool_number; i++)
        {
            this.thread_pool.push(new Thread(i,this,file,option));
            this.can_use_id.push(i);
        }
    }

    /** @returns Promise<Thread> */
    async getThread ()
    {
        if (this.can_use_id.length <= 0)
            return  new Promise((res,rej) =>
            {
                this.await_queue.push((thread)=>
                {
                    res(thread);
                });
                return;
            });
        else return this.thread_pool[this.can_use_id.splice(0,1)[0]];
    }

    /** on put back */
    __on_put_back (id)
    {
        if (this.can_use_id.indexOf(id) !== -1) return;
        if (this.await_queue.length > 0)
            this.await_queue.splice(0,1)[0](this.thread_pool[id]);
        else
            this.can_use_id.push(id);
        return;
    }
}

class Thread
{
    /** @type worker_threads.Worker */
    worker;
    /** @type number */
    id;
    /** @type Thread_pool */
    thread_pool;

    constructor(id , thread_pool , file , option)
    {
        this.worker = new worker_threads.Worker(file,option);
        this.id = id;
        this.thread_pool = thread_pool;
    }

    /** @returns Thread */
    on (event_name , callback)
    {
        this.worker.on(event_name,callback);
        return this;
    }

    /** @returns Thread */
    off (event_name , callback)
    {
        this.worker.off(event_name,callback);
        return this;
    }

    /** @returns Thread */
    postMessage (data , transferList)
    {
        this.worker.postMessage(data,transferList)
        return this;
    }

    put_back ()
    {
        this.thread_pool.__on_put_back(this.id);
    }
}

/** @class Thread */
Thread_pool.Thread = Thread;

module.exports = Thread_pool;