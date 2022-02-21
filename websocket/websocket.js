const http = require('http');
const crypto = require('crypto')
const a = 0;
const calls = Symbol();

/** web socket GUID */
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class Websocket
{
    constructor()
    {
        this[calls] = {};
        this[calls]['message'] = [];
        this[calls]['close'] = [];
        this[calls]['error'] = [];
        this[calls]['connect'] = [];
    }

    /**
     * @param req : http.IncomingMessage
     * @param resp : http.ServerResponse
     * */
    async __request (req,resp)
    {
        const key = req.headers['sec-websocket-key'];
        const hash = crypto.createHash('sha1');  // 创建一个签名算法为sha1的哈希对象
        hash.update(`${key}${GUID}`)  // 将key和GUID连接后，更新到hash
        const result = hash.digest('base64') // 生成base64字符串
        const header = `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-Websocket-Accept: ${result}\r\n\r\n` // 生成供前端校验用的请求头
        resp.socket.write(header);
        /** connect event commit  */
        const socket = new Server_one_socket(resp.socket);
        for (let i = 0; i < this[calls]['connect'].length; i++)
        {
            await Websocket.execute_async(this[calls]['connect'][i] , socket);
        }

        const self = this;
        async function messageListen (buff)
        {
            const parse_data = Websocket.parse(buff);
            if (parse_data.opcode === 8)
            {
                resp.socket.end();
                return;
            }
            const socket = new Server_one_socket(resp.socket);
            socket.opcode = parse_data.opcode;
            socket.payloadData = parse_data.payloadData;
            /** data event commit  */
            for (let i = 0; i < self[calls]['message'].length; i++)
            {
                await Websocket.execute_async(self[calls]['message'][i] , socket);
            }
            return;
        }
        async function errorListen (err)
        {
            const socket = new Server_one_socket(resp.socket);
            socket.error = err;
            /** error event commit  */
            for (let i = 0; i < self[calls]['message'].length; i++)
            {
                await Websocket.execute_async(self[calls]['error'][i] , socket);
            }
            return;
        }
        async function closeListen (had_error)
        {
            const socket = new Server_one_socket(resp.socket);
            /** close event commit  */
            for (let i = 0; i < self[calls]['close'].length; i++)
            {
                await Websocket.execute_async(self[calls]['close'][i] , socket);
            }
            /** free listen function */
            resp.socket.off("data",messageListen);
            resp.socket.off("error",errorListen);
            resp.socket.off("close",closeListen);
            return;
        }

        resp.socket.on("data" , messageListen);
        resp.socket.on("error" , errorListen);
        resp.socket.on("close" , closeListen);
        return;
    }

    /** add event listen
     * @param event : "message"|"close"|"error"|"connect"
     * @param call : (socket:Server_one_socket)=>void
     * */
    addEventListener (event , ...call)
    {
        if (!this[calls][event]) throw new Error("invalid event");
        else this[calls][event].push(...call);
        return this;
    }

    /** parse message data
     * @returns {{isFinal,payloadData:Buffer,maskingKey,opcode:number,payloadLen,masked}}
     * */
    static parse (data)
    {
        let start = 0;
        let frame =
        {
            isFinal: (data[start] & 0x80) === 0x80,
            opcode: data[start++] & 0xF,
            masked: (data[start] & 0x80) === 0x80,
            payloadLen: data[start++] & 0x7F,
            maskingKey: '',
            payloadData: null
        };

        if (frame.payloadLen === 126)
        {
            frame.payloadLen = (data[start++] << 8) + data[start++];
        }
        else if (frame.payloadLen === 127)
        {
            frame.payloadLen = 0;
            for (let i = 7; i >= 0; --i)
            {
                frame.payloadLen += (data[start++] << (i * 8));
            }
        }
        if (frame.payloadLen)
        {
            if (frame.masked)
            {
                const maskingKey =
                [
                    data[start++],
                    data[start++],
                    data[start++],
                    data[start++]
                ];
                frame.maskingKey = maskingKey;
                frame.payloadData = data
                    .slice(start, start + frame.payloadLen)
                    .map((byte, idx) => byte ^ maskingKey[idx % 4]);
            }
            else
            {
                frame.payloadData = data.slice(start, start + frame.payloadLen);
            }
        }
        return frame;
    }
    /** create message data
     * @param data : {{isFinal,opcode,payloadData}|string}
     * @returns Buffer
     * */
    static generate (data)
    {
        const isFinal = data.isFinal !== undefined ? data.isFinal : true,
            opcode = data.opcode !== undefined ? data.opcode : 1,
            payloadData = data.payloadData ? Buffer.from(data.payloadData) : null,
            payloadLen = payloadData ? payloadData.length : 0;

        let frame = [];
        if (isFinal) frame.push((1 << 7) + opcode);
        else frame.push(opcode);
        if (payloadLen < 126)
        {
            frame.push(payloadLen);
        }
        else if (payloadLen < 65536)
        {
            frame.push(126, payloadLen >> 8, payloadLen & 0xFF);
        } else
        {
            frame.push(127);
            for (let i = 7; i >= 0; --i)
            {
                frame.push((payloadLen & (0xFF << (i * 8))) >> (i * 8));
            }
        }
        frame = payloadData ? Buffer.concat([Buffer.from(frame), payloadData]) : Buffer.from(frame);
        return frame;
    }

    static async execute_async (call , socket)
    {
        const promise = new Promise((res,rej) =>
        {
            const call_result = call(socket);
            if (call_result instanceof Promise) call_result.then((value) => res(value));
            else res(call_result);
        });
        return promise;
    }
}

class Server_one_socket
{
    /**
     * cline data
     * @type null|Buffer */
    payloadData;

    constructor(socket)
    {
        this.socket = socket;
        this.error = null;
        this.payloadData = null;
        this.opcode = null;
    }

    /**
     * write data to cline
     * @param buff : Buffer|string */
    write (buff)
    {
        const result_buffer = Websocket.generate({payloadData : buff});
        this.socket.write(result_buffer);
    }

    close ()
    {
        this.socket.end();
    }
}

module.exports = Websocket;