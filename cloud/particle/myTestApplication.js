import { Particle } from 'framework/particleAPI';

//local variables - these are reset when the app is reloaded so don't rely on them!
let cronCounter = 0;

//support websockets?
const SUPPORT_WEBSOCKETS = false

export class MyTestApplication {

    webSockets = [];

    /* Register all of my logic blocks(?) hooks */
    constructor() {
      console.log('MyTestApplication init');

      Particle.logic.register('lll_testRequest', (particleAPI, eventName, deviceID, productID, payload) => {
        console.log('testRequest', eventName, deviceID, productID, payload);
      });

      //listen to all messages from a device
      if(SUPPORT_WEBSOCKETS) {
        Particle.logic.register('*', this.onAllMessages);
      }

      //experiement with a single event that contains multiple payloads
      Particle.logic.register('lll_testMulti', this.onTestMultiEvent);

      //Experiment with using different event names for transferring data
      Particle.logic.register('lll_cameraFrameStart', this.onCameraFrameEvent);
      Particle.logic.register('lll_cameraFrameData', this.onCameraFrameEvent);
      Particle.logic.register('lll_cameraFrameEnd', this.onCameraFrameEvent);


      //register a CRON job that runs every 10 seconds
      Particle.logic.register(this.onCRONTimeout, '*/10 * * * * *');

      //install a websocket for an external service to connect to
      if(SUPPORT_WEBSOCKETS) {
        const websocket = Particle.serveWebsocket(onWebSocketEvent);
      }
    }

    //a function that unpacks the payload
    async onTestMultiEvent(particleAPI, eventName, deviceID, productID, payload) {
      console.log('onTestMultiEvent', eventName, deviceID, payload);

      //decode the payload which is a string, comma separated
      const payloadArray = payload.split(',')

      //print them out on the console
      payloadArray.forEach((item, index) => {
        console.log('item', index, item)

        //do something with the data?
        //fire to an API
      });
    }

    /* This is a function that is called when a camera data is received
    *  It is called 3 times:
    *   1. When the camera starts sending data
    *   2. When a sub packet of data is received
    *   3. When the camera stops sending data
    * It stores the data in a temp array until all packets are received
    * Then it decodes the data and stores it in display buffer KV
    * */

    async onCameraFrameEvent(particleAPI, eventName, deviceID, productID, payload) {

      function resetState(frameNumber, packetCount) {
        console.log('resetState', frameNumber, packetCount)

        particleAPI.ledger.write('cameraDataTotalPackets_' + frameNumber, 0)
        particleAPI.ledger.write('cameraDataNextPacket_' + frameNumber, 0)
        particleAPI.ledger.write('cameraDataArray_' + frameNumber, "")
      }

      //decode the payload as JSON
      const payloadJSON = JSON.parse(payload)

      console.log('onCameraFrameEvent', eventName, deviceID, productID, payload, payloadJSON);

      if (eventName === 'lll_cameraFrameStart') {
        //the payload says how many packets to expect
        resetState(payloadJSON.frameNumber, payloadJSON.packets);
      }
      else if (eventName === 'lll_cameraFrameData') {

        const expectedPacketID = particleAPI.ledger.read('cameraDataNextPacket_' + payloadJSON.frameNumber)
        console.log('lll_cameraFrameData', payloadJSON.subframe, expectedPacketID);

        const totalPackets = particleAPI.ledger.read('cameraDataTotalPackets_' + payloadJSON.frameNumber)

        const cameraFrameKeyName = 'cameraDataArray_' + payloadJSON.frameNumber

        //did we receive all packets in order?
        if( payloadJSON.subframe == expectedPacketID ) {
          //store the data in the temp array
          let tempString = particleAPI.ledger.read(cameraFrameKeyName)

          //append the new data to the temp array
          tempString += payloadJSON.data

          //store the temp array back into the KV store
          particleAPI.ledger.write(cameraFrameKeyName, tempString)

          //increment the next packet ID
          particleAPI.ledger.write('cameraDataNextPacket_' + payloadJSON.frameNumber, expectedPacketID + 1)

          //write the incremental totalPackets
          particleAPI.ledger.write('cameraDataTotalPackets_' + payloadJSON.frameNumber, totalPackets + 1)
        }
        else {
          console.log('ERROR: out of order packet received', payloadJSON.subframe, expectedPacketID)
        }
      }
      else if (eventName === 'lll_cameraFrameEnd') {
          //did we receive all packets in order?
          const totalPackets = particleAPI.ledger.read('cameraDataTotalPackets_' + payloadJSON.frameNumber)
          const nextPacketID = particleAPI.ledger.read('cameraDataNextPacket_' + payloadJSON.frameNumber)

          console.log('lll_cameraFrameEnd', totalPackets, nextPacketID)

          if( nextPacketID == totalPackets ) {
            //for each of the sub packets, decode them from base64 and copy them into the full frame
            const tempArray = particleAPI.ledger.read('cameraDataArray_' + payloadJSON.frameNumber)

            particleAPI.ledger.write('displayBuffer', tempArray)
          }
          else {
            console.log('ERROR: missing packets', totalPackets, nextPacketID)
          }
      }
    }

    //a function that is called when a CRON job is triggered
    onCRONTimeout(particleAPI) {
      //do something I guess
      console.log('CRON!')

      //send an event to a specific device - KHAAAANNNNNNN!!!
      particleAPI.sendEvent(particleAPI, '0a10aced202194944a040a64', 'lll_CRONNNNN', 'testPayload: ' + cronCounter++);
    }

    //a wildcard subscription for all events
    //we use this to make a websocket bridge
    async onAllMessages(particleAPI, eventName, deviceID, productID, payload) {
      //send to all connected websockets
      this.websocket.forEach(function(socket, index, arr){
        socket.send(eventName + ' ' + deviceID + ' ' + payload);
      })
    }

    onWebSocketEvent(particleAPI, event, data) {
      console.log('onWebSocketEvent!')

      if(event == 'connect') {
        //store the websocket object
        this.websocket.append(data.socket);
      }
      else if(event == 'disconnect') {
        //remove the websocket object from the array
        this.websocket = this.websocket.filter(function(value, index, arr){
          return value !== data.socket;
        })
      }
      else if (event == 'message') {
        //send the message to all devices? for now, just a single device
        particleAPI.sendEvent(particleAPI, '0a10aced202194944a040a64', data.eventName, data.payload);
      }
    }
}

const app = new MyTestApplication();
