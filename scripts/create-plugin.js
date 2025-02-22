import readLine from "readline";
import * as fs from 'fs';
import axios from 'axios';

const rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function askQuestion(query) {
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            resolve(answer);
        });
    });
}

async function getUserInput() {
    const name = await askQuestion("插件名称: ");
    const description = await askQuestion("插件描述: ");
    const author = await askQuestion("插件作者: ");
    const version = await askQuestion("插件版本: ");
    const license = await askQuestion("插件许可证: ");
    
    rl.close();

    return {
        name: name.replace(/ /g, "-"),
        description: description.replace(/ /g, "-"),
        author: author.replace(/ /g, "-"),
        version: version.replace(/ /g, "-"),
        license: license.replace(/ /g, "-")
    };
}

async function createPlugin(plugindata) {
    console.log('正在创建插件目录...');
    fs.mkdirSync(`./plugins/${plugindata.name}`);
    console.log('正在创建插件配置文件...');
    
    const plugin_json = {
        "name": plugindata.name,
        "version": plugindata.version,
        "description": plugindata.description,
        "author": plugindata.author,
        "license": plugindata.license,
        "config": {
            "enabled": true
        },
        "packages": []
    };

    fs.writeFileSync(`./plugins/${plugindata.name}` + '/plugin.json', JSON.stringify(plugin_json, null, 2));
    console.log('正在写入插件模板...');
    
    const res = await axios.get('https://gitlab.com/skibot-official-plugins/template/-/raw/main/index.ts');
    const template = res.data;
    fs.writeFileSync(`./plugins/${plugindata.name}` + '/index.ts', template);
    console.log('插件创建成功！');
}

async function main() {
    if (fs.existsSync('./plugins') == false) {
        fs.mkdirSync('./plugins');
    }
    const plugindata = await getUserInput();
    await createPlugin(plugindata);
}

main();
