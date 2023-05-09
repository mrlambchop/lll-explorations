import { Logic } from './logic.js'
import { Ledger } from './ledger.js'

let PRINT_VERBOSE = false

class ParticleAPIClass {

    apiDictionary = {};
    
    logic = undefined
    ledger = undefined

    constructor() {
      //Hook into the fetch event
      addEventListener('fetch', event => {
        event.respondWith(this.handleFetch(this, event.request));
      });

       //create the logic object
       this.logic = new Logic(this)
       this.ledger = new Ledger(this.logic, this)
    }

    //helper function to handle options requests from third party web apps
    async handleOptions(request) {
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
      };

      if (
        request.headers.get("Origin") !== null &&
        request.headers.get("Access-Control-Request-Method") !== null &&
        request.headers.get("Access-Control-Request-Headers") !== null
      ) {
        // Handle CORS preflight requests.
        return new Response(null, {
          headers: {
            ...corsHeaders,
            "Access-Control-Allow-Headers": request.headers.get(
              "Access-Control-Request-Headers"
            ),
          },
        });
      } else {
        // Handle standard OPTIONS request.
        return new Response(null, {
          headers: {
            Allow: "GET, HEAD, POST, OPTIONS",
          },
        });
      }
    }

    //main fetch API - called in a queue from the workerd process
    //Sends either external API registrations or handles registered events
    async handleFetch(obj, request) {
      if (PRINT_VERBOSE) {
        console.log('handleFetch', request.url, request.method )
      }

      if (request.method === "OPTIONS") {
        // Handle CORS preflight requests
        return obj.handleOptions(request);
      }
      else {
        //if there is a path then it is a REST API call
        if (request.url.includes('/api/')) {

            //get the path
            const path = request.url.split('/api/')[1]

            if (PRINT_VERBOSE) {
              console.log('path', path)
            }

            //get the callback
            const callback = this.apiDictionary[path];

            if (callback) {
              const payload = await request.json();
              const response = callback(obj, request, payload);
              return response;
            } else {
              //not found! options are
              console.log("not found! options are: ", Object.keys(this.apiDictionary))
              return Response("Not Found\n", { status: 404 });
            }
        } else {
            //decode the request JSON and get the event name
            const payload = await request.json();

            //pass to the * handler
            const callback = this.apiDictionary['*'];

            return callback()
        }
      }
    }

    //API register
    registerAPI(path, callback) {
      this.apiDictionary[path] = callback;
    }

    // curl --location 'https://api.particle.io/v1/devices/events' \
    // --header 'Authorization: Bearer NOKEY' \
    // --header 'Content-Type: application/x-www-form-urlencoded' \
    // --data-urlencode 'name=lll_ledgerReadResponse' \
    // --data-urlencode 'data=DATA'
    async sendEvent(particleAPI, deviceID, eventName, payload) {

        if (PRINT_VERBOSE) {
        console.log('sendEvent', deviceID, eventName, payload)
        }

        const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
        };
        //do a HTTP call to api.particle.io and send the event
        const url = 'https://api.particle.io/v1/devices/events'
        // + '?access_token=' + access_token;

        var message = {
        'name': eventName,
        'data': payload
        };

        var formBody = [];
        for (var property in message) {
            var encodedKey = property //encodeURIComponent(property);
            var encodedValue = message[property] //encodeURIComponent(message[property]);
            formBody.push(encodedKey + "=" + encodedValue);
        }
        formBody = formBody.join("&");

        console.log('formBody', formBody)
        console.log('url', url)

        //...corsHeaders,

        //send the event
        await fetch(url, {
        timeout: 1000,
        method: 'POST',
        body: formBody,
        headers: {  'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Bearer NOKEY' },
        })

        if (PRINT_VERBOSE) {
          console.log('sendEvent done');
        }
    }
};

export const Particle = new ParticleAPIClass();
