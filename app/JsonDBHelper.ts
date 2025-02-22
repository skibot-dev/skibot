import * as fa from 'fs';

class Database {
    private _dbpath: string;
    private _db: object;
    private _cache: Map<string, any>; 

    constructor(_dbpath: string) {
        this._dbpath = _dbpath;
        this._db = {};
        this._cache = new Map();
        this.load_data();
    }

    get(key: string): any {
        if (this._cache.has(key)) { 
            return this._cache.get(key);
        }
        const value = this._db[key];
        this._cache.set(key, value);
        return value;
    }

    set(key: string, value: any): void {
        this._db[key] = value;
        this._cache.set(key, value); 
        fa.writeFileSync(this._dbpath, JSON.stringify(this._db));
    }

    del(key: string): void {
        delete this._db[key];
        this._cache.delete(key);
        fa.writeFileSync(this._dbpath, JSON.stringify(this._db));
    }
    updateOne(key: string, value: any){
        this._db[key] = value;
        this._cache.set(key, value);
        fa.writeFileSync(this._dbpath, JSON.stringify(this._db));

    }

    includes(key: string): boolean {
        return this._db.hasOwnProperty(key);
    }

    load_data(): void {
        if (fa.existsSync(this._dbpath)) {
            this._db = JSON.parse(fa.readFileSync(this._dbpath).toString());
            this._cache.clear();
            for (const key in this._db) {
                if (this._db.hasOwnProperty(key)) {
                    this._cache.set(key, this._db[key]); 
                }
            }
        } else {
            fa.writeFileSync(this._dbpath, JSON.stringify(this._db));
        }
    }
}

export {
    Database
}