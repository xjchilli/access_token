var sha1 = require('sha1');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
 
var prefix = "https://api.weixin.qq.com/cgi-bin/"
var api = {
  access_token:prefix+'token?grant_type=client_credential'
}
 
function Wechat(opts){
  var that = this;
  this.appID = opts.appID;
  this.appSecret = opts.appSecret;
  this.getAccessToken = opts.getAccessToken;
  this.saveAccessToken = opts.saveAccessToken;
 
  return this.getAccessToken()
    .then(function(data){
      try{
        data = JSON.parse(data);
      }
      catch(e){
        return that.updateAccessToken(data);
      }
      if(that.isValidAccessToken(data)){
        return Promise.resolve(data);
      }else{
        return that.updateAccessToken();
      }
    })
    .then(function(data){
      that.access_token = data.access_token;
      that.exprise_in = data.expires_in;
      that.saveAccessToken(data);
      return Promise.resolve(data)
    })
}
 
Wechat.prototype.isValidAccessToken = function(data){
  if(!data || !data.access_token || !data.exprise_in){
    return false;
  }
  var access_token = data.access_token;
  var exprise_in = data.exprise_in;
  var now = (new Date().getTime());
  if(now<exprise_in){
    return true;
  }else{
    return false;
  }
}
 
Wechat.prototype.updateAccessToken = function(){
  var appID = this.appID;
  var appSecret = this.appSecret;
  var url = api.access_token +'&appid='+appID+'&secret'+appSecret;
  return new Promise(function(resolve,reject){
    request({url:url,json:true}).then(function(response){
      var data = response.body;
      var now = (new Date().getTime());
      var expires_in = now + (data.expirse_in-20)*1000;
      data.exprise_in = expires_in;
      resolve(data);
    })
  })
}
 
module.exports = function(opts){
  var wechat = new Wechat(opts);
  return function *(next){
    console.log(this.query);
    var token = opts.token;
    var signature = this.query.signature;
    var nonce = this.query.nonce;
    var timestamp = this.query.timestamp;
    var echostr = this.query.echostr;
    var str = [token,timestamp,nonce].sort().join('');
    var sha = sha1(str);
 
    if(sha === signature){
      this.body = echostr+'';
    }else{
      this.body = 'wrong'
    }
  }
}