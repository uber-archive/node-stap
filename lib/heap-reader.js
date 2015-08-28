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

var HEAP_OBJECT_FIXED_ARRAY_TYPE = 0xa3;

var JS_FUNC_SHARED_INFO_OFFSET = 0x28;

var SHARED_INFO_NAME_OFFSET = 0x08;
var SHARED_INFO_INFERRED_NAME_OFFSET = 0x50;
var SHARED_INFO_SCRIPT_OFFSET = 0x40;
var SHARED_INFO_START_POSITION_AND_TYPE_OFFSET = 0x84;
var SHARED_INFO_START_POSITION_SHIFT = 0x02;

var SCRIPT_NAME_OFFSET = 0x10;
var SCRIPT_LINE_OFFSET_OFFSET = 0x18;
var SCRIPT_LINE_ENDS_OFFSET = 0x58;

var FIXED_ARRAY_LENGTH_OFFSET = 0x08;
var FIXED_ARRAY_HEADER_SIZE = 0x10;

module.exports = HeapReader;

function HeapReader(fd) {
    this.fd = fd;
    this.buffer = new Buffer(8);
}

HeapReader.prototype.readUInt8 = readUInt8;
HeapReader.prototype.readUInt16 = readUInt16;
HeapReader.prototype.readUInt32 = readUInt32;
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
HeapReader.prototype.readHeapObjectType = readHeapObjectType;
HeapReader.prototype.readFixedArrayLength = readFixedArrayLength;
HeapReader.prototype.readFixedArraySMI = readFixedArraySMI;
HeapReader.prototype.readFuncSharedInfo = readFuncSharedInfo;
HeapReader.prototype.readFuncSharedInfoName = readFuncSharedInfoName;
HeapReader.prototype.readFuncSharedInfoFileName = readFuncSharedInfoFileName;
HeapReader.prototype.readFuncSharedInfoLineNumber =
    readFuncSharedInfoLineNumber;
HeapReader.prototype.readFunction = readFunction;

function readUInt8(addr) {
    var self = this;

    var fd = self.fd;
    var buffer = self.buffer;

    buffer.fill(0);
    fs.readSync(fd, buffer, 0, 1, addr);

    return buffer.readUInt8(0);
}

function readUInt16(addr) {
    var self = this;

    var fd = self.fd;
    var buffer = self.buffer;

    buffer.fill(0);
    fs.readSync(fd, buffer, 0, 2, addr);

    return buffer.readUInt16LE(0);
}

function readUInt32(addr) {
    var self = this;

    var fd = self.fd;
    var buffer = self.buffer;
    buffer.fill(0);

    fs.readSync(fd, buffer, 0, 4, addr);

    return buffer.readUInt32LE(0);
}

function readUInt64(addr) {
    var self = this;

    var fd = self.fd;
    var buffer = self.buffer;

    buffer.fill(0);
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
    return Math.floor(val / Math.pow(2, 32));
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

function readString(stringAddr) {
    return this.readStringInternal(stringAddr, 0);
}

function readFuncSharedInfo(funcPtr) {
    return this.readPointer(funcPtr + JS_FUNC_SHARED_INFO_OFFSET);
}

function readFuncSharedInfoName(sharedInfoPtr) {
    var self = this;

    var ptr = self.readPointer(sharedInfoPtr + SHARED_INFO_NAME_OFFSET);
    var stringLength = self.readStringLength(ptr);

    if (stringLength === 0) {
        ptr = self.readPointer(
            sharedInfoPtr + SHARED_INFO_INFERRED_NAME_OFFSET
        );
    }

    return self.readString(ptr);
}

function readFuncSharedInfoFileName(sharedInfoPtr) {
    var self = this;

    var scriptPtr = this.readPointer(sharedInfoPtr + SHARED_INFO_SCRIPT_OFFSET);
    var scriptNamePtr = this.readPointer(scriptPtr + SCRIPT_NAME_OFFSET);

    return self.readString(scriptNamePtr);
}

function readHeapObjectType(objPtr) {
    var self = this;
    var mapPtr = self.readPointer(objPtr + HEAP_OBJECT_MAP_OFFSET);

    return self.readUInt8(mapPtr + HEAP_MAP_TYPE_OFFSET);
}

function readFixedArrayLength(arrayAddr) {
    return this.readSMI(arrayAddr + FIXED_ARRAY_LENGTH_OFFSET);
}

function readFixedArraySMI(arrayAddr, index) {
    return this.readSMI(arrayAddr + FIXED_ARRAY_HEADER_SIZE + 8 * index);
}

function readFuncSharedInfoLineNumber(sharedInfoPtr) {
    var self = this;

    var startPosition = Math.floor(
        self.readUInt32(
            sharedInfoPtr + SHARED_INFO_START_POSITION_AND_TYPE_OFFSET
        ) / Math.pow(2, SHARED_INFO_START_POSITION_SHIFT)
    );

    var scriptPtr = self.readPointer(sharedInfoPtr + SHARED_INFO_SCRIPT_OFFSET);
    var lineEnds = self.readPointer(scriptPtr + SCRIPT_LINE_ENDS_OFFSET);
    var lineOffset = self.readSMI(scriptPtr + SCRIPT_LINE_OFFSET_OFFSET);
    var size = self.readFixedArrayLength(lineEnds);

    if (self.readHeapObjectType(lineEnds) !== HEAP_OBJECT_FIXED_ARRAY_TYPE) {
        return '[unknown]';
    }

    var low = 0;
    var high = size - 1;

    while (low < high) {
        var mid = Math.floor((high + low) / 2);

        var midLineEnd = self.readFixedArraySMI(lineEnds, mid);

        if (midLineEnd < startPosition) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }

    var lineNumber = low + lineOffset;

    if (lineNumber >= 0) {
        return lineNumber;
    } else {
        return '[unknown]';
    }
}

function readFunction(funcPtr) {
    var self = this;

    var sharedInfoPtr = self.readFuncSharedInfo(funcPtr);

    var functionName;
    var fileName;
    var lineNumber;

    try {
        functionName = self.readFuncSharedInfoName(sharedInfoPtr);
    } catch (e) {
        functionName = '[empty]';
    }

    try {
        fileName = self.readFuncSharedInfoFileName(sharedInfoPtr);
    } catch (e) {
        fileName = '[empty]';
    }

    try {
        lineNumber = self.readFuncSharedInfoLineNumber(sharedInfoPtr);
    } catch (e) {
        lineNumber = '[unknown]';
    }

    return functionName + ':' + fileName + ':' + lineNumber;
}
