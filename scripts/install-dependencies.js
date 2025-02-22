import process from "child_process";
import * as fs from 'fs'
function main(){
    const files = fs.readdirSync('./plugins');
    for (const file of files) {
        const plugin_json = JSON.parse(fs.readFileSync(`./plugins/${file}/plugin.json`, 'utf8'));
        const packages = plugin_json.packages;
        for (const i of packages) {
            console.log(`正在安装插件${file}的依赖${i}`);
            process.exec(`npm install ${i} --no-save`, (error, stdout, stderr) => {
                if (!error) {
                    console.log(`插件${file}的依赖${i}安装成功`);
                } else {
                  console.warn(`插件${file}的依赖${i}安装失败 ${error}`)
                }
              });
        }
    }
}

main()