replaceAt = (string, index, replacement) => {
    const newString = string.substr(0, index) +
    replacement + string.substr(index + replacement.length);

    return newString;
};

module.exports = {
    replaceAt,
};
