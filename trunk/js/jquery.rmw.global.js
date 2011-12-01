/*
 * @author liukaixuan@gmail.com
*/

//已经引入过此文件
//if(typeof(rmw) != 'undefined'){		
//	return ;
//}

/**工具方法*/
var _rmw_encoding_ = {
	
	/* UTF8 encoding/decoding functions
	 * Copyright (c) 2006 by Ali Farhadi.
	 * released under the terms of the Gnu Public License.
	 * see the GPL for details.
	 *
	 * Email: ali[at]farhadi[dot]ir
	 * Website: http://farhadi.ir/
	 */
	
	//an alias of String.fromCharCode
	chr0 : function(code) {
		return String.fromCharCode(code);
	},
	
	//returns utf8 encoded charachter of a unicode value.
	//code must be a number indicating the Unicode value.
	//returned value is a string between 1 and 4 charachters.
	code2utf : function(code){
		if (code < 128) return this.chr0(code);
		if (code < 2048) return this.chr0(192+(code>>6)) + this.chr0(128+(code&63));
		if (code < 65536) return this.chr0(224+(code>>12)) + this.chr0(128+((code>>6)&63)) + this.chr0(128+(code&63));
		if (code < 2097152) return this.chr0(240+(code>>18)) + this.chr0(128+((code>>12)&63)) + this.chr0(128+((code>>6)&63)) + this.chr0(128+(code&63));
	},
	
	//it is a private function for internal use in utf8Encode function 
	utf8Encode0 : function(str){	
		var utf8str = new Array();
		for (var i=0; i<str.length; i++) {
			utf8str[i] = this.code2utf(str.charCodeAt(i));
		}
		return utf8str.join('');
	},
	
	//Encodes a unicode string to UTF8 format.
	utf8Encode : function(str)
	{	
		var utf8str = new Array();
		var pos,j = 0;
		var tmpStr = '';
		
		while ((pos = str.search(/[^\x00-\x7F]/)) != -1) {
			tmpStr = str.match(/([^\x00-\x7F]+[\x00-\x7F]{0,10})+/)[0];
			utf8str[j++] = str.substr(0, pos);
			utf8str[j++] = this.utf8Encode0(tmpStr);
			str = str.substr(pos + tmpStr.length);
		}
		
		utf8str[j++] = str;
		return utf8str.join('');
	},
	
	//it is a private function for internal use in utf8Decode function 
	utf8Decode0 : function(utf8str){	
		var str = new Array();
		var code,code2,code3,code4,j = 0;
		for (var i=0; i<utf8str.length; ) {
			code = utf8str.charCodeAt(i++);
			if (code > 127) code2 = utf8str.charCodeAt(i++);
			if (code > 223) code3 = utf8str.charCodeAt(i++);
			if (code > 239) code4 = utf8str.charCodeAt(i++);
			
			if (code < 128) str[j++]= this.chr0(code);
			else if (code < 224) str[j++] = this.chr0(((code-192)<<6) + (code2-128));
			else if (code < 240) str[j++] = this.chr0(((code-224)<<12) + ((code2-128)<<6) + (code3-128));
			else str[j++] = this.chr0(((code-240)<<18) + ((code2-128)<<12) + ((code3-128)<<6) + (code4-128));
		}
		return str.join('');
	},
	
	//Decodes a UTF8 formated string
	utf8Decode : function(utf8str){
		var str = new Array();
		var pos = 0;
		var tmpStr = '';
		var j=0;
		while ((pos = utf8str.search(/[^\x00-\x7F]/)) != -1) {
			tmpStr = utf8str.match(/([^\x00-\x7F]+[\x00-\x7F]{0,10})+/)[0];
			str[j++]= utf8str.substr(0, pos) + this.utf8Decode0(tmpStr);
			utf8str = utf8str.substr(pos + tmpStr.length);
		}
		
		str[j++] = utf8str;
		return str.join('');
	},
	
	// public method for url encoding
	urlEncode : function(string) {
		return escape(this.utf8Encode(string));
	},
	 
	// public method for url decoding
	urlDecode : function(string) {
		return this.utf8Decode(unescape(string));
	},
	
	/*
	 * Hexadecimal conversion methods. Copyright (c) 2006 by Ali Farhadi. released
	 * under the terms of the Gnu Public License. see the GPL for details.
	 * 
	 * Email: ali[at]farhadi[dot]ir Website: http://farhadi.ir/
	 */
	
	// Encodes data to Hex(base16) format
	hexEncode : function(data) {
		var b16_digits = '0123456789abcdef';
		var b16_map = new Array();
		for ( var i = 0; i < 256; i++) {
			b16_map[i] = b16_digits.charAt(i >> 4) + b16_digits.charAt(i & 15);
		}
	
		var result = new Array();
		for ( var i = 0; i < data.length; i++) {
			result[i] = b16_map[data.charCodeAt(i)];
		}
	
		return result.join('');
	},
	
	// Decodes Hex(base16) formated data
	hexDecode : function(data) {
		var b16_digits = '0123456789abcdef';
		var b16_map = new Array();
		for ( var i = 0; i < 256; i++) {
			b16_map[b16_digits.charAt(i >> 4) + b16_digits.charAt(i & 15)] = String
					.fromCharCode(i);
		}
		if (!data.match(/^[a-f0-9]*$/i))
			return false;// return false if input data is not a valid Hex string
	
		if (data.length % 2)
			data = '0' + data;
	
		var result = new Array();
		var j = 0;
		for ( var i = 0; i < data.length; i += 2) {
			result[j++] = b16_map[data.substr(i, 2)];
		}
	
		return result.join('');
	}

	
} ;

/**工具方法*/
var _rmw_util_ = {
	
	//取cookie值
	getCookie : function(name){ 
	    var arr = document.cookie.match(new RegExp("(^| )"+name+"=([^;]*)(;|$)"));
	    
	    if(arr != null){
	    	return unescape(arr[2]) ;
	    }
	    
	    return null;
	},
	
	isEmpty : function(str){
		if(!str || str == undefined) return true ;
		
		return false ;
	},
	
	getQueryString : function(url, param){
		if(!url) return "" ;
		
		param = param + "=" ;
			
		var startIndex = url.indexOf(param) ;
		if(startIndex == -1) return "" ;
		
		startIndex = startIndex + param.length ;
		
		var endIndex = url.indexOf("&", startIndex) ;
		
		var value ;
		if(endIndex == -1){
			value = url.substring(startIndex, url.length) ;
		}else{
			value = url.substring(startIndex, endIndex) ;
		}
		
		if(value.indexOf("#") != -1){
			value = value.substring(0, value.indexOf("#")) ;
		}
		
		return _rmw_encoding_.urlDecode(value) ;
	},
	
	replaceQueryString : function(url, orginal, toBe){
		if(!url) return "" ;
		
		var startQ = url.indexOf("?") ;
		if(startQ == -1) return url ;
		
		var firstPart = url.substring(0, startQ) ;
		var secondPart = url.substring(startQ, url.length) ;
		
		secondPart = secondPart.replace(orginal, toBe) ;
		
		return firstPart + secondPart ;
	},
	
	resizeToRect : function(jdoms, maxWidth, maxHeight){
		if(!jdoms || jdoms.length < 1) return ;
		
		if(maxWidth < 1) return ;
		if(!maxHeight || maxHeight == undefined || maxHeight < 1) maxHeight = maxWidth ;
				
		jdoms.each(function(event) {
			try{
				var img = new Image();
				img.src = $(this).attr("src");
				
				if(img.width <= maxWidth && img.height <= maxHeight){
					//alert(img.width) ;
					//no changed required.
				}else{
					var rate = Math.max(img.width / maxWidth, img.height / maxHeight) ;
					
					if(rate == 'NaN') return true ;
					
					var changedWidth = img.width / rate ;
					var changedHeight = img.height /rate ;
					
					//接近的数据不在调整大小
					if(Math.abs(changedWidth - img.width) > 1){
						img.width = changedWidth ;
					}				
					if(Math.abs(changedHeight - img.height) > 1){
						img.height = changedHeight ;
					}
					
					delete rate ;
					delete changedWidth ;
					delete changedHeight ;
				}
				
				$(this).attr("width", img.width) ;
				$(this).attr("height", img.height) ;
				
				delete img ;
			}catch(e){}
		}) ;
	}
	
} ;

var _rmw_global_ = {
	
	//客户端机器与服务器的时间偏差，单位：毫秒
	var_local_server_time_minus:0 ,
	
	snsDomain:"http://sns.people.com.cn",
	
	//userNick vs image url
	CACHED_PORTRAITS_URL:{} ,
	
	setSNSDomain : function(domain){
		this.snsDomain = domain ;
	},
	
	setServerTimeInMillSeconds : function(serverTime){
		var currentTime = (new Date()).valueOf(); 
			
		this.var_local_server_time_minus = serverTime - currentTime ;
	},
	
	getLoginUser: function(){
		//read cookie
		var hexUserInfo = _rmw_util_.getCookie("guzz_session_user") ;
		if(!hexUserInfo) return null ;
		
		var guzzLoginUser = eval('(' + _rmw_encoding_.utf8Decode(_rmw_encoding_.hexDecode(hexUserInfo)) + ')');
		if(!guzzLoginUser) return null ;
		
		//pass ssoClient.this to the inner function
		guzzLoginUser.ssoc = this ;
		
		guzzLoginUser.bindPortrait = function(imgJDom) {
			var userNick = this.userNick ;
			if(!userNick) return ;
			
			var t = this.version ;
			var width = imgJDom.attr("imgWidth") ;
			
			var key = userNick + "@" + width + "@" + t ;
			
			imgJDom.bind("error", {ssoc: this.ssoc}, function(event){
				event.preventDefault() ;
				var path = "http://sns.people.com.cn/images/defaultAvatar.gif" ;
				
				//100以上尺度，都返回120的图，以保持清晰度
				if(width >= 100 && width < 180){
					path = "http://sns.people.com.cn/images/defaultAvatar_120X120.gif" ;
				}else if(width >= 180){
					path = "http://sns.people.com.cn/images/defaultAvatar_200X200.gif" ;
				}else if(width == "org"){
					path = "http://sns.people.com.cn/images/defaultAvatar_org.gif" ;
				}
							
				//the default image cann't be loaded, pass the error.
				this.ssoc.CACHED_PORTRAITS_URL[key] = path ;
				
				if($(this).attr("src").indexOf("http://sns.people.com.cn/uploads/avatar/") != -1){
					$(this).unbind("error").attr("src", path) ;
				}
				
			}) ;
			
			var cachedPortrait = this.ssoc.CACHED_PORTRAITS_URL[key] ;
			
			if(cachedPortrait){
				imgJDom.attr("src", cachedPortrait) ;
				
				return ;
			}
			
			try{
				//var startTime = new Date() ;
				var _hex = _rmw_encoding_.hexEncode(_rmw_encoding_.utf8Encode(userNick)) ;
				//alert("decode [" + userNick + "] takes " + (new Date() - startTime) + "ms") ;

				var buffer ;
				
				if (_hex.length < 8) {
					buffer = new Array('0', '0', '0', '0', '0', '0', '0', '0') ;
					
					var paddingZero = 8 - _hex.length ;
					
					for(var i = _hex.length - 1 ; i >= 0 ; i--){
						buffer[paddingZero + i] = _hex.charAt(i) ;
					}
				}else{
					var buffer = new Array() ;
					for(var i = 0 ; i < _hex.length ; i++){
						buffer.push(_hex.charAt(i)) ;
					}
				}
				
				var path = 'http://sns.people.com.cn/uploads/avatar/' + buffer[0] + buffer[1]
				         + '/' + buffer[2] + buffer[3]
				         + '/' + buffer[4] + buffer[5]
				         + '/' ;
				
				for(var i = 6 ; i < buffer.length ; i++){
					path += buffer[i] ;
				}
				
				//100以上尺度，都返回120的图，以保持清晰度
				if(width >= 100 && width < 180){
					path += "_120X120" ;
				}else if(width >= 180){
					path += "_200X200" ;
				}else if(width == "org"){
					path += "_org" ;
				}
				
				path += ".jpg" ;
				
				//with version
				if(t){
					path = path + "?t=" + t ;
				}
				
				this.ssoc.CACHED_PORTRAITS_URL[key] = path ;
				
				imgJDom.attr("src", path) ;
			}catch(e){
				//alert("error:" + e) ;
			}
		} ;
		
		guzzLoginUser.getLoginTime = function() {
			var d = new Date();
			d.setTime(this.loginTime);
			
			return d ;
		} ;
		
		return guzzLoginUser ;
	},
	
	bindUserPortraits: function(jdoms){
		var ssoc = this ;
		
		jdoms.each(function(image) {
			var userNick = $(this).attr("userNick") ;
			var width = $(this).attr("imgWidth") ;
			var t = $(this).attr("t") ;
			
			if(!userNick) return ;
			
			var key = userNick + "@" + width + "@" + t ;
			
			$(this).bind("error", {ssoc: ssoc}, function(event){
				event.preventDefault() ;
				var path = "http://sns.people.com.cn/images/defaultAvatar.gif" ;
				
				//100以上尺度，都返回120的图，以保持清晰度
				if(width >= 100 && width < 180){
					path = "http://sns.people.com.cn/images/defaultAvatar_120X120.gif" ;
				}else if(width >= 180){
					path = "http://sns.people.com.cn/images/defaultAvatar_200X200.gif" ;
				}else if(width == "org"){
					path = "http://sns.people.com.cn/images/defaultAvatar_org.gif" ;
				}
							
				//the default image cann't be loaded, pass the error.
				ssoc.CACHED_PORTRAITS_URL[key] = path ;
				
				if($(this).attr("src").indexOf("http://sns.people.com.cn/uploads/avatar/") != -1){
					$(this).unbind("error").attr("src", path) ;
				}
				
			}) ;
			
			var cachedPortrait = ssoc.CACHED_PORTRAITS_URL[key] ;
			
			if(cachedPortrait){
				$(this).attr("src", cachedPortrait) ;
				
				return ;
			}
			
			try{
				//var startTime = new Date() ;
				var _hex = _rmw_encoding_.hexEncode(_rmw_encoding_.utf8Encode(userNick)) ;
				//alert("decode [" + userNick + "] takes " + (new Date() - startTime) + "ms") ;

				var buffer ;
				
				if (_hex.length < 8) {
					buffer = new Array('0', '0', '0', '0', '0', '0', '0', '0') ;
					
					var paddingZero = 8 - _hex.length ;
					
					for(var i = _hex.length - 1 ; i >= 0 ; i--){
						buffer[paddingZero + i] = _hex.charAt(i) ;
					}
				}else{
					var buffer = new Array() ;
					for(var i = 0 ; i < _hex.length ; i++){
						buffer.push(_hex.charAt(i)) ;
					}
				}
				
				var path = 'http://sns.people.com.cn/uploads/avatar/' + buffer[0] + buffer[1]
				         + '/' + buffer[2] + buffer[3]
				         + '/' + buffer[4] + buffer[5]
				         + '/' ;
				
				for(var i = 6 ; i < buffer.length ; i++){
					path += buffer[i] ;
				}
				
				//100以上尺度，都返回120的图，以保持清晰度
				if(width >= 100 && width < 180){
					path += "_120X120" ;
				}else if(width >= 180){
					path += "_200X200" ;
				}else if(width == "org"){
					path += "_org" ;
				}
				
				path += ".jpg" ;
				
				//with version
				if(t){
					path = path + "?t=" + t ;
				}
				
				ssoc.CACHED_PORTRAITS_URL[key] = path ;
				
				if(_rmw_util_.isEmpty(width)){
					$(this).attr("width", 50) ;
				}
				
				$(this).attr("src", path) ;
			}catch(e){
				//alert("error:" + e) ;
			}
		}) ;
		
		return jdoms ;
	},
	
	getPortraitUrl: function(userNick, width, version){
		if(!userNick) return ;
		
		var key = userNick + "@" + width + "@" + version ;
		
		var cachedPortrait = this.CACHED_PORTRAITS_URL[key] ;
		
		if(cachedPortrait){
			return cachedPortrait;
		}
		
		try{
			var _hex = _rmw_encoding_.hexEncode(_rmw_encoding_.utf8Encode(userNick)) ;
			var buffer ;
			
			if (_hex.length < 8) {
				buffer = new Array('0', '0', '0', '0', '0', '0', '0', '0') ;
				
				var paddingZero = 8 - _hex.length ;
				
				for(var i = _hex.length - 1 ; i >= 0 ; i--){
					buffer[paddingZero + i] = _hex.charAt(i) ;
				}
			}else{
				var buffer = new Array() ;
				for(var i = 0 ; i < _hex.length ; i++){
					buffer.push(_hex.charAt(i)) ;
				}
			}
			
			var path = 'http://sns.people.com.cn/uploads/avatar/' + buffer[0] + buffer[1]
			         + '/' + buffer[2] + buffer[3]
			         + '/' + buffer[4] + buffer[5]
			         + '/' ;
			
			for(var i = 6 ; i < buffer.length ; i++){
				path += buffer[i] ;
			}
			
			//100以上尺度，都返回120的图，以保持清晰度
			if(width >= 100 && width < 180){
				path += "_120X120" ;
			}else if(width >= 180){
				path += "_200X200" ;
			}else if(width == "org"){
				path += "_org" ;
			}
			
			path += ".jpg" ;
			
			//with version
			if(version){
				path = path + "?t=" + version ;
			}
		
			return path ;
		}catch(e){
			//alert("error:" + e) ;
		}
		
		//on error
		var path = "http://sns.people.com.cn/images/defaultAvatar.gif" ;
			
		//100以上尺度，都返回120的图，以保持清晰度
		if(width >= 100 && width < 180){
			path = "http://sns.people.com.cn/images/defaultAvatar_120X120.gif" ;
		}else if(width >= 180){
			path = "http://sns.people.com.cn/images/defaultAvatar_200X200.gif" ;
		}else if(width == "org"){
			path = "http://sns.people.com.cn/images/defaultAvatar_org.gif" ;
		}
		
		return path ;
	},
	
	//translate million seconds to human readable date
	translateMillSeconds : function(jdoms){
		var ssoc = this ;
		
		jdoms.each(function(event){
			var s_time = $(this).text() ;
			
			try{
				//mill-seconds
				var l_time = parseInt(s_time) ;
				
				if(l_time <= 1000 || l_time == 'NaN' ) {
					$(this).text("刚刚") ;
				}else{
					var currentTime = (new Date()).valueOf() + ssoc.var_local_server_time_minus; 
					
					//seconds
					l_time = Math.floor((currentTime - l_time) / 1000) ;
					
					if(l_time < 3){
						$(this).text("刚刚") ;
					}else if(l_time < 60){
						$(this).text(l_time + "秒前") ;
					}else{
						//分钟
						l_time = Math.floor(l_time / 60) ;
						if(l_time < 60){
							$(this).text(l_time + "分钟前") ;
						}else{
							//小时
							l_time = Math.floor(l_time / 60) ;
							if(l_time < 24){
								$(this).text(l_time + "小时前") ;
							}else{
								//天
								l_time = Math.floor(l_time / 24) ;
								
								if(l_time < 7){
									$(this).text(l_time + "天前") ;
								}else if(l_time < 14){
									$(this).text("一周前") ;
								}else if(l_time < 21){
									$(this).text("两周前") ;
								}else if(l_time < 28){
									$(this).text("三周前") ;
								}else if(l_time < 60){
									$(this).text("一个月前") ;
								}else if(l_time < 365){
									//月
									l_time = Math.floor(l_time / 30) ;
									$(this).text(l_time + "个月前") ;
								}else if(l_time < 731){
									$(this).text("一年前") ;
								}else{
									$(this).text("很久以前") ;
								}
							}
						}
					}
				}
			}catch(e){
				//alert("error:" + e) ;
			}
		}) ;
		
		return jdoms ;
	}
	
} ;


var _rmw_sns_ = {
	
	//setup friends' relationships with me
	checkRSWithMe : function(jHrefs, checkWithMeURL){
		var userNicks = new Array() ;
			
		var guzzLoginUser = _rmw_global_.getLoginUser() ;
		if(!guzzLoginUser){
			return ;
		}
		
		var loginUserNick = guzzLoginUser.userNick ;
			
		if(_rmw_util_.isEmpty(checkWithMeURL)){
			checkWithMeURL = "http://sns.people.com.cn/api/checkWithMe.do" ;
		}

		jHrefs.each(function(event){
			   var href = $(this).attr("href") ;
			   var userNick = _rmw_util_.getQueryString(href, "userNick") ;
			   
			   if(userNick){
				   //检查重复
				   for(var i = 0 ; i < userNicks.length ; i++){
					   if(userNicks[i] == userNick){
						   return ;
					   }
				   }
				   
				   userNicks.push(userNick) ;
			   }
		});
		
		if(userNicks.length > 0){
			//send a AJAX request to update these guys's relationships with me.
			 $.ajax({
			   		url : checkWithMeURL ,
			   		type: "GET",
			   		data : {"userNicks" : userNicks},
					dataType: "jsonp",
			   		jHrefs : jHrefs,
			   		success: function(map){
			   			if(map["error"]){
			   				return ;
			   			}
			   		
			   			jHrefs.each(function(event){
			 			   var href = $(this).attr("href") ;
			 			   var userNick = _rmw_util_.getQueryString(href, "userNick") ;
			 			   
			 			   var myFriend = map[userNick] ;
			 			   			 			   
			 			   if(myFriend){
			 				   if(myFriend.paired){
			 					  $(this).replaceWith("<img src='http://sns.people.com.cn/imagesnew/xhgz.png' title='我和 " + userNick + " 相互关注中' />") ;
			 				   }else if(myFriend.closedFriend){
			 					  $(this).replaceWith("<img src='http://sns.people.com.cn/imagesnew/ytbgz.png' title='我已特别关注 " + userNick + "' />") ;
			 				   }else{
			 					  $(this).replaceWith("<img src='http://sns.people.com.cn/imagesnew/ygz.png' title='我已关注 " + userNick + "' />") ;
			 				   }
			 			   }
			 			   
			 			   if(userNick == loginUserNick){
			 				  $(this).css("display", "none") ;
			 			   }
			 		  });
			   		}
			});
		}
	}, 
		
	/**
	* 绑定关注，取消关注，特别关注，取消特别关注的操作到href上。
	*/
	bindFollowActions : function(jHrefs, imgsFolder){
		if(_rmw_util_.isEmpty(imgsFolder)){
			imgsFolder = "http://sns.people.com.cn/imagesnew/" ;
		}
	
		jHrefs.bind("click", function(event){
		   var href = $(this).attr("href") ;
		   
		   var action = _rmw_util_.getQueryString(href, "action") ;
		   
		   if(action == "follow"){
			   var html = $(this).html() ;
			   
			   $(this).replaceWith("<img src='" + imgsFolder + "ygz.png'/>") ;
		   }else if(action == "unfollow"){
			   var html = $(this).html() ;
			   $(this).html(html.replace("取消关注", "关注").replace("qxgz.png", "gz.png")) ;
			   
			   $(this).removeClass("followed").addClass("unfollowed").attr("href", _rmw_util_.replaceQueryString(href, "unfollow", "follow")) ;
		   }else if(action == "closefollow"){
			   var html = $(this).html() ;
			   
			   $(this).replaceWith("<img src='" + imgsFolder + "ytbgz.png'/>") ;
			   
		   }else if(action == "unclosefollow"){
			   var html = $(this).html() ;
			   $(this).html(html.replace("取消特别关注", "特别关注").replace("qxtbgz.png", "tbgz.png")) ;
			   
			   $(this).attr("href", _rmw_util_.replaceQueryString(href, "unclosefollow", "closefollow")) ;
		   }else{
		   		return true ;
		   }
			   
		   event.preventDefault() ;
		   
		   $.ajax({
			   	url : href ,
			   	type: "GET",
				dataType: "jsonp",
			   	cache: false
			});
		   
			return false ;
	    });
		
		return jHrefs ;
	},
	
	/*说明：可以让指定的层浮动到网页上的任何位置，当滚动条滚动时它会保持在当前位置不变，不会产生闪动*/
	/*调用：
	1 无参数调用：默认浮动在右下角
	$("#id").floatdiv();
	2 内置固定位置浮动
	//右下角
	$("#id").floatdiv("rightbottom");
	//左下角
	$("#id").floatdiv("leftbottom");
	//右下角
	$("#id").floatdiv("rightbottom");
	//左上角
	$("#id").floatdiv("lefttop");
	//右上角
	$("#id").floatdiv("righttop");
	//居中
	$("#id").floatdiv("middle");
	另外新添加了四个新的固定位置方法
	middletop（居中置顶）、middlebottom（居中置低）、leftmiddle、rightmiddle
	3 自定义位置浮动
	$("#id").floatdiv({left:"10px",top:"10px"});
	以上参数，设置浮动层在left 10个像素,top 10个像素的位置
	*/
	floatDiv : function(location, left, top2){
		//判断浏览器版本
		var isIE6=false;
		var Sys = {};
	    var ua = navigator.userAgent.toLowerCase();
	    var s;
	    (s = ua.match(/msie ([\d.]+)/)) ? Sys.ie = s[1] : 0;
		if(Sys.ie && Sys.ie=="6.0"){
			isIE6=true;
		}
		
		if(!left){
			left = 0 ;
		}
		
		if(!top2){
			top2 = 0 ;
		}
		
		var windowWidth,windowHeight;//窗口的高和宽
		//取得窗口的高和宽
		if (self.innerHeight) {
			windowWidth=self.innerWidth;
			windowHeight=self.innerHeight;
		}else if (document.documentElement&&document.documentElement.clientHeight) {
			windowWidth=document.documentElement.clientWidth;
			windowHeight=document.documentElement.clientHeight;
		} else if (document.body) {
			windowWidth=document.body.clientWidth;
			windowHeight=document.body.clientHeight;
		}
		
		
		return this.floatedDivDom.each(function(){
			var loc;//层的绝对定位位置
			var wrap=$("<div></div>");
			var top=-1;
			if(location==undefined || location.constructor == String){
				switch(location){
					case("rightbottom")://右下角
						loc={position: "relative",right:left,bottom:top2};
						break;
					case("leftbottom")://左下角
						loc={position: "relative",left:left,bottom:top2};
						break;	
					case("lefttop")://左上角
						loc={position: "relative",left:left,top:top2};
						top=0;
						break;
					case("righttop")://右上角
						loc={position: "relative",right:left,top:top2};
						top=0;
						break;
					case("middletop")://居中置顶
						loc={left:windowWidth/2-this.floatedDivDom.width()/2+"px",top:"0px"};
						top=0;
						break;
					case("middlebottom")://居中置低
						loc={left:windowWidth/2-this.floatedDivDom.width()/2+"px",bottom:"0px"};
						break;
					case("leftmiddle")://左边居中
						loc={left:"0px",top:windowHeight/2-this.floatedDivDom.height()/2+"px"};
						top=windowHeight/2-this.floatedDivDom.height()/2;
						break;
					case("rightmiddle")://右边居中
						loc={right:"0px",top:windowHeight/2-this.floatedDivDom.height()/2+"px"};
						top=windowHeight/2-this.floatedDivDom.height()/2;
						break;
					case("middle")://居中
						var l=0;//居左
						var t=0;//居上
						l=windowWidth/2-this.floatedDivDom.width()/2;
						t=windowHeight/2-this.floatedDivDom.height()/2;
						top=t;
						loc={left:l+"px",top:t+"px"};
						break;
					default://默认为右下角
						location="rightbottom";
						loc={right:"0px",bottom:"0px"};
						break;
				}
			}else{
				loc=location;
				var str=loc.top;
				//09-11-5修改：加上top为空值时的判断
				if (typeof(str)!= 'undefined'){
					str=str.replace("px","");
					top=str;
				}
			}
			/*fied ie6 css hack*/
			if(isIE6){
				if (top>=0)
				{
					wrap=$("<div style=\"top:expression(documentElement.scrollTop+"+top+");\"></div>");
				}else{
					wrap=$("<div style=\"top:expression(documentElement.scrollTop+documentElement.clientHeight-this.offsetHeight);\"></div>");
				}
			}
			rmw.sns._sns_newsNotify_body.append(wrap);
			
			wrap.css(loc).css({position:"fixed",
				z_index:"999"});
			if (isIE6)
			{
				wrap.css("position","absolute");
				//没有加这个的话，ie6使用表达式时就会发现跳动现象
				//至于为什么要加这个，还有为什么要加nothing.txt这个，偶也不知道，希望知道的同学可以告诉我
				rmw.sns._sns_newsNotify_body.css("background-attachment","fixed").css("background-image","url(n1othing.txt)");
			}
			//将要固定的层添加到固定层里
			rmw.sns.floatedDivDom.appendTo(wrap);
		});
	},
	
	startNewsNotify : function(left,top, bodyJDom){
		if(typeof(bodyJDom) == 'function'){
			//custom callback
			this._sns_newsNotify_body = bodyJDom;
		}else{
			if(!this.floatedDivDom){
				this.floatedDivDom = $("<div></div>") ;
			}else{
				this.floatedDivDom.attr("style", "display:block;") ;
			}
			
			this._sns_newsNotify_left = left;
			this._sns_newsNotify_top = top;
			
			if(bodyJDom){
				this._sns_newsNotify_body = bodyJDom;
			}else{
				this._sns_newsNotify_body = $("body") ;
			}
		}
		
		this.__sns__getmessage();
        
        this.timerId = setInterval("rmw.sns.__sns__getmessage();",10000); //定时器
        
        if(typeof(bodyJDom) != 'function'){
		    $("#closeNews").live("click", function(timerId){
		    	rmw.sns.floatedDivDom.attr("style", "display:none");
		    	
			  	clearInterval(rmw.sns.timerId);
		    });
	    }
	},
	
	__sns__getmessage : function(){
		var guzzLoginUser = _rmw_global_.getLoginUser() ;
		if(!guzzLoginUser){
			return ;
		}
		
		var userNick = guzzLoginUser.userNick ;
		
		if(typeof(_rmw_sns_._sns_newsNotify_body) == 'function'){
			//custom callback
			$.ajax({
				url : _rmw_global_.snsDomain + "/api/myJsonNews.do" ,
				type: "GET",
				cache: false, 
				data : {"userNick" : userNick,"snsDomain":_rmw_global_.snsDomain},
				dataType: "jsonp",
				success: function(map) {
					_rmw_sns_._sns_newsNotify_body(map);
				}
			});
		}else{
			this.floatDiv("righttop",this._sns_newsNotify_left,this._sns_newsNotify_top) ;
		
			$.ajax({
				url : _rmw_global_.snsDomain + "/api/other/myNews.do" ,
				type: "GET",
				cache: false, 
				data : {"userNick" : userNick,"snsDomain":_rmw_global_.snsDomain},
				dataType: "jsonp",
				success: function(map) {
					rmw.sns.floatedDivDom.html(map);
				}
			});
		}
	}
	
} ;

var rmw = {
	global : _rmw_global_,
	util   : _rmw_util_,
	encode : _rmw_encoding_,
	sns : _rmw_sns_
} ;

