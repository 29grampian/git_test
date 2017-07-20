var _ovg = {};
if("undefined" !== typeof ovg_settings){
	_ovg = ovg_settings;
}else if("undefined" !== typeof ovg){
	_ovg = ovg;
}

(function(jwplayer){

    var template = function(player, config, div) {
        player.on('ready', setup);
        function setup(evt) {
            // Creates and styles title overlay
            div.setAttribute('id','title_overlay');
            div.style.color = "#E0E0E0";
            div.style.font = "bold 15px sans,serif";
            div.style.position = "absolute";
            div.style.paddingLeft = "20px";
            div.style.paddingTop = "28px";
            div.style.paddingRight = (player.getWidth() / 2) + "px";
            div.style.height = '65px';
            div.style.display = 'block';
            div.style.whiteSpace = 'nowrap';
            div.style.overflow = 'hidden';
            div.style.textOverflow  = 'ellipsis';
            div.style.pointerEvents = "none";
            div.innerHTML = '';
            div.style.backgroundColor='transparent';   // removed because background color does not extend to the width of the player.  Looks odd
            div.style.width = player.getWidth() + "px";
			loadIrisPlugin(player, config);  // triggers the loading of the Iris plugin and library
        };

        function loadIrisPlugin(player, config){

          //get the library code
          jQuery.getScript('https://s3.amazonaws.com/cdn.jukeboxu.com/libraries/iris-min.js').done(function(){

			console.log("Library loaded");

            var imgBaseURL = "https://s3.amazonaws.com/cdn.jukeboxu.com/brightcove/nextgen/"

            //initialize irisplayer. insert credentials here.
            iris = new IrisPlayer(player,{
              number : 5,
              base_url : 'https://cdn2.static.ovimg.com/player/jwplayer6/plugins/lib/images/', //current location of files
              client_token : config['client_token'],
              platform : 'OVGuide',
              access_token : '8ad6f9b1391da48d5d0b90139ee70109e834e47fab8524bef221a4e92c9d7342',
              api_url : 'https://api.iris.tv',
              platform_id : config['platform_id'],
              firstPlay: true,
              plugin_version : "TitleOverlay.v1",
              player_version : "JWPlayer7"
            });


            ////////////////////////////////////////////////////////////////////////////////////////////////////////////
            ////////////         IMPLEMENT REQUIRED FUNCTIONS //////////////////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////

			IrisPlayer.prototype.play = function(){
				var video = iris.getCurrentVideo();
				var content_url = video["content_url"].replace('http://','https://');
				var platform_id = video["platform_id"].replace(/-/g, '');
				var site_uuid = video["site_uuid"].replace(/-/g, '');
				var that = this;
				var _r = window.location.href;
				if(-1 != _r.search(/local|qa/)){
					_r = "http://www.ovguide.com";
				}
				_r = encodeURIComponent(_r);
				var _tag = "https://www.ovguide.com/vmap/1/googima/"+site_uuid+"/"+platform_id+"?correlator="+Date.now()+"&referrer_url="+_r+"&device'" + _ovg["device"];

				player.setup({
					file: content_url,
					autostart:true,
					width: '100%',
					aspectratio: '16:9',
					advertising:{
						client:'googima',
						tag: _tag
					},
					flashplayer: "//cdn2.static.ovimg.com/player/jwplayer7.2.2/jwplayer.flash.swf",
				}).on('complete', function(){
					that.next_auto()
				});

				updateButtons();
			};

			IrisPlayer.prototype.getCurrentDuration = function(){
				return player.getDuration();
			};

			IrisPlayer.prototype.getCurrentTime = function(){
				return player.getPosition();
			};

			//overwrite defaultVideo function of plugin (jwplayer uses content_url to play video)
			IrisPlayer.prototype.defaultVideo = function() {
				// get player's playlist
				playlist =  this.player.getPlaylist() ;
				return {
					iris_id: null,
					platform: this.settings['platform'],
					platform_id: this.settings['platform_id'],
					//finds initial playlist location.
					content_url: playlist[0].sources[0].file
				};
			};


            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            ////////////         EVENT LISTENERS          ///////////////////////////////////////////////////////////////////////
            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            iris.player.on('play', function(){
			  var playlist = iris.player.getPlaylist();
              var initialVideo = playlist[0];
              if (iris.settings["firstPlay"] == true ){
                iris.settings["firstPlay"] = false;
                iris.watch(function(){
                  updateButtons();
                  startWorker();
                  if (initialVideo["title"] !== undefined) {
                    jQuery('#title_overlay').text(initialVideo["title"]);
                  }
                });
              }
              if (iris.getCurrentVideo() === undefined || iris.getCurrentVideo()['title'] === undefined ) {
                jQuery('#title_overlay').text("")
              } else {
                jQuery('#title_overlay').text(iris.getCurrentVideo()['title'])
              }
            });

            var thumbsUpClicked = function() {
              if (iris.getCurrentVideo()["thumbs"] === undefined) {
                iris.thumbs_up(function(){
                  updateButtons();
                });
              }
            };

            var thumbsDownClicked = function() {
              iris.thumbs_down(function(){});
				//check
				if(_ovg.video_is_full){
					if('movies' == _ovg.cat){
						window.location = '//www.ovguide.com/browse_movies?po=free';
					}else if(0 == _ovg.cat.indexOf('tv')){
						window.location = '//www.ovguide.com/browse_tv?po=free';
					}
				}
            };

            var nextButtonClicked = function() {
              iris.skip_forward(function() {});

            };

            var prevButtonClicked = function() {
              iris.skip_backward(function(){});
            };

            iris.player.on('pause', function(){
              iris.pause();
            });

            iris.player.on('complete', function(){
			  iris.next_auto();
            });


            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            ////////////         CUSTOM BUTTON FUNCTIONS           ///////////////////////////////////////////////////////////////////////
            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


            var updateButtons = function() {
              player.removeButton("prev");
              player.removeButton("next");
              player.removeButton("thumbsUp");
              player.removeButton("thumbsDown");

              //checks if it is the initial adding of buttons or if the current video is thumb'd up
              if (iris.getCurrentVideo() === undefined ||iris.getCurrentVideo()["thumbs"] != "up") {
                player.addButton(imgBaseURL+"img/icons/like.png", "More Like This", thumbsUpClicked, "thumbsUp");
              } else {
                player.addButton(imgBaseURL+"img/icons/like-active.png", "You've liked this video", null, "thumbsUp");
              }
              if (iris.getCurrentVideo() === undefined ||iris.getCurrentVideo()["thumbs"] != "down") {
                player.addButton(imgBaseURL+"img/icons/dislike.png", "Less Like This", thumbsDownClicked, "thumbsDown");
              } else {
                player.addButton(imgBaseURL+"img/icons/dislike-active.png", "You've disliked this", null, "thumbsDown");
              }
              player.addButton(imgBaseURL+"img/icons/next.png", "Next Video", nextButtonClicked, "next");
              player.addButton(imgBaseURL+"img/icons/prev.png", "Prev Video", prevButtonClicked, "prev");

              };

            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            ////////////         WORKER FUNCTIONS                  ///////////////////////////////////////////////////////////////////////
            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            function startWorker(){
				if(jQuery("#player").length && iris.getCurrentVideo() !== undefined){
					// Sends an update if more than 75% of the video has been watched
					var percentageWatched = iris.percentageWatched();
					if ( ( percentageWatched > 0.75 ) && ( iris.getCurrentVideo().percentage_watched_update_sent === false ) ) {
					  iris.getCurrentVideo().percentage_watched_update_sent = true;
					  iris.setBehavior("percentage_watched", percentageWatched);
					  iris.update();
					}
					else if ( percentageWatched < 0.75 ) {
					  iris.getCurrentVideo().percentage_watched_update_sent = false;
					}

					// Displays/Hides title overlay based on if the control bar is active or not

						var player_class = jQuery("#player").attr('class');

						if ("undefined" != typeof player_class && (( player_class.includes("jw-flag-user-inactive")) || ( player_class.includes("jw-flag-ads-hide-controls"))) ){
							jQuery('#title_overlay').hide();
						}
						else {
							jQuery('#title_overlay').show();
						}

					// Reset the worker to run again
					setTimeout(function(){
						startWorker();
					}, 500);
                }
            }

          });
        }


    };

    jwplayer().registerPlugin('iris_plugin','6.0',template);

})(jwplayer);
