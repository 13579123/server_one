"use strict";

const http = require('http');
const https = require('https');
const Router = require('./router');
const Jsonwebtoken = require("./jsonwebtoken/jsonwebtoken");
const Thread_pool = require("./thread/thread_pool");
const Mysql = require("./mysql/mysql");
const Encryption = require("./encryption/encryption");
const Worker_pool = require("./thread/worker_pool");
const WebSocket = require("./websocket/websocket");

class Server_one extends Router
{
    /** @type http.Server */
    server;
    /** @type WebSocket */
    socket_server = null;

    /**
     *  @param option : {{key : string , cert : string}}
     * */
    constructor(option)
    {
        super();
        const self = this;
        let http_module;
        if (option) http_module = https;
        else http_module = http;
        /** @type Server server object */
        self.server = http_module.createServer(async (req,resp) =>
        {
            /** deal websocket request */
            if (req.headers['upgrade'] === 'websocket')
            {
                /** examine version */
                if (req.headers['sec-websocket-version'] !== "13")
                {
                    resp.statusCode = 500;
                    resp.end('connect version err');
                    return;
                }
                if (!this.socket_server)
                {
                    resp.statusCode = 500;
                    resp.end('websocket connection are not supported');
                    return;
                }
                else await this.socket_server.__request(req,resp);
                return;
            }
            /** ordinary http request */
            let requestUrl = req.url.split("?");
            let paths = requestUrl[0] && requestUrl[0].split('/');
            paths.shift();
            let getData = requestUrl[1] && requestUrl[1].split('&');
            /** init response object */
            resp = this.#initResponse(resp);
            /** parse data */
            if (req.method === 'GET') Server_one.#parseGetData(req,getData);
            /** execute functions */
            await this.execute_router(req,resp,paths);
            return;
        });
    }

    /** mount websocket module
     * @param websocket : WebSocket
     * */
    websocket (websocket)
    {
        if (this.socket_server) throw new Error("the app has already mounted websocket");
        this.socket_server = websocket;
        return this;
    }

    /** init response object
     * @returns Server_one.Response
     * */
    #initResponse (resp)
    {
        /** send data function */
        resp.send = Server_one.Response.prototype.send;
        return resp;
    }

    /** listen port
     * @param port : number
     * */
    listen(port, call = function (){})
    {
        this.server.listen(port,call);
        return this;
    }

    /** parse get request data
     * @param data : Array<string>
     * */
    static #parseGetData (req , data)
    {
        if (!data)
        {
            req.query = {};
            return;
        }
        let result = {};
        for (let i = 0; i < data.length; i++)
        {
            let keyVs = data[i].split("=");
            result[decodeURI(keyVs[0])] = decodeURI(keyVs[1]);
        }
        req.query = result;
    }

    /** post request execute */
    static body_parse ()
    {
        function func(req,resp,next)
        {
            let chunk = [];
            req.on('data' , (buf) =>
            {
                chunk.push(Buffer.from(buf));
            });
            req.on('end',() =>
            {
                req.post_buffer = Buffer.concat(chunk);
                try
                {
                    req.body = JSON.parse(req.post_buffer.toString());
                }
                catch (err)
                {
                    req.body = {};
                }
                next();
            });
            return;
        }
        return func;
    }

    /** parse form_data and set it to request.body*/
    static form_data ()
    {
        /** parse form_data and set it to request.body
         * @param req : Server_one.Request
         * @param resp : Server_one.Response
         * */
        function func (req,resp,next)
        {
            if (!req.post_buffer)
            {
                next("form_data function must be called before body_parse function id called");
                return;
            }
            else if (req.post_buffer.length <= 0)
            {
                next();
                return;
            }
            /** get the request boundary value */
            let strings = req.headers["content-type"].split("boundary=");
            if (!strings[strings.length - 1])
            {
                next();
                return;
            }

            let nextBuffer = '\r\n';
            let boundary = "--" + strings[strings.length - 1] + nextBuffer, boundaryBuffer = Buffer.from(boundary);
            let endBoundary = "--" + strings[strings.length - 1] + "--" + nextBuffer , endBoundaryBuffer = Buffer.from(endBoundary);
            let nextDataBuffer = Buffer.from(nextBuffer + nextBuffer);
            let newBuffer = req.post_buffer.slice(0,req.post_buffer.indexOf(endBoundaryBuffer) - 2);

            let nameReg = /name="(.*?)"/;
            while (true)
            {
                if (newBuffer.indexOf(boundaryBuffer) === -1) break;

                let temporaryBuffer = newBuffer.slice(newBuffer.indexOf(boundaryBuffer) + boundaryBuffer.length);
                newBuffer = temporaryBuffer;
                let dataBuffer = temporaryBuffer.slice(0 , temporaryBuffer.indexOf(boundaryBuffer) - 2);

                /** get proto name */
                let protoBuffer = dataBuffer.slice(0,dataBuffer.indexOf(nextBuffer)).toString();
                let protoName = nameReg.exec(protoBuffer)[1];

                dataBuffer = dataBuffer.slice(dataBuffer.indexOf(nextDataBuffer) + nextDataBuffer.length)

                /** set data */
                req.body[protoName] = dataBuffer;
                if (newBuffer.length === 0) break;
            }
            next();
        }
        return func;
    }

}

/** Router module
 * @class Router
 */
Server_one.Router = Router;

/** create token module
 * @class Jsonwebtoken
 * */
Server_one.Jsonwebtoken = Jsonwebtoken;

/** Mysql module
 * @class Mysql
 * */
Server_one.Mysql = Mysql;

/** Encryption module
 * @class Encryption
 * */
Server_one.Encryption = Encryption;

/** Multithreading module use Worker_pool
 * abandoned !!!
 * @class Thread_pool
 * @abandoned
 * */
Server_one.Thread_pool = Thread_pool;

/**
 * Multithreading module
 * @class Worker_pool
 * */
Server_one.Worker_pool = Worker_pool;

/**
 * Websocket module
 * @class WebSocket
 * */
Server_one.WebSocket = WebSocket;

Server_one.Response = class Response extends http.ServerResponse
{
    /** send data function
     * @param code
     * */
    send (code , data , type = "json")
    {
        if (typeof code !== "number" || data === undefined)
        {
            data = code;
            code = 200;
        }
        this.statusCode = code;
        /** set header */
        this.setHeader('content-type', `text/${type};charset=utf8`);
        data = JSON.stringify(data);
        this.end(data);
    }
};
Server_one.Request = class Request extends http.IncomingMessage
{
    /** @type Buffer */
    post_buffer ;
    body = {};
    query = {};
};

module.exports = Server_one;