
function TaskRunner() {
}
	
TaskRunner.prototype.init = function() {
	this.pollIntervalMin = 1000 * 60;  // 1 minute
	this.pollIntervalMax = 1000 * 60 * 10;  // 10 minutes
	this.requestFailureCount = 0;  // used for exponential backoff
	this.requestTimeout = 1000 * 5;  // 5 seconds
	this.unreadCount = -1;
	this.requestTimerId = null;
	this.errorMsg = null ;
	this.stopped = false ;
	
	this.startRequest();
} ;

TaskRunner.prototype.destory = function() {
	this.stopped = true ;

	if (this.requestTimerId) {
		window.clearTimeout(this.requestTimerId);
	}
} ;

TaskRunner.prototype.scheduleRequest = function() {
	if (this.requestTimerId) {
		window.clearTimeout(this.requestTimerId);
	}

	if(this.stopped) return ;
	
	var randomness = Math.random() * 2;
	var exponent = Math.pow(2, this.requestFailureCount);
	var multiplier = Math.max(randomness * exponent, 1);
	var delay = Math.min(multiplier * this.pollIntervalMin, this.pollIntervalMax);
	delay = Math.round(delay);

	var owner = this ;
	
	this.requestTimerId = window.setTimeout(function(){
		owner.startRequest() ;
	}, delay);
} ;

// ajax stuff
TaskRunner.prototype.startRequest = function() {
	this.internalRunTask(true) ;
    this.scheduleRequest();
} ;
	
TaskRunner.prototype.manualCheckNow = function(){
	this.internalRunTask(false) ;
} ;

TaskRunner.prototype.internalRunTask = function(shouldNotifyError) {
	if(this.stopped) return ;

	var xhr = new XMLHttpRequest();
	var abortTimerId = window.setTimeout(function() {
	  xhr.abort();  // synchronously calls onreadystatechange
	}, this.requestTimeout);

	function handleSuccess(runner, data) {
		runner.requestFailureCount = 0;
	    window.clearTimeout(this.abortTimerId);
	    
	    runner.updateUnreadCount(data) ;
	}

	var invokedErrorCallback = false;
	function handleError(runner, errorMsg) {
		runner.requestFailureCount++;
	    window.clearTimeout(runner.abortTimerId);
	    if (shouldNotifyError && !invokedErrorCallback){
	    	runner.updateToError(errorMsg) ;
	    }
	    
	    invokedErrorCallback = true;
	}

	try {
		console.debug("this.checkUnreadNotifications:" + typeof(this.checkUnreadNotifications)) ;
		this.checkUnreadNotifications(this, xhr, handleSuccess, handleError) ;
	} catch(e) {
		console.error("check exception", e);
		handleError(this);
	}
} ;

TaskRunner.prototype.updateToError = function(errorMsg) {
	this.unreadCount = -1;
	
	globalNotifyError(this.appName, this.errorMsg) ;
} ;

/****************************************Gmail**************************************************/
function GmailChecker(){
	this.appName = "gmail" ;
}
GmailChecker.prototype = new TaskRunner() ;
GmailChecker.prototype.constructor = GmailChecker ;

GmailChecker.prototype.start = function(){
	// Identifier used to debug the possibility of multiple instances of the
	// extension making requests on behalf of a single user.
	this.instanceId = 'gmc' + parseInt(Date.now() * Math.random(), 10);
	
	this.init() ;	
} ;

GmailChecker.prototype.tabsUpdated = function(tabId, changeInfo){
	if (changeInfo.url && this.isGmailUrl(changeInfo.url)) {
		this.manualCheckNow() ;
	}
} ;

GmailChecker.prototype.goToInbox = function() {
	var owner = this ;
	
	chrome.tabs.getAllInWindow(undefined, function(tabs) {
	    for (var i = 0, tab; tab = tabs[i]; i++) {
	      if (tab.url && owner.isGmailUrl(tab.url)) {
	        chrome.tabs.update(tab.id, {selected: true});
	        return;
	      }
	    }
	    
	    chrome.tabs.create({url: owner.getGmailUrl()});
	});
} ;

GmailChecker.prototype.updateUnreadCount = function(count) {
	count = parseInt(count) ;
	
	if (this.unreadCount != count) {
		this.unreadCount = count;
		
		var data = [{"unReadCount" : count,
					"icon" : "",
					"text" : count + chrome.i18n.getMessage("newMails"),
					"link" : this.getGmailUrl()
		}] ;
		
		globalNotifyUnreadMessage(this.appName, data);
	}
} ;

GmailChecker.prototype.checkUnreadNotifications = function(runner, xhr, handleSuccess, handleError){
		console.debug("checkUnreadNotifications called") ;
		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4)
				return;
			if (xhr.responseXML) {
				var xmlDoc = xhr.responseXML;
				var fullCountSet = xmlDoc.evaluate(
						"/gmail:feed/gmail:fullcount", xmlDoc, function(prefix) {
							if(prefix == 'gmail') {
								return 'http://purl.org/atom/ns#';
							}
						},
						XPathResult.ANY_TYPE, null);
				var fullCountNode = fullCountSet.iterateNext();
				if (fullCountNode) {
					handleSuccess(runner,fullCountNode.textContent);
					return;
				} else {
					console.error("gmailcheck_node_error");
				}
			}
	
			handleError(runner);
		};

		xhr.onerror = function(error) {
			handleError(runner);
		};
	
		xhr.open("GET", runner.getFeedUrl(), true);
		xhr.send(null);
} ;

GmailChecker.prototype.getGmailUrl = function() {
	var url = "https://mail.google.com/";
	if (localStorage.customDomain)
		url += localStorage.customDomain + "/";
	else
		url += "mail/" ;
	return url;
} ;

GmailChecker.prototype.getFeedUrl = function() {
	// "zx" is a Gmail query parameter that is expected to contain a random
	// string and may be ignored/stripped.
	return this.getGmailUrl() + "feed/atom?zx=" + encodeURIComponent(this.instanceId);
} ;

GmailChecker.prototype.isGmailUrl = function(url) {
	// This is the Gmail we're looking for if:
	// - starts with the correct gmail url
	// - doesn't contain any other path chars
	var gmail = this.getGmailUrl();
	if (url.indexOf(gmail) != 0)
		return false;
	
	return url.length == gmail.length || url[gmail.length] == '?' ||url[gmail.length] == '#';
} ;

GmailChecker.prototype.getSiteInfo = function() {
	return {"text" : "Gmail", "icon" : "/images/mail.ico" ,"loginUrl" : "http://www.gmail.com/"} ;
} ;

/****************************************Facebook**************************************************/
function FacebookChecker(){
	this.appName = "facebook" ;
}
FacebookChecker.prototype = new TaskRunner() ;
FacebookChecker.prototype.constructor = FacebookChecker ;

FacebookChecker.prototype.start = function(){	
	this.init() ;	
} ;

FacebookChecker.prototype.tabsUpdated = function(tabId, changeInfo){
	if (changeInfo.url && changeInfo.url.indexOf("http://www.facebook.com/") != -1) {
		this.manualCheckNow() ;
	}
} ;

FacebookChecker.prototype.goToInbox = function() {
	var owner = this ;
	var inboxUrl = "http://www.facebook.com/notifications" ;
	
	chrome.tabs.getAllInWindow(undefined, function(tabs) {
	    for (var i = 0, tab; tab = tabs[i]; i++) {
	      if (tab.url && tab.ur.indexOf(inboxUrl) != -1) {
	        chrome.tabs.update(tab.id, {selected: true});
	        return;
	      }
	    }
	    
	    chrome.tabs.create({url: inboxUrl});
	});
} ;

FacebookChecker.prototype.updateUnreadCount = function(count) {
	count = parseInt(count) ;
	
	if (this.unreadCount != count) {
		this.unreadCount = count;
		
		var data = [{"unReadCount" : count,
					"icon" : "",
					"text" : count + chrome.i18n.getMessage("newNotifications"),
					"link" : "http://www.facebook.com/notifications"
		}] ;
		
		globalNotifyUnreadMessage(this.appName, data);
	}
} ;

FacebookChecker.prototype.checkUnreadNotifications = function(runner, xhr, handleSuccess, handleError){
		console.debug(this.appName + " checkUnreadNotifications called") ;
		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4)
				return;
			if (xhr.responseText) {
				var textDoc = xhr.responseText;
				
				try{
					textDoc = textDoc.substr(textDoc.indexOf("{")) ;
					
					var json = JSON.parse(textDoc);
					if(json){
						if(json.errorSummary){
							handleError(runner, json.errorSummary);
							return ;
						}else if(json.payload){
							var m_notifications = json.payload.notifications ;
							var m_count = 0 ;
							
							for(index in m_notifications){
								m_count += m_notifications[index].unread ;
							}
							
							handleSuccess(runner, m_count);
							return ;
						}
					}
				}catch(e){
					//format changed
					handleError(runner, chrome.i18n.getMessage("needUpgrade"));
					return ;
				}
			}
	
			handleError(runner);
		};

		xhr.onerror = function(error) {
			handleError(runner);
		};
	
		xhr.open("GET", "http://www.facebook.com/ajax/notifications/get.php?time=0&version=2&__a=1", true);
		xhr.send(null);
} ;

FacebookChecker.prototype.getSiteInfo = function() {
	return {"text" : "Facebook", "icon" : "/images/facebook.ico", "loginUrl" : "http://www.facebook.com/"} ;
} ;

/****************************************Hotmail**************************************************/
function HotmailChecker(){
	this.appName = "hotmail" ;
}
HotmailChecker.prototype = new TaskRunner() ;
HotmailChecker.prototype.constructor = HotmailChecker ;

HotmailChecker.prototype.start = function(){
	this.init() ;
	this.pollIntervalMin = 1000 * 60 * 5; //5 minutes
} ;

HotmailChecker.prototype.tabsUpdated = function(tabId, changeInfo){
	if (changeInfo.url && changeInfo.url.indexOf("mail.live.com/") != -1) {
		this.manualCheckNow() ;
	}
} ;

HotmailChecker.prototype.goToInbox = function() {
	var owner = this ;
	var inboxUrl = "mail.live.com/" ;
	
	chrome.tabs.getAllInWindow(undefined, function(tabs) {
	    for (var i = 0, tab; tab = tabs[i]; i++) {
	      if (tab.url && tab.ur.indexOf(inboxUrl) != -1) {
	        chrome.tabs.update(tab.id, {selected: true});
	        return;
	      }
	    }
	    
	    chrome.tabs.create({url: "http://mail.live.com/"});
	});
} ;

HotmailChecker.prototype.updateUnreadCount = function(count) {
	count = parseInt(count) ;
	
	if (this.unreadCount != count) {
		this.unreadCount = count;
		
		var data = [{"unReadCount" : count,
					"icon" : "",
					"text" : count + chrome.i18n.getMessage("newMails"),
					"link" : "http://sn107w.snt107.mail.live.com/default.aspx"
		}] ;
		
		globalNotifyUnreadMessage(this.appName, data);
	}
} ;

HotmailChecker.prototype.checkUnreadNotifications = function(runner, xhr, handleSuccess, handleError){
		console.debug(this.appName + " checkUnreadNotifications called") ;
		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4)
				return;
			if (xhr.responseText) {
				//
				var textDoc = xhr.responseText;
				
				try{
					var pos = textDoc.indexOf("class=\"lnav_topItemLnk\"") ;
					
					if(pos == -1){
						handleError(runner);
						return ;
					}
					
					pos = textDoc.indexOf("(<span>", pos) ;
					if(pos > 0){
						pos += "(<span>".length ;
						endPos = textDoc.indexOf("</span>)", pos) ;
						var len = endPos - pos ;
						
						var count = textDoc.substr(pos, len) ;
						
						console.debug("found " + count + " new mails for hotmail.") ;
						
						if(count){
							handleSuccess(runner, parseInt(count));
						}else{
							handleSuccess(runner, 0);
						}

						return ;
					}
				}catch(e){
					//format changed
					handleError(runner, chrome.i18n.getMessage("needUpgrade"));
					return ;
				}
			}else{
				//Hotmail is not stable. Sometimes you are logged in but it returns ""; sometimes it returns the right content.
				//Ingore this time.
				return ;
			}
	
			handleError(runner);
		};

		xhr.onerror = function(error) {
			handleError(runner);
		};
	
		xhr.open("GET", "http://sn107w.snt107.mail.live.com/default.aspx", true);
		xhr.send(null);
} ;

HotmailChecker.prototype.getSiteInfo = function() {
	return {"text" : "Hotmail", "icon" : "/images/hotmail.ico", "loginUrl" : "http://www.hotmail.com/"} ;
} ;

/****************************************Yahoo Mail**************************************************/
function YahooMailChecker(){
	this.appName = "yahoom" ;
}
YahooMailChecker.prototype = new TaskRunner() ;
YahooMailChecker.prototype.constructor = YahooMailChecker ;

YahooMailChecker.prototype.start = function(){
	this.init() ;
	this.pollIntervalMin = 1000 * 60 * 1; //1 minutes
	this.requestTimeout = this.requestTimeout * 2 ;
	this.wwssid = "" ;
} ;

YahooMailChecker.prototype.tabsUpdated = function(tabId, changeInfo){
	if (changeInfo.url && changeInfo.url.indexOf("mail.yahoo.com/") != -1) {
		this.manualCheckNow() ;
	}
} ;

YahooMailChecker.prototype.goToInbox = function() {
	var owner = this ;
	var inboxUrl = "mail.yahoo.com/" ;
	
	chrome.tabs.getAllInWindow(undefined, function(tabs) {
	    for (var i = 0, tab; tab = tabs[i]; i++) {
	      if (tab.url && tab.ur.indexOf(inboxUrl) != -1) {
	        chrome.tabs.update(tab.id, {selected: true});
	        return;
	      }
	    }
	    
	    chrome.tabs.create({url: "http://mail.yahoo.com/"});
	});
} ;

YahooMailChecker.prototype.updateUnreadCount = function(count) {
	count = parseInt(count) ;
	
	if (this.unreadCount != count) {
		this.unreadCount = count;
		
		var data = [{"unReadCount" : count,
					"icon" : "",
					"text" : count + chrome.i18n.getMessage("newMails"),
					"link" : "http://mail.yahoo.com/"
		}] ;
		
		globalNotifyUnreadMessage(this.appName, data);
	}
} ;

YahooMailChecker.prototype.checkUnreadNotifications = function(runner, xhr, handleSuccess, handleError){
		console.debug(this.appName + " checkUnreadNotifications called") ;
		
		if(!runner.wwssid || runner.wwssid == ""){
			xhr.abort() ;
			runner.computWwssid(runner, handleSuccess, handleError) ;
			return ;
		}
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4)
				return;
			if (xhr.responseText) {
				//
				var textDoc = xhr.responseText;
				
				try{
					var json = JSON.parse(textDoc);
					if(json){
						if(json.message){
							runner.wwssid = "" ;
							handleError(runner, json.message);
							return ;
						}else if(json.folder){
							var m_notifications = json.folder ;
							var m_count = 0 ;
							
							for(index in m_notifications){
								if(m_notifications[index].unread > 0){
									if(!m_notifications[index].isSystem || m_notifications[index].folderInfo.fid == "Inbox"){
										m_count += m_notifications[index].unread ;
									}
								}
							}
							
							handleSuccess(runner, m_count);
							return ;
						}
					}
				}catch(e){
					//format changed
					runner.wwssid = "" ;
					handleError(runner, chrome.i18n.getMessage("needUpgrade"));
					return ;
				}
			}
	
			handleError(runner);
		};

		xhr.onerror = function(error) {
			handleError(runner);
		};
	
		xhr.open("GET", "http://us.mg5.mail.yahoo.com/ws/mail/v2.0/formrpc?appid=YahooMailNeo&m=ListFolders&o=json&resetMessengerUnseen=true&wssid=" + runner.wwssid, true);
		xhr.send(null);
} ;

YahooMailChecker.prototype.computWwssid = function(runner, handleSuccess, handleError){
	console.debug(runner.appName + " computing wwssid.") ;
	
	var xhr = new XMLHttpRequest();
	var abortWwssidTimerId = window.setTimeout(function() {
	  xhr.abort();  // synchronously calls onreadystatechange
	}, runner.requestTimeout / 2);
	
	xhr.onreadystatechange = function() {
		if (xhr.readyState != 4)
			return;
		if (xhr.responseText) {
			window.clearTimeout(abortWwssidTimerId);
			//
			var textDoc = xhr.responseText;
			
			try{
				var pos = textDoc.indexOf("wssid:\"") ;
				
				if(pos == -1){
					handleError(runner);
					return ;
				}
				
				if(pos > 0){
					pos += "wssid:\"".length ;
					endPos = textDoc.indexOf("\"", pos) ;
					var len = endPos - pos ;
					
					var wwssid = textDoc.substr(pos, len) ;
					
					console.debug("yahoo wwssid: " + wwssid + " recorded.") ;
					
					runner.wwssid = wwssid ;
					runner.manualCheckNow(runner) ;

					return ;
				}
			}catch(e){
				//format changed
				window.clearTimeout(abortWwssidTimerId);
				handleError(runner, chrome.i18n.getMessage("needUpgrade"));
				return ;
			}
		}

		window.clearTimeout(abortWwssidTimerId);
		handleError(runner);
	};

	xhr.onerror = function(error) {
		window.clearTimeout(abortWwssidTimerId);
		handleError(runner);
	};

	//The better checking url is:http://prod2.rest-notify.msg.yahoo.com/v1/pushchannel/xxxx?seq=3&cb=7htfu76b&format=json&idle=110&imtoken=2MjcP2c_xd.SPoY1bFJYJRBWISCm9hbknIQGowrc4i4BcKZwXq3WBNb50tZFwI_IEaeyglby2q2NPQmgzRWUv%7Cqw_zJEj2Z42uaDOek4WVnQ--&sid=XbZBnRDs3BiaM68Qs4f.wLMAg.Ku1MuOkLIU_A--&c=qZxxWvu0xR1&msgrAppId=mim&cache=1321318294265
	//But this url is blocked in China Mainland and unreachable....
	xhr.open("GET", "http://mail.yahoo.com/", true);
	xhr.send(null);
} ;

YahooMailChecker.prototype.getSiteInfo = function() {
	return {"text" : "Yahoo Mail", "icon" : "/images/yahoo.ico", "loginUrl" : "http://mail.yahoo.com/"} ;
} ;

/****************************************Sina Weibo**************************************************/
function SinaWeiboChecker(){
	this.appName = "weibo" ;	
	this.pollIntervalMin = 1000 * 30; //30 seconds
	this.count = 1 ;
	this.uid = 0 ;
}
SinaWeiboChecker.prototype = new TaskRunner() ;
SinaWeiboChecker.prototype.constructor = SinaWeiboChecker ;

SinaWeiboChecker.prototype.start = function(){	
	this.init() ;
	this.prepareSession(this) ;
} ;

SinaWeiboChecker.prototype.updateUid = function(){
	var runner = this ;
	//read uid from cookie
	chrome.cookies.get({"url" : "http://login.sina.com.cn/", "name" : "SUP"}, function(cookie){
		if(cookie == null){
			runner.uid = 0 ;
		}else{
			try{
				var m_value = cookie.value ;
				var startPos = m_value.indexOf("uid%3D") + "uid%3D".length ;
				var endPos = m_value.indexOf("%26", startPos) ;
				var m_uid = (endPos == -1) ? m_value.substr(startPos) : m_value.substr(startPos, (endPos - startPos)) ;
				
				console.debug("sina weibo uid detected:" + m_uid) ;
				
				var oldUid = runner.uid ;
				runner.uid = parseInt(m_uid) ;

				if(oldUid < 1){
					runner.manualCheckNow.apply(runner) ;
				}
			}catch(e){
				runner.uid = -2 ;
			}
		}
	}) ;
} ;

SinaWeiboChecker.prototype.tabsUpdated = function(tabId, changeInfo){
	if (changeInfo.url && changeInfo.url.indexOf("http://weibo.com/") != -1) {
		this.manualCheckNow() ;
	}
} ;

SinaWeiboChecker.prototype.goToInbox = function() {
	var owner = this ;
	var inboxUrl = "http://weibo.com/" ;
	
	chrome.tabs.getAllInWindow(undefined, function(tabs) {
	    for (var i = 0, tab; tab = tabs[i]; i++) {
	      if (tab.url && tab.ur.indexOf(inboxUrl) != -1) {
	        chrome.tabs.update(tab.id, {selected: true});
	        return;
	      }
	    }
	    
	    chrome.tabs.create({url: inboxUrl});
	});
} ;

SinaWeiboChecker.prototype.updateUnreadCount = function(json) {
	var tips = [] ;
	var count = 0 ;

	if(json.follower > 0){
		tips.push({"unReadCount" : json.follower, "text" : json.follower + "位新粉丝", "link" : "http://weibo.com/" + this.uid + "/fans?topnav=1"}) ;
		count+= json.follower ;
	}

	if(json.cmt > 0){
		tips.push({"unReadCount" : json.cmt, "text" : json.cmt + "条新评论", "link" : "http://weibo.com/comment/inbox?f=1&topnav=1"}) ;
		count+= json.cmt ;
	}
	
	if(json.mention_status > 0){
		tips.push({"unReadCount" : json.mention_status, "text" : json.mention_status + "条新@提到我", "link" : "http://weibo.com/at/weibo?topnav=1"}) ;
		count+= json.mention_status ;
	}
	
	if(json.dm > 0){
		tips.push({"unReadCount" : json.dm, "text" : json.dm + "条新私信", "link" : "http://weibo.com/messages?topnav=1"}) ;
		count+= json.dm ;
	}
	
	if(json.notice > 0){
		tips.push({"unReadCount" : json.notice, "text" : json.notice + "条新公告", "link" : "http://weibo.com/systemnotice?topnav=1&wvr=4"}) ;
		count+= json.notice ;
	}

	if(this.unreadCount != count){
		this.unreadCount = count ;
		globalNotifyUnreadMessage(this.appName, tips);
	}

} ;

SinaWeiboChecker.prototype.checkUnreadNotifications = function(runner, xhr, handleSuccess, handleError){
		console.debug(this.appName + " checkUnreadNotifications called") ;
		
		this.updateUid() ;

		if (runner.uid == -2){
			xhr.abort() ;
			handleError(runner, chrome.i18n.getMessage("needUpgrade"));
			return ;
		}else if(runner.uid < 1){
			xhr.abort() ;
			handleError(runner);
			return ;
		}

		xhr.onreadystatechange = function() {
			if (xhr.readyState == 1){
				//set headers
				console.debug("set headers for sina weibo xhr.") ;
				//xhr.setRequestHeader("Referer", "http://weibo.com/") ;
				return;
			}
			if (xhr.readyState != 4)
				return;
			if (xhr.responseText) {
				var textDoc = xhr.responseText;
				
				try{					
					var json = JSON.parse(textDoc);
					if(json){
						if(json.error){
							handleError(runner, json.error);
							return ;
						}else{				
							handleSuccess(runner, json);
							return ;
						}
					}
				}catch(e){
					//format changed
					handleError(runner, chrome.i18n.getMessage("needUpgrade"));
					return ;
				}
			}
	
			handleError(runner);
		};

		xhr.onerror = function(error) {
			handleError(runner);
		};
	
		xhr.open("GET", "http://rm.api.weibo.com/remind/unread_count.json?source=3818214747&target=api&user_id=" + runner.uid + "&_pid=0&count=" + (runner.count)++, true);
		xhr.send(null);
} ;

SinaWeiboChecker.prototype.prepareSession = function(runner){
	console.debug(runner.appName + " prepare session cookies.") ;
	
	var xhr = new XMLHttpRequest();
	var weiboTimerId = window.setTimeout(function() {
	  xhr.abort();  // synchronously calls onreadystatechange
	}, runner.requestTimeout * 2);
	
	xhr.onreadystatechange = function() {
		if (xhr.readyState != 4)
			return;
		if (xhr.responseText) {
			window.clearTimeout(weiboTimerId);
			runner.updateUid() ;
		}
	};

	xhr.open("GET", "http://weibo.com/", true);
	xhr.send(null);
} ;

SinaWeiboChecker.prototype.getSiteInfo = function() {
	return {"text" : "新浪微博", "icon" : "/images/weibo.ico", "loginUrl" : "http://weibo.com/"} ;
} ;

/****************************************Baidu Space**************************************************/
function BaiduChecker(){
	this.appName = "baidu" ;	
	this.pollIntervalMin = 1000 * 30; //30 seconds
	this.count = 1 ;
}

BaiduChecker.prototype = new TaskRunner() ;
BaiduChecker.prototype.constructor = BaiduChecker ;

BaiduChecker.prototype.start = function(){	
	this.init() ;
} ;

BaiduChecker.prototype.tabsUpdated = function(tabId, changeInfo){
	if (changeInfo.url && changeInfo.url.indexOf("http://hi.baidu.com/msg/") != -1) {
		this.manualCheckNow() ;
	}
} ;

BaiduChecker.prototype.goToInbox = function() {
	var owner = this ;
	var inboxUrl = "http://hi.baidu.com/msg/index?from=" ;
	
	chrome.tabs.getAllInWindow(undefined, function(tabs) {
	    for (var i = 0, tab; tab = tabs[i]; i++) {
	      if (tab.url && tab.ur.indexOf(inboxUrl) != -1) {
	        chrome.tabs.update(tab.id, {selected: true});
	        return;
	      }
	    }
	    
	    chrome.tabs.create({url: inboxUrl});
	});
} ;

BaiduChecker.prototype.updateUnreadCount = function(json) {
	var tips = [] ;
	var count = 0 ;

	//{'sysMsgNum':'0','actMsgNum':'0','mailMsgNum':'0','myFRDNum':'0','mySTRNum':'0'}
	var msg = parseInt(json.mailMsgNum) ;
	if(msg > 0){
		tips.push({"unReadCount" : msg, "text" : msg + "条站内消息", "link" : "http://hi.baidu.com/msg/index?from=mail"}) ;
		count+= msg ;
	}
	
	msg = parseInt(json.actMsgNum) ;
	if(msg > 0){
		tips.push({"unReadCount" : msg, "text" : msg + "条互动请求", "link" : "http://hi.baidu.com/msg/index?from=act"}) ;
		count+= msg ;
	}
	
	msg = parseInt(json.sysMsgNum) ;
	if(msg > 0){
		tips.push({"unReadCount" : msg, "text" : msg + "条系统通知", "link" : "http://hi.baidu.com/msg/index?from=sys"}) ;
		count+= msg ;
	}

	if(this.unreadCount != count){
		this.unreadCount = count ;
		globalNotifyUnreadMessage(this.appName, tips);
	}

} ;

BaiduChecker.prototype.checkUnreadNotifications = function(runner, xhr, handleSuccess, handleError){
		console.debug(this.appName + " checkUnreadNotifications called") ;
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4)
				return;
			if (xhr.responseText) {
				var textDoc = xhr.responseText;
				textDoc = textDoc.substr(2, textDoc.length - 4) ;
				textDoc = textDoc.replace(/'/g, "\"") ;
				try{					
					var json = JSON.parse(textDoc);
					if(json){
						//Baidu没有错误信息，即使未登录，也返回正确的json格式，只是所有消息数为0
						if(json.error){
							handleError(runner, json.error);
							return ;
						}else{				
							handleSuccess(runner, json);
							return ;
						}
					}
				}catch(e){
					//format changed
					handleError(runner, chrome.i18n.getMessage("needUpgrade"));
					return ;
				}
			}
	
			handleError(runner);
		};

		xhr.onerror = function(error) {
			handleError(runner);
		};
	
		xhr.open("GET", "http://hi.baidu.com/msg/msg_dataGetmsgCount?callback=a&ran=" + (runner.count)++, true);
		xhr.send(null);
} ;

BaiduChecker.prototype.getSiteInfo = function() {
	return {"text" : "百度", "icon" : "/images/baidu.ico", "loginUrl" : "http://hi.baidu.com/"} ;
} ;

/****************************************163.com Mail**************************************************/
function Mail163Checker(){
	this.appName = "163m" ;	
	this.pollIntervalMin = 1000 * 60 * 1; //60 seconds
	this.count = 1 ;
	this.sid = "" ;
}
Mail163Checker.prototype = new TaskRunner() ;
Mail163Checker.prototype.constructor = Mail163Checker ;

Mail163Checker.prototype.start = function(){	
	this.init() ;
	this.prepareSession(this) ;
} ;

Mail163Checker.prototype.updateUid = function(){
	var runner = this ;
	//read uid from cookie
	chrome.cookies.getAll({"domain" : "mail.163.com"}, function(cookies){
		var oldSid = runner.sid ;
		runner.sid = "" ;
		cookies.forEach(
				function(cookie){						
					if(cookie.name == "Coremail"){
						var m_sid = cookie.value ;
						var startPos = m_sid.indexOf("%") + 1 ;
						var endPos = m_sid.indexOf("%", startPos) ;
						
						runner.sid = m_sid.substr(startPos, (endPos - startPos)) ;
						
						console.debug("163 mail Coremail.sid detected:" + runner.sid) ;
					}else if(cookie.name == "mail_uid"){
						runner.uid = cookie.value ;
						console.debug("163 mail uid detected:" + runner.uid) ;
					}
				}
		) ;
		
		if(runner.sid && !oldSid){
			runner.manualCheckNow.apply(runner) ;
		}
		
	}) ;
} ;

Mail163Checker.prototype.tabsUpdated = function(tabId, changeInfo){
	if (changeInfo.url && changeInfo.url.indexOf("mail.163.com") != -1) {
		this.manualCheckNow() ;
	}
} ;

Mail163Checker.prototype.goToInbox = function() {
	var owner = this ;
	var inboxUrl = "http://entry.mail.163.com/coremail/fcg/ntesdoor2?verifycookie=1&lightweight=1" ;
	chrome.tabs.create({url: inboxUrl});
} ;

Mail163Checker.prototype.updateUnreadCount = function(count) {
	if(this.unreadCount != count){
		this.unreadCount = count ;
		globalNotifyUnreadMessage(this.appName, [{"unReadCount" : count, "text" : count + chrome.i18n.getMessage("newMails"), 
			"link" : "http://entry.mail.163.com/coremail/fcg/ntesdoor2?verifycookie=1&lightweight=1"}]);
	}
} ;

Mail163Checker.prototype.checkUnreadNotifications = function(runner, xhr, handleSuccess, handleError){
		console.debug(this.appName + " checkUnreadNotifications called") ;
		
		this.updateUid() ;

		if (!runner.sid){
			xhr.abort() ;
			handleError(runner);
			return ;
		}
		
		xhr.onreadystatechange = function() {
			if(xhr.readyState == 1){
			    xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
			    return ;
			}
			if (xhr.readyState != 4)
				return;
			if (xhr.responseText) {
				var textDoc = xhr.responseText;
				
				try{
					var startPos = textDoc.indexOf("<int name=\"id\">1</int>") ;
					startPos = textDoc.indexOf("<int name=\"unreadMessageCount\">", startPos) + "<int name=\"unreadMessageCount\">".length ;
					var endPos = textDoc.indexOf("</int>", startPos) ;
					
					var msgCount = textDoc.substr(startPos, (endPos - startPos)) ;
					handleSuccess(runner, parseInt(msgCount));
					
					return ;
				}catch(e){
					//format changed
					handleError(runner, chrome.i18n.getMessage("needUpgrade"));
					return ;
				}
			}
	
			handleError(runner);
		};

		xhr.onerror = function(error) {
			handleError(runner);
		};

		xhr.open("POST", "http://webmail.mail.163.com/js4/s?sid=" + runner.sid + "&func=global:sequential", true);
		//var dataToSent = "var=" + encodeURIComponent("<?xml version=\"1.0\"?><object><array name=\"items\"><object><string name=\"func\">mbox:getAllFolders</string><object name=\"var\"><boolean name=\"stats\">true</boolean><boolean name=\"threads\">true</boolean></object></object><object><string name=\"func\">mbox:getFolderStats</string><object name=\"var\"><array name=\"ids\"><string>1,2,3,5,7,18,9928436</string><string>2,3,5,7,18,9928436</string></array><boolean name=\"messages\">true</boolean><boolean name=\"threads\">true</boolean></object></object></array></object>") ;
		var dataToSent = "var=" + encodeURIComponent("<?xml version=\"1.0\"?><object><array name=\"items\"><object><string name=\"func\">mbox:getAllFolders</string><object name=\"var\"><boolean name=\"stats\">true</boolean><boolean name=\"threads\">true</boolean></object></object><object><string name=\"func\">mbox:getFolderStats</string><object name=\"var\"><array name=\"ids\"><string>1,2,3,5,7,18</string><string>2,3,5,7,18</string></array><boolean name=\"messages\">true</boolean><boolean name=\"threads\">true</boolean></object></object></array></object>") ;
		xhr.send(dataToSent);
} ;

Mail163Checker.prototype.prepareSession = function(runner){
	console.debug(runner.appName + " prepare session cookies.") ;
	
	var xhr = new XMLHttpRequest();
	var weiboTimerId = window.setTimeout(function() {
	  xhr.abort();  // synchronously calls onreadystatechange
	}, runner.requestTimeout * 2);
	
	xhr.onreadystatechange = function() {
		if (xhr.readyState != 4){
			return;
		}
		
		window.clearTimeout(weiboTimerId);
		runner.updateUid() ;
	};

	xhr.open("GET", "http://entry.mail.163.com/coremail/fcg/ntesdoor2?verifycookie=1&lightweight=1", true);
	xhr.send(null);
} ;

Mail163Checker.prototype.getSiteInfo = function() {
	return {"text" : "网易邮箱", "icon" : "/images/163.ico", "loginUrl" : "http://mail.163.com/"} ;
} ;

/****************************************AOL Mail**************************************************/
function AOLMailChecker(){
	this.appName = "aolm" ;
}
AOLMailChecker.prototype = new TaskRunner() ;
AOLMailChecker.prototype.constructor = AOLMailChecker ;

AOLMailChecker.prototype.start = function(){	
	this.init() ;	
} ;

AOLMailChecker.prototype.tabsUpdated = function(tabId, changeInfo){
	if (changeInfo.url && changeInfo.url.indexOf("mail.aol.com") != -1) {
		this.manualCheckNow() ;
	}
} ;

AOLMailChecker.prototype.goToInbox = function() {
	var owner = this ;
	
	chrome.tabs.getAllInWindow(undefined, function(tabs) {
	    for (var i = 0, tab; tab = tabs[i]; i++) {
	      if (tab.url && tab.ur.indexOf("mail.aol.com") != -1) {
	        chrome.tabs.update(tab.id, {selected: true});
	        return;
	      }
	    }
	    
	    chrome.tabs.create({url: "http://mail.aol.com/"});
	});
} ;

AOLMailChecker.prototype.updateUnreadCount = function(count) {
	count = parseInt(count) ;
	
	if (this.unreadCount != count) {
		this.unreadCount = count;
		
		var data = [{"unReadCount" : count,
					"icon" : "",
					"text" : count + chrome.i18n.getMessage("newMails"),
					"link" : "http://mail.aol.com/"
		}] ;
		
		globalNotifyUnreadMessage(this.appName, data);
	}
} ;

AOLMailChecker.prototype.checkUnreadNotifications = function(runner, xhr, handleSuccess, handleError){
		console.debug(this.appName + " checkUnreadNotifications called") ;
		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4)
				return;
			if (xhr.responseText) {
				var textDoc = xhr.responseText;
				
				try{					
					var json = JSON.parse(textDoc);
					if(json){
						if(json.count){
							var m_count = json.count ;
							var startPos = m_count.indexOf(">") ;
							var endPos = m_count.indexOf("<", startPos) ;
							
							m_count = m_count.substr(startPos + 1, (endPos - startPos)) ;
							handleSuccess(runner, m_count);
							return ;
						}else if(json.html.indexOf("mail-signin-linkout") > 0){
							handleError(runner, "Not signin.");
							return ;
						}
					}
				}catch(e){
					//format changed
					handleError(runner, chrome.i18n.getMessage("needUpgrade"));
					return ;
				}
			}
	
			handleError(runner);
		};

		xhr.onerror = function(error) {
			handleError(runner);
		};
	
		xhr.open("GET", "http://www.aol.com/ajax.jsp?m=quicknav&p=mail_preview&preview=1&cv=1", true);
		xhr.send(null);
} ;

AOLMailChecker.prototype.getSiteInfo = function() {
	return {"text" : "AOL", "icon" : "/images/aol.ico", "loginUrl" : "http://mail.aol.com/"} ;
} ;

/****************************************Sohu.com Mail**************************************************/
function SohuMailChecker(){
	this.appName = "sohum" ;
}
SohuMailChecker.prototype = new TaskRunner() ;
SohuMailChecker.prototype.constructor = SohuMailChecker ;

SohuMailChecker.prototype.start = function(){	
	this.init() ;	
} ;

SohuMailChecker.prototype.tabsUpdated = function(tabId, changeInfo){
	if (changeInfo.url && changeInfo.url.indexOf("mail.sohu.com/bapp/") != -1) {
		this.manualCheckNow() ;
	}
} ;

SohuMailChecker.prototype.goToInbox = function() {
	var owner = this ;
	
	chrome.tabs.getAllInWindow(undefined, function(tabs) {
	    for (var i = 0, tab; tab = tabs[i]; i++) {
	      if (tab.url && tab.ur.indexOf("http://mail.sohu.com/bapp/121/main") != -1) {
	        chrome.tabs.update(tab.id, {selected: true});
	        return;
	      }
	    }
	    
	    chrome.tabs.create({url: "http://mail.sohu.com/"});
	});
} ;

SohuMailChecker.prototype.updateUnreadCount = function(count) {
	if (this.unreadCount != count) {
		this.unreadCount = count;
		
		var data = [{"unReadCount" : count,
					"icon" : "",
					"text" : count + chrome.i18n.getMessage("newMails"),
					"link" : "http://mail.sohu.com/"
		}] ;
		
		globalNotifyUnreadMessage(this.appName, data);
	}
} ;

SohuMailChecker.prototype.checkUnreadNotifications = function(runner, xhr, handleSuccess, handleError){
		console.debug(this.appName + " checkUnreadNotifications called") ;
		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4)
				return;
			if (xhr.responseText) {
				var textDoc = xhr.responseText;
				
				try{					
					var json = JSON.parse(textDoc);
					if(json){
						handleSuccess(runner, json.unreadcount);
						return ;
					}
				}catch(e){
					//format changed
					handleError(runner, chrome.i18n.getMessage("needUpgrade"));
					return ;
				}
			}
	
			handleError(runner);
		};

		xhr.onerror = function(error) {
			handleError(runner);
		};
	
		xhr.open("GET", "http://register.mail.sohu.com/servlet/getUnreadMailCountServlet?_=" + (new Date()).getTime(), true);
		xhr.send(null);
} ;

SohuMailChecker.prototype.getSiteInfo = function() {
	return {"text" : "搜狐邮箱", "icon" : "/images/sohum.ico", "loginUrl" : "http://mail.sohu.com/"} ;
} ;

/****************************************people.com.cn**************************************************/
function RMWChecker(){
	this.appName = "rmw" ;
}
RMWChecker.prototype = new TaskRunner() ;
RMWChecker.prototype.constructor = RMWChecker ;

RMWChecker.prototype.start = function(){
	this.init() ;
	this.pollIntervalMin = 1000 * 20;  // 20 seconds
	this.pollIntervalMax = 1000 * 60 * 2;  // 2 minutes
} ;

RMWChecker.prototype.tabsUpdated = function(tabId, changeInfo){
	if (changeInfo.url && changeInfo.url.indexOf("sns.people.com.cn") != -1) {
		this.manualCheckNow() ;
	}
} ;

RMWChecker.prototype.goToInbox = function() {
	var owner = this ;
	
	chrome.tabs.getAllInWindow(undefined, function(tabs) {
	    for (var i = 0, tab; tab = tabs[i]; i++) {
	      if (tab.url && tab.ur.indexOf("http://sns.people.com.cn/") != -1) {
	        chrome.tabs.update(tab.id, {selected: true});
	        return;
	      }
	    }
	    
	    chrome.tabs.create({url: "http://sns.people.com.cn/"});
	});
} ;

RMWChecker.prototype.updateUnreadCount = function(json) {
	var data = [] ;
	var count = 0 ;
	
	for(var index in json){
		var m_data = json[index] ;
		count += m_data.count ;
		
		data.push({"unReadCount" : m_data.count,
					"icon" : "",
					"text" : m_data.count + "个" + m_data.name,
					"link" : m_data.url
				}) ;
	}
	
	if (this.unreadCount != count) {
		this.unreadCount = count;
		globalNotifyUnreadMessage(this.appName, data);
	}
} ;

RMWChecker.prototype.checkUnreadNotifications = function(runner, xhr, handleSuccess, handleError){
		console.debug(this.appName + " checkUnreadNotifications called") ;
		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4)
				return;
			if (xhr.responseText) {
				var textDoc = xhr.responseText;
				
				if(textDoc){
					try{
						var json = JSON.parse(textDoc);
						if(json){
							handleSuccess(runner, json);
							return ;
						}
					}catch(e){
						//format changed
						handleError(runner, chrome.i18n.getMessage("needUpgrade"));
						return ;
					}
				}
			}
	
			handleError(runner);
		};

		xhr.onerror = function(error) {
			handleError(runner);
		};
	
		xhr.open("GET", "http://sns.people.com.cn/api/myJsonNews.do?t_=" + (new Date()).getTime(), true);
		xhr.send(null);
} ;

RMWChecker.prototype.getSiteInfo = function() {
	return {"text" : "人民社区", "icon" : "/images/rmw_sns.ico", "loginUrl" : "http://sns.people.com.cn/"} ;
} ;


/****************************************tieba.baidu.com**************************************************/
function BaiduTiebaChecker(){
	this.appName = "baidu_tieba" ;
}
BaiduTiebaChecker.prototype = new TaskRunner() ;
BaiduTiebaChecker.prototype.constructor = BaiduTiebaChecker ;

BaiduTiebaChecker.prototype.start = function(){
	this.init() ;
	this.pollIntervalMin = 1000 * 5;  // 5 seconds
	this.pollIntervalMax = 1000 * 60 * 2;  // 2 minutes
	
	this.portraitId = "1" ;
	this.preparePortraitId(this) ;
} ;

BaiduTiebaChecker.prototype.tabsUpdated = function(tabId, changeInfo){
	if (changeInfo.url && changeInfo.url.indexOf("http://tieba.baidu.com/i/") != -1) {
		this.manualCheckNow() ;
	}
} ;

BaiduTiebaChecker.prototype.goToInbox = function() {
	var owner = this ;
	
	chrome.tabs.getAllInWindow(undefined, function(tabs) {
	    for (var i = 0, tab; tab = tabs[i]; i++) {
	      if (tab.url && tab.ur.indexOf("http://tieba.baidu.com/i/") != -1) {
	        chrome.tabs.update(tab.id, {selected: true});
	        return;
	      }
	    }
	    
	    chrome.tabs.create({url: "http://tieba.baidu.com/"});
	});
} ;

BaiduTiebaChecker.prototype.updateUnreadCount = function(msgs) {
	var data = [] ;
	var count = 0 ;
	
	for(i=0; i<msgs.length; i++){
		msgs[i] = parseInt(msgs[i]) ;
	}
	
	if(msgs[0] > 0){
		data.push({"unReadCount" : msgs[0],
			"icon" : "",
			"text" : msgs[0] + "位新粉丝",
			"link" : "http://tieba.baidu.com/i/sys/jump?u=" + this.portraitId + "&type=fans"
		}) ;
		count += msgs[0] ;
		msgs[0] = 0 ;
	}
	
	if(msgs[3] > 0){
		data.push({"unReadCount" : msgs[3],
			"icon" : "",
			"text" : msgs[3] + "个新回复",
			"link" : "http://tieba.baidu.com/i/sys/jump?u=" + this.portraitId + "&type=replyme"
		}) ;
		count += msgs[3] ;
		msgs[3] = 0 ;
	}
	
	var otherCount = 0 ;
	for(i=0; i<msgs.length; i++){
		var m_msg = parseInt(msgs[i]) ;
		
		if(m_msg > 0){
			otherCount += m_msg ;
		}
	}
	
	if(otherCount > 0){
		data.push({"unReadCount" : otherCount,
			"icon" : "",
			"text" : otherCount + "个新提醒",
			"link" : "http://tieba.baidu.com/"
		}) ;
		count += otherCount ;
	}
	
	if (this.unreadCount != count) {
		this.unreadCount = count;
		globalNotifyUnreadMessage(this.appName, data);
	}else{
		delete data ;
	}
} ;

BaiduTiebaChecker.prototype.checkUnreadNotifications = function(runner, xhr, handleSuccess, handleError){
		console.debug(this.appName + " checkUnreadNotifications called") ;
		
		if(runner.portraitId = "1"){
			this.preparePortraitId(runner) ;
		}
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4)
				return;
			if (xhr.responseText) {
				var textDoc = xhr.responseText;
				
				if(textDoc){
					try{
						var startPos = textDoc.indexOf('[') ;
						var endPos = textDoc.indexOf(']') ;
						
						var m_msg = textDoc.slice(startPos + 1, endPos) ;
						var msgs = m_msg.split(",") ;
						
						if(msgs){
							handleSuccess(runner, msgs);
							return ;
						}
					}catch(e){
						//format changed
						handleError(runner, chrome.i18n.getMessage("needUpgrade"));
						return ;
					}
				}
			}
	
			handleError(runner);
		};

		xhr.onerror = function(error) {
			handleError(runner);
		};
	
		xhr.open("GET", "http://message.tieba.baidu.com/i/msg/get_data", true);
		xhr.send(null);
} ;

BaiduTiebaChecker.prototype.preparePortraitId = function(runner){
	var xhr = new XMLHttpRequest();
	var abortTimerId = window.setTimeout(function() {
	  xhr.abort();  // synchronously calls onreadystatechange
	}, runner.requestTimeout);
	
	xhr.onreadystatechange = function() {
		if (xhr.readyState != 4)
			return;
		if (xhr.responseText) {
			var textDoc = xhr.responseText;
			
			if(textDoc){
				try{
					var json = JSON.parse(textDoc);
					if(json){
						runner.portraitId = json.data.user_portrait ;
						console.debug(this.appName + " protrait id:" + runner.portraitId) ;
						return ;
					}
				}catch(e){
					//format changed
					runner.portraitId = "1" ;
					return ;
				}
			}
		}
		
		runner.portraitId = "1" ;
	};

	xhr.open("GET", "http://tieba.baidu.com/f/user/json_userinfo?_=" + (new Date()).getTime(), true);
	xhr.send(null);
} ;

BaiduTiebaChecker.prototype.getSiteInfo = function() {
	return {"text" : "百度贴吧", "icon" : "/images/baidu.ico", "loginUrl" : "http://tieba.baidu.com/"} ;
} ;


