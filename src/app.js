/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */


var UI = require('ui');
var Vector2 = require('vector2');
var Settings = require('settings');
require('firebase');
var Vibe = require('/ui/vibe');
var Light = require('ui/light');


var baseurl = "https://onpoint.firebaseio.com/";
var key = keygen(5);
var timers = [];


function start(key) {
  var shouldUpdateUI = true;
  //key = "38A011750F21";
  var slidesdb = new Firebase(baseurl + "shows/" + key);
  var currentslidedb = new Firebase(baseurl + "monitor/" + key + "/currentSlide");
  var monitordb = new Firebase(baseurl + "monitor/" + key);
  var keydb = new Firebase(baseurl + "monitor/");
  var offsetdb = new Firebase(baseurl + "monitor/" + key + "/offset");
  var defaultMonitors = {index: Date.now(), currentSlide: -1, offset: 0};
  monitordb.set(defaultMonitors);
  
  var slides;
  
  slidesdb.on('value', function(data) {
    console.log("Got slides: " + JSON.stringify(data.val()));
    slides = data.val();
    currentslidedb.once('value', currentSlideChanged);
  });
  
  var main = new UI.Card({
    title: ' On Point',
    icon: 'images/icon.png',
    subtitle: 'Enter key in PowerPoint.',
    body: 'Key: ' + key
  });
  
  main.show();
  
  
  
  currentslidedb.on('value', currentSlideChanged);
  function currentSlideChanged(snapshot) {
    console.log("Child changed: " + snapshot.val());
    for(i = 0; i < timers.length; i++) {
      clearInterval(timers[i]);
    }
    if(snapshot.val() >= 0) {
      var name = slides[snapshot.val()].name;
      var time = slides[snapshot.val()].time;
      console.log("Slide " + name + " " + time);
      var seconds = time;
      main.body(name);
      main.subtitle(pad(Math.floor(seconds / 60)) + ":" + pad((seconds % 60)) + " remaining.");
      
      
      var timer = function() {
          if(shouldUpdateUI) {
            main.body(name);
            main.subtitle(pad(Math.floor(seconds / 60)) + ":" + pad((seconds % 60)) + " remaining.");
          }
          seconds--;
          if(seconds < 0) {
            clearInterval(t);
            Light.trigger();
            Vibe.vibrate('double');
            Vibe.vibrate('long');
          }
      }
      
      if(time > 0) {     
        var t = setInterval(timer, 1000);    
        timers.push(t);
      }
    } else if(snapshot.val() == -1) {
      main.subtitle("Enter key in PowerPoint.");
      main.body("Key: " + key);
    }
  }
  
  main.on('click', 'up', function(e) {
    offsetdb.once('value', function(data) {
      var offset = data.val() + 1;
      monitordb.update({offset: offset});
    });
  });
  
  main.on('click', 'select', function(e) {
    shouldUpdateUI = false;
    
    keydb.orderByChild("index").once('value', function(data) {
      var keys = [];
      
      
      data.forEach(function(snap) {
        keys.unshift({title: snap.key()});
      })
      var menu = new UI.Menu({
        sections: [{
          title: 'Past Keys',
          items: keys
        }]
      });
      
      
      menu.on('select', function(e) {
        selecteddb = new Firebase(baseurl + "monitor/" + e.item.title)
        if(key != e.item.title) {
          key = e.item.title;
          selecteddb.update({
            index: Date.now()
          });
          main.hide();
          menu.hide();
          for(i = 0; i < timers.length; i++) {
            clearInterval(timers[i]);
          }
          start(key);
        } else {
          menu.hide();
          shouldUpdateUI = true;
        }
      });
      
      menu.on('hide', function(e) {
        shouldUpdateUI = true;
      });
      
      menu.show();
    });
    
    
    
  });
  
  main.on('click', 'down', function(e) {
    offsetdb.once('value', function(data) {
      var offset = data.val() - 1;
      monitordb.update({offset: offset});
    });
  });
  
}  
  
  
function keygen(length) {
  return Math.random().toString(36).substring(2, 2 + length);
}

function pad(number) {
    return (number < 10 ? '0' : '') + number;
}

start(key);
