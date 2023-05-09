let PRINT_VERBOSE = false

export default class Logic {
  
      eventDictionary = {};
      cronDictionary = {};

      constructor(particleAPI) {  

        //register for the default event hook
        particleAPI.registerAPI('*', this.eventStarHandler);

        //register a CRON hook API
        particleAPI.registerAPI('cron', this.cronLogicBlockRestAPI);
      }

      //create a function that takes in a call back that contains 2 parameters (a) eventName and (b) payload
      //store this function in an dictionary with the key being the eventName and the value being the callback
      register(eventName, callback) {
          //store the callback in the dictionary
          this.eventDictionary[eventName] = callback;
      }

      async eventStarHandler(particleAPI, request, payloadJSON) {
        const eventName = payloadJSON.event;
        const callback = this.eventDictionary[eventName];

        if (PRINT_VERBOSE) {
          console.log('payload', payload);
        }

        if (callback) {
          const deviceID = payload.coreid
          const productID = "unknown"
          await callback(obj, eventName, deviceID, productID, payload.data);
          return new Response("OK\n");
        } else {
          //not found! options are
          console.log("not found! options are: ", Object.keys(this.eventDictionary))

          return new Response("OK\n"); //Response("Not Found\n", { status: 404 });
        }
      }

      cronLogicBlockRestAPI(particleAPI, request, payload) {
        if (PRINT_VERBOSE) {
          console.log('cronLogicBlockRestAPI', payload);
        }
  
        //get the cron
        const cron = payload.cron
  
        //get the callback
        const callback = particleAPI.cronDictionary[cron];
  
        if (callback) {
          callback(particleAPI, request, payload);
          return new Response("OK\n");
        }
        else {
          return new Response("Not Found\n", { status: 404 });
        }
      }

      async registerLogicBlockCRON(callback, cron) {
        if (PRINT_VERBOSE) {
            console.log('registerLogicBlockCRON', cron)
        }
  
        //store the callback in the dictionary
        this.cronDictionary[cron] = callback;
      }
}


