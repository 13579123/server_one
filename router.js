"use strict";
const http = require('http');

/** router class
 * */
class Router
{
    /** @type string any */
    static ANY_PATH = "%any%";
    /** @type string */
    static ANY_METHOD = "%any_request%";
    static POST_METHOD = "POST";
    static GET_METHOD = "GET";

    /** main path of the router */
    constructor(routerPath = Router.ANY_PATH)
    {
        /** @type string method */
        this.method = Router.ANY_METHOD;
        /** @type string router path */
        this.path = routerPath;
        /** @type Array<RouterExecute> Router or  RouterExecute */
        this.son_router_or_execute = [];
        /** @type Array<RouterExecute> err execute functions */
        this.err_execute = [];
        /** @type Router */
        this.last_router = null;
    }

    /** execute router
     * @param req : Server_one.Request|http.IncomingMessage
     * @param resp : Server_one.Response
     * @param paths : Array<string>
     * */
    async execute_router ( req , resp , paths)
    {
        let path = paths[0];
        paths.shift();
        for (let i = 0; i < this.son_router_or_execute.length; i++)
        {
            let son = this.son_router_or_execute[i];
            if (
                (son.method !== Router.ANY_METHOD && son.method !== req.method)
                ||
                (son.path !== Router.ANY_PATH && son.path !== path)
            ) continue;
            for (let j = 0; j < son.calls.length; j++)
            {
                if (son.calls[j] instanceof Router)
                {
                    if (await son.calls[j].execute_router(req,resp,[...paths])) return true;
                }
                else
                {
                    let result = await this.#executeFunction(req,resp,son.calls[j]);
                    if (result === "next") break;
                    else if (result !== undefined)
                    {
                        await this.#execute_err_router(result,req,resp);
                        return true;
                    }
                    continue;
                }
            }
        }
        return false;
    }

    async #execute_err_router (err,req,resp)
    {
        for (let i = 0; i < this.err_execute.length; i++)
        {
            let son = this.err_execute[i];
            for (let j = 0; j < son.calls.length; j++)
            {
                if (son.calls[j] instanceof Router) await son.calls[j].#execute_err_router(err,req,resp);
                else await this.#executeFunction(req,resp,son.calls[j],err);
            }
        }
        if (this.last_router !== null) await this.last_router.#execute_err_router(err,req,resp);
        return;
    }

    /**
     * @param req : Server_one.Request
     * @param resp : Server_one.Response
     * @param func : (req:Server_one.Request,resp:Server_one.Response,next:any)=>any|(err:any,req:Server_one.Request,resp:Server_one.Response,next:any)=>any
     * */
    async #executeFunction ( req , resp , func , err)
    {
        if (err !== undefined)
        {
            return new Promise((res,rej) =>
            {
                func(err,req,resp,(value)=>
                {
                    res(value);
                });
            });
        }
        return new Promise((res,rej) =>
        {
            func(req,resp,(value) =>
            {
                res(value);
            });
        });
    }

    /** add err request router
     * @param calls : (err:any,req:Server_one.Request,resp:Server_one.Response,next:any)=>any
     * */
    err (...calls)
    {
        for (let i = 0; i < calls.length; i++)
        {
            if (calls[i] instanceof Router) calls[i].last_router = this;
        }
        this.err_execute.push(new RouterExecute(Router.ANY_METHOD,Router.ANY_PATH,[...calls]));
        return this;
    }

    /** add get request router
     * @param calls : (req:Server_one.Request,resp:Server_one.Response,next:any)=>any
     * */
    get (path , ...calls)
    {
        let method = Router.GET_METHOD;
        if (path instanceof Router)
        {
            calls.unshift(path);
            path = Router.ANY_PATH;
        }
        return this.use(path , method , ...calls);
    }

    /** add post request router
     * @param calls : (req:Server_one.Request,resp:Server_one.Response,next:any)=>any
     * */
    post (path , ...calls)
    {
        let method = Router.POST_METHOD;
        if (path instanceof Router)
        {
            calls.unshift(path);
            path = Router.ANY_PATH;
        }
        return  this.use(path , method , ...calls);
    }

    /** add generic router
     * @param path : (req:Server_one.Request,resp:Server_one.Response,next:any)=>any)|string
     * @param method : (req:Server_one.Request,resp:Server_one.Response,next:any)=>any)|string
     * @param calls : ((req:Server_one.Request,resp:Server_one.Response,next:any)=>any)|Router
     * */
    use (path , method , ...calls)
    {
        if (typeof path !== "string" && typeof method !== "string")
        {
            if (method) calls.unshift(path , method);
            else calls.unshift(path);
            path = Router.ANY_PATH;
            method = Router.ANY_METHOD;
        }
        else if (typeof path === "string" && typeof method !== "string")
        {
            calls.unshift(method);
            method = Router.ANY_METHOD;
        }
        else if (typeof path === "string" && typeof method === "string") {}
        else throw new Error("The parameter of the function does not meet the requirements");
        const begin_path = /(^\/)|(^\\)/;
        if (begin_path.test(path)) path = path.replace(begin_path,"");
        for (let i = 0; i < calls.length; i++)
        {
            if (calls[i] instanceof Router) calls[i].last_router = this;
        }
        /** foreach put */
        this.son_router_or_execute.push(new RouterExecute(method,path,[...calls]));
        return this;
    }

}

/** save the router and execute functions */
class RouterExecute
{
    /** @param calls : Array<(req:Server_one.Request,resp:Server_one.Response,next:any)=>any|(err:Error,req:Server_one.Request,resp:Server_one.Response,next:any)=>a|Router> */
    constructor(method , path , calls)
    {
        /** @type string */
        this.method = method;
        /** @type string */
        this.path = path;
        /** @type  Array<(req:Server_one.Request,resp:Server_one.Response,next:any)=>any|(err:Error,req:Server_one.Request,resp:Server_one.Response,next:any)=>a|Router> */
        this.calls = calls;
    }
}

module.exports = Router;