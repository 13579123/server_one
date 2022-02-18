/** if not have mysql module */
let mysql = null;
try {mysql = require("mysql")}
catch (err) {}

class Mysql
{
    /** @type {{user:string,password:string,database:string,host:string,port:string}} connect config */
    #config;
    /** @type Pool mysql connect pool */
    #pool;
    /** @type Connection */
    #connection;
    /** @type boolean is use normal connect ? */
    use_connection ;
    /** @param config {{user:string,password:string,database:string,host:string,port:string,use_connection:boolean}} connect config */
    constructor (config)
    {
        if (mysql === null) throw new Error("not found mysql module you can try : npm install mysql .");
        this.use_connection = config.use_connection || false;
        this.#config = config;
        this.#pool = null;
        this.#connection = null;
        if (this.use_connection)
            this.__connection = mysql.createConnection(this.#config);
        else
            this.__pool = mysql.createPool(this.#config);
    }

    /** get mysql connect
     *  @returns  Promise<PoolConnection|Connection>
     * */
    async #getConnect (use_pool)
    {
        if (this.use_connection && !use_pool)
        {
            if (!this.__connection) this.__connection = mysql.createConnection(this.#config);
            this.__connection.connect();
            return this.__connection;
        }
        let promise = new Promise((res,rej)=>
        {
            if (!this.__pool) this.__pool = mysql.createPool(this.#config);
            this.__pool.getConnection((err, connection)=>
            {
                if (err) rej(err);
                else res(connection);
            });
        });
        return promise;
    }

    /**
     * normal execute sql
     * @param sql : string
     * */
    async query (sql, data)
    {
        const promise = new Promise(async (res,rej) =>
        {
            const connection = await this.#getConnect(true);
            connection.query(sql,data,(err,data)=>
            {
                if (err) rej(err)
                else res(data);
                if (this.use_connection) connection.end();
                else connection.release();
            });
        });
        return promise;
    }

    /** @returns Promise<Transaction> */
    async begin_transaction ()
    {
        const connection = await this.#getConnect(true);
        const promise = new Promise((res,rej) =>
        {
            connection.beginTransaction((err) =>
            {
                if (err) throw err;
                res(new Transaction(connection));
            });
        });
        return promise;
    }

}

class Transaction
{
    /** @param connection : PoolConnection|Connection */
    constructor(connection)
    {
        /** @type PoolConnection|Connection */
        this.connection = connection;
    }

    /**
     * normal execute sql
     * @param sql : string
     * */
    async query (sql , data)
    {
        const promise = new Promise((res,rej) =>
        {
            this.connection.query(sql , data , (err , rows , fields) =>
            {
                if (err) rej(err);
                res(rows);
            });
        });
        return promise;
    }

    /** rollback data */
    rollback (option , call)
    {
        return this.connection.rollback(option , call);
    }

    /** commit sql */
    commit (option , call)
    {
        return this.connection.commit(option , call);
    }

    /** free connection */
    release (call = ()=>{})
    {
        return  call(this.connection.release());
    }
}

module.exports = Mysql;