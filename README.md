# server_one

### install
```shell
npm install server_one
```

### Introduction
这是我仿照express写的一个简单服务器框架，主要用作学习，还额外添加了一些我认为有用的东西。

### Server_one 类

这是框架的主类，所有的功能都是通过它暴露出来的。同时它也是Router类的子类，详情可以查看
源代码：server_one/server_one.js  文件。它是整个框架实现web服务的起点，我们可以先创建一个它的对象。

```javascript
// 引入Server_one类
const Server_one = require('server_one');
// 创建实例
const app = new Server_one();

// 调用listen方法，开启服务 , 第一个参数是服务端口号，第二个则是开启后的回调函数
app.listen(9898 , () =>
{
    console.log('服务器端口号 : 9898');
});
```

这样，一个web服务就启动了。

接下来是路由的添加，Router类提供了3种添加路由路由的方式，use , get , post , err ，而我们的Server_one类继承了Router所以可以直接使用这四个函数，其中use函数添加的路由会无视请求方法的不同，直接进行路由匹配，若符合条件则加入执行队列。

```javascript
// 加入路由（路由前面不用带"/"）
app.use("test",(req,resp,next) =>
{
    resp.send("test use function");
});
// 传入Server_one.Router.ANY_PATH与不传第一个参数一样，即第一个参数默认是Server_one.Router.ANY_PATH
app.use(Server_one.Router.ANY_PATH,(req,resp,next)=>
{
    console.log("any");
    next();
});
app.use(Server_one.Router.ANY_PATH,Server_one.Router.ANY_METHOD,(req,resp,next)=>
{
    console.log("any");
    next();
});
// 直接传入一个或多个函数
app.use((req,resp,next) =>
{
    next();
},(req,resp,next) =>
{
    resp.send("use function");
});
```

这样我们就可以通过 http://localhost:9898/test 和 http://localhost:9898 来分别触发这几个函数了。

其中回调函数中的req是Server_one.Request的对象实例，它继承了http.IncomingMessage，所以可以通过它获取到请求的信息；并且Server_one内置了两个插件用于解析post请求的数据

```javascript
/** 获取post请求参数 */
app.use(Server_one.body_parse());

/** 处理formData数据 */
app.use(Server_one.form_data());

// 这两个插件解析的数据都会放在req.body对象中 , get请求的数据会被自动解析到req.query对象中
```

回调函数中的resp是Server_one.Response的对象实例，它继承了http.Response，可以通过它发送反馈信息。

回调函数中的next其实是一个函数，在调用它之前，本次请求会被卡在该函数中（类似于被阻塞），每次调用next会让本次请求继续执行下一步函数的调用，所以，请在适当的时候调用next放行吧。同时next也可以接收一个参数，当参数为"next"时，则会跳过本次添加的所有函数:

```javascript
app.use(Server_one.Router.ANY_PATH,Server_one.Router.ANY_METHOD,(req,resp,next)=>
{
    console.log("1");
    next();
},(req,resp,next)=>
{
    console.log("2");
    next("next"); // 会导致本次请求直接进入下一个符合条件的RouterExecute
},(req,resp,next)=>
{
    console.log("3");
    next();
});
app.use(Server_one.Router.ANY_PATH,Server_one.Router.ANY_METHOD,(req,resp,next)=>
{
    console.log("4");
    next();
});
// 结果输出 : 1 , 2 , 4 我们可以看到3没有被输出 ， 这是因为我们传入"next"参数跳过了它的执行
```

当然了，next也可以接受其他非"next"类型的参数，具体看app.err函数的介绍

#### app.use([path : string],[method : string],...calls)函数

同时use也接受另一个路由作为参数:

```javascript
app.use("router" , new Server_one.Router());
// 或
app.use(new Server_one.Router("router"));
// 或
app.use(new Server_one.Router());
// 或
app.use("api","GET",(req,resp,next) => 
{
    next();
}) // 这里可以直接用"GET"不过，还是推荐使用框架提供的Server_one.Router.GET_METHOD
// 同样的 在匹配通用方法时推荐Server_one.Router.ANY_METHOD或不写post请求则使用Server_one.Router.POST_METHOD
```

#### app.get([path : string],...calls) , app.post([path : string],...calls)函数

至于 post 和 get 除了不用传入请求方式外，基本与use函数没有什么不同 , 毕竟也是通过use实现的。

#### app.err(...calls)函数

err函数则比较特殊，它只接受一个或多个函数作为参数，会在任意一个next("xxx")参数列表中被传入非空或"next"时被链式地调用（当前路由 -> 主路由）：

```javascript
// err 就是next("xxx")传入的数据
app.err((err,req,resp,next) => 
{
	console.log(err); // 输出："xxx"
});
```


### Server_one.Thread_pool 类

线程池类，可以通过Server_one.Thread_pool进行访问，由于node没有提供创建线程池类的方法，所以我这里手动实现了一下，它与Thread类（未暴露在框架之外）互相作用，通过事件通知的方式实现了"线程池"的功能。

具体文件 : server_one/thread/thread_pool.js

使用方式 : 

```javascript
// 创建一个线程池对象
const thread_pool = new Server_one.Thread_pool("要执行的js脚本文件.js",12/*线程数量，默认12个，可选*/);
```

这样我们就拥有了一个线程池对象，接下来我们我们执行脚本文件，并且绑定事件。

```javascript
// thread_pool 会返回一个Promise<Thread>对象
thread_pool.then((thread) => 
{
    function onExit () 
    {
        // ...
    }
    function onMessage (value)
    {
        // ...
        thread.off("message",onMessage); // 记得释放监听函数 避免内存泄漏
        thread.off("exit",onExit); // 记得释放监听函数 避免内存泄漏
    }
    thread.on("message" , onMessage);
    thread.on("exit" , onExit);
    thread.put_back(); // 放回线程池
});

/*
该函数会在线程没有空闲时被放入等待队列，直到有空闲线程
*/
```

提醒一下，对于有内存缓存的多线程文件，需要手动释放内存，具体可以参考Server_one.Jsonwebtoken.generate函数的实现（基于Thread_pool实现的token创建函数）。

## Server.Mysql类

它依赖于mysql包，我们在创建这个类的实例时，它会判断是否安装了这个包，若没有则抛出异常，若安装了，则可以正常使用。

依赖包 : **npm install mysql**

```javascript
const option = 
{
    user : "root", // mysql用户名
    password : "123456", // mysql用户密码
    database : "xiaojiangbuhuia", // 连接的数据库
    host : "127.0.0.1", // 主机IP
    port : "3306", // 数据库端口号
}
const mysql = new Server_one.Mysql(option); // 创建mysql对象
```

#### mysql.query(sql : string , [data : Array<any>])函数

```javascript
mysql.query("select * from xx_table where id=?" , [1])
.then((value) => 
{
    console.log(value);
});

async function test ()
{
	const data = await mysql.query("select * from xx_table where id=?" , [1]);
}
```

mysql.query会执行一条sql语句，并且支持预匹配（即以 ? 来替代某些数据，这样可以有效防止sql注入），并返回一个Promise。

第一个参数是sql语句，支持预匹配。第二个参数是一个数组，用来传递执行预匹配的数据，示例表示的意思是，查找xx_table(你的表名)中id为1的数据的所有字段。它会返回一个promise所以也支持Async/Await语法，结果会在promise中被返回。

#### mysql.begin_transaction(void)函数

下面是一般使用方法 :

```javascript
async function test ()
{
    const connect = await mysql.begin_transaction(); // 会返回一个Transaction类的对象，用于执行事务
	try
    {
    	let data1 = await connect.query("insert into xx_table (xx,xx) values (?,?)",[1,2]); // 事务语句1
    	let data2 = await connect.query("insert into xx_table (xx,xx) values (?,?)",[1,2]); // 事务语句2
        connect.commit(); // 提交事务，不然插入等操作不会被真正执行
    }
    catch (err)
    {
        // 出现异常 , 事务回滚
        connect.rollback();
    }
    finally
    {
        // 释放资源
        connect.release();
    }
}
```

### Server_one.Jsonwebtoken 类

提供了静态方法用于token的生成和解析。

#### Server_one.Jsonwebtoken.generate(key : string, data : any , [options : {coding:string,effectiveTime:number}])

该函数用于生成token : 

```javascript
async function test ()
{
    const token = await Server_one.Jsonwebtoken.generate("my_key" , {name : "mr.jiang" , age : 14},{effective : 1000*60*60 , coding : "base64"});
    console.log(token);
    /*
  eyJhbGdvcml0aG0iOiJiYXNlNjQifQ==.eyJuYW1lIjoibXIuamlhbmciLCJhZ2UiOjE0fQ==.eyJlZmZlY3RpdmVUaW1lIjotMSwiY3JlYXRlVGltZSI6MTY0NTE5NTkyODM
2OCwia2V5IjoibXlfa2V5In0=
    */
}
```

第一个参数是 *键*  它相当于一把钥匙，可以是任意字符串，在解析时需要它。

第二个参数是要保存的 *数据*  可以是任何可序列化的数据

第三个参数是 *配置对象*  可以不写,effective token的有效表示时间，默认永久 , coding 表示编码方式，可以不选，若设置了，则之后解码时也需要设置相同的编码。

### Server_one.Jsonwebtoken.parse(token:string,key:string,[options:{coding:string}])

该函数用于解析token :

```javascript
async function test ()
{
    const data = await Server_one.Jsonwebtoken.parse(` eyJhbGdvcml0aG0iOiJiYXNlNjQifQ==.eyJuYW1lIjoibXIuamlhbmciLCJhZ2UiOjE0fQ==.eyJlZmZlY3RpdmVUaW1lIjotMSwiY3JlYXRlVGltZSI6MTY0NTE5NTkyODM
2OCwia2V5IjoibXlfa2V5In0=` , "my_key" , {coding : "base64"});
    console.log(data); // {name : "mr.jiang" , age : 14}
}
```

第一个参数是 *token*  就是我们生成的token

第二个参数是 *键*  生成时指定的键

第三个参数是 *配置对象*  可以不写coding 表示编码方式，可以不选，若设置了，则之前编码时也需要设置相同的编码。



这两个函数都会在第一次被调用时创建一个Server_one.Thread_pool对象，它们的解析与生成也是在其他线程进行的，所以不需要担心会阻塞主线程。

## Server_one.Encryption类

该类提供了部分多线程加密方法。

```javascript
const md5 = await Server_one.Encryption.md5("149847ababab"); // md5加密
const obj_cry = await Server_one.Encryption.encryption({name : "小江不会啊"}); // 可逆的简单加密
const obj = await Server_one.Encryption.decryption(obj_cry); // 对上一个方法加密的数据进行解密
```

