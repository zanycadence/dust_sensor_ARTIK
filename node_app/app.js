var artikCloud = "https://api.artik.cloud/v1.1/messages";

//device info
var dustBearer = "Bearer INSERT_DEVICE_TOKEN_HERE";
var dustId = "INSERT_DEVICE_ID_HERE";


var dust_data = "Dust_Level";

//BLE stuffs
var noble = require('noble');
var exitHandlerBound = false;
var maxPeripherals = 4;
var peripherals = [];
var dust = 0;
var deviceMapping = {};

var discover = function(peripheral){
  console.log('scan found: ' + peripheral.advertisement.localName + ' - UUID ' + peripheral.advertisement.uuid);
  deviceMapping[peripheral.uuid] = peripheral.advertisement.localName;
  peripheral.connect(connect.bind({peripheral:peripheral}));
}

var connect = function (err) {
  if (err) throw err;
  console.log("Connection to : " + this.peripheral.uuid);
  peripherals[peripherals.length] = this.peripheral;

  if (peripherals.length >= maxPeripherals){
    console.log("Stopping BLE scan. Reached " + maxPeripherals + " peripherals");
    noble.stopScanning();
  }

  if (!exitHandlerBound){
    exitHandlerBound = true;
    process.on('SIGINT', exitHandler);
  }
  this.peripheral.discoverServices([], setupService);
};

var setupService = function(err, services) {
  if (err) throw err;
  services.forEach(function(service){
    console.log(service.uuid);
    if (service.uuid === '19b10040e8f2537e4f6cd104768a1214') {
      console.log('found dust sensor UUID');
      var characteristicUUIDs= ['19b10041e8f2537e4f6cd104768a1214'];
      service.discoverCharacteristics(characteristicUUIDs, function(err, characteristics){
        console.log('got characteristics');
        requestNotify(characteristics[0]);
      });
    }
  });
};

var requestNotify = function(characteristic){
  characteristic.on('read', function(data, isNotification){
    dust = (data[3] << 24) + (data[2] << 16) +(data[1] << 8)+ data[0];
    dust = Bytes2Float32(dust)
    console.log("dust is " + dust);
  });
  characteristic.notify(true, function(err){
    console.log('turned on notificaitons ' + (err ? 'with error' : 'without error'));
  });
}


//copied from StackOverflow http://stackoverflow.com/a/16001019
//Thanks to user Haravikk
function Bytes2Float32(bytes) {
    var sign = (bytes & 0x80000000) ? -1 : 1;
    var exponent = ((bytes >> 23) & 0xFF) - 127;
    var significand = (bytes & ~(-1 << 23));

    if (exponent == 128)
        return sign * ((significand) ? Number.NaN : Number.POSITIVE_INFINITY);

    if (exponent == -127) {
        if (significand == 0) return sign * 0.0;
        exponent = -126;
        significand /= (1 << 22);
    } else significand = (significand | (1 << 23)) / (1 << 23);

    return sign * significand * Math.pow(2, exponent);
}

var exitHandler = function exitHandler(){
  peripherals.forEach(function(peripheral){
    peripheral.disconnect(function(){
      console.log('disconnected');
    });
  });

  setTimeout(function(){
    process.exit();
  }, 2000);
}

noble.on('stateChange', function(state){
  if (state === 'poweredOn'){
    noble.startScanning(['19b10040e8f2537e4f6cd104768a1214'], false);
    noble.on('discover', discover);
  } else {
    noble.stopScanning();
  }
});



//REST client
var Client = require('node-rest-client').Client;
var c = new Client();

function build_args (measurement, measurement_Type, ts, bearer, sdid) {
  var args = {
    headers: {
      "Content-Type": "application/json",
      "Authorization": bearer
    },
    data: {
      "sdid": sdid,
      "ts": ts,
      "type": "message",
      "data": {
        [measurement_Type]: measurement
      }
    }
  };
  return args;
}

var postToCloud = function(){
setTimeout(function(){
    console.log("writing to cloud");
    var test_dust = build_args(dust, dust_data, new Date().valueOf(), dustBearer, dustId);
    c.post(artikCloud, test_dust, function(data, response){
      console.log(data);
    });
  postToCloud();
}, 600000);

};

postToCloud();
