'use strict';

var Buffer = require('buffer').Buffer;
var fs = require('fs');

var STRING_LENGTH_OFFSET = 0x08;
var SEQ_STRING_DATA_OFFSET = 0x18;
var CONS_STRING_FIRST_OFFSET = 0x18;
var CONS_STRING_SECOND_OFFSET = 0x20;
var MAX_CONS_STRING_DEPTH = 5;

var STRING_REPR_MASK = 0x07;
var STRING_ENC_ASCII = 0x04;
var STRING_LAYOUT_MASK = 0x03;
var STRING_LAYOUT_SEQ = 0x00;
var STRING_LAYOUT_CONS = 0x01;

var HEAP_OBJECT_MAP_OFFSET = 0x00;
var HEAP_MAP_TYPE_OFFSET = 0x0c;

var JS_FUNC_SHARED_INFO_OFFSET = 0x28;

var SHARED_INFO_NAME_OFFSET = 0x08;
var SHARED_INFO_INFERRED_NAME_OFFSET = 0x50; 

module.exports = HeapReader;

function HeapReader(fd) {
    this.fd = fd;
    this.buffer = new Buffer(8);
}

HeapReader.prototype.readUInt8 = readUInt8;
HeapReader.prototype.readUInt16 = readUInt16;
HeapReader.prototype.readUInt64 = readUInt64;
HeapReader.prototype.readSMI = readSMI;
HeapReader.prototype.readPointer = readPointer;
HeapReader.prototype.readStringLength = readStringLength;
HeapReader.prototype.readStringShape = readStringShape;
HeapReader.prototype.readAsciiString = readAsciiString;
HeapReader.prototype.readUtf16String = readUtf16String;
HeapReader.prototype.readConsString = readConsString;
HeapReader.prototype.readString = readString;
HeapReader.prototype.readStringInternal = readStringInternal;
HeapReader.prototype.readFuncSharedInfo = readFuncSharedInfo;
HeapReader.prototype.readFuncSharedInfoName = readFuncSharedInfoName;
HeapReader.prototype.readFuncSharedInfoFileName = readFuncSharedInfoFileName;
HeapReader.prototype.readFuncSharedInfoLineNumber = readFuncSharedInfoLineNumber;
HeapReader.prototype.readFunction = readFunction;

function readUInt8(addr) {
    var self = this;
    var fd = self.fd;
    var buffer = self.buffer;

    buffer.fill(0);

    // console.log('reading 8bit value from address', addr.toString(16));
    fs.readSync(fd, buffer, 0, 1, addr);

    return buffer.readUInt8(0);
}

function readUInt16(addr) {
    var self = this;
    var fd = self.fd;
    var buffer = self.buffer;

    buffer.fill(0);

    // console.log('reading 16bit value from address', addr.toString(16));
    fs.readSync(fd, buffer, 0, 4, addr);

    return buffer.readUInt16LE(0);
}

function readUInt64(addr) {
    var self = this;
    var fd = self.fd;
    var buffer = self.buffer;

    buffer.fill(0);

    // console.log('reading 64bit value from address', addr.toString(16));
    fs.readSync(fd, buffer, 0, 8, addr);

    var a = buffer.readUInt32LE(0);
    var b = buffer.readUInt32LE(4);

    return a + b * 0x100000000;
}

function stripLowBit(addr) {
    return addr - (addr % 2);
}

function readSMI(addr) {
    var val = this.readUInt64(addr);
    return val / Math.pow(2, 32);
}

function readPointer(addr) {
    return stripLowBit(this.readUInt64(stripLowBit(addr)));
}

function readStringShape(stringAddr) {
    var self = this;

    var mapPtr = self.readPointer(stringAddr + HEAP_OBJECT_MAP_OFFSET);
    var typeField = self.readUInt8(mapPtr + HEAP_MAP_TYPE_OFFSET);

    return typeField & STRING_REPR_MASK;
}

function readStringLength(stringAddr) {
    return this.readSMI(stringAddr + STRING_LENGTH_OFFSET);
}

function readAsciiString(addr, length) {
    var self = this;

    addr = stripLowBit(addr);
    var str = [];

    for (var i = 0; i < length; i++) {
        var char = self.readUInt8(addr);
        str.push(String.fromCharCode(char));
        addr += 1;
    }

    return str.join('');
}

function readUtf16String(addr, length) {
    var self = this;

    addr = stripLowBit(addr);
    var str = [];

    for (var i = 0; i < 200 && i < length; i++) {
        var char = self.readUInt16(addr);
        str.push(String.fromCharCode(char));
        addr += 2;
    }

    return str.join('');
}

function readConsString(stringPtr, depth) {
    var self = this;

    var first = self.readPointer(stringPtr + CONS_STRING_FIRST_OFFSET);
    var second = self.readPointer(stringPtr + CONS_STRING_SECOND_OFFSET);
    var firstString = self.readStringInternal(first, depth + 1);
    var secondString = self.readStringInternal(second, depth + 1);

    return firstString + secondString;
}

function readStringInternal(origStringAddr, depth) {
    var self = this;

    if (depth >= MAX_CONS_STRING_DEPTH) {
        return '...';
    }

    var stringAddr = stripLowBit(origStringAddr);
    var stringShape = self.readStringShape(stringAddr);
    var stringLength = self.readStringLength(stringAddr);

    if (stringLength === 0) {
        return '[empty]';
    } else if (stringShape === (STRING_ENC_ASCII | STRING_LAYOUT_SEQ)) {
        return self.readAsciiString(
            stringAddr + SEQ_STRING_DATA_OFFSET,
            stringLength
        );
    } else if (stringShape === (STRING_LAYOUT_SEQ)) {
        return self.readUtf16String(
            stringAddr + SEQ_STRING_DATA_OFFSET,
            stringLength
        );
    } else if ((stringShape & STRING_LAYOUT_MASK) === STRING_LAYOUT_CONS) {
        return self.readConsString(stringAddr, depth + 1);
    } else {
        return '[unknown]';
    }
}

// Root of recursion
function readString(stringAddr) {
    return this.readStringInternal(stringAddr, 0);
}

function readFuncSharedInfo(funcPtr) {
    return this.readPointer(funcPtr + JS_FUNC_SHARED_INFO_OFFSET)
}

function readFuncSharedInfoName(sharedInfoPtr) {
    var self = this;

    var ptr = self.readPointer(sharedInfoPtr + SHARED_INFO_NAME_OFFSET);
    // console.log('ptr', ptr.toString(16));
    var stringLength = self.readStringLength(ptr);

    if (stringLength === 0) {
        ptr = self.readPointer(sharedInfoPtr + SHARED_INFO_INFERRED_NAME_OFFSET);
        // console.log('falling back to inferred function name ptr');
    }
 
    // console.log('name_ptr:', ptr.toString(16));

    return self.readString(ptr);
}

function readFuncSharedInfoFileName(funcPtr) {
    return '[empty]';
}

function readFuncSharedInfoLineNumber(funcPtr) {
    return '[unknown]';
}

function readFunction(funcPtr) {
    var self = this;
    // console.log('func_ptr:', funcPtr.toString(16));

    var sharedInfoPtr = self.readFuncSharedInfo(funcPtr);
    // console.log('shared_info:', sharedInfoPtr.toString(16));

    var functionName;
    var fileName;
    var lineNumber;

    try {
        functionName = self.readFuncSharedInfoName(sharedInfoPtr);
    } catch(e) {
        functionName = '[empty]';
    }

    try {
        fileName = self.readFuncSharedInfoFileName(sharedInfoPtr);
    } catch(e) {
        fileName = '[empty]';
    }

    try {
        lineNumber = self.readFuncSharedInfoLineNumber(sharedInfoPtr);
    } catch (e) {
        lineNumber = '[unknown]';
    }

    return functionName + ':' + fileName + ':' + lineNumber;
}

