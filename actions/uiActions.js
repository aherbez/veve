const fs = require('fs');


/*
const handleNewFile = function(form, dir, content) {
    let fileName = form.target[0].value;
    form.target.classList.remove('show');
    let elChild = document.createElement('li');
    elChild.innerText = fileName;
    readFileContentOnClick(dir, elChild);
    form.target[0].value = '';
    form.target.parentNode.insertBefore(elChild, form.target.nextSibling);

    // TODO: this trusts editor to be defined. refactor
    editor.session.setValue(content);
}
*/

const readTitles = function(dataURL) {
    let titles = [];
    fs.readdirSync(dataURL).forEach((file, i) => {
        titles.push({
            title: `${file.split('.md')[0]}`,
            dir: `${dataURL}/${file}`

        })
    })
    return titles;
}

module.exports = {
    readTitles
}