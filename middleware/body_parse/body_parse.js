const form_data = require("./form_data");
const x_www_form_urlencoded = require("./x_www_form_urlencoded");

function body_parse ()
{

    /** parse form_data and set it to request.body
     * @param req : Server_one.Request
     * @param resp : Server_one.Response
     * */
    function func(req,resp,next)
    {
        if (req.method === 'GET') {next();return;}
        let chunk = [];
        req.on('data' , (buf) =>
        {
            chunk.push(Buffer.from(buf));
        });
        req.on('end',() =>
        {
            req.post_buffer = Buffer.concat(chunk);
            if (/^multipart\/form-data; boundary=(.*?)/igs.test(req.headers['content-type'])) req.body = form_data(req,resp);
            /** Select the corresponding processing function 选择对应的处理函数 */
            else if (req.headers['content-type'] === 'application/x-www-form-urlencoded')
            {
                try {req.body = JSON.parse(req.post_buffer.toString());}
                catch (err) {req.body = x_www_form_urlencoded(req.post_buffer);}
            }
            else req.body = {};
            next();
        });
        return;
    }
    return func;
}

module.exports = body_parse;