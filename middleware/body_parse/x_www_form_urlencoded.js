/** array of special characters
 * @type Array
 * */
const special_array = [
    {reg : /%40/igs, char : "@"},
    {reg : /%23/igs, char : "#"},
    {reg : /%24/igs, char : "$"},
    {reg : /%3F/igs, char : "?"},
    {reg: /%3D/igs , char : "="},
    {reg: /%2F/igs , char : '/'}
];

/**
 * parse x_www_form_urlencoded data
 * @param buffer : Buffer */
function x_www_form_urlencoded (buffer)
{
    const data = {};
    let data_str = decodeURI(buffer.toString());
    const key_values = data_str.split("&");
    for (let i = 0; i < key_values.length; i++)
    {
        let [key , value] = key_values[i].split("=");
        /** replace special char */
        for (let i = 0; i < special_array.length; i++) value = value.replace(special_array[i].reg , special_array[i].char);
        data[key] = value;
    }
    return data;
}

module.exports = x_www_form_urlencoded;