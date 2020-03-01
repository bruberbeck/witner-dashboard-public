'use strict';

// Initialize and add the map
(function initMap() {
  // The location of Kadikoy
  const Kadikoy = { lat: 40.975980, lng: 29.050518 },
    Zoom = 14,
		ConfigPath = '/config',
    WitneetsPath = '/weets/witneets',
		DefaultReplyTrack = { color: "green", priority: 0, text: "default" };
  // The map, centered at Istanbul
  const map = new google.maps.Map(document.getElementById('map'),
   { zoom: Zoom, center: Kadikoy });

  dashboardUi.init(() => {
    document.getElementById('firebaseui-auth-container').className += ' hidden';
    const mapDiv = document.getElementById('map'),
      mainWindow = document.getElementById('mainWindow'),
			selectAllTracksBtn = document.getElementById('selectAllTracksBtn'),
			clearAllTracksBtn = document.getElementById('clearAllTracksBtn'),
			replyTrackCbList = document.getElementById('replyTrackCbList'),
      eventFlowView = document.getElementById('eventFlowView'),
			configRef = firebase.database().ref(ConfigPath),
      witneetsRef = firebase.database().ref(WitneetsPath),
      witneetMap = new Map();
		let replyTrackCbs = null;
    mainWindow.className = mainWindow.className.replace('hidden', '');
    markerManager.init(map);
    geofireListener.init(markerManager);

    function _identifyWitneetChange(witneet) {
      let before = witneetMap.get(witneet.tweetId),
        prevStat = before.replyStats && before.replyStats.currentQualifiedStatus,
        nextStat = witneet.replyStats && witneet.replyStats.currentQualifiedStatus,
        prevUser = prevStat && prevStat.user,
        nextUser = nextStat && nextStat.user,
        change = '';

        if (!prevStat && !nextStat
          || prevStat && nextStat && prevStat.priority == nextStat.priority) {
          // No meaningful change has occurred.
          return change;
        }

        if (prevStat && !nextStat
          || prevStat && prevStat.priority < nextStat.priority && prevUser.userId != nextUser.userId) {
          // Previous replier has moved on to another location.
          change = `User @${prevUser.screenName} has moved on to another location.`;
          if (nextStat) {
            // There is another left over user.
            change += ` Current active user is @${nextUser.screenName} (Priority level: ${nextStat.priority} (#${nextStat.tag}))`;
          }
        }
        else if (!prevStat && nextStat) {
          // Stat update.
          change = `User @${nextUser.screenName} has posted a response (Priority level: ${nextStat.priority} (#${nextStat.tag})`;
        }
        else {
          if (prevUser.userId == nextUser.userId) {
            if (nextStat.priority < prevStat.priority) {
              change = `User @${prevUser.screenName} has advanced his/her response: `;
            }
            else {
              change = `User @${prevUser.screenName} has scaled down his/her response: `;
            }
          }
          else {
            change = `User @${nextUser.screenName} has overridden user @${prevUser.screenName}'s response: `
          }

          change += `(Priority level: ${prevStat.priority} (#${prevStat.tag}) -> (Priority level: ${nextStat.priority} (#${nextStat.tag})`;
        }

        return change;
    }

    function _witneetEventHandler(event, snapshot) {
      let witneet = snapshot.val(),
        prompt = `> Witneet '${witneet.tweetId}' (${witneet.text}): `;
      switch (event) {
        case 'child_added':
          witneetMap.set(witneet.tweetId, witneet);
          prompt += 'Witneet has been added to the database.'
          break;

        case 'child_changed':
          {
            let change = _identifyWitneetChange(witneet);
            witneetMap.set(witneet.tweetId, witneet);
            if (!change) {
              // No meaningful change has occurred.
              return;
            }
            prompt += `Witneet has changed [ ${change} ]`;
          }
          break;

        case 'child_removed':
          witneetMap.delete(snapshot.key);
          prompt += 'Witneet has been removed from database.'
          break;
      }

      let p = document.createElement('p');
      p.className = "text-monospace";
      p.innerText = prompt;
      eventFlowView.appendChild(p);
    }

		configRef.on('value', (snapshot) => {
			let config = snapshot.val(),
        cbListContent = '',
				tracks = null;
			if (config && config.replyTracks) {
				tracks = Object.values(config.replyTracks).sort((rt1, rt2) => rt1.priority > rt2.priority);
				// Find min priority.
				let minPrio = Math.max(... tracks.map(rt => rt.priority)) + 1; // The higher its value, the lower a priority.
				DefaultReplyTrack.priority = minPrio;
				tracks.push(DefaultReplyTrack);
			}
			else {
				tracks = [ DefaultReplyTrack ];
			}

			cbListContent = tracks.map(rt => {
				let cbId = `replyTrackCb${rt.priority}`,
          textClass = 'text-white';

        switch (rt.color) {
          case 'cyan':
          case 'orange':
          case 'yellow':
            textClass = 'text-black';
            break;
        }

				return `<li class="list-group-item py-2 d-flex justify-content-between align-items-center">
						<!-- Default checked -->
						 <div class="custom-control custom-checkbox">
							 <input type="checkbox" class="custom-control-input reply-track-checkbox" data-tag="${rt.text}" id="${cbId}" checked>
							 <label style="background-color: ${rt.color}; font-size: .875rem;" class="custom-control-label ${textClass}"  for="${cbId}">#${rt.text}</label>
						 </div>
						<span class="badge badge-primary badge-pill"></span>
					</li>`;
				}).join('');

			replyTrackCbList.innerHTML = cbListContent;
			replyTrackCbs = document.querySelectorAll('#replyTrackCbList input[type="checkbox"]')
		});
    witneetsRef.on('child_added', _witneetEventHandler.bind(null, 'child_added'));
    witneetsRef.on('child_changed', _witneetEventHandler.bind(null, 'child_changed'));
    witneetsRef.on('child_removed', _witneetEventHandler.bind(null, 'child_removed'));

		// Attach listeners.
		function _refreshHiddenTags() {
			let tags = [... replyTrackCbs].filter(cb => !cb.checked)
				.map(cb => cb.dataset.tag);
			markerManager.setHiddenTags(tags);
		}
		
		selectAllTracksBtn.addEventListener('click', () => {
			for (let cb of replyTrackCbs) {
				cb.checked = true;
			}
			_refreshHiddenTags();
		});

		clearAllTracksBtn.addEventListener('click', () => {
			for (let cb of replyTrackCbs) {
				cb.checked = false;
			}
			_refreshHiddenTags();
		});
		
		replyTrackCbList.addEventListener('change', () => _refreshHiddenTags());
  });
}());
