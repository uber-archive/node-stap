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

var _ = require('underscore');
var util = require('util');

function AddressMap() {
    this.entries = [];
}

/* eslint-disable max-params */
function Entry(name, base, length, mappedEntityOffset) {
    this.base = base;
    this.length = length;
    this.name = name;

    // Where in the underlying entity did we start loading?
    this.mappedEntityOffset = mappedEntityOffset || 0;
}

// jshint: maxparams=5
AddressMap.prototype.addEntry = function addEntry(name, base, length,
                                                  mappedEntityOffset) {
    var entry = new Entry(name, base, length, mappedEntityOffset);
    this.entries.push(entry);
};

AddressMap.prototype.getEntryForOffset = function getEntryForOffset(address) {
    var entry = _.find(this.entries, function encloses(e) {
        return (address >= e.base && address <= e.base + e.length);
    });

    return entry;
};

// Ugly; really need to break this out into a separate structure
// for mapped files vs. the top-level map.  This only makes sense
// if all entries are mapped from the same entity
AddressMap.prototype.getEntryForOffsetPhys =
                                    function getEntryForOffsetPhys(address) {
    var entry = _.find(this.entries, function encloses(e) {
        return (address >= e.mappedEntityOffset &&
            address <= e.mappedEntityOffset + e.length);
    });

    return entry;
};

AddressMap.prototype.print = function print(logger) {
    this.entries.sort(function compareAddrs(e1, e2) {
        return e1.base - e2.base;
    });

    this.entries.forEach(function printSym(entry) {
        logger.info(util.format('%s-%s: %s',
                Number(entry.base).toString(16),
                Number(entry.base + entry.length).toString(16)),
            entry.name);
    });
};

module.exports = AddressMap;
