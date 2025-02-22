import * as fs from 'fs';
import logger from './log.js';
import { get_bot } from './bot.js';
import config from './config.js';
import ts from 'typescript';
const compilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext, 
  };
export class Plugin {
    private _plugin_dir: string;
    private plugins: Array<any>;
    constructor(_plugin_dir: string){
        this._plugin_dir = _plugin_dir;
        this.plugins = [];
    }
    async load_plugins(){
        const files = fs.readdirSync(this._plugin_dir);
        for(const file of files){
            let fileIndexPath = `${this._plugin_dir}/${file}/index.ts`
            const plugininfopath = `${this._plugin_dir}/${file}/plugin.json`;
            try{
                const tsfilecode = fs.readFileSync(fileIndexPath,'utf8')
                const result = ts.transpileModule(tsfilecode, {
                    compilerOptions,
                    fileName: fileIndexPath,
                  }).outputText;
                fs.writeFileSync(fileIndexPath.replace('.ts','.js'),result)
                fileIndexPath = fileIndexPath.replace('.ts','.js')
                const plugin_json = JSON.parse(fs.readFileSync(plugininfopath, 'utf-8'));
                const plugin_except_config = plugin_json.config;
                let plugin_config = config.get(`plugin.${file}`);
                if (plugin_config === null){
                    config.set(`plugin.${file}`, plugin_except_config);
                    plugin_config = config.get(`plugin.${file}`,null)
                }
                if (plugin_config.enabled === true){
                    const plugin_main = await import(`../.${fileIndexPath}`);
                    logger.info(`load plugin ${file}`)
                    this.plugins.push(plugin_json.name)
                    plugin_main.init_config(plugin_config)
                    await plugin_main.init(get_bot(config.get('self_id')))
            }}
            catch(e){
                logger.error(`load plugin ${file} error: ${e}`)
            }}

    }
    get_load_plugins():number{
        return this.plugins.length
    }
}

const plugin = new Plugin('./plugins')
export default plugin