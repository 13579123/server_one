# server_one

### install
```shell
npm install server_one
```

 

### 支持Node版本

```text
v14.14.0 以上
```



### 版本改动

```text
version 3.3.3 --> version 3.3.4 文档改动
version 3.3.4 --> version 3.3.5 thread_pool类被废弃，改用worker_pool类，并且Jsonwebtoken类和Encryption也被重写
version 3.3.5 --> version 3.3.6 添加WebSocket类用于处理websocket连接
version 3.3.6 --> version 3.3.7 websocket类的bug修复
version 3.3.7 --> version 3.3.8 修复Encryption类的bug
version 3.3.8 --> version 3.3.9 废弃Server_one.body_parse和Server_one.form_data中间件，全部改用Server_one.middleware.body_parse中间件，并且修复了一些bug，并且提供了Server_one.middleware来专门存放内置中间件
version 3.3.9 --> version 3.3.10 废弃Server_one.Thread_pool类 , Encryption类添加random_str静态方法用于获取随机指定长度的字符串
version 3.3.9 --> version 3.3.11 些许改动
version 3.3.12 --> version 3.3.13 为Encryption类的所有函数提供了静态的同步方法
version 3.3.13 --> version 3.3.14 修改了Encryption类的加密解密函数的实现
version 3.3.14 --> version 3.3.15 修复了body_parse的一个小bug
version 3.3.15 --> version 3.3.16 修复了Jsonwebtoken类的一个小bug，给thread.execute函数添加了一个全局__worker_handle__变量，用于获取子线程对象
```

### 目录信息
```text
server_one 
----encryption
    ----encryption.js # 加密解密类
----jsonwebtoken
    ----jsonwebtoken.js # server_one_jwt类
----middleware
	----body_parse
		----form_data.js # 解析form_data类型的请求数据，由body_parse中间件调用
		----body_parse.js # body_parse中间件，用于处理post请求的数据
		----x_www_form_urlencoded.js # 解析post请求的数据，由body_parse中间件调用
	----middleware.js # 框架内置中间件模块
----mysql
    ----mysql.js # 数据库操作的简单封装，依赖于mysql包
----thread
    ----worker_pool.js # 线程池的封装，操作更加简单，用户可以自行查看调用方式
    ----worker_thread_file.js # 线程池实现逻辑
----websocket
	----websocket.js # websocket操作的简易封装
----algorithm.js # 一些算法的封装，暂时没有被使用
----README.md # 说明文档
----router.js # 核心类Router类
----server_one.js # 核心类Server_one类
    
```





### Introduction

这是我仿照express写的一个简单服务器框架，主要用作学习，还额外添加了一些我认为有用的东西。





### Server_one 类

#### 构造器

new Server_one([option]) 当我们传入第一个参数时，启用https模块，需要ssl证书的信息。

#### 基本操作

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

对于https服务的创建，只需要在构造器中传入一个对象 {key : "xxx" , cert : "xxx"}
那么Server_one就会创建https服务器了。

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

#### 请求数据

其中回调函数中的req是Server_one.Request的对象实例，它继承了http.IncomingMessage，所以可以通过它获取到请求的信息；并且Server_one内置了两个插件用于解析post请求的数据

```javascript
/** 获取post请求参数 */
// app.use(Server_one.body_parse()); // 废弃

/** 处理formData数据 */
// app.use(Server_one.form_data()); // 废弃

/* 处理post请求的数据，并将它挂载在req.body上 */
app.use(Server_one.middleware.body_parse());

// 这两个插件解析的数据都会放在req.body对象中 , get请求的数据会被自动解析到req.query对象中
```

回调函数中的resp是Server_one.Response的对象实例，它继承了http.Response，可以通过它发送反馈信息。

回调函数中的next其实是一个函数，在调用它之前，本次请求会被卡在该函数中（类似于被阻塞），每次调用next会让本次请求继续执行下一步函数的调用，所以，请在适当的时候调用next放行吧。同时next也可以接收一个参数，当参数为"next"时，则会跳过本次添加的所有函数:

```javascript
app.use(Server_one.Router.ANY_PATH,Server_one.Router.ANY_METHOD,(req,resp,next)=>
{
    console.log(req.body); // 查看post请求数据，前提是挂载了Server_one.middleware.body_parse中间件
    console.log(req.query); // 查看get请求数据，无需挂载任何中间件，框架内部自动处理
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







## Server_one.Worker_pool类

线程池类，用于创建一个线程池。

```javascript
// 线程数量
const limit = 5;
// 创建线程池对象
const pool = new Server_one.Worker_pool(limit/*线程数量 ， 可以不选 ， 默认为2*/);
```

#### pool.get_thread(void) 函数

该函数返回一个Promise<Worker_thread>。

```javascript
pool.get_thread()
.then(async (worker) => 
{
    // 调用worker对象的execute方法开启多线程
    /*
    函数原型 : Worker_thread.prototype.execute( call:()=>any , [data : Object] , [lib : Array<string>]);
    call 是线程要执行的函数
    data 是执行时的上下文中的数据
    lib 是执行时使用的库的路径数组
    注意，execute中的回调函数是多线程执行的，所以在这里它无法访问到该作用域的数据，必须在data中声明。
    这里调用第三方库或标准库时，必须在lib中表示
    */
    const count = 100;
    const no_count = 200;
    const data = await worker.execute(() => 
    {
        // 可以获取到子线程的对象
        __worker_handle__.postMessage("");
        // 这里count可以修改与外界的count无关
        count += 1;
        // 由于我们在lib里面加入了fs和path所以这里也可以调用
        const stream = fs.createStream(path.join(__dirname , "./test.json"));
        console.log(count); // 101 正常输出
        // console.log(no_count); // error : no_count is not definition 这里无法访问到外界的no_count数据
        return {name : "test end"}; // 返回值会作为execute的放回值被返回
    } , {count} , ["fs" , "path"]);
    
    console.log(data); // {name : "test end"}
    // 之后线程会自动被放回线程池，等待下一次使用
})
```

#### pool.destroy_pool(void)函数

用于销毁当前线程池。







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

提供了两个静态方法用于token的简单生成和解析。

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

#### Server_one.Jsonwebtoken.parse(token:string,key:string,[options:{coding:string}])

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

该类提供了部分多线程加密方法。以及同步加密解密的方法

```javascript
// 该类提供了一个变量用于控制是否采用相对不可读的加密方式，默认关闭
Server_one.Encryption.complex = true; // 开启该方式

const md5 = await Server_one.Encryption.md5("149847ababab"); // md5加密
const md5_sync = Server_one.Encryption.md5_synchronize("149847ababab"); // 同步md5加密
const obj_cry = await Server_one.Encryption.encryption({name : "小江不会啊"}); // 可逆的简单加密
const obj_cry_sync = Server_one.Encryption.encryption_synchronize({name : "小江不会啊"}); // 同步可逆的简单加密
const obj = await Server_one.Encryption.decryption(obj_cry); // 对上一个方法加密的数据进行解密
const obj_sync = Server_one.Encryption.decryption_synchronize(obj_cry); // 同步对上一个方法加密的数据进行解密

// 获取指定长度的随机字符串，第一个参数是字符串的模式默认"any" ， 第二个参数则是字符串长度，默认6
/*
模式有 :
"any" 大小写字母和数字
"number" 仅数字
"any_letter" 仅大小写字母
"lower_letter" 仅小写字母
"uppercase_letter" 仅大写字母
"number_lower_letter" 数字和小写字母
"number_uppercase_letter" 数字和大写字母
*/
const random_string = await  Server_one.Encryption.random_str("any" , 5);
const random_string_sync = Server_one.Encryption.random_str_synchronize("any" , 5);
```





## Server_one.Websocket类

用于websocket连接的处理

#### 操作演示

```javascript
const websocket = new Server_one.WebSocket(); // 创建一个websocket实例
// 当客户端有消息发送过来时会调用message事件绑定的函数,socket是一个内部对象
websocket.addEventListen("message" , (socket) => 
{
    // 客户端的数据会被放在 payloadData 中，不过它是Buffer的形式，可以使用toString函数转换成字符串
    console.log(socket.payloadData.toString());
    socket.write("你也好");
});
// 当客户端发送出错时会调用error事件绑定的函数,socket是一个内部对象
websocket.addEventListen("error" , (socket) => 
{
    // 错误数据会被保存在socket.error中
    console.error(socket.error);
});
// 当客户端连接成功时会调用connect事件绑定的函数,socket是一个内部对象
websocket.addEventListen("connect" , (socket) => 
{
    console.log("connect");
});
// 当客户端连接断开时会调用close事件绑定的函数,socket是一个内部对象
websocket.addEventListen("close" , (socket) => 
{
    console.log("close");
});
app.websocket(websocket); // 将该实例通过websocket函数挂载在app上 , 这样当有ws协议的请求进入时，会自动处理
```

在浏览器，我们可以 : 

```javascript
const socket = new WebSocket("ws://localhost:9898");

    socket.onopen = function ()
    {
        console.log(1)
        socket.send("你好");
    }

    socket.onmessage = function (v)
    {
        console.log(v)
        socket.close();
    }

    socket.onclose = function ()
    {
        console.log('close')
    }
```



目前websocket有 message ， error ， connect ，close 四个事件可以绑定监听函数。

对于回调函数中的socket对象，实际上它是 Server_one_socket 类，但是在框架中并未暴露

#### Server_one_socket 类

它有四个属性和两个函数 : 

```javascript
socket; // 原始socket对象
error; // 当发生错误时的错误对象 默认null
payloadData; // 当获取到数据时的数据流对象
opcode; // 操作类型码

socket.write (buff); // write 函数 ， 可以将数据写回前端 ， 参数为 Buffer类型或 string类型
socket.close () // 结束本次socket连接
```





### 联系方式

无论是有bug或建议还是有技术缺陷可以 ： 2242818464@qq.com 或者直接好友联系 欢迎指正。