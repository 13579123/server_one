const worker_thread = require("worker_threads");
const vm = require("vm");

/** @type Object vm.Script object cache */
let scripts = {};

worker_thread.parentPort.on("message" , (worker) =>
{
    const {event} = worker;
    switch (event)
    {
        case "execute" :
        {
            execute(worker);
            break;
        }
        case "destroy" : destroy();
    }
});

function execute (worker)
{
    const data_keys = Object.keys(worker['context_data']);
    try
    {
        /** @type vm.Script */
        let script;
        if (scripts[worker['function_str']]) script = scripts[worker['function_str']];
        else
        {
            const func_name = worker['func_name'];
            if (!func_name) worker['function_str'] = '(' + worker['function_str'] + ')();'
            else worker['function_str'] = worker['function_str'] + ';' + worker['func_name'] + '();';
            script = new vm.Script(worker['function_str']);
            scripts[worker['function_str']] = script;
        }

        /** add data to global */
        for (let i = 0; i < data_keys.length; i++)
        {
            const var_str = data_keys[i];
            global[var_str] = worker['context_data'][var_str]
        }

        /** require library */
        if (worker['lib'])
        {
            for (let i = 0; i < worker['lib'].length; i++)
            {
                global[worker['lib'][i]] = require(worker['lib'][i]);
            }
        }
        global["__worker_handle__"] = worker_thread.parentPort;

        const context = vm.createContext(global);
        const result = script.runInContext(context);
        if (result instanceof Promise) result.then((value) =>
        {
            free_resource(data_keys , worker['lib']);
            worker_thread.parentPort.postMessage({event : "execute_end" , data : value});
        });
        else
        {
            free_resource(data_keys , worker['lib']);
            worker_thread.parentPort.postMessage({event : "execute_end" , data : result});
        }
    }
    catch (err)
    {
        free_resource(data_keys , worker['lib']);
        worker_thread.parentPort.postMessage(
            {event : "error" , data : err});
        return;
    }
}

/** close thread */
function destroy ()
{
    scripts = null;
    worker_thread.parentPort.close();
}

/** freed resource */
function free_resource (data_keys , lib)
{
    for (let i = 0; i < data_keys.length; i++)
    {
        const var_str = data_keys[i];
        delete global[var_str];
    }
    if (lib)
    {
        for (let i = 0; i < lib.length; i++)
        {
            delete global[lib[i]];
        }
    }
}