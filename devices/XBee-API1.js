/* Copyright (c) 2014 Sacha Gloor. See the file LICENSE for copying permission. */
/*

Module for communicate with xBee radios
=======================================

Summary
-------

Serial1.setup(38400,{rx:B7,tx:B6,bytesize:8,parity:none,stopbits:1});
myxbee=requere('XBee-API1'.connect(Serial1);

function:

  XBee-API1.AT(command,value,function(re,data) {} )
  XBee-API1.strtobytes(String)
  XBee-API1.TX(addr64,addr16,options,data,function(re,data) {} )
  XBee-API1.RX(function(data) {} )
*/

exports.connect = function(serial) {
    return new xbee(serial);
};

var xbee=function(ser) {
    
    var self=this;
    // Framestate and data
    var pstate='S';
    var f_len=0;
    var f_type=-1;
    var f_id=0;
    var f_data=[];
    var f_cs=0;
    
    this.ser=ser;
    this.seq=0x01;
    
    // Timeout in Seconds
    this.timeout=10; 
    // Store callbacks and setTimeout ids
    this.callbacks=[];
    // RX callback
    this.rxcb=undefined;
    
    //
    // process incomming data
    //
    ser.onData(function (e) {
        //console.log('S:'+pstate);
        // console.log(e.data.charCodeAt(0).toString(16));
        var data=e.data.charCodeAt(0);
        
        switch(pstate)
        {
            case 'S': // Waiting for Start
                if (data==0x7E) {
                    f_cs=0; // Clear checksum
                    f_data=[]; // Clear Data/payload buffer
                    pstate='LH';
                }
                break;
            case 'LH': f_len=data*256; pstate='LL';  // High Byte
                break;
            case 'LL': f_len+=data; pstate='FT';    // Low Bayte
                break;
            case 'FT': f_type=data; pstate='D'; f_len--; f_cs+=data;  // Frame type
                break;
            case 'D':   f_data.push(data); f_cs+=data;                    // Data
                        if (--f_len===0) { pstate='CS'; }
                break;
            case 'CS':
                        if(data==(0xFF-(f_cs & 0xFF))) { // Checksum ok
                            self.prepCB(f_type,f_data);
                        }
                        else { console.log('xBee: Checksum Fail'); }
                        
                        pstate='S'; // Start over
                break;
        }
    });
    //
    // Prep. Callback
    //
    this.prepCB=function(type,data) {
                var d={};
                var i;
                var seq=0; 
                
                if (type==0x88) { // AT CMD Response
                    seq=data[0]; // FrameID
                    d['cmd']=String.fromCharCode(data[1],data[2]);
                    d['status']=data[3];
                    d['data']=[];
                    for(i=4;i<data.length;i++) { d['data'].push(data[i]); }
                }
                else if (type==0x8B) { // AT Transmit Responce
                    seq=data[0]; // FrameID
                    d['destination']=[data[1],data[2]];
                    d['retrycount']=data[3];
                    d['delivery_status']=data[4];
                    d['discovery_status']=data[5];
                }
                else if (type==0x90) { // RX Transmit Frame
                    d['addr64']=[];
                    for(i=0;i<8;i++) { d['addr64'].push(data[i]); }
                    d['addr16']=[data[8],data[9]];
                    d['option']=data[10];
                    d['data']=[];
                    for(i=11;i<data.length;i++) { d['data'].push(data[i]); }
                    if (this.rxcb!==undefined) { // Call CB
                        this.rxcb(d);
                    }
                }
                else {
                    console.log('xBee: Unknown Frametype: '+type.toString(16));
                }
                if (seq>0) {
                    clearTimeout(this.callbacks[seq][1]); // Cancel Timeout CB
                //   console.log('SEQ:'+seq);
                //   console.log(this.callbacks[seq]);
                    this.callbacks[seq][0](true,d); // Call the Callback
                    delete this.callbacks[seq];
                }
    };
    //
    // Register a callback with timeout
    //
    this.regCB=function(seq,cb) {
        var tid=setTimeout(function() { self.cancelCB(seq); },this.timeout*1000);
        this.callbacks[seq]=[cb,tid];
    };
    //
    // Cancel callback
    //
    this.cancelCB=function(seq) {
        this.callbacks[seq][0](false,'');
        delete this.callbacks[seq];
    };
    //
    // Transmit an AT command
    //
    this.AT=function(cmd,val,cb) {
        var fr=this.atFrame(cmd,val);
        
        this.ser.write(fr);
        this.regCB(fr[4],cb);
    };
    //
    // Transmit an TX command
    //
    this.TX=function(addr64,addr16,opt,data,cb) {
        var fr=this.transmitFrame(addr64,addr16,opt,data);

        this.ser.write(fr);
        this.regCB(fr[4],cb);
    };
    //
    // Register RX Callback
    //
    this.RX=function(cb) {
        this.rxcb=cb;
    };
    //
    // Build an TRANSMIT frame
    //
    this.transmitFrame=function(addr64,addr16,opt,data) {
        var i;
        // Frame
        var a=[0x7E,0,0,0x10,this.seq];
        for (i=0;i<addr64.length;i++) {  a.push(addr64[i]); }
        for (i=0;i<addr16.length;i++) {  a.push(addr16[i]); }
        
        a.push(0x00); // Broadcast Radius
        a.push(opt);  // Options
        
        for (i=0;i<data.length;i++) {  a.push(data[i]); } // Payload, data
        // Add length and Cecksum
        a=this.calcLandC(a);
        // Sequence Number 
        this.seq++; if (this.seq>255) { this.seq=1; }
        return(a);
    };
    //
    // Build an AT frame
    //
    this.atFrame=function(cmd,value) {
        var i;
        // Frame
        var a=[0x7E,0,0,0x8,this.seq,Integer.valueOf(cmd[0]),Integer.valueOf(cmd[1])];
        // Proc Value
        for(i=0;i<value.length;i++) {
            a.push(value[i]);
        }
        // Add length and Cecksum
        a=this.calcLandC(a);
        // Sequence Number 
        this.seq++; if (this.seq>255) { this.seq=1; }
        return(a);
    };
    //
    // Calculate Length and Checksum
    //
    this.calcLandC=function(frame) {
        var i=0;
        var l=frame.length-3;
        var c=0;
        
        // Length
        frame[2]=l&255; // High / Low Byte
        frame[1]=l>>8;
        // Calc checksum
        for(i=3;i<frame.length;i++) { c+=frame[i]; }
        c=(c&255); c=255-c;
        
        frame[frame.length]=c;
        return(frame);
    };
    //
    // Converts a string to array of bytes. Usefull wenn sending ASCII Data
    // Do not use characters > 256
    //
    this.strtobytes=function(str) {
        var bytes = [];
        for (var i = 0; i < str.length; ++i)
        {
            bytes.push(str.charCodeAt(i));
        }
        return(bytes);
    };
};
