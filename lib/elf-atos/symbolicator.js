// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
'use strict';

var util = require('util');

function Symbolicator(addressMap, symbolTables) {
    this.addressMap = addressMap;
    this.symbolTables = symbolTables;
}

Symbolicator.prototype.atos = function atos(address) {
    var vmEntry = this.addressMap.getEntryForOffset(address);
    var addr = '0x' + Number(address).toString(16);
    if (!vmEntry) {
        return util.format('[%s in unknown binary]', addr);
    }

    var symbolTable = this.symbolTables[vmEntry.name];
    if (!symbolTable) {
        return util.format('[%s in %s]', addr, vmEntry.name);
    }

    var offset = address - vmEntry.base + vmEntry.mappedEntityOffset;
    var objectEntry = symbolTable.getEntryForOffset(offset);
    if (!objectEntry) {
        return util.format('[%s in %s]', addr, vmEntry.name);
    }

    return objectEntry.name;
};

module.exports = Symbolicator;
