class Utils
{
    replaceAt = (string, index, replacement) =>
    {
        return string.substr(0, index) + replacement + string.substr(index + replacement.length);
    }
}

module.exports = new Utils;