
var background = chrome.extension.getBackgroundPage();
	
function refreshPages(notificationsData){
	var tipPage = "" ;
	background.console.debug("refresh pages") ;
	
	for(index in notificationsData){
		var m_data = notificationsData[index] ;
		var hasSomethingToShow = false ;
		
		background.console.debug("process data:" + m_data["siteInfo"]) ;
		
		//site info
		var html = "<div class=\"app\">" ;
		if(m_data["siteInfo"]["icon"]){
			html += "<img style='vertical-align:text-bottom;' src='" + m_data["siteInfo"]["icon"] + "' width='16' height='16' /> " ;
		}
		
		html += m_data["siteInfo"]["text"] + ":</div><div class=\"msg_box\"><ul>" ;
		
		//detailed notifications.
		if(m_data["result"] == "success" && m_data["details"]){
			var ns = m_data["details"] ;
			for(m_index in ns){
				var m_tip = ns[m_index] ;
				
				if(m_tip["unReadCount"] > 0){
					html = html + "<li><a href=\"" + m_tip["link"] + "\" target='_blank'>"
					 	+ m_tip["text"] + "</a></li>" ;
					hasSomethingToShow = true ;
				}
			}
		}else if(m_data["result"] == "fail"){
			html = html + "<li class='no_conn_error'>"
					 	+ (m_data["details"] ? m_data["details"] : chrome.i18n.getMessage("notConnected"))
						+ " <a href='" + m_data["siteInfo"]["loginUrl"] + "' target='_blank' class='diagnose'>"
						+ chrome.i18n.getMessage("diagnose")
						+ "</a></li>" ;
			hasSomethingToShow = true ;
		}else{
			html = html + "<li>" + chrome.i18n.getMessage("loading") + "</li>" ;
			hasSomethingToShow = true ;
		}
		
		if(hasSomethingToShow){
			html += "</ul></div>" ;
			tipPage += html ;
		}
	}
	
	background.console.debug("pop content:" + tipPage) ;
	
	if(!tipPage || tipPage.length == 0){
		tipPage = "<div class=\"msg_box\"><ul><li>"
			+chrome.i18n.getMessage("noNewMessageTip")
			+"</li></ul></div>" ;
	}
	
	$("#tipContent").replaceWith(tipPage) ;
	
	background.console.debug("page refreshed!") ;
}

function init(){
	background.console.debug("popup page initing") ;

	refreshPages(background.getSortedNotifications()) ;
	background.console.debug("popup page inited") ;
	
	
	background.registerPopupCallback(refreshPages) ;	

	$("[i18ntext]").each(
		function (index, item){
			var jItem = $(item) ;
			var m_value = chrome.i18n.getMessage(jItem.attr("i18ntext")) ;
			
			jItem.val(m_value) ;
			jItem.text(m_value) ;
		}
	) ;
	
	//background.repaintTips() ;
}

$(document).ready(function(){
	init() ;
	
	$("#action_open_options").click(function(e){
		e.preventDefault() ;
		
		background.openOptionsPageInTab();
	}) ;
}) ;



