/** parse form_data and set it to request.body
 * @param req : Server_one.Request
 * @param resp : Server_one.Response
 * */
function form_data (req,resp)
{
    const result = {};
    /** get the request boundary value */
    let strings = req.headers["content-type"].split("boundary=");

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
        const boundary_number = temporaryBuffer.indexOf(boundaryBuffer);
        let dataBuffer = temporaryBuffer.slice(0 , boundary_number <= -1 ? undefined : boundary_number - 2);

        /** get proto name */
        let protoBuffer = dataBuffer.slice(0,dataBuffer.indexOf(nextBuffer)).toString();
        let protoName = nameReg.exec(protoBuffer)[1];

        dataBuffer = dataBuffer.slice(dataBuffer.indexOf(nextDataBuffer) + nextDataBuffer.length)

        /** set data */
        result[protoName] = dataBuffer;

        if (newBuffer.length === 0) break;
    }
    return result;
}

module.exports = form_data;