
var express = require('express');
var fs      = require('fs');
var cheerio = require('cheerio');
var superagent = require('superagent');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var schedule = require('node-schedule');


/**
 *  定义爬虫程序
 */
var SampleApp = function() {

    //  Scope.
    var self = this;

    /**
     *  定义服务器的IP地址和接口
     */
    self.setupVariables = function() {
        self.ipaddress = "114.215.89.172";
        self.port      = 80 || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };


    /**
     *  缓存静态文件
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        self.zcache['index.html'] = fs.readFileSync('./index.html');
        self.zcache['login.html'] = fs.readFileSync('./login.html');
        self.zcache['page1.html'] = fs.readFileSync('./page1.html');        
    };


    /**
     *  获取缓存文件
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  创建路由列表
     */
    self.createRoutes = function() {

        //此函数用来判断cookies，如果已登录则跳转到url上，否则跳转到登陆页面
        self.resSendFile = function(req, res, url){
          if (req.cookies.name_id == "zhaoyan") {
            res.send(self.cache_get(url));
            // res.sendFile(__dirname + "/" + url);
          } else {
            res.redirect('/login');
            // res.sendFile(__dirname + "/" + "login.html");
          }
        }

        self.routes = { };

        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            self.resSendFile(req, res,'page1.html' );
        };

        self.routes['/index'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            self.resSendFile(req, res,'page1.html' );
        };

        self.routes['/hello'] = function(req,res){
            res.send('hello world');
        };

        self.routes['/login'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('login.html'));
        };
    };

    /**
    * 创建所有的ajax请求和反馈
    *
    */
    self.createAjax = function(){
        /*
        *登录验证
        */
        self.app.post('/login',function(req,res){
              if (req.body.name == "zhaoyan" && req.body.password == "zhaoyan") {
                res.cookie("name_id", "zhaoyan");
                // res.redirect('index');
                res.send("success");
              } else {
                    res.send("用户名或密码错误");
              };
        });
        /*
        *获取赶集网的所有大类
        */
        self.app.get('/ganjicatergarylist', function(req, res) {
          var urlList = [];
          superagent.get('http://bj.ganji.com/zhaopin/')
            .end(function(err, sres) {
              if (err) {
                // return next(err)
              };
              var $ = cheerio.load(sres.text);
              $('.f-all-news dt a').each(function(idx, element) {
                urlList.push({
                  name: $(this).text(),
                  url: 'http://bj.ganji.com' + $(this).attr('href')
                });
              });
              res.send(urlList);

              resultBuffer = JSON.stringify({
                urlList: urlList
              });

              fs.writeFile('./data/ganji-category.json', resultBuffer, function(err) {
                if (err) throw err;
                // console.log(resultBuffer);
              });
            })
        });

        /*
        * 获取赶集网的某个大类中的所有公司列表
        */
        self.app.post('/catatery', function(req, res) {
              var url = req.body.url
              var campanyList;

              fs.readFile('./data/ganji-category-company.json', function(err, data) {
                var jsonObj = JSON.parse(data);
                var urlList = jsonObj.urlList;

                if (urlList != 'undefined') {
                  urlList.map(function(category) {
                    if (category.url == url) {
                      campanyList = category.campanyList;
                    }
                  })
                  // console.log(campanyList);
                  res.send(campanyList);
                } else {
                  res.send({});
                  console.log("kong shu ju");
                }
              });
        });
        /*
        * 查询服务器的时间
        */
        self.app.get('/getTime', function(req, res) {
            var time = new Date();
            var d = time.getDate();
            var h = time.getHours();
            var m = time.getMinutes();
            var s = time.getSeconds();
            res.send(time+'\n'+d+'-'+h+':'+m+':'+s);
        });

        };

    /**
     * 创建定时任务
     */
    self.createSchedule = function(){
        self.schedule = {};

        /**
         * 定时获取赶集网所有发免费招聘帖的公司
         */
        self.schedule.getAllGanjiData = function(){
            var rule = new schedule.RecurrenceRule();
            rule.dayOfWeek = [0, new schedule.Range(1, 6)];
            rule.hour = 23;
            rule.minute = 26;　
            var j = schedule.scheduleJob(rule,ganjiTask);
        }

        function ganjiTask(){
          console.log('定时任务开始');
          var urlList = [];

          superagent.get('http://bj.ganji.com/zhaopin/')
            .end(function(err, sres) {
              if (err) {
                // return next(err)
                console.log(err);
                j.cancel();
                rule.minute+=10;
                j = schedule.scheduleJob(rule,ganjiTask);
              }else if(sres.ok){
                      var $ = cheerio.load(sres.text);
                      $('.f-all-news dt a').each(function(idx, element) {
                        urlList.push({
                          name: $(this).text(),
                          url: 'http://bj.ganji.com' + $(this).attr('href')
                        });
                      });

                      //把数据写入到缓存中
                      var resultBuffer = JSON.stringify({
                        urlList: urlList
                      });
                      fs.writeFile('./data/ganji-category.json', resultBuffer, function(err) {
                        if (err) throw err;
                        console.log('把数据写入到ganji-category.json中');
                      });

                      var i = 0
                      getUrl(urlList[i].url, cb)

                      function cb() {
                        urlList[i].campanyList = thisList;

                        //把数据写入到缓存中
                        resultBuffer = JSON.stringify({
                          urlList: urlList
                        });
                        fs.writeFile('./data/ganji-category-company.json', resultBuffer, function(err) {
                          if (err) throw err;
                          // console.log(resultBuffer);
                        });

                        thisList = [];
                        i++;
                        if (i < urlList.length) {
                          getUrl(urlList[i].url, cb);
                        }
                      };

                      　　　　
                      var allCompanyList = [];
                      var thisList = [];

                      function getUrl(url, callback) {
                        superagent.get(url)
                          .end(function(err, sres) {
                            // 常规的错误处理
                            if (err) {
                              console.log(err);
                              callback();
                            }else if(sres.ok){
                                var $ = cheerio.load(sres.text);

                                $('.job-list').each(function(idx, element) {
                                  var $element = $(element);
                                  if ($(this).find('.company .ico-bang-new').length > 0) {} else {
                                    var $thiscompany = $(this).find('.company a');
                                    thisList.push({
                                      companyName: $thiscompany.attr('title'),
                                      companyHref: $thiscompany.attr('href')
                                    });
                                    allCompanyList.push({
                                      companyName: $thiscompany.attr('title'),
                                      companyHref: $thiscompany.attr('href')
                                    });
                                  }
                                });
                                if ($('.pageLink .next').length > 0) {
                                  var newurl = 'http://bj.ganji.com' + $('.pageLink .next').attr('href');
                                  var delay = parseInt((Math.random() * 20000000) % 2000, 10);
                                  setTimeout(function() {
                                    getUrl(newurl, callback);
                                    console.log(newurl);
                                  }, delay);
                                } else {
                                  callback();
                                }
                            }else{
                               console.log('本类别终止，进入下个类别抓取');
                               callback();
                            }
                            
                          });
                      }
              }else{
                j.cancel();
                rule.minute+=10;
                j = schedule.scheduleJob(rule,ganjiTask);
              };
              
            })

        };

        /**
         * 初始化
         */
        self.schedule.init = function(){
            self.schedule.getAllGanjiData();
            console.log("初始化定时任务");
        };
        self.schedule.init();

    }

    /**
     *  初始化express，创建路由，注册函数
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();

        //指定静态文件
        self.app.use(express.static('static'));
        self.app.use(express.static('node_modules'));
        self.app.use(cookieParser());

        self.app.use(bodyParser.json());
        self.app.use(bodyParser.urlencoded({
            extended: false
        }));

        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        };

        self.createAjax();
        self.createSchedule();
    };


    /**
     *  初始化应用程序
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  启动服务器.
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};



/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();

