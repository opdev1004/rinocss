const path = require('path');
const fs = require('fs');
const Tot = require('totjs');
const chokidar = require('chokidar');
const http = require('http');
const WebSocket = require('ws');
const { exec } = require('child_process');
const net = require('net');

module.exports = class RinoCSS
{
    constructor()
    {
    }

    async dev(totFilename, projectDirname, htmlDirname, distFilename)
    {
        await this.rebuild(totFilename, distFilename);

        let port = await this.findPort(3000);
        const server = this.createServer(htmlDirname, port);
        const wss = this.createWSS(server);
        const url = `http://localhost:${ port }`

        this.openBrowser(url);
        this.createWatcher(totFilename, projectDirname, distFilename, port, wss);
    }

    async findPort(port)
    {
        let result = await this.isPortInUse(port)

        if (result)
        {
            return await this.findPort(port + 1);
        }
        else
        {
            return port;
        }
    }

    isPortInUse(port)
    {
        return new Promise((resolve, reject) =>
        {
            const server = net.createServer()
                .once('error', error =>
                {
                    if (error.code !== 'EADDRINUSE') return reject(error);
                    resolve(true);
                })
                .once('listening', () =>
                {
                    server.close();
                    resolve(false);
                })
                .listen(port);
        });
    }

    createWSS(server)
    {
        const wss = new WebSocket.Server({ server });

        wss.on('connection', (ws) =>
        {
            ws.on('message', (message) =>
            {
                if (message === 'reload')
                {
                    wss.clients.forEach((client) =>
                    {
                        client.send('reload');
                    });
                }
            });
        });

        return wss;
    }

    createWatcher(totFilename, projectDirname, distFilename, port, wss)
    {
        const watcher = chokidar.watch(projectDirname).on('change', async (filepath) =>
        {
            console.clear();
            console.log(`File ${ filepath } has been changed`);
            console.log("Rebuilding...");
            await this.rebuild(totFilename, distFilename).then(() =>
            {
                wss.clients.forEach((client) =>
                {
                    client.send('reload');
                });
            });

            console.log(`Server listening on port ${ port }`);
            console.log(`Check http://localhost:${ port }`);
        })

        return watcher;
    }

    createServer(distDirname, port)
    {
        const server = http.createServer((req, res) =>
        {
            res.setHeader('Access-Control-Allow-Origin', 'http://localhost, http://localhost');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Access-Control-Expose-Headers', 'Authorization');
            res.setHeader('Access-Control-Max-Age', '86400');
            let filePath = path.join(distDirname, req.url);

            fs.readFile(filePath, 'utf8', (error, data) =>
            {
                if (error)
                {
                    filePath = path.join(filePath, 'index.html');
                    fs.readFile(filePath, 'utf8', (error, data) =>
                    {
                        let fileext = path.extname(filePath);

                        if (error)
                        {
                            req.statusCode = 404;
                            res.end('File not found');
                        }
                        else
                        {
                            if (fileext === '.html')
                            {
                                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                                data = this.injectReload(data, port)
                            }
                            res.end(data);
                        }
                    });
                }
                else
                {
                    let fileext = path.extname(filePath);

                    if (fileext === '.html')
                    {
                        res.setHeader('Content-Type', 'text/html; charset=utf-8');
                        data = this.injectReload(data, port)
                    }
                    else if (fileext === '.mjs' || fileext === '.js')
                    {
                        res.setHeader('Content-Type', 'application/javascript, text/javascript, module');
                    }
                    else if (fileext === '.css')
                    {
                        res.setHeader('Content-Type', 'text/css');
                    }
                    else
                    {
                        res.setHeader('Content-Type', 'application/octet-stream');
                    }

                    res.end(data);
                }
            });
        });

        server.listen(port, () =>
        {
            console.log(`Server listening on port ${ port }`);
            console.log(`Check http://localhost:${ port }`);
        });

        return server;
    }

    openBrowser(url)
    {
        if (process.platform === 'darwin') exec(`open ${ url }`);
        else if (process.platform === 'win32') exec(`start ${ url }`);
        else exec(`xdg-open ${ url }`);
    }

    injectReload(data, port)
    {
        const reloadScript = `
        <script type="text/javascript">
            const ws = new WebSocket('ws://localhost:${ port }');

            ws.onmessage = (event) => {
                console.log(event.data);
                if (event.data === 'reload') {
                    location.reload();
                }
            };
        </script>
        </head>
        `;
        return data.replace("</head>", reloadScript);
    }

    async rebuild(startFilename, distFilename)
    {
        let css = await this.buildCSS(startFilename);
        await this.writeFile(distFilename, css);

        console.log("Build is completed!");
    }

    async buildCSS(filename)
    {
        const tot = new Tot(filename);

        let css = await tot.getDataByName("css");;
        let result = "";

        while (css.length > 0)
        {
            let start = css.indexOf("{{") + 2;
            let end = css.indexOf("}}");

            if (start == 1 || end == -1)
            {
                result = result + css;
                break;
            }

            result = result + css.substring(0, start - 2);
            let target = css.substring(start, end).trim();
            css = css.substring(end + 2);

            if (target.substring(0, 11) == "components.")
            {
                let compResult;
                let targetArray = target.split(",");
                let targetName = targetArray[0].trim().substring(11, target.length);
                let componentDirName = targetArray[1].trim();

                if (targetArray.length > 2)
                {
                    let props;

                    if (targetArray[2] !== undefined) props = JSON.parse(await tot.getDataByName(targetArray[2].trim()))

                    compResult = await this.buildComponent(componentDirName, targetName, props);
                }
                else
                {
                    compResult = await this.buildComponent(componentDirName, targetName);
                }

                result = result + compResult;
            }
        }

        return result;
    }

    async buildComponent(dirname, name, props = undefined)
    {
        const tot = new Tot(path.join(dirname, `/${ name }.tot`));

        let css = await tot.getDataByName("css");

        if (css === undefined || css === null) css = "";

        let result = "";

        while (css.length > 0)
        {
            let start = css.indexOf("{{") + 2;
            let end = css.indexOf("}}");

            if (start == 1 || end == -1)
            {
                result = result + css;
                break;
            }

            result = result + css.substring(0, start - 2);
            let target = css.substring(start, end).trim();
            css = css.substring(end + 2);
            let targetArray = target.split(",");
            let targetName = targetArray[0].trim().substring(11, target.length);

            if (target.substring(0, 11) == "components." && targetName !== name)
            {
                let compResult;
                let componentDirName = targetArray[1].trim();

                if (targetArray.length > 2)
                {
                    let props;

                    if (targetArray[2] !== undefined) props = JSON.parse(await tot.getDataByName(targetArray[2].trim()))

                    compResult = await this.buildComponent(componentDirName, targetName, props);
                }
                else
                {
                    compResult = await this.buildComponent(componentDirName, targetName);
                }

                result = result + compResult;
            }
        }


        if (props !== undefined) result = await this.buildProps(result, props);


        return result;
    }

    async buildProps(css, data)
    {
        let tmp = css;
        let result = "";

        while (tmp.length > 0)
        {
            let start = tmp.indexOf("{{") + 2;
            let end = tmp.indexOf("}}");

            if (start == 1 || end == -1)
            {
                result = result + tmp;
                break;
            }

            result = result + tmp.substring(0, start - 2);
            let target = tmp.substring(start, end).trim();
            tmp = tmp.substring(end + 2);

            if (target.substring(0, 6) == "props.")
            {
                result = result + await this.getValueFromObj(target.substring(6), data)
            }
            else
            {
                result = result + `{{ ${ target } }}`;
            }
        }

        return result;
    }

    async writeFile(filename, css)
    {
        try
        {
            await fs.promises.writeFile(filename, css);
            return true;
        }
        catch (error)
        {
            console.error(error);
            return false;
        }
    }

    async getValueFromObj(target, data)
    {
        return await target.split(".").reduce((obj, prop) => obj[prop], data);
    }
}