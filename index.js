'use strict'

var Alexa = require('alexa-sdk');
var scrapeIt = require('scrape-it');
var states = {
    FINDMODE: '_FINDMODE',
    DESCMODE: '_DESCMODE',
};

var APP_ID = "amzn1.ask.skill.f6a9ee28-a12d-473b-9cd4-90f43f62178e";

var alexa;

var languageStrings = {
    'en': {
        translation: {
            SKILL_NAME: 'Comet TV Schedule',
            WELCOME_MESSAGE: "Welcome to Comet. You can ask me whats showing, show descriptions and show times, or say help. What can I find for you?",
            WELCOME_REPROMT: "You can ask me whats showing, show description and show times, or say help. What can I find for you?",
            HELP_MESSAGE: "Here are some things you can say: Whats showing right now. Tell me about the show on right now",
            TRYAGAIN_MESSAGE: "please try again.",
            TOMORROW: "Tomorrow",
            YESTERDAY: "Yesterday",
            TODAY: "Today",
            JANUARY: "January",
            FEBRUARY: "February",
            MARCH: "March",
            APRIL: "April",
            MAY: "May",
            JUNE: "June",
            JULY: "July",
            AUGUST: "August",
            SEPTEMBER: "September",
            OCTOBER: "October",
            NOVEMBER: "November",
            DECEMBER: "December",
            SHOWS_FOUND_ON_DAY: "%s on Comet: ",
            SHOWS_FOUND_ON_DATE: "On %s on Comet: ",
            SHOW_TIME_WITH_EPISODE: " ,%s, episode %s is showing at %s ",
            SHOW_TIME: " ,%s is showing at %s. ",
            AND: "and ",
            ALL_FOUND: "Thats everything I found on Comet for %s .",
            CHECK_BACK: "Check back later for more shows.",
            HELP_MESSAGE: 'You can say whats on Comet, or, you can say exit. What can I help you with?',
            HELP_REPROMPT: 'Ask me whats showing. What can I help you with?',
            STOP_MESSAGE: 'Goodbye!',
        },
    }
};


var newSessionHandlers = {
    'LaunchRequest': function() {
        this.emit(':ask', this.t("WELCOME_MESSAGE"), this.t("WELCOME_REPROMT"));
    },
    'getScheduleIntent': function() {
        this.handler.state = states.FINDMODE;    
        this.emitWithState('getScheduleIntent');
    },
    'getDescriptionIntent': function() {
        this.handler.state = states.FINDMODE;    
        this.emitWithState('getDescriptionIntent');
    },
    'AMAZON.StopIntent': function() {
        this.emit('SessionEndedRequest');
    },
    'AMAZON.CancelIntent': function() {
        this.emit('SessionEndedRequest');
    },
    'SessionEndedRequest': function() {
        this.emit(':tell', this.t("STOP_MESSAGE"));
    },
    'Unhandled': function() {
        this.attributes['speechOutput'] = this.t("HELP_MESSAGE");
        this.attributes['repromptSpeech'] = this.t("HELP_REPROMPT");
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptSpeech']);
    },
};

var startFindHandlers = Alexa.CreateStateHandler(states.FINDMODE, {
    'getScheduleIntent': function() {
        var monthNames = [
            { num: "1", short: "jan", long: this.t("JANUARY") },
            { num: "2", short: "feb", long: this.t("FEBRUARY") },
            { num: "3", short: "mar", long: this.t("MARCH") },
            { num: "4", short: "apr", long: this.t("APRIL") },
            { num: "5", short: "may", long: this.t("MAY") },
            { num: "6", short: "jun", long: this.t("JUNE") },
            { num: "7", short: "jul", long: this.t("JULY") },
            { num: "8", short: "aug", long: this.t("AUGUST") },
            { num: "9", short: "sep", long: this.t("SEPTEMBER") },
            { num: "10", short: "oct", long: this.t("OCTOBER") },
            { num: "11", short: "nov", long: this.t("NOVEMBER") },
            { num: "12", short: "dec", long: this.t("DECEMBER") },
        ];

        var dateSlot = this.event.request.intent.slots.date;
        var timeSlot = this.event.request.intent.slots.time;
        var URL = "http://www.comettv.com/schedule/";

        var currentDate = new Date();
        var currentDay;
        var currentMonthIndex;
        var year = currentDate.getFullYear();
        var monthIndex = currentMonthIndex  = currentDate.getMonth();
        var day = currentDay = currentDate.getDate();
        var hours;
        var mins;
        var AMPM = "AM";

        //var tmr = currentDay + 1;   
        //var yest = currentDay - 1;
        var strDay = null;
        var strDate = false;
        var numDay;
        var obj = this;

        if (dateSlot && dateSlot.value) {
            var date = new Date(dateSlot.value);
            day = date.getDate();
            monthIndex = date.getMonth();
            URL += "?date="+monthNames[monthIndex].short+"+"+day;
        }

        if (timeSlot && timeSlot.value) {
            var time = timeSlot.value;
            /* var parts = time.split(/\s/);*/
            var hours = Number(time.match(/^(\d+)/)[1]);
            if (time.match(/:(\d+)/)) {
                mins  = Number(time.match(/:(\d+)/)[1]);
            }
            if (hours>=12) { AMPM = "PM"; hours = hours-12; }
           
            // var AMPM  = parts[1].toUpperCase();
            // if(AMPM == "PM" && hours<12) hours = hours+12;
            // if(AMPM == "AM" && hours==12) hours = hours-12;
            console.log(new Date(year, monthIndex, day, hours, mins));
            console.log(year, monthIndex, day, hours, mins, AMPM);
        }

        switch(day) {
            case currentDay + 1:
                strDay = this.t("TOMORROW");
                break;
            case currentDay - 1:
                strDay = this.t("YESTERDAY");
                break;
            case currentDay:
                strDay = this.t("TODAY");
                break;
            default:
                strDay = monthNames[monthIndex].long + " " + day;
                numDay = monthIndex+1 + "-" + day;
                strDate = true;
                break;
        }



        makeRequest(URL, {
            schedule: {
                listItem: ".sched-main .row"
                , data: {
                    title: {
                        selector: "div div.sched-title a"
                        , how: "html"
                    }
                    , time: {
                        selector: "div.sched-time"
                    }
                    , link: {
                        selector: "div div.sched-title a",
                        attr: "href",
                    }
                    , episode: "div div.sched-title span.epi-title"
                }
            }
        }, function (err, responseBody) {
            var speechOutput;
            var cardTitle;
            var cardContent;
            var showTitle;
            var showEpisode;
            var showTime;

            if (err) {
                if (err =='undefined') {
                    speechOutput += obj.t("REQUEST_RETRY");
                } else {
                    speechOutput += obj.t("REQUEST_FAILED");
                }
            } else {
                if (strDate) {
                    cardTitle = obj.t("SHOWS_FOUND_ON_DATE", strDay);
                    strDay = "<say-as interpret-as=\"date\" format=\"md\">" + numDay + "</say-as>";
                    speechOutput += obj.t("SHOWS_FOUND_ON_DATE", strDay);   
                } else {
                    speechOutput += obj.t("SHOWS_FOUND_ON_DAY", strDay);
                    cardTitle = obj.t("SHOWS_FOUND_ON_DAY", strDay);
                }

                for (var i=0; i<responseBody.schedule.length; i++) {
                    showTitle = responseBody.schedule[i].title;
                    showEpisode = responseBody.schedule[i].episode;
                    showTime = responseBody.schedule[i].time;
                    
                    if (responseBody.schedule.length-1 == i) speechOutput += obj.t("AND");

                    if (responseBody.schedule[i].episode) {
                        speechOutput += obj.t("SHOW_TIME_WITH_EPISODE", showTitle, showEpisode, showTime);
                    } else {
                        speechOutput += obj.t("SHOW_TIME", showTitle, showTime);
                    }
                }
                speechOutput += obj.t("ALL_FOUND", strDay);
                speechOutput += obj.t("CHECK_BACK");
            }
            cardContent = speechOutput;
            obj.emit(':tellWithCard', speechOutput, cardTitle, cardContent);
        });




    },
    'getDescriptionIntent': function() {
        this.handler.state = states.DESCMODE;
        /*athis.emit(':askWithCard', */ 
    },
    'AMAZON.HelpIntent': function() {
        this.attributes['speechOutput'] = this.t("HELP_MESSAGE");
        this.attributes['repromptSpeech'] = this.t("HELP_REPROMPT");
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptSpeech']);
    },
    'AMAZON.YesIntent': function() {
        this.attributes['speechOutput'] = this.t("HELP_MESSAGE");
        this.attributes['repromptSpeech'] = this.t("HELP_REPROMPT");
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptSpeech']);
    },
    'AMAZON.NoIntent': function() {
        this.attributes['speechOutput'] = this.t("HELP_MESSAGE");
        this.attributes['repromptSpeech'] = this.t("HELP_REPROMPT");
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptSpeech']);
    },
    'AMAZON.RepeatIntent': function() {
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptSpeech']);
    },
    'AMAZON.CancelIntent': function() {
        this.emit('SessionEndedRequest');
    },
    'AMAZON.StopIntent': function() {
        this.emit('SessionEndedRequest');
    },
    'SessionEndedRequest': function() {
        this.emit(':tell', this.t("STOP_MESSAGE"));
    },
    'Unhandled': function() {
        this.attributes['speechOutput'] = this.t("HELP_MESSAGE");
        this.attributes['repromptSpeech'] = this.t("HELP_REPROMPT");
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptSpeech']);
    }   
});

var descriptionHandlers = Alexa.CreateStateHandler(states.DESCMODE, {
    'getScheduleIntent': function() {
        this.handler.state = states.FINDMODE;
        this.emitWithState('getScheduleIntent');
    },
    'getDescriptionIntent': function() {

    },
    'AMAZON.HelpIntent': function() {
        this.attributes['speechOutput'] = this.t("HELP_MESSAGE");
        this.attributes['repromptSpeech'] = this.t("HELP_REPROMPT");
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptSpeech']);
    },
    'AMAZON.YesIntent': function() {
        this.attributes['speechOutput'] = this.t("HELP_MESSAGE");
        this.attributes['repromptSpeech'] = this.t("HELP_REPROMPT");
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptSpeech']);
    },
    'AMAZON.NoIntent': function() {
        this.attributes['speechOutput'] = this.t("HELP_MESSAGE");
        this.attributes['repromptSpeech'] = this.t("HELP_REPROMPT");
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptSpeech']);
    },
    'AMAZON.RepeatIntent': function() {
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptSpeech']);
    },
    'AMAZON.CancelIntent': function() {
        this.emit('SessionEndedRequest');
    },
    'AMAZON.StopIntent': function() {
        this.emit('SessionEndedRequest');
    },
    'SessionEndedRequest': function() {
        this.emit(':tell', this.t("STOP_MESSAGE"));
    },
    'Unhandled': function() {
        this.attributes['speechOutput'] = this.t("HELP_MESSAGE");
        this.attributes['repromptSpeech'] = this.t("HELP_REPROMPT");
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptSpeech']);
    }   
});

exports.handler = function (event, context, callback) {
    alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.resources = languageStrings;
    alexa.registerHandlers(newSessionHandlers, startFindHandlers, descriptionHandlers);
    alexa.execute();
};


function makeRequest(query, struct, callback) {
    var body = '';
    scrapeIt(query, struct
    , (err, body) => {
        if (err) console.error(err);
        if (body) {
            for (var i = body.schedule.length-1; i >= 0; i--) {
                if (body.schedule[i].title === null) {
                    body.schedule.splice(i, 1);
                }
            }
            callback(null, body);
        }
    });
}



