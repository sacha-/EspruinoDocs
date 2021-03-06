<!--- Copyright (c) 2014 Sacha Gloor. See the file LICENSE for copying permission. -->


Module for communicate with xBee radios
=======================================

* KEYWORDS: Module,xBee,API Firmeware, API Mode 1

Summary
-------
```
Serial1.setup(38400,{rx:B7,tx:B6,bytesize:8,parity:none,stopbits:1});
myxbee=requere('XBee-API1'.connect(Serial1);
```
functions:

  XBee-API1.AT(command,value,function(re,data) {} )
  XBee-API1.strtobytes(String)
  XBee-API1.TX(addr64,addr16,options,data,function(re,data) {} )
  XBee-API1.RX(function(data) {} )


xBee Frame Types implemented
----------------------------

* 08 => AT Command
* 88 => AT Command respond
* 10 => Transmit request
* 8B => Transmit Status
* 90 => RX Packet

Creating an xbee object
-----------------------

Initialize a serial object and pass it to the xbee object

```
Serial1.setup(38400,{rx:B7,tx:B6,bytesize:8,parity:none,stopbits:1});
myxbee=requere('XBee-API1'.connect(Serial1);
```

function XBee-API1.AT
---------------------

Call type:
    function XBee-API1.AT(command,value,function(re,data) {} )
    
Description:
    
    Submits a AT Command. 
    
Parameters:
    'command' is the AT command without the "AT" prefix
    
    'value' array of bytes. When empty the function reads the current value, otherwise it will be written
    
    'function' the callback function. Called on timeout, or on success.
    on sucess, the value of 're' will be true and data contains an array with the returned data.
    
    Example of the data array:
    {
      "cmd":"VR",
      "status":0,
      "data":[35,167]
    }
        
Return: 
    No return value (undefined)
    
Examples:
  
Read out an AT parameter:
```
myxbee.AT('VR',[],function(re,data) {
    console.log(re);
    if (re===true) {
        console.log(data);
    }
});
```

Sets the NI to "MyBee":
```
myxbee.AT('NI',[0x4D,0x79,0x42,0x65,0x65],function(re,data) {
    console.log(re);
    if (re===true) {
        console.log(data);
    }
});
```

function XBee-API1.strtobytes
------------------------------

Call type:
    function XBee-API1.strtobytes(String)
    
Description:
    
    Returns an array of bytes representing the string. Can be used to
    pass ASCII values to the AT command
    
Return: Array of bytes

Example:
```
myxbee.AT('NI',myxbee.strtobytes('MyBee'),function(re,data) {
    console.log(re);
    if (re===true) {
        console.log(data);
    }
});
```

function XBee-API1.TX
---------------------

Call type:
    function XBee-API1.TX(addr64,addr16,options,data,function(re,data) {} )
    
Description:
    
    Sends data to another xBee radio. 
    
Parameters:
    'addr64' 64 Bit address
    'addr16' 16 Bit address
    
    options: See xBee API documentation, default 0x00
    
    'data' Data to send
    
    'function' the callback function. Called on timeout, or on success.
    on sucess, the value of 're' will be true and data contains an array with the returned data.
    
    Example of the data array:
    {
      "destination":[0,0],
      "retrycount":0,"delivery_status":0,"discovery_status":0
    }
        
Return: 
    No return value (undefined)
    
Example:
```
    addr64=[0x00,0x13,0xA2,0x00,0x40,0xA1,0xF2,0x1D]; // Destination 64 Bit address
    addr16=[0x0,0x0]; // Destination 16 bit address

    myxbee.TX(addr64,addr16,0,[0x55,0x56,0x44],function(re,data) {
    console.log(re);
    if (re===true) {
        console.log(data);
      }
    });
```

function XBee-API1.RX
---------------------

Call type:
    function XBee-API1.RX(function(data) {} )
    
Description:
    
    Register a callback function to receive data from other radios. 
    
Parameters:
    
    'function' the callback function. Called when data is received.
    
    Example of the data array:
    {
      "addr64":[0,19,162,0,64,161,242,29],  // 64 Bit address of the sender radio
      "addr16":[0,0],                       // 16 Bit address of the sender radio
      "option":1,                           // Options, see xBee API documentation
      "data":[70,114,105,101,110,100,115]   // The data itself
    }
        
Return: 
    No return value (undefined)
    
Example:
```
    myxbee.RX(function(data) {
        console.log(data);
    });
```
