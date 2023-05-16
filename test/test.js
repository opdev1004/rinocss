const RinoCSS = require('../src/index.js');
const path = require('path');

async function test()
{
    let rinocss = new RinoCSS();
    await rinocss.dev(path.resolve("./css/main.tot"), path.join(__dirname, "./"), path.join(__dirname, "../testdist"), path.join(__dirname, "../testdist/style.css"));

    /*
    let css = await rinocss.buildCSS(path.resolve("./css/main.tot"));
    await rinocss.writeFile("../testdist/style.css", css);
    */
}

test();