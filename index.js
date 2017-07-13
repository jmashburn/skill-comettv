'use strict';

const scrapeIt = require("scrape-it");
const APP_ID = "amzn1.ask.skill.f6a9ee28-a12d-473b-9cd4-90f43f62178e";  // TODO replace with your app ID (OPTIONAL).

const languageStrings = {
    'en': {
        translation: {
            SKILL_NAME: 'Comet TV Schedule',
            GET_COMETTV_MESSAGE: "Here's whats on comet tv: ",
            HELP_MESSAGE: 'You can say whats on comet tv, or, you can say exit... What can I help you with?',
            HELP_REPROMPT: 'What can I help you with?',
            STOP_MESSAGE: 'Goodbye!',
        },
    }
}

exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.application.applicationId != APP_ID) {
            context.fail("Invalid Application ID");
        }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                    event.session,
                    function callback(sessionAttributes, speechletResponse) {
                        context.succeed(buildResponse(sessionAttributes, speechletResponse));
                    });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                    event.session,
                    function callback(sessionAttributes, speechletResponse) {
                        context.succeed(buildResponse(sessionAttributes, speechletResponse));
                    });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch(e) {
        context.fail("Exception: " + e);
    }
};


function onSessionStarted(onSessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + onSessionStartedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    getWelcomeResponse(callback);
}

function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId + 
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
    intentName = intentRequest.intent.name;

    if ("AskIntent" === intentName) {
        getInsp(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getHelpResponse(callback);
    } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) {
        handleSessionEndRequest(callback);
    } else {
        throw "Invalid intent";
    }
}

function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
        ", sessionId=" + session.sessionId);
    // Add Cleanup Logic
}


function getWelcomeResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "Welcome to Comet TV. " +
        "To get "
    var repromptText = "You can get help by asking, help.";
    var shouldEndSession = false;

    callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getHelpResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Help";
    var speechOutput = "To use Comet TV, " +
        "you may ask for whats on comet tv today by saying: whats on comet tv today.";
    var repromptText = "Or just say now";

    var shouldEndSession = false;

    callback(sessionAttributes, 
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession)); 
}

function handleSessionEndRequest(callback) {
    var cardTitle = "Session End";
    var speechOutput = "Thanks for checking out comet tv."
    var shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));

}

function makeTheRequest(cat, url, theResponseCallback) {

    var body = '';

    scrapeIt(url, {
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
               , episode: "div div.sched-title span.epi-title"
            }
        }
    }, (err, body) => {
        if (err) {
            console.log();
        }
        if (body){
            for (var i = body.schedule.length-1; i >=0; i--) {
                if (body.schedule[i].title === null) {
                    body.schedule.splice(i, 1);
                }
            }
            console.log('Got response: ', body);
            theResponseCallback(null, body);
        }
    });
}

function getInsp(intent, session, callback) {
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";
    var monthOutput = "";
    var currentDay ="";
    var currentMonth = "";
    var maxLength = 0;
    var URL = "http://www.comettv.com/schedule/";

    var currentDate = new Date();
    var day = currentDay = currentDate.getDate();
    var monthIndex = currentMonth = currentDate.getMonth();
    var tmr = currentDay + 1;
    var yest = currentDay - 1;
    var strDay = null;

    var monthNames = [ 
        { num: "01", short: "jan", long:"January"}, 
        { num: "02", short: "feb", long: "February"},
        { num: "03", short: "mar", long: "March"},
        { num: "04", short: "apr", long: "April"},
        { num: "05", short: "may", long: "May"},
        { num: "06", short: "jun", long: "June"},
        { num: "07", short: "jul", long: "July"},
        { num: "08", short: "aug", long: "August"},
        { num: "09", short: "sep", long: "September"},
        { num: "10", short: "oct", long: "October"},
        { num: "11", short: "nov", long: "November"},
        { num: "12", short: "dec", long: "December"},
    ];

    if (intent.slots.date.value) {
        var date = intent.slots.date.value;
        var myDate = new Date(date);
        day = myDate.getDate();
        monthIndex = myDate.getMonth();
        URL += "?date="+monthNames[monthIndex].short+"+"+day
    }

        console.log(currentDate.getTime(), myDate.getTime());


    switch(day) {
        case tmr:
            strDay = "Tomorrow";
            break;
        case yest:
            strDay = "Yesterday";
            break;
        case currentDay:
            strDay = "Today";
            break;
    }

    console.log(URL);

    makeTheRequest(0, URL, function theResponseCallback(err, theReponseBody) {
        var speechOutput;

        if (err) {
            if (err == 'undefiend') {
                speechOutput += "Sorry, the comet tv service can not process your request, please try again.";
            }
            else {
                speechOutput += "Sorry, the comet tv service is experiencing a problem with your request. Try again later.";
            }
        } else {
            var theResponse = theReponseBody;

            speechOutput = "<speak><p>"
            if (strDay) {
                speechOutput += strDay + " on";
            } else {
                strDay = '<say-as interpret-as="date" format="md">'+ monthNames[monthIndex].num +'-'+ day +'</say-as>';
                speechOutput += "On " + strDay +" on";
            }

            speechOutput += " CometTV ";
            speechOutput += "</p>";

            for (var i=0; i<theResponse.schedule.length; i++) {
                speechOutput += "<p>";
                if (theResponse.schedule.length-1 == i) speechOutput += " and ";
                speechOutput += theResponse.schedule[i].title;
                if (theResponse.schedule[i].episode !== "") {
                    speechOutput += ", episode " + theResponse.schedule[i].episode;
                }
                speechOutput += " is showing at " + theResponse.schedule[i].time + "</p>";
            }
            speechOutput +="<p>Thats everything I found on CometTV for " + strDay +".</p>";
            speechOutput += "<p>Check back later for more shows.</p>";
            speechOutput +="</speak>";

            if (strDay == "Yesterday" || myDate < currentDate ) {
                speechOutput = "<speak>" + strDay + " is in the past. Let it go!</speak>";
            }
            // TODO: Not to far inthe futre 
            if (myDate.getMonth() !== currentDate.getMonth() && myDate.getYear() !== currentDate.getYear()) {
                speechOutput = "<speak>Lets us schedule something first.  Try something in " + monthsName[monthIndex].long +"</speak>";
            }

        }

        callback(sessionAttributes,
                buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
    });
}

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "SSML",
            ssml: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

