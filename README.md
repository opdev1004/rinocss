# Rino CSS 🦏
CSS Preprocessor for developing your CSS project.

## 📢 Notice
### 👍 Releasing version 0.0.3
Fixed the problem with writing a file when there's no parent directory.

## 💪 The things you can do with Rino CSS:
```
1. You can compile .tot files and generate a single css file.
2. It is quite flexible. As it helps you replacing plain text like variables and combining css files.
3. You can crete a css component and pass JSON property to manipulate the component like managing color from parent. However Top parent's props cannot be passed to the component of component (child of child, grandchild). But it may change in the future.
4. Live web development just like other frontend web frameworks for seeing updated styles.
```

If you want to know about .tot file format, you can have a look at [totjs repository](https://github.com/opdev1004/totjs).

## ▶️ Installation
```
npm i rinocss
```

### 🛠 Requirements
My setting is Windows 10, so I cannot test other OS. However, it should work as almost everything is written in Javascript.

However, I recommend using LTS version of Node.js and recent version of OS.

## 📖 Example:
If you want to have a look at bigger example of using rinocss, have a look at
[rino ui repository](https://github.com/opdev1004/rinoui)
### ./src/index.js:
index.js for Live development:
```
const RinoCSS = require('../src/index.js');
const path = require('path');

async function test()
{
    let rino = new Rino();
    // The arguments(parameter) for dev() is:
    // Top parent tot file path, project directory path, directory path where the html file is for running develpment server and filename of css file for exporting.

    await rinocss.dev(path.resolve("./css/main.tot"), path.join(__dirname, "./"), path.join(__dirname, "../testdist"), path.join(__dirname, "../testdist/style.css"));
}

test();
```
or index.js for manual build without live development:

```
const RinoCSS = require('../src/index.js');
const path = require('path');

async function test()
{
    let rinocss = new RinoCSS();
    let css = await rinocss.buildCSS(path.resolve("./css/main.tot"));
    await rinocss.writeFile("../testdist/style.css", css);
}

test();
```
### ./src/css/main.tot:
```
<d:css>
body {
    background-color: #666;
    color: #fff;
}

{{ components.padding, ./css/ }}

</d:css>
```

### .src/css/padding.tot:
```
<d:css>
.pa-1 {
    padding: 2px;
}

.pa-2 {
    padding: 4px;
}
</d:css>
```
If you know how to use rino.js, This should be easy as it has exactly same structure. Have a look at [rino.js repository](https://github.com/opdev1004/rinojs) for more detail.

## 💪 Sponsor 
[Github sponsor page](https://github.com/sponsors/opdev1004)

## 👨‍💻 Author
[Victor Chanil Park](https://github.com/opdev1004)

## 💯 License
MIT, See [LICENSE](./LICENSE).
