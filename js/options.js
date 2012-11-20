
	function init(){
		var background = chrome.extension.getBackgroundPage();
		var sites = background.getSavedSites() ;

		if(sites){
			sites.forEach(
				function(site){
					$("#" + site).attr("checked", true) ;
				}
			) ;
		}

		$("[i18ntext]").each(
			function (index, item){
				var jItem = $(item) ;
				var m_value = chrome.i18n.getMessage(jItem.attr("i18ntext")) ;
				
				jItem.val(m_value) ;
				jItem.text(m_value) ;
			}
		) ;
	}

	function saveOptions(){
		var selectedOptions = [] ;
		$("input[name=providers]").each(
			function (index, item){
				if(item.checked){
					selectedOptions.push(item.id) ;
				}
			}
		) ;

		var background = chrome.extension.getBackgroundPage();
		background.storeSavedSites(selectedOptions) ;

		$("#tipForSaveOK").fadeIn("slow").fadeOut(10000) ;
	}
	
	$(document).ready(function(){
		init() ;
		
		$("#saveConfig").click(function(e){
			e.preventDefault() ;
			saveOptions() ;
		}) ;
		
		$("input[name='op_sounds']").bind("click", function(e){
			localStorage["fSoundsOpitions"] = $(this).val() ;
		}) ;
		
		var m_value = localStorage["fSoundsOpitions"] ;
		if(!m_value){
			m_value = "once" ;
		}
		
		$("input[name='op_sounds'][value='" + m_value + "']").attr("checked", "checked") ;
	}) ;
	
	