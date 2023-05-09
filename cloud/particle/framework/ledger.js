let PRINT_VERBOSE = false

export default class Ledger {
  
    //global quick KV store dictionary
    //Don't persist this dictionary between runs
    kvStore = {};

    constructor(logicAPI, particleAPI) {  
      //expose the ledger via events that can read / write from the ledger
      logicAPI.register('lll_ledgerWrite', this.writeKeyLogicBlock);
      logicAPI.register('lll_ledgerRead', this.readKeyLogicBlock);

      particleAPI.registerAPI('ledger/read', this.readKeyLogicBlockRestAPI);
      particleAPI.registerAPI('ledger/write', this.writeKeyLogicBlockRestAPI);

      //register a CRON hook API
      particleAPI.registerAPI('cron', this.cronLogicBlockRestAPI);
    }

    //LOGIC WRITE
    write = (key, value) => {
      this.kvStore[key] = value;

      if (PRINT_VERBOSE) {
        console.log('ledgerWrite:', key, this.kvStore[key])
      }

      //console.log('ledgerWrite ALL:', this.kvStore)
    }

    //LOGIC READ
    read = (key) => {
      //console.log('ledgerRead ALL:', this.kvStore)

      if (PRINT_VERBOSE) {
        console.log('ledgerRead:', key, this.kvStore[key])
      }

      return this.kvStore[key];
    }

    //logic block that just writes a key
    async writeKeyLogicBlock(particleAPI, eventName, deviceID, productID, payload) {

      if (PRINT_VERBOSE) {
        console.log('writeKeyLogicBlock', eventName, payload);
      }

      //split the payload into key and value deliminated by ':'
      const payloadArray = payload.split(':')

      particleAPI.ledgerWrite(payloadArray[0], payloadArray[1])
    }

    //logic block that just reads a key
    async readKeyLogicBlock(particleAPI, eventName, deviceID, productID, payload) {

      if (PRINT_VERBOSE) {
        console.log('readKeyLogicBlock', eventName, payload);
      }

      let value = "";

      try {
        value = particleAPI.ledger.read(payload)
      } catch (error) {
        console.log("error", error)
      }

      //construct the update that is the key and value together
      const update = payload + ':' + value

      //send the value back to the device
      await particleAPI.sendEvent(particleAPI, deviceID, 'lll_ledgerReadResponse', update );
    }

    /*********
     * REST API to access ledger data from external apps
     */
    readKeyLogicBlockRestAPI(particleAPI, request, payload) {

      if (PRINT_VERBOSE) {
        console.log('readKeyLogicBlockRestAPI', payload, request.headers);
      }

      //read the key
      const value = particleAPI.ledger.read(payload.key)

      //create a response
      const response = {
        key: payload.key,
        value: value
      }

      const json = JSON.stringify(response);

      //console.log('response', json)

      const headers = {
        "content-type": "application/json;charset=UTF-8"
      }

      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
      };

      const responseHeaders = new Headers(request.headers)
      responseHeaders.set('Access-Control-Allow-Origin', 'https://719nw37v.ngrok.io/api/ledger/read')
      responseHeaders.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS')
      responseHeaders.set('Access-Control-Max-Age', '86400')
      responseHeaders.set('content-type', 'application/json;charset=UTF-8')

      return new Response(json,{ status: 201, headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    writeKeyLogicBlockRestAPI(particleAPI, request, payload) {
      if (PRINT_VERBOSE) {
        console.log('writeKeyLogicBlockRestAPI', payload);
      }

      //write the key
      particleAPI.ledger.write(payload.key, payload.value)

      return new Response("OK\n", { status: 201, headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    /*******
     * CRON hook - the CRON timing is done by the workerd infrastructure
     */
    async registerLogicBlockCRON(callback, cron) {
      if (PRINT_VERBOSE) {
          console.log('registerLogicBlockCRON', cron)
      }

      //store the callback in the dictionary
      this.cronDictionary[cron] = callback;
    }
}

