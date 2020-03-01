'use strict';

var config = {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: ""
};
firebase.initializeApp(config);

var uiConfig = {
  callbacks: {
    signInSuccessWithAuthResult: function(authResult, redirectUrl) {
      // User successfully signed in.
      // Return type determines whether we continue the redirect automatically
      // or whether we leave that to developer to handle.
      funcs.init();
      return false;
    }
  },
  // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
  //signInFlow: 'popup',
  signInOptions: [
    // Leave the lines as is for the providers you want to offer your users.
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
    firebase.auth.FacebookAuthProvider.PROVIDER_ID,
    firebase.auth.TwitterAuthProvider.PROVIDER_ID,
    firebase.auth.GithubAuthProvider.PROVIDER_ID,
    firebase.auth.EmailAuthProvider.PROVIDER_ID,
    firebase.auth.PhoneAuthProvider.PROVIDER_ID
  ],
};

if (firebase.auth().currentUser == null) {
    // Initialize the FirebaseUI Widget using Firebase.
    var ui = new firebaseui.auth.AuthUI(firebase.auth());
    // The start method will wait until the DOM is loaded.
    ui.start('#firebaseui-auth-container', uiConfig);
}
else {
    funcs.init();
}

(function _exts() {
    Array.prototype.remove = function(item) {
        var i = this.indexOf(item);
        if (i >= 0)
            this.splice(i, 1);
    };
    String.prototype.toFirstLetterCapital = function() {
        var ret = '';
        if (this.length > 0)
            ret += this[0].toUpperCase();
        if (this.length > 1)
            ret += this.slice(1).toLowerCase();
        return ret;
    };
}());

var funcs = (function() {
    var _whiteSpaceRegex = /\s+/g,
        _config,
        _configRef = firebase.database().ref('config/'),
        _prios = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ],
        _colors = [ 'azure', 'blue', 'cyan', 'green', 'magenta',
                 'orange', 'red', 'mistyrose', 'violet', 'yellow' ],
        _mainContainer = document.getElementById('main-container'),
        _signOutBtn = document.getElementById('signOutBtn'),
        _isOnInput = document.getElementById('isOnInput'),
        _isOn = document.getElementById('isOn'),
        _tracksInput = document.getElementById('tracksInput'),
        _tracks = document.getElementById('tracks'),
        _replyTrackText = document.getElementById('replyTrackText'),
        _prioritiesInput = document.getElementById('replyTrackPriority'),
        _colorsInput = document.getElementById('replyTrackColor'),
        _replyTracks = document.getElementById('replyTracks'),
        _clickHandlers;

    function _clearIsOn() {
        _configRef.child('isOn').set(null);
    }

    function _clearTracks() {
        _configRef.child('tracks').set(null);
    }

    function _clearReplyTracks() {
        _configRef.child('replyTracks').set(null);
    }

    function _submitIsOn() {
        _configRef.child('isOn').set(_isOnInput.checked);
    }

    function _submitTracks() {
        var newRacks = _tracksInput.value.split(' '),
            oldRacks = _config.tracks || [],
            i,
            rack;

        for (i = 0; i < newRacks.length; ++i) {
            rack = newRacks[i];
            if (oldRacks.indexOf(rack) < 0)
                oldRacks.push(rack);
        }

        _tracksInput.value = '';
        oldRacks.sort();
        _configRef.child('tracks').set(oldRacks);
    }

    function _submitReplyTracks() {
        var text = _replyTrackText.value.replace(_whiteSpaceRegex, ''),
            val = {};

        if (text.length == 0 || _prioritiesInput.length == 0)
            return;

        var item = {
            text: text,
            priority: parseInt(_prioritiesInput.value),
            color: _colorsInput.value
        };
        _configRef.child(`replyTracks/${text}`).transaction(() => item);
    }

    function _processClick(event) {
        if (event.target.id in _clickHandlers) {
            _clickHandlers[event.target.id]();
            event.stopPropagation();
            return;
        }
    }

    function _processIsOn(config) {
        var isOn = false;
        if (config.isOn)
            isOn = !!config.isOn;

        _isOn.checked = _isOnInput.checked = isOn;
    }

    function _processTracks(config) {
        var trs = '';
        if (config.tracks && Array.isArray(config.tracks))
            trs = config.tracks.join(', ');

        _tracks.innerText = trs;
    }

    function _processReplyTracks(config) {
        var racks = config.replyTracks, // racks is an object.
            racksArr = [],
            prios = _prios.slice(0),
            colors = _colors.slice(0),
            prop,
            rows = [],
            table;

        for (prop in racks) {
          racksArr.push(racks[prop]);
        }
        racksArr.sort((r1, r2) => r1.priority - r2.priority);

        for (let rack of racksArr) {
            prios.remove(rack.priority);
            colors.remove(rack.color);

            rows.push({
                prio: rack.priority,
                row: `<tr><td>${rack.text}</td>
                    <td>${rack.priority}</td>
                    <td style="background-color: ${rack.color}">${rack.color}</td></tr>` });
        }

        table = `<table width="100%">
                    <thead>
                        <tr>
                            <td>Tag</td>
                            <td>Priority</td>
                            <td>Color</td>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => r.row).join('')}
                    </tbody>
                </table>`;

        replyTracks.innerHTML = table;
        replyTrackPriority.innerHTML = prios.map(p =>
            `<option value="${p}">${p}</option>`).join('');
        replyTrackColor.innerHTML = colors.map(c =>
            `<option value="${c}">${c}</option>`).join('');
    }

    function _configListener(config) {
        _processIsOn(config);
        _processTracks(config);
        _processReplyTracks(config);
    }

    function _init() {
        _clickHandlers = {
            onOffSubmit: _submitIsOn,
            tracksSubmit: _submitTracks,
            replyTracksSubmit: _submitReplyTracks,
            onOffClear: _clearIsOn,
            tracksClear: _clearTracks,
            replyTracksClear: _clearReplyTracks
        };

        document.addEventListener('click', _processClick);
        _signOutBtn.style.display = "";
        _mainContainer.style.display = "";
        _signOutBtn.addEventListener('click', () => _signOut());
        _configRef.on('value', function(snapshot) {
            _config = snapshot.val() || {};
            _configListener(_config);
        });
    }

    function _signOut() {
        firebase.auth().signOut().then(function() {
            location.reload();
        },
            function(error) {
                alert.error();
        });
    }

    return {
        init: _init
    };
}());
